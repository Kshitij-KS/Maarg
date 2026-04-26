from typing import Any

from src.trust.extraction.extractor import LocalExtractorAdapter, NormalizedFacilityText


def run_two_pass_extraction(
    normalized: NormalizedFacilityText,
    extractor: LocalExtractorAdapter | None = None,
) -> dict[str, Any]:
    adapter = extractor or LocalExtractorAdapter()
    pass_1 = adapter.extract(normalized)
    pass_2 = adapter.extract(normalized)
    return {"pass_1": pass_1, "pass_2": pass_2}
