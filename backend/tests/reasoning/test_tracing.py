from __future__ import annotations

from pathlib import Path

from app.reasoning.tracing.mlflow_setup import current_trace_id, traced


@traced("tests.traced_noop")
def traced_noop() -> str:
    trace_id = current_trace_id()
    assert trace_id
    return trace_id


def test_traced_function_exposes_trace_id_and_creates_local_store() -> None:
    trace_id = traced_noop()

    assert trace_id
    assert Path("mlruns").exists()
