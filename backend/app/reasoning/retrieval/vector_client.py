"""Thin wrapper around Person A's future Mosaic AI Vector Search index.

Hour 0-8 returns citations already present in the mock Gold facility records.
"""

from __future__ import annotations

from app.reasoning.tracing.mlflow_setup import set_trace_attributes, traced
from app.shared.catalog import load_facility_trust
from app.shared.schemas import Citation, FacilityTrustRecord


class VectorClient:
    """Citation retrieval facade."""

    @traced("vector_client.citations_for")
    def citations_for(self, facility_id: str, query: str, k: int = 3) -> list[Citation]:
        facilities = load_facility_trust()
        facility = next(
            (record for record in facilities if record.facility_id == facility_id),
            None,
        )
        if facility is None:
            set_trace_attributes({"facility_found": False, "citation_count": 0})
            return []

        return self.citations_from_facility(facility, query, k=k)

    @traced("vector_client.citations_from_facility")
    def citations_from_facility(
        self, facility: FacilityTrustRecord, query: str, k: int = 3
    ) -> list[Citation]:
        citations: list[Citation] = []
        for claim in facility.capabilities:
            if claim.claim_present:
                citations.extend(claim.citations)

        set_trace_attributes(
            {
                "facility_found": True,
                "citation_count": min(len(citations), k),
                "query_length": len(query),
            }
        )
        return citations[:k]
