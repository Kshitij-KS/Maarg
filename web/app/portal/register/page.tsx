"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { submitRegistration } from "@/lib/portal-client";

const initialForm = {
  facility_name: "",
  facility_type: "Private Hospital",
  official_phone: "",
  official_email: "",
  official_website: "",
  address_line1: "",
  address_line2: "",
  address_city: "",
  address_state_or_region: "",
  address_zip_or_postcode: "",
  contact_person_name: "",
  contact_person_role: "",
  contact_person_phone: "",
  contact_person_email: "",
  proof_documents: "",
  declaration_confirmed: false,
};

export default function RegisterPage() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState<{ registration_id: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await submitRegistration({
        ...form,
        proof_documents: form.proof_documents
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  const setValue = (name: keyof typeof form, value: string | boolean) =>
    setForm((current) => ({ ...current, [name]: value }));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-text-muted">Facility Portal</p>
        <h1 className="mt-3 text-4xl font-semibold text-text-primary">Register your facility</h1>
        <p className="mt-3 max-w-2xl text-text-secondary">
          Apply for access to see the same trust data our healthcare reasoning agents use.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Application Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            {Object.entries(form)
              .filter(([key]) => key !== "declaration_confirmed")
              .map(([key, value]) => (
                <label key={key} className="flex flex-col gap-2 text-sm text-text-secondary">
                  {key.replaceAll("_", " ")}
                  <Input
                    value={String(value)}
                    required={!["official_website", "address_line2"].includes(key)}
                    onChange={(event) => setValue(key as keyof typeof form, event.target.value)}
                  />
                </label>
              ))}
            <label className="flex items-center gap-3 text-sm text-text-secondary md:col-span-2">
              <input
                type="checkbox"
                checked={form.declaration_confirmed}
                onChange={(event) => setValue("declaration_confirmed", event.target.checked)}
              />
              I confirm that I am authorized to represent this facility.
            </label>
            <div className="flex items-center gap-3 md:col-span-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Submitting..." : "Submit registration"}
              </Button>
              {result ? (
                <Link
                  className="text-sm text-trust-300 underline"
                  href={`/portal/register/status/${result.registration_id}`}
                >
                  View status for {result.registration_id}
                </Link>
              ) : null}
            </div>
            {error ? <p className="text-sm text-red-400 md:col-span-2">{error}</p> : null}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
