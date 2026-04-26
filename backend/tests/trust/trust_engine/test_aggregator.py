from src.trust.trust_engine.aggregator import aggregate_trust_score, provisional_interval


def test_aggregate_uses_all_four_signal_weights() -> None:
    score = aggregate_trust_score(
        self_consistency=1.0,
        coherence=0.0,
        peer_anomaly=0.5,
        inference=1.0,
    )

    assert score == 0.6


def test_equipment_mismatch_caps_trust_score() -> None:
    score = aggregate_trust_score(
        self_consistency=0.9,
        coherence=0.2,
        peer_anomaly=0.5,
        inference=0.05,
        flags=["EQUIPMENT_CLAIM_MISMATCH"],
    )

    assert score <= 0.35


def test_provisional_interval_is_clipped_and_flagged() -> None:
    low, high, flags = provisional_interval(0.9, existing_flags=["PEER_ANOMALY_NOT_COMPUTED"])

    assert low == 0.7
    assert high == 1.0
    assert flags == ["PEER_ANOMALY_NOT_COMPUTED", "PROVISIONAL_INTERVAL"]
