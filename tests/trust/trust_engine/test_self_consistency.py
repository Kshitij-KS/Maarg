from src.trust.trust_engine.self_consistency import compute_self_consistency_score


def test_self_consistency_is_high_when_passes_agree() -> None:
    score = compute_self_consistency_score(
        pass_1_capabilities=["advanced_surgery", "icu"],
        pass_2_capabilities=["icu", "advanced_surgery"],
    )

    assert score == 1.0


def test_self_consistency_reflects_disagreement() -> None:
    score = compute_self_consistency_score(
        pass_1_capabilities=["advanced_surgery", "icu"],
        pass_2_capabilities=["icu"],
    )

    assert score == 0.5
