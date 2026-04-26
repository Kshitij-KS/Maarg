"""Shared constants for the Reasoning Layer.

This is a lightweight mirror of Person A's capability taxonomy. Reconcile with
`src/shared/capability_requirements.yaml` during the Hour 2 sync.
"""

from __future__ import annotations

CAPABILITY_TAXONOMY: tuple[str, ...] = (
    "emergency_obstetric_care",
    "c_section",
    "anesthesiologist_coverage",
    "dialysis",
    "nicu",
    "icu",
    "blood_bank",
    "emergency_care",
    "trauma_care",
    "ambulance",
)

CAPABILITY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "emergency_obstetric_care": (
        "emergency obstetric",
        "obstetric",
        "obstetrics",
        "maternal",
        "delivery",
    ),
    "c_section": ("c-section", "c section", "cesarean", "caesarean", "cs"),
    "anesthesiologist_coverage": (
        "anesthesiologist",
        "anaesthesiologist",
        "anesthesia",
        "anaesthesia",
    ),
    "dialysis": ("dialysis", "hemodialysis", "haemodialysis"),
    "nicu": ("nicu", "neonatal intensive"),
    "icu": ("icu", "intensive care"),
    "blood_bank": ("blood bank", "blood storage"),
    "emergency_care": ("emergency care", "emergency department", "casualty"),
    "trauma_care": ("trauma", "accident"),
    "ambulance": ("ambulance", "transport"),
}

DEMO_MADHEPURA_LAT = 25.92
DEMO_MADHEPURA_LON = 86.79
DEMO_MADHEPURA_PIN = "852113"
DEMO_CRITICAL_DESERT_PIN = "855107"
