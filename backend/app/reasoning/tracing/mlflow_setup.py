"""MLflow tracing utilities for the Reasoning Layer."""

from __future__ import annotations

import functools
import inspect
import os
from collections.abc import Callable
from typing import ParamSpec, TypeVar

P = ParamSpec("P")
R = TypeVar("R")


def _mlflow():
    import mlflow

    return mlflow


def init_mlflow(experiment_name: str | None = None) -> None:
    """Initialize local or Databricks-backed MLflow tracking."""

    mlflow = _mlflow()
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
    active = mlflow.get_active_trace_id()
    if active:
        return active
    last = mlflow.get_last_active_trace_id(thread_local=True)
    return last or ""


def set_trace_attributes(attributes: dict[str, int | float | str | bool | None]) -> None:
    """Attach attributes to the current active MLflow span, if one exists."""

    mlflow = _mlflow()
    span = mlflow.get_current_active_span()
    if span is not None:
        span.set_attributes({key: value for key, value in attributes.items() if value is not None})
