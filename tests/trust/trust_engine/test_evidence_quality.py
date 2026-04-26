from src.trust.trust_engine.evidence_quality import evaluate_citation_quality


def test_evidence_quality_accepts_exact_source_substring() -> None:
    flags = evaluate_citation_quality(
        citations=[
            {
                "source_field": "description",
                "sentence": "Operation theatre available for emergency care.",
                "char_start": 0,
                "char_end": 47,
            }
        ],
        source_fields={
            "description": "Operation theatre available for emergency care.",
        },
    )

    assert flags == []


def test_evidence_quality_flags_missing_and_weak_citations() -> None:
    assert evaluate_citation_quality([], {"description": "Dialysis machine available."}) == [
        "MISSING_CITATION"
    ]

    flags = evaluate_citation_quality(
        citations=[
            {
                "source_field": "description",
                "sentence": "Dialysis machine available.",
                "char_start": 0,
                "char_end": 27,
            }
        ],
        source_fields={"description": "No dialysis service listed."},
    )

    assert "CITATION_NOT_IN_SOURCE" in flags
