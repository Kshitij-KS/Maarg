from src.trust.trust_engine.coherence import compute_coherence_signal


def test_coherence_flags_missing_anesthesiologist_for_advanced_surgery() -> None:
    result = compute_coherence_signal(
        capability="advanced_surgery",
        claim_present=True,
        extracted_equipment=["operation theatre"],
        extracted_staff=["medical officer"],
    )

    assert result.score < 0.5
    assert "missing_anesthesiologist" in result.flags


def test_unclaimed_capability_is_neutral_for_coherence() -> None:
    result = compute_coherence_signal(
        capability="advanced_surgery",
        claim_present=False,
        extracted_equipment=[],
        extracted_staff=[],
    )

    assert result.score == 0.5
    assert result.flags == ["CAPABILITY_NOT_CLAIMED"]
