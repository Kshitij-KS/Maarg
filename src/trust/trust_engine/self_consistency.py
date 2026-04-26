def compute_self_consistency_score(
    pass_1_capabilities: list[str],
    pass_2_capabilities: list[str],
) -> float:
    first = set(pass_1_capabilities)
    second = set(pass_2_capabilities)
    if not first and not second:
        return 1.0
    union = first | second
    intersection = first & second
    return round(len(intersection) / len(union), 4)
