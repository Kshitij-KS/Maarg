SIGNAL_WEIGHTS = {
    "self_consistency": 0.25,
    "coherence": 0.30,
    "peer_anomaly": 0.20,
    "inference": 0.25,
}


def aggregate_trust_score(
    self_consistency: float,
    coherence: float,
    peer_anomaly: float,
    inference: float,
    flags: list[str] | None = None,
) -> float:
    score = (
        self_consistency * SIGNAL_WEIGHTS["self_consistency"]
        + coherence * SIGNAL_WEIGHTS["coherence"]
        + peer_anomaly * SIGNAL_WEIGHTS["peer_anomaly"]
        + inference * SIGNAL_WEIGHTS["inference"]
    )
    if flags and "EQUIPMENT_CLAIM_MISMATCH" in flags:
        score = min(score, 0.35)
    return round(score, 4)


def provisional_interval(
    trust_score: float,
    existing_flags: list[str] | None = None,
    single_pass: bool = False,
) -> tuple[float, float, list[str]]:
    flags = list(existing_flags or [])
    if single_pass:
        interval = (0.0, 1.0)
    else:
        interval = (max(0.0, round(trust_score - 0.2, 4)), min(1.0, round(trust_score + 0.2, 4)))
    if "PROVISIONAL_INTERVAL" not in flags:
        flags.append("PROVISIONAL_INTERVAL")
    return interval[0], interval[1], flags
