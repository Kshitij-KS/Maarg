"use client";

import Link from "next/link";
import { useCallback, useId, useState } from "react";
import { FileUp, Paperclip, Trash2, Building2, MapPin, UserCircle, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  assertProofFiles,
  FACILITY_TYPES,
  fingerprintFiles,
  PROOF_MAX_FILES,
  type RegistrationFormValues,
  registrationFormSchema,
} from "@/lib/portal-registration-schema";
import { submitRegistration } from "@/lib/portal-client";

const empty: RegistrationFormValues = {
  facility_name: "",
  facility_type: "",
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
  declaration_confirmed: false,
};

type FieldName = keyof RegistrationFormValues;
type ErrorMap = Partial<Record<FieldName | "proof" | "form", string>>;

function mapZodErrors(issue: { path: (string | number)[]; message: string }[]): ErrorMap {
  const m: ErrorMap = {};
  for (const e of issue) {
    const key = e.path[0];
    if (typeof key === "string" && key in empty) {
      m[key as FieldName] = e.message;
    }
  }
  return m;
}

export function OrganizationRegistrationForm() {
  const formId = useId();
  const [values, setValues] = useState<RegistrationFormValues>(empty);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<ErrorMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    registration_id: string;
    status: string;
    matched_facility_id?: string | null;
    match_confidence?: number | null;
  } | null>(null);

  const setField = <K extends FieldName>(key: K, v: RegistrationFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const addFiles = useCallback((list: File[]) => {
    if (list.length === 0) return;
    setFiles((prev) => [...prev, ...list].slice(0, PROOF_MAX_FILES));
    setErrors((p) => {
      const n = { ...p };
      delete n.proof;
      return n;
    });
  }, []);

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files ? Array.from(e.target.files) : [];
    addFiles(picked);
    e.target.value = "";
  };

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrors({});

    const proofErr = assertProofFiles(files);
    if (proofErr) {
      setErrors({ proof: proofErr });
      return;
    }

    const parsed = registrationFormSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(mapZodErrors(parsed.error.issues as { path: (string | number)[]; message: string }[]));
      return;
    }

    setLoading(true);
    try {
      const proof_documents = await fingerprintFiles(files);
      const payload = {
        ...parsed.data,
        official_website: parsed.data.official_website?.trim() || undefined,
        address_line2: parsed.data.address_line2?.trim() || undefined,
        proof_documents,
      };
      const res = await submitRegistration(payload);
      setResult({
        registration_id: res.registration_id,
        status: res.status,
        matched_facility_id: res.matched_facility_id ?? null,
        match_confidence: res.match_confidence ?? null,
      });
      setFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  const err = (name: FieldName | "proof") => errors[name];

  return (
    <form id={formId} className="flex flex-col gap-8" onSubmit={onSubmit} noValidate>
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-text-muted">Facility portal</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
          Organization onboarding
        </h1>
        <p className="mt-3 max-w-2xl text-text-secondary">
          Apply to join Maarg with verified contact details and supporting documents. Fields are
          validated before submit; each upload is checksummed for integrity (no raw file content is
          sent in this demo build).
        </p>
      </div>

      <Card className="border-border-default bg-surface-raised/30">
        <CardHeader>
          <div className="flex items-center gap-2 text-trust-600">
            <Building2 size={20} aria-hidden />
            <CardTitle>Organization</CardTitle>
          </div>
          <CardDescription>Legal and public-facing name as registered in India.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-text-primary" htmlFor={`${formId}-name`}>
              Facility name
            </label>
            <Input
              id={`${formId}-name`}
              className="mt-1.5"
              value={values.facility_name}
              onChange={(e) => setField("facility_name", e.target.value)}
              required
              maxLength={200}
              autoComplete="organization"
              aria-invalid={!!err("facility_name")}
            />
            {err("facility_name") ? <p className="mt-1 text-xs text-red-500">{err("facility_name")}</p> : null}
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary" htmlFor={`${formId}-type`}>
              Facility type
            </label>
            <select
              id={`${formId}-type`}
              className="mt-1.5 flex h-9 w-full rounded-lg border border-input bg-surface-raised px-2.5 text-sm text-text-primary outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
              value={values.facility_type}
              onChange={(e) => setField("facility_type", e.target.value)}
              aria-invalid={!!err("facility_type")}
            >
              <option value="" disabled>
                Select type
              </option>
              {FACILITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {err("facility_type") ? <p className="mt-1 text-xs text-red-500">{err("facility_type")}</p> : null}
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary" htmlFor={`${formId}-ophone`}>
              Main phone (board / reception)
            </label>
            <Input
              id={`${formId}-ophone`}
              className="mt-1.5"
              value={values.official_phone}
              onChange={(e) => setField("official_phone", e.target.value)}
              inputMode="tel"
              autoComplete="tel"
              placeholder="e.g. 011-XXXX or +91 11XXXXXXXX"
              aria-invalid={!!err("official_phone")}
            />
            {err("official_phone") ? <p className="mt-1 text-xs text-red-500">{err("official_phone")}</p> : null}
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary" htmlFor={`${formId}-oemail`}>
              Official email
            </label>
            <Input
              id={`${formId}-oemail`}
              type="email"
              className="mt-1.5"
              value={values.official_email}
              onChange={(e) => setField("official_email", e.target.value)}
              autoComplete="email"
              aria-invalid={!!err("official_email")}
            />
            {err("official_email") ? <p className="mt-1 text-xs text-red-500">{err("official_email")}</p> : null}
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-text-primary" htmlFor={`${formId}-web`}>
              Website (optional)
            </label>
            <Input
              id={`${formId}-web`}
              className="mt-1.5"
              value={values.official_website}
              onChange={(e) => setField("official_website", e.target.value)}
              inputMode="url"
              placeholder="https://"
              aria-invalid={!!err("official_website")}
            />
            {err("official_website") ? (
              <p className="mt-1 text-xs text-red-500">{err("official_website")}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border-default bg-surface-raised/30">
        <CardHeader>
          <div className="flex items-center gap-2 text-trust-600">
            <MapPin size={20} aria-hidden />
            <CardTitle>Address</CardTitle>
          </div>
          <CardDescription>Must match or overlap your registry / license address.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-text-primary" htmlFor={`${formId}-l1`}>
              Address line 1
            </label>
            <Textarea
              id={`${formId}-l1`}
              className="mt-1.5 min-h-[88px]"
              value={values.address_line1}
              onChange={(e) => setField("address_line1", e.target.value)}
              aria-invalid={!!err("address_line1")}
            />
            {err("address_line1") ? <p className="mt-1 text-xs text-red-500">{err("address_line1")}</p> : null}
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-text-primary" htmlFor={`${formId}-l2`}>
              Address line 2 (optional)
            </label>
            <Input
              id={`${formId}-l2`}
              className="mt-1.5"
              value={values.address_line2}
              onChange={(e) => setField("address_line2", e.target.value)}
            />
            {err("address_line2") ? <p className="mt-1 text-xs text-red-500">{err("address_line2")}</p> : null}
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary" htmlFor={`${formId}-city`}>
              City / district
            </label>
            <Input
              id={`${formId}-city`}
              className="mt-1.5"
              value={values.address_city}
              onChange={(e) => setField("address_city", e.target.value)}
              autoComplete="address-level2"
            />
            {err("address_city") ? <p className="mt-1 text-xs text-red-500">{err("address_city")}</p> : null}
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary" htmlFor={`${formId}-state`}>
              State / UT
            </label>
            <Input
              id={`${formId}-state`}
              className="mt-1.5"
              value={values.address_state_or_region}
              onChange={(e) => setField("address_state_or_region", e.target.value)}
            />
            {err("address_state_or_region") ? (
              <p className="mt-1 text-xs text-red-500">{err("address_state_or_region")}</p>
            ) : null}
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary" htmlFor={`${formId}-pin`}>
              PIN code
            </label>
            <Input
              id={`${formId}-pin`}
              className="mt-1.5 font-mono"
              value={values.address_zip_or_postcode}
              onChange={(e) => setField("address_zip_or_postcode", e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              autoComplete="postal-code"
            />
            {err("address_zip_or_postcode") ? (
              <p className="mt-1 text-xs text-red-500">{err("address_zip_or_postcode")}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border-default bg-surface-raised/30">
        <CardHeader>
          <div className="flex items-center gap-2 text-trust-600">
            <UserCircle size={20} aria-hidden />
            <CardTitle>Authorised contact</CardTitle>
          </div>
          <CardDescription>Person we can reach for portal access and verifications (mobile number).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-text-primary" htmlFor={`${formId}-cname`}>
              Full name
            </label>
            <Input
              id={`${formId}-cname`}
              className="mt-1.5"
              value={values.contact_person_name}
              onChange={(e) => setField("contact_person_name", e.target.value)}
              autoComplete="name"
            />
            {err("contact_person_name") ? (
              <p className="mt-1 text-xs text-red-500">{err("contact_person_name")}</p>
            ) : null}
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary" htmlFor={`${formId}-crole`}>
              Role
            </label>
            <Input
              id={`${formId}-crole`}
              className="mt-1.5"
              value={values.contact_person_role}
              onChange={(e) => setField("contact_person_role", e.target.value)}
              placeholder="e.g. Medical superintendent, Admin"
            />
            {err("contact_person_role") ? (
              <p className="mt-1 text-xs text-red-500">{err("contact_person_role")}</p>
            ) : null}
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary" htmlFor={`${formId}-cphone`}>
              Mobile
            </label>
            <Input
              id={`${formId}-cphone`}
              className="mt-1.5"
              value={values.contact_person_phone}
              onChange={(e) => setField("contact_person_phone", e.target.value)}
              inputMode="tel"
            />
            {err("contact_person_phone") ? (
              <p className="mt-1 text-xs text-red-500">{err("contact_person_phone")}</p>
            ) : null}
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary" htmlFor={`${formId}-cemail`}>
              Work email
            </label>
            <Input
              id={`${formId}-cemail`}
              type="email"
              className="mt-1.5"
              value={values.contact_person_email}
              onChange={(e) => setField("contact_person_email", e.target.value)}
              autoComplete="email"
            />
            {err("contact_person_email") ? (
              <p className="mt-1 text-xs text-red-500">{err("contact_person_email")}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border-default bg-surface-raised/30">
        <CardHeader>
          <div className="flex items-center gap-2 text-trust-600">
            <Shield size={20} aria-hidden />
            <CardTitle>Supporting documents</CardTitle>
          </div>
          <CardDescription>
            At least one file (PDF, PNG, JPG, WebP, max {PROOF_MAX_FILES} files, 5 MB each). Examples:
            clinical establishment registration, NABH / state license, or board resolution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border-subtle bg-surface-base/30 px-4 py-6 text-center transition-colors hover:border-trust-400/30"
            role="group"
            aria-label="Document uploads"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const list = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
              addFiles(list);
            }}
          >
            <FileUp className="text-text-muted" size={28} aria-hidden />
            <div>
              <label className="cursor-pointer text-sm font-medium text-trust-600">
                <input
                  type="file"
                  className="sr-only"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                  multiple
                  onChange={onFilePick}
                />
                <span>Choose files</span>
              </label>
              <span className="text-sm text-text-secondary"> or drag and drop into this area</span>
            </div>
            <p className="text-xs text-text-muted">
              We store SHA-256 fingerprints and file metadata, not file contents, in this environment.
            </p>
          </div>
          {err("proof") ? <p className="text-sm text-red-500">{err("proof")}</p> : null}
          {files.length > 0 ? (
            <ul className="space-y-2">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${f.size}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface-elevated/40 px-3 py-2 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Paperclip size={16} className="shrink-0 text-text-muted" aria-hidden />
                    <span className="truncate font-mono text-xs text-text-primary">{f.name}</span>
                    <span className="shrink-0 text-text-muted">({(f.size / 1024).toFixed(1)} KB)</span>
                  </span>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => removeFile(i)}
                    aria-label={`Remove ${f.name}`}
                  >
                    <Trash2 size={16} />
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <label className="flex items-start gap-3 rounded-2xl border border-border-subtle bg-surface-base/20 p-4 text-sm text-text-secondary">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-border-default"
          checked={values.declaration_confirmed}
          onChange={(e) => setField("declaration_confirmed", e.target.checked)}
        />
        <span>
          I confirm I am authorized to represent this organization and that the information provided is
          accurate to the best of my knowledge.
        </span>
      </label>
      {err("declaration_confirmed") ? (
        <p className="text-xs text-red-500">{err("declaration_confirmed")}</p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" disabled={loading} className="h-10 min-w-[200px] rounded-full">
          {loading ? "Submitting…" : "Submit application"}
        </Button>
        {result ? (
          <div className="text-sm text-text-secondary">
            <span className="text-success-600">Submitted. </span>
            <Link className="font-medium text-trust-600 underline" href={`/portal/register/status/${result.registration_id}`}>
              Track status: {result.registration_id}
            </Link>
            {result.matched_facility_id != null ? (
              <span className="mt-1 block text-xs text-text-muted">
                Matched reference facility: {result.matched_facility_id}
                {result.match_confidence != null
                  ? ` (confidence ${(result.match_confidence * 100).toFixed(0)}%)`
                  : ""}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </form>
  );
}
