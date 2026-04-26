import { describe, expect, it } from "vitest";

import {
  assertProofFiles,
  registrationFormSchema,
} from "@/lib/portal-registration-schema";

const validBase = {
  facility_name: "Test Hospital",
  facility_type: "Private Hospital",
  official_phone: "011-41234567",
  official_email: "info@test.org",
  official_website: "",
  address_line1: "123 Main Road, Sector 4",
  address_line2: "",
  address_city: "Patna",
  address_state_or_region: "Bihar",
  address_zip_or_postcode: "800001",
  contact_person_name: "Dr. Example",
  contact_person_role: "Admin",
  contact_person_phone: "9876543210",
  contact_person_email: "contact@test.org",
  declaration_confirmed: true,
};

describe("registrationFormSchema", () => {
  it("accepts a complete valid payload", () => {
    const r = registrationFormSchema.safeParse(validBase);
    expect(r.success).toBe(true);
  });

  it("rejects invalid PIN", () => {
    const r = registrationFormSchema.safeParse({
      ...validBase,
      address_zip_or_postcode: "80001",
    });
    expect(r.success).toBe(false);
  });

  it("rejects invalid contact mobile", () => {
    const r = registrationFormSchema.safeParse({
      ...validBase,
      contact_person_phone: "12345",
    });
    expect(r.success).toBe(false);
  });

  it("rejects missing declaration", () => {
    const r = registrationFormSchema.safeParse({
      ...validBase,
      declaration_confirmed: false,
    });
    expect(r.success).toBe(false);
  });
});

describe("assertProofFiles", () => {
  it("requires at least one file", () => {
    expect(assertProofFiles([])).toBeTruthy();
  });
});
