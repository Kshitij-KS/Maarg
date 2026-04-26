# ruff: noqa: E402
import argparse
import csv
import json
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from src.trust.trust_engine.data_completeness import compute_data_completeness_flags


def _text(row: dict[str, Any]) -> str:
    fields = [
        "name",
        "description",
        "equipment",
        "procedure",
        "capability",
        "address_city",
        "address_stateOrRegion",
        "address_zipOrPostcode",
    ]
    return " ".join(str(row.get(field, "")) for field in fields).lower()


def _has_geo(row: dict[str, Any]) -> bool:
    flags = compute_data_completeness_flags(row)
    return "MISSING_GEO" not in flags


def _score_clean(row: dict[str, Any]) -> int:
    text = _text(row)
    score = 0
    for term in ("operation theatre", "anesthesia machine", "anesthesiologist", "baby warmer"):
        score += 1 if term in text else 0
    score += 1 if _has_geo(row) else 0
    return score


def _score_live_catch(row: dict[str, Any]) -> int:
    text = _text(row)
    claim = "advanced surgery" in text or "dialysis" in text
    contradiction = " no anesthesia machine" in text or "[]" in text or "no dialysis" in text
    return int(claim) + int(contradiction) + int(_has_geo(row))


def _score_uncertainty(row: dict[str, Any]) -> int:
    text = _text(row)
    flags = compute_data_completeness_flags(row)
    uncertain_terms = ("24x7", "emergency", "specialist", "icu", "nicu")
    return sum(term in text for term in uncertain_terms) + len(flags)


def _score_geo(row: dict[str, Any]) -> int:
    text = _text(row)
    score = 2 if "madhepura" in text or "852113" in text else 0
    score += 1 if _has_geo(row) else 0
    return score


def _top(rows: list[dict[str, Any]], scorer: Any, limit: int) -> list[dict[str, Any]]:
    ranked = sorted(rows, key=scorer, reverse=True)
    return [
        {
            "name": row.get("name", ""),
            "pin_code": row.get("address_zipOrPostcode", ""),
            "district": row.get("address_city", ""),
            "score": scorer(row),
        }
        for row in ranked[:limit]
        if scorer(row) > 0
    ]


def mine_demo_cases(rows: list[dict[str, Any]], limit: int = 5) -> dict[str, list[dict[str, Any]]]:
    return {
        "clean_win": _top(rows, _score_clean, limit),
        "live_catch": _top(rows, _score_live_catch, limit),
        "uncertainty": _top(rows, _score_uncertainty, limit),
        "madhepura_geo": _top(rows, _score_geo, limit),
    }


def _read_csv(path: Path) -> list[dict[str, Any]]:
    with path.open(newline="", encoding="utf-8") as file:
        return list(csv.DictReader(file))


def main() -> None:
    parser = argparse.ArgumentParser(description="Mine judge-friendly Truth Layer demo cases.")
    parser.add_argument("csv_path", type=Path)
    parser.add_argument("--limit", type=int, default=5)
    args = parser.parse_args()
    print(json.dumps(mine_demo_cases(_read_csv(args.csv_path), limit=args.limit), indent=2))


if __name__ == "__main__":
    main()
