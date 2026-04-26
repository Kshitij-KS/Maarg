from src.trust.trust_engine.inference_graph import compute_inference_signal


def test_advanced_surgery_supported_by_anesthesia_and_staff() -> None:
    result = compute_inference_signal(
        capability="advanced_surgery",
        claim_present=True,
        extracted_equipment=["general anesthesia machine", "operation theatre", "surgical lights"],
        extracted_staff=["anesthesiologist"],
    )

    assert result.inferred_present is True
    assert result.inference_confidence >= 0.7
    assert "general anesthesia machine" in result.supporting_equipment
    assert not result.contradictions


def test_advanced_surgery_claim_without_required_evidence_is_capped() -> None:
    result = compute_inference_signal(
        capability="advanced_surgery",
        claim_present=True,
        extracted_equipment=["minor procedure room"],
        extracted_staff=["medical officer"],
    )

    assert result.inferred_present is False
    assert result.inference_confidence <= 0.15
    assert result.contradictions == [
        "Claims Advanced Surgery but no anesthesia machine or anesthesiologist found"
    ]
    assert "EQUIPMENT_CLAIM_MISMATCH" in result.inference_flags


def test_advanced_surgery_requires_equipment_even_when_staff_present() -> None:
    result = compute_inference_signal(
        capability="advanced_surgery",
        claim_present=True,
        extracted_equipment=["operation theatre", "surgical lights"],
        extracted_staff=["anesthesiologist"],
    )

    assert result.inferred_present is False
    assert result.inference_confidence <= 0.15
    assert "EQUIPMENT_CLAIM_MISMATCH" in result.inference_flags


def test_negated_required_equipment_does_not_support_claim() -> None:
    result = compute_inference_signal(
        capability="advanced_surgery",
        claim_present=True,
        extracted_equipment=["no anesthesia machine", "operation theatre"],
        extracted_staff=["anesthesiologist"],
    )

    assert result.inferred_present is False
    assert "EQUIPMENT_CLAIM_MISMATCH" in result.inference_flags


def test_first_five_p0_capabilities_have_positive_support() -> None:
    cases = [
        (
            "advanced_surgery",
            ["anesthesia machine", "operation theatre"],
            ["anesthesiologist"],
        ),
        (
            "emergency_obstetric_care",
            ["operation theatre", "baby warmer"],
            ["gynaecologist"],
        ),
        ("neonatal_icu", ["incubator", "phototherapy unit"], []),
        ("dialysis", ["dialysis machine", "RO water system"], []),
        (
            "emergency_trauma",
            ["trauma bay", "defibrillator"],
            ["emergency physician"],
        ),
    ]

    for capability, equipment, staff in cases:
        result = compute_inference_signal(
            capability=capability,
            claim_present=True,
            extracted_equipment=equipment,
            extracted_staff=staff,
        )
        assert result.inferred_present is True, capability
        assert result.inference_confidence >= 0.6, capability
        assert result.supporting_equipment, capability


def test_dialysis_claim_without_machine_is_capped() -> None:
    result = compute_inference_signal(
        capability="dialysis",
        claim_present=True,
        extracted_equipment=[],
        extracted_staff=[],
    )

    assert result.inferred_present is False
    assert result.inference_confidence <= 0.10
    assert result.contradictions == ["Claims Dialysis but no dialysis machine or RO system found"]


def test_unknown_capability_returns_neutral_result() -> None:
    result = compute_inference_signal(
        capability="dental_implants",
        claim_present=True,
        extracted_equipment=["dental chair"],
        extracted_staff=["dentist"],
    )

    assert result.inferred_present is None
    assert result.inference_confidence == 0.5
    assert result.inference_flags == ["CAPABILITY_NOT_IN_INFERENCE_GRAPH"]
