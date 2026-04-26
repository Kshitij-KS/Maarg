"use client";

import { FormEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { CameraCapture } from "@/components/portal/camera-capture";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getUpdateFields, submitUpdate, type ProofMedia } from "@/lib/portal-client";

export default function NewUpdateRequestPage() {
  const [fieldName, setFieldName] = useState("equipment");
  const [oldValue, setOldValue] = useState("");
  const [newValue, setNewValue] = useState("");
  const [justification, setJustification] = useState("");
  const [proof, setProof] = useState<ProofMedia[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fields = useQuery({ queryKey: ["portal-update-fields"], queryFn: getUpdateFields });
  const selectedField = fields.data?.find((field) => field.field_name === fieldName);
  const requiresProof = Boolean(selectedField?.requires_proof);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      let parsedValue: unknown = newValue;
      if (selectedField?.value_type === "list[str]") {
        parsedValue = newValue
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      } else if (selectedField?.value_type === "int") {
        parsedValue = Number.parseInt(newValue, 10);
      }
      const response = await submitUpdate({
        field_name: fieldName,
        new_value: parsedValue,
        justification,
        proof_media_ids: proof.map((item) => item.media_id),
        old_value: oldValue || undefined,
      });
      setResult(response.request_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit update.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-4xl font-semibold text-text-primary">Request a correction</h1>
      <Card>
        <CardHeader>
          <CardTitle>Guided organization update</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="flex flex-col gap-2 text-sm text-text-secondary">
              Field
              <select
                className="h-9 rounded-lg border border-border-default bg-background px-3"
                value={fieldName}
                onChange={(event) => {
                  setFieldName(event.target.value);
                  setProof([]);
                  setResult(null);
                }}
              >
                {(fields.data ?? []).map((field) => (
                  <option key={field.field_name} value={field.field_name}>
                    {field.description}
                  </option>
                ))}
              </select>
            </label>
            {selectedField ? (
              <div className="rounded-lg border border-border-default p-3 text-sm text-text-secondary">
                <p>Category: {selectedField.category}</p>
                <p>Expected value: {selectedField.value_type}</p>
                <p>
                  Proof requirement: {selectedField.requires_proof ? "Required" : "Not required"}
                </p>
                {selectedField.examples.length > 0 ? <p>Example: {selectedField.examples[0]}</p> : null}
              </div>
            ) : null}
            <label className="flex flex-col gap-2 text-sm text-text-secondary">
              Current value (optional)
              <Input value={oldValue} onChange={(event) => setOldValue(event.target.value)} />
            </label>
            <label className="flex flex-col gap-2 text-sm text-text-secondary">
              Proposed value {selectedField?.value_type === "list[str]" ? "(comma separated)" : null}
              <Input value={newValue} onChange={(event) => setNewValue(event.target.value)} />
            </label>
            <label className="flex flex-col gap-2 text-sm text-text-secondary">
              Why is this correction needed?
              <Textarea
                value={justification}
                onChange={(event) => setJustification(event.target.value)}
              />
            </label>
            {requiresProof ? (
              <div className="space-y-3">
                <p className="text-sm text-warn-200">
                  This clinical or equipment update needs location-tagged proof from your facility.
                </p>
                <CameraCapture onUploaded={(media) => setProof((items) => [...items, media])} />
              </div>
            ) : null}
            {proof.length > 0 ? (
              <p className="text-sm text-trust-300">{proof.length} proof photo(s) attached.</p>
            ) : null}
            <Button type="submit" disabled={submitting || (requiresProof && proof.length === 0)}>
              {submitting ? "Submitting..." : "Submit update request"}
            </Button>
            {result ? (
              <p className="text-sm text-trust-300">
                Submitted request {result}. <Link href="/portal/dashboard">Return to dashboard</Link>
              </p>
            ) : null}
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
