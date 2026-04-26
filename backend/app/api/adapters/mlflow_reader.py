"""Read MLflow traces into frontend-safe DTOs."""

from __future__ import annotations

from collections.abc import Mapping

from app.api.schemas import TraceResponse, TraceSpan
from app.reasoning.tracing.mlflow_setup import init_mlflow


def _scalar(value: object) -> str | int | float | bool | None:
    if value is None or isinstance(value, str | int | float | bool):
        return value
    return str(value)


def _mapping(value: object) -> dict[str, str | int | float | bool | None]:
    if not isinstance(value, Mapping):
        return {}
    return {str(key): _scalar(item) for key, item in value.items()}


def _span_name(span: object) -> str:
    info = getattr(span, "info", None)
    return str(getattr(info, "name", None) or getattr(span, "name", "span"))


def _span_type(span: object) -> str | None:
    info = getattr(span, "info", None)
    value = getattr(info, "span_type", None) or getattr(span, "span_type", None)
    return str(value) if value is not None else None


def _span_time(span: object, attr: str) -> int | None:
    info = getattr(span, "info", None)
    value = getattr(info, attr, None) or getattr(span, attr, None)
    return int(value) if isinstance(value, int | float) else None


def get_trace(trace_id: str) -> TraceResponse:
    import mlflow

    init_mlflow()
    trace = mlflow.get_trace(trace_id, silent=True)
    if trace is None:
        return TraceResponse(trace_id=trace_id, found=False, spans=[])

    data = getattr(trace, "data", None)
    spans = getattr(data, "spans", None) or getattr(trace, "spans", None) or []
    return TraceResponse(
        trace_id=trace_id,
        found=True,
        spans=[
            TraceSpan(
                name=_span_name(span),
                span_type=_span_type(span),
                start_time_ms=_span_time(span, "start_time_ms"),
                end_time_ms=_span_time(span, "end_time_ms"),
                attributes=_mapping(getattr(span, "attributes", None)),
            )
            for span in spans
        ],
    )
