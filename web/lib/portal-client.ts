"use client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const TOKEN_KEY = "facility_portal_token";

export type RegistrationPayload = {
  facility_name: string;
  facility_type: string;
  official_phone: string;
  official_email: string;
  official_website?: string;
  address_line1: string;
  address_line2?: string;
  address_city: string;
  address_state_or_region: string;
  address_zip_or_postcode: string;
  contact_person_name: string;
  contact_person_role: string;
  contact_person_phone: string;
  contact_person_email: string;
  proof_documents: string[];
  declaration_confirmed: boolean;
};

export type PortalToken = {
  access_token: string;
  token_type: string;
  expires_in_seconds: number;
  facility_id: string;
  user_id: string;
  role: string;
};

export type Dashboard = {
  facility_id: string;
  facility_name: string;
  pin_code: string;
  state: string;
  district: string;
  facility_type: string;
  last_updated: string;
  trust_score_percent: number;
  capabilities: Array<{
    capability: string;
    label: string;
    trust_score_percent: number;
    claim_present: boolean;
    status_label: string;
    explanation: string;
    citation_sentence?: string | null;
    flags: string[];
    plain_english_flags: string[];
  }>;
  update_requests: UpdateRequest[];
  improvement_suggestions: Array<{
    severity: "high" | "medium" | "low";
    title: string;
    description: string;
    field_name?: string | null;
  }>;
};

export type UpdateRequest = {
  request_id: string;
  facility_id: string;
  field_name: string;
  field_category: string;
  new_value: string;
  justification: string;
  requires_proof: boolean;
  proof_media_ids: string[];
  status: string;
  reviewer_notes?: string | null;
  submitted_at: string;
};

export type ProofMedia = {
  media_id: string;
  storage_path: string;
  original_filename: string;
  location_lat?: number | null;
  location_lon?: number | null;
  location_accuracy_m?: number | null;
};

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // Keep the HTTP status when the response is not JSON.
    }
    throw new Error(detail);
  }
  return (await response.json()) as T;
}

function authHeaders(): HeadersInit {
  const token = typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY);
  return token ? { authorization: `Bearer ${token}` } : {};
}

export function savePortalToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export async function submitRegistration(payload: RegistrationPayload) {
  const response = await fetch(`${API_BASE_URL}/portal/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson<{ registration_id: string; status: string; matched_facility_id?: string | null }>(
    response,
  );
}

export async function getRegistration(registrationId: string) {
  const response = await fetch(`${API_BASE_URL}/portal/register/${registrationId}`);
  return parseJson<Record<string, unknown>>(response);
}

export async function login(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/portal/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const token = await parseJson<PortalToken>(response);
  savePortalToken(token.access_token);
  return token;
}

export async function getDashboard() {
  const response = await fetch(`${API_BASE_URL}/portal/facility/me`, {
    headers: authHeaders(),
  });
  return parseJson<Dashboard>(response);
}

export async function submitUpdate(payload: {
  field_name: string;
  new_value: unknown;
  justification: string;
  proof_media_ids: string[];
}) {
  const response = await fetch(`${API_BASE_URL}/portal/updates`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return parseJson<UpdateRequest>(response);
}

export async function uploadProof(payload: {
  file: File;
  location_lat: number;
  location_lon: number;
  location_accuracy_m: number;
  location_captured_at: string;
}) {
  const formData = new FormData();
  formData.set("file", payload.file);
  formData.set("location_lat", String(payload.location_lat));
  formData.set("location_lon", String(payload.location_lon));
  formData.set("location_accuracy_m", String(payload.location_accuracy_m));
  formData.set("location_captured_at", payload.location_captured_at);
  const response = await fetch(`${API_BASE_URL}/portal/proof/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  return parseJson<ProofMedia>(response);
}

export async function adminListRegistrations(adminToken: string) {
  const response = await fetch(`${API_BASE_URL}/portal/admin/registrations`, {
    headers: { authorization: `Bearer ${adminToken}` },
  });
  return parseJson<Array<Record<string, unknown>>>(response);
}

export async function adminListUpdates(adminToken: string) {
  const response = await fetch(`${API_BASE_URL}/portal/admin/updates`, {
    headers: { authorization: `Bearer ${adminToken}` },
  });
  return parseJson<UpdateRequest[]>(response);
}

export async function adminReviewRegistration(
  adminToken: string,
  registrationId: string,
  payload: { status: string; matched_facility_id?: string; reviewer_notes?: string },
) {
  const response = await fetch(`${API_BASE_URL}/portal/admin/registrations/${registrationId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(payload),
  });
  return parseJson<Record<string, unknown>>(response);
}

export async function adminReviewUpdate(
  adminToken: string,
  requestId: string,
  payload: { status: string; reviewer_notes?: string; proof_verified: boolean },
) {
  const response = await fetch(`${API_BASE_URL}/portal/admin/updates/${requestId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(payload),
  });
  return parseJson<UpdateRequest>(response);
}
