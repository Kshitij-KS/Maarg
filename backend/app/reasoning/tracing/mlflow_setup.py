"""MLflow tracing utilities for the Reasoning Layer."""

from __future__ import annotations

import functools
import inspect
import os
import time
import uuid
from collections.abc import Callable
from typing import Any, ParamSpec, TypeVar

P = ParamSpec("P")
R = TypeVar("R")
_TRACE_STACK: list[str] = []
_LAST_TRACE_ID = ""
_FALLBACK_TRACES: dict[str, list[dict[str, Any]]] = {}


def _mlflow() -> Any | None:
    try:
        import mlflow
    except ModuleNotFoundError:
        return None
    return mlflow


def init_mlflow(experiment_name: str | None = None) -> None:
    """Initialize local or Databricks-backed MLflow tracking."""

    mlflow = _mlflow()
    if mlflow is None:
        os.makedirs(os.getenv("MLFLOW_TRACKING_URI", "./mlruns"), exist_ok=True)
        return
    tracking_uri = os.getenv("MLFLOW_TRACKING_URI", "./mlruns")
    experiment = experiment_name or os.getenv("MLFLOW_EXPERIMENT_NAME", "hacknation-reasoning")
    mlflow.set_tracking_uri(tracking_uri)
    mlflow.set_experiment(experiment)


def traced(name: str) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """Decorate a function with MLflow 3 tracing.

    MLflow's docs recommend `@mlflow.trace(name=...)` for manual tracing and
    `mlflow.get_active_trace_id()` to access the current trace id.
    """

    mlflow = _mlflow()

    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        if mlflow is None:
            @functools.wraps(func)
            def fallback_wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
                global _LAST_TRACE_ID
                trace_id = _TRACE_STACK[-1] if _TRACE_STACK else f"local-{uuid.uuid4().hex}"
                _LAST_TRACE_ID = trace_id
                _TRACE_STACK.append(trace_id)
                start = int(time.time() * 1000)
                span: dict[str, Any] = {
                    "name": name,
                    "span_type": "func",
                    "start_time_ms": start,
                    "end_time_ms": None,
                    "attributes": {},
                }
                _FALLBACK_TRACES.setdefault(trace_id, []).append(span)
                os.makedirs(os.getenv("MLFLOW_TRACKING_URI", "./mlruns"), exist_ok=True)
                try:
                    return func(*args, **kwargs)
                finally:
                    span["end_time_ms"] = int(time.time() * 1000)
                    _TRACE_STACK.pop()

            fallback_wrapper.__signature__ = inspect.signature(  # type: ignore[attr-defined]
                func,
                eval_str=True,
            )
            return fallback_wrapper
        traced_func = mlflow.trace(name=name, span_type="func")(func)

        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            init_mlflow()
            return traced_func(*args, **kwargs)

        wrapper.__signature__ = inspect.signature(func, eval_str=True)  # type: ignore[attr-defined]
        return wrapper

    return decorator


def current_trace_id() -> str:
    """Return the active trace id or the last trace id in this thread."""

    mlflow = _mlflow()
    if mlflow is None:
        return _TRACE_STACK[-1] if _TRACE_STACK else _LAST_TRACE_ID
    active = mlflow.get_active_trace_id()
    if active:
        return active
    last = mlflow.get_last_active_trace_id(thread_local=True)
    return last or ""


def set_trace_attributes(attributes: dict[str, int | float | str | bool | None]) -> None:
    """Attach attributes to the current active MLflow span, if one exists."""

    mlflow = _mlflow()
    if mlflow is None:
        if _TRACE_STACK:
            spans = _FALLBACK_TRACES.get(_TRACE_STACK[-1], [])
            if spans:
                spans[-1]["attributes"].update(
                    {key: value for key, value in attributes.items() if value is not None}
                )
        return
    span = mlflow.get_current_active_span()
    if span is not None:
        span.set_attributes({key: value for key, value in attributes.items() if value is not None})


def fallback_trace_spans(trace_id: str) -> list[dict[str, Any]]:
    return _FALLBACK_TRACES.get(trace_id, [])
