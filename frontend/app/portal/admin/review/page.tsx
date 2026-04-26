"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  adminListRegistrations,
  adminListUpdates,
  adminReviewRegistration,
  adminReviewUpdate,
} from "@/lib/portal-client";

export default function AdminReviewPage() {
  const queryClient = useQueryClient();
  const [adminToken, setAdminToken] = useState("portal-demo-admin-token");
  const registrations = useQuery({
    queryKey: ["portal-admin-registrations", adminToken],
    queryFn: () => adminListRegistrations(adminToken),
    enabled: Boolean(adminToken),
  });
  const updates = useQuery({
    queryKey: ["portal-admin-updates", adminToken],
    queryFn: () => adminListUpdates(adminToken),
    enabled: Boolean(adminToken),
  });

  async function approveRegistration(row: Record<string, unknown>) {
    await adminReviewRegistration(adminToken, String(row.registration_id), {
      status: "approved",
      matched_facility_id: String(row.matched_facility_id ?? ""),
      reviewer_notes: "Approved for demo portal access.",
    });
    await queryClient.invalidateQueries({ queryKey: ["portal-admin-registrations"] });
  }

  async function approveUpdate(requestId: string) {
    await adminReviewUpdate(adminToken, requestId, {
      status: "approved",
      reviewer_notes: "Proof reviewed and accepted.",
      proof_verified: true,
    });
    await queryClient.invalidateQueries({ queryKey: ["portal-admin-updates"] });
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-text-muted">Admin Review</p>
        <h1 className="mt-3 text-4xl font-semibold text-text-primary">Portal review queue</h1>
      </div>
      <label className="flex max-w-md flex-col gap-2 text-sm text-text-secondary">
        Admin bearer token
        <Input value={adminToken} onChange={(event) => setAdminToken(event.target.value)} />
      </label>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Registrations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {registrations.data?.map((row) => (
              <div
                key={String(row.registration_id)}
                className="space-y-2 rounded-lg border border-border-default p-3"
              >
                <p className="font-medium text-text-primary">{String(row.facility_name)}</p>
                <p className="text-sm text-text-secondary">
                  Status: {String(row.status)} | Match: {String(row.matched_facility_id ?? "none")}
                </p>
                <Button
                  type="button"
                  disabled={!row.matched_facility_id || row.status === "approved"}
                  onClick={() => approveRegistration(row)}
                >
                  Approve
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Update Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {updates.data?.map((row) => (
              <div key={row.request_id} className="space-y-2 rounded-lg border border-border-default p-3">
                <p className="font-medium text-text-primary">{row.field_name}</p>
                <p className="text-sm text-text-secondary">
                  {row.status} | Proof: {row.proof_media_ids.length} file(s)
                </p>
                <p className="text-sm text-text-secondary">{row.justification}</p>
                <Button
                  type="button"
                  disabled={row.status === "approved"}
                  onClick={() => approveUpdate(row.request_id)}
                >
                  Approve and queue for pipeline
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
