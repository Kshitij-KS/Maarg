from typing import Any


def evaluate_citation_quality(
    citations: list[dict[str, Any]],
    source_fields: dict[str, str] | None = None,
) -> list[str]:
    flags: list[str] = []
    if not citations:
        return ["MISSING_CITATION"]

    sources = source_fields or {}
    for citation in citations:
        source_field = str(citation.get("source_field", ""))
        sentence = str(citation.get("sentence", "")).strip()
        if not source_field or not sentence:
            flags.append("WEAK_CITATION")
            continue
        if len(sentence) < 8:
            flags.append("WEAK_CITATION")
        source_text = sources.get(source_field)
        if source_text is not None and sentence not in source_text:
            flags.append("CITATION_NOT_IN_SOURCE")

    return list(dict.fromkeys(flags))


def evidence_quality_penalty(flags: list[str]) -> float:
    if "MISSING_CITATION" in flags:
        return 0.2
    if "CITATION_NOT_IN_SOURCE" in flags:
        return 0.1
    if "WEAK_CITATION" in flags:
        return 0.05
    return 0.0
