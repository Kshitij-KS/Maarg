export type ContactInfo = {
  phone: string;
  emergency: string;
  address: string;
  directions_url: string;
  email?: string;
  website?: string;
  operating_hours?: string;
  ambulance?: string;
};

export const FACILITY_CONTACTS: Record<string, ContactInfo> = {
  F00001: {
    phone: "+91-6476-222-301",
    emergency: "112",
    ambulance: "+91-6476-222-108",
    address: "Civil Lines, Madhepura, Bihar 852113",
    directions_url: "https://maps.google.com/?q=25.921,86.792",
    email: "madhepura.dh@bihar.gov.in",
    website: "https://health.bihar.gov.in",
    operating_hours: "24 × 7 (Emergency & OPD Mon–Sat 8am–2pm)",
  },
  F00002: {
    phone: "+91-6478-234-500",
    emergency: "112",
    ambulance: "+91-6478-234-108",
    address: "Station Road, Saharsa, Bihar 852201",
    directions_url: "https://maps.google.com/?q=25.883,86.597",
    email: "info@saharsamedical.in",
    operating_hours: "24 × 7 (Emergency) · OPD 9am–5pm",
  },
  F00003: {
    phone: "+91-6454-255-800",
    emergency: "112",
    ambulance: "+91-6454-255-108",
    address: "NH-31, Purnea, Bihar 854301",
    directions_url: "https://maps.google.com/?q=25.777,87.475",
    email: "purneacityhospital@gmail.com",
    operating_hours: "24 × 7",
  },
  F00042: {
    phone: "+91-6476-231-042",
    emergency: "112",
    address: "Kosi Nagar, Madhepura, Bihar 852113",
    directions_url: "https://maps.google.com/?q=25.913,86.806",
    email: "kosi.dialysis@gmail.com",
    operating_hours: "Mon–Sat 7am–7pm (Dialysis by appointment)",
  },
  F00099: {
    phone: "+91-6476-240-099",
    emergency: "112",
    address: "Singheshwar, Madhepura, Bihar 852128",
    directions_url: "https://maps.google.com/?q=26.032,86.755",
    operating_hours: "Mon–Sat 9am–3pm",
  },
};

export function getContact(facilityId: string): ContactInfo | null {
  return FACILITY_CONTACTS[facilityId] ?? null;
}
