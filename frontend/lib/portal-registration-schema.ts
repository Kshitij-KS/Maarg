import { z } from "zod";

/** Digits-only length check after stripping non-digits. */
function countDigits(s: string): string {
  return s.replace(/\D/g, "");
}

/** Primary switchboard: 10–12 digit Indian numbers (landline or mobile). */
const IN_PHONE_RELAXED = z
  .string()
  .min(1, "Required")
  .refine((s) => {
    const d = countDigits(s);
    return d.length >= 10 && d.length <= 12;
  }, "Use a valid phone: at least 10 digits (e.g. board line or mobile)")

function normalizeMobileDigits(s: string): string {
  let t = s.replace(/\s/g, "");
  if (t.startsWith("+91")) t = t.slice(3);
  else if (t.length === 12 && t.startsWith("91")) t = t.slice(2);
  return t;
}

/** Authorised signatory: 10-digit Indian mobile (6–9 leading). */
const IN_MOBILE = z
  .string()
  .min(1, "Required")
  .refine((s) => {
    const t = normalizeMobileDigits(s);
    return /^[6-9]\d{9}$/.test(t);
  }, "Use a 10-digit mobile (e.g. 98XXXXXXXX or +91 98XXXXXXXX), starting 6–9");

const IN_PIN = z
  .string()
  .min(1, "Required")
  .refine((s) => /^\d{6}$/.test(s.trim()), "PIN must be exactly 6 digits");

/**
 * Public registration form values (before optional website normalize).
 */
export const registrationFormSchema = z
  .object({
    facility_name: z
      .string()
      .min(2, "Facility name is too short")
      .max(200, "Facility name is too long"),
    facility_type: z.string().min(1, "Select a facility type"),
    official_phone: IN_PHONE_RELAXED,
    official_email: z.string().min(1, "Required").email("Invalid email"),
    official_website: z.string().optional().default(""),
    address_line1: z
      .string()
      .min(5, "Address line 1 is required (at least 5 characters)")
      .max(300),
    address_line2: z.string().max(200).optional().default(""),
    address_city: z.string().min(2, "City is required").max(100),
    address_state_or_region: z.string().min(2, "State / UT is required").max(100),
    address_zip_or_postcode: IN_PIN,
    contact_person_name: z.string().min(2, "Contact name is required").max(120),
    contact_person_role: z.string().min(2, "Role / title is required").max(100),
    contact_person_phone: IN_MOBILE,
    contact_person_email: z.string().min(1, "Required").email("Invalid email"),
    declaration_confirmed: z.boolean().refine((v) => v === true, {
      message: "You must confirm you are authorized to represent this organization",
    }),
  })
  .superRefine((data, ctx) => {
    if (data.official_website && data.official_website.trim()) {
      const u = data.official_website.trim();
      if (!z.string().url().safeParse(u).success) {
        ctx.addIssue({
          code: "custom",
          path: ["official_website"],
          message: "Enter a valid URL (https://...)",
        });
      }
    }
  });

export type RegistrationFormValues = z.infer<typeof registrationFormSchema>;

export const FACILITY_TYPES = [
  "Private Hospital",
  "Government / District Hospital",
  "Community Health Centre (CHC)",
  "Primary Health Centre (PHC)",
  "Multi-speciality clinic",
  "Single-doctor / nursing home",
  "Diagnostic & imaging centre",
  "Other",
] as const;

export const PROOF_MAX_FILES = 5;
export const PROOF_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const PROOF_ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

export function assertProofFiles(files: File[]): string | null {
  if (files.length < 1) {
    return "Upload at least one document (e.g. registration certificate, NABH, or board license).";
  }
  if (files.length > PROOF_MAX_FILES) {
    return `You can upload at most ${PROOF_MAX_FILES} files.`;
  }
  for (const f of files) {
    if (f.size > PROOF_MAX_BYTES) {
      return `“${f.name}” is too large. Max size per file is 5 MB.`;
    }
    const type = f.type || "";
    const ext = f.name.toLowerCase();
    const extOk = /\.(pdf|png|jpe?g|webp)$/.test(ext);
    const mimeOk = type === "" ? extOk : PROOF_ALLOWED_MIME.has(type);
    if (!mimeOk && !extOk) {
      return `“${f.name}” is not an allowed type. Use PDF, PNG, JPG, or WebP.`;
    }
  }
  return null;
}

/**
 * Fingerprint for backend `proof_documents` (compact, no raw file bytes).
 */
export async function fingerprintFiles(files: File[]): Promise<string[]> {
  const out: string[] = [];
  for (const file of files) {
    const buf = await file.arrayBuffer();
    const hash = await crypto.subtle.digest("SHA-256", buf);
    const hex = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const safeName = file.name.replace(/[|]/g, "-");
    out.push(
      `doc|${safeName}|${file.type || "application/octet-stream"}|${file.size}|sha256=${hex.slice(0, 24)}`,
    );
  }
  return out;
}
