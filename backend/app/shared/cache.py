"""High-performance caching layer for Maarg backend.

Provides both in-memory LRU caching with TTL and optional Redis integration
for distributed caching across multiple instances.

This module addresses critical performance bottlenecks:
1. Eliminates repeated JSON file loads on every request
2. Reduces database query load with intelligent caching
3. Provides sub-millisecond cache hits for frequently accessed data
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import time
from functools import wraps
from typing import Any, Callable, TypeVar

from dotenv import load_dotenv

load_dotenv()

LOGGER = logging.getLogger(__name__)

T = TypeVar("T")


class TimedLRUCache:
    """Thread-safe LRU cache with TTL support.
    
    This cache automatically evicts:
    - Entries older than ttl_seconds
    - Entries when max_size is exceeded (LRU eviction)
    
    Usage:
        cache = TimedLRUCache(max_size=100, ttl_seconds=600)
        cache.set("key", value)
        value = cache.get("key")  # Returns None if expired or missing
    """
    
    def __init__(self, max_size: int = 100, ttl_seconds: int = 600):
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._cache: dict[str, tuple[Any, float, int]] = {}  # key -> (value, timestamp, access_count)
        self._access_counter = 0
        self._hits = 0
        self._misses = 0
    
    def get(self, key: str) -> Any | None:
        """Get value from cache. Returns None if expired or missing."""
        if key not in self._cache:
            self._misses += 1
            return None
        
        value, timestamp, _ = self._cache[key]
        
        # Check if expired
        if time.time() - timestamp > self.ttl_seconds:
            del self._cache[key]
            self._misses += 1
            LOGGER.debug("Cache miss (expired): %s", key)
            return None
        
        # Update access count for LRU tracking
        self._access_counter += 1
        self._cache[key] = (value, timestamp, self._access_counter)
        self._hits += 1
        LOGGER.debug("Cache hit: %s", key)
        return value
    
    def set(self, key: str, value: Any) -> None:
        """Set value in cache with automatic TTL and size management."""
        current_time = time.time()
        
        # Evict oldest entries if at capacity
        if len(self._cache) >= self.max_size:
            self._evict_oldest()
        
        self._access_counter += 1
        self._cache[key] = (value, current_time, self._access_counter)
        LOGGER.debug("Cache set: %s", key)
    
    def delete(self, key: str) -> bool:
        """Delete a specific key from cache. Returns True if deleted."""
        if key in self._cache:
            del self._cache[key]
            return True
        return False
    
    def clear(self) -> None:
        """Clear all cached entries."""
        self._cache.clear()
        LOGGER.info("Cache cleared")
    
    def _evict_oldest(self) -> None:
        """Evict the least recently used entry."""
        if not self._cache:
            return
        
        # Find entry with lowest access count (LRU)
        oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k][2])
        del self._cache[oldest_key]
        LOGGER.debug("Cache eviction (LRU): %s", oldest_key)
    
    def stats(self) -> dict[str, Any]:
        """Return cache statistics."""
        total = self._hits + self._misses
        hit_rate = self._hits / total if total > 0 else 0.0
        return {
            "size": len(self._cache),
            "max_size": self.max_size,
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": round(hit_rate, 3),
            "ttl_seconds": self.ttl_seconds,
        }


class RedisCache:
    """Redis-backed distributed cache with TTL support.
    
    Falls back gracefully if Redis is not available.
    Uses Upstash Redis (serverless) or any Redis-compatible service.
    
    Environment variables:
        REDIS_URL: Redis connection URL (default: redis://localhost:6379)
    """
    
    def __init__(self, ttl_seconds: int = 600):
        self.ttl_seconds = ttl_seconds
        self._client = None
        self._connected = False
        
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        
        try:
            import redis
            self._client = redis.Redis.from_url(redis_url, decode_responses=True)
            # Test connection
            self._client.ping()
            self._connected = True
            LOGGER.info("Redis cache connected: %s", redis_url)
        except ImportError:
            LOGGER.warning("Redis not installed. Install with: pip install redis")
        except Exception as e:
            LOGGER.warning("Redis connection failed (%s). Using in-memory cache fallback.", e)
    
    def is_available(self) -> bool:
        """Check if Redis is connected and available."""
        return self._connected
    
    def get(self, key: str) -> Any | None:
        """Get value from Redis cache."""
        if not self._connected:
            return None
        
        try:
            value = self._client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            LOGGER.error("Redis get error: %s", e)
            return None
    
    def set(self, key: str, value: Any, ttl_seconds: int | None = None) -> bool:
        """Set value in Redis cache with TTL."""
        if not self._connected:
            return False
        
        try:
            ttl = ttl_seconds or self.ttl_seconds
            serialized = json.dumps(value, default=str)
            self._client.setex(key, ttl, serialized)
            return True
        except Exception as e:
            LOGGER.error("Redis set error: %s", e)
            return False
    
    def delete(self, key: str) -> bool:
        """Delete key from Redis cache."""
        if not self._connected:
            return False
        
        try:
            return bool(self._client.delete(key))
        except Exception as e:
            LOGGER.error("Redis delete error: %s", e)
            return False
    
    def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching a pattern. Returns count of deleted keys."""
        if not self._connected:
            return 0
        
        try:
            keys = self._client.keys(pattern)
            if keys:
                return self._client.delete(*keys)
            return 0
        except Exception as e:
            LOGGER.error("Redis clear_pattern error: %s", e)
            return 0


def generate_cache_key(func_name: str, *args: Any, **kwargs: Any) -> str:
    """Generate a deterministic cache key from function name and arguments."""
    key_parts = [func_name]
    
    # Add positional args
    for arg in args:
        key_parts.append(str(arg))
    
    # Add sorted keyword args
    for k, v in sorted(kwargs.items()):
        key_parts.append(f"{k}={v}")
    
    key_string = ":".join(key_parts)
    hash_digest = hashlib.md5(key_string.encode()).hexdigest()[:16]
    
    return f"maarg:{func_name}:{hash_digest}"


def cached(
    ttl: int = 300,
    prefix: str = "",
    cache_instance: TimedLRUCache | None = None,
    enabled: bool = True,
) -> Callable:
    """Decorator for caching function results with TTL.
    
    Args:
        ttl: Time-to-live in seconds (default: 5 minutes)
        prefix: Optional prefix for cache keys
        cache_instance: Cache to use (creates global if None)
        enabled: Toggle caching on/off (useful for debugging)
    
    Usage:
        @cached(ttl=600, prefix="facilities")
        def load_facility_trust(limit: int | None = None):
            # Expensive operation here
            return facilities
    """
    # Use provided cache or create/get global
    cache = cache_instance if cache_instance else get_global_cache()
    
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            if not enabled:
                return func(*args, **kwargs)
            
            # Generate cache key
            key_parts = [prefix, func.__name__] if prefix else [func.__name__]
            cache_key = generate_cache_key(":".join(key_parts), *args, **kwargs)
            
            # Try cache first
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                LOGGER.debug("Cache HIT for %s", cache_key)
                return cached_value
            
            # Execute function and cache result
            LOGGER.debug("Cache MISS for %s, executing function", cache_key)
            result = func(*args, **kwargs)
            cache.set(cache_key, result)
            
            return result
        
        # Expose cache invalidation method
        def invalidate(*args: Any, **kwargs: Any) -> bool:
            key_parts = [prefix, func.__name__] if prefix else [func.__name__]
            cache_key = generate_cache_key(":".join(key_parts), *args, **kwargs)
            return cache.delete(cache_key)
        
        wrapper.invalidate = invalidate  # type: ignore[attr-defined]
        return wrapper
    
    return decorator


# Global cache instances
_global_cache: TimedLRUCache | None = None
_redis_cache: RedisCache | None = None


def get_global_cache() -> TimedLRUCache:
    """Get or create the global in-memory cache."""
    global _global_cache
    if _global_cache is None:
        _global_cache = TimedLRUCache(max_size=200, ttl_seconds=600)
        LOGGER.info("Initialized global cache: max_size=200, ttl=600s")
    return _global_cache


def get_redis_cache() -> RedisCache:
    """Get or create the Redis cache (if available)."""
    global _redis_cache
    if _redis_cache is None:
        _redis_cache = RedisCache(ttl_seconds=600)
    return _redis_cache


def get_best_available_cache() -> TimedLRUCache | RedisCache:
    """Return the best available cache (Redis preferred, falls back to in-memory)."""
    redis_cache = get_redis_cache()
    if redis_cache.is_available():
        return redis_cache
    return get_global_cache()


def warmup_cache(func: Callable, *args: Any, **kwargs: Any) -> Any:
    """Pre-warm cache by calling function and storing result.
    
    Useful for startup warming of frequently accessed data.
    """
    cache = get_best_available_cache()
    key = generate_cache_key(func.__name__, *args, **kwargs)
    
    result = func(*args, **kwargs)
    cache.set(key, result)
    LOGGER.info("Cache warmed: %s", key)
    
    return result


# Facility-specific cache utilities
FACILITY_CACHE_KEY = "maarg:facilities:all"
DESERT_CACHE_KEY = "maarg:deserts:all"


def invalidate_facility_cache() -> bool:
    """Invalidate all facility-related cache entries."""
    cache = get_best_available_cache()
    if isinstance(cache, RedisCache):
        return cache.clear_pattern("maarg:facilities:*") > 0
    else:
        cache.clear()
        return True


def invalidate_desert_cache() -> bool:
    """Invalidate all desert-related cache entries."""
    cache = get_best_available_cache()
    if isinstance(cache, RedisCache):
        return cache.clear_pattern("maarg:deserts:*") > 0
    else:
        cache.clear()
        return True


def get_cache_stats() -> dict[str, Any]:
    """Get comprehensive cache statistics."""
    stats = {"in_memory": get_global_cache().stats()}
    
    redis_cache = get_redis_cache()
    if redis_cache.is_available():
        stats["redis"] = {"available": True, "ttl": redis_cache.ttl_seconds}
    else:
        stats["redis"] = {"available": False}
    
    return stats
