import { normalizeAccountingCurrency } from "./currency";

export type VenueProfile = {
  name: string;
  businessType: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
  address: string;
  district: string;
  currency: string;
  venueFormat: string;
  seats: number;
  employees: number;
  openTime: string;
  closeTime: string;
  areas: unknown[];
  competitors: unknown[];
  logoId: string | null;
  workingDays?: Record<string, unknown>;
};

function text(value: unknown, maxLength = 180): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function positiveNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function imageId(value: unknown): string | null {
  return typeof value === "string" && /^[a-zA-Z0-9-]{20,80}$/.test(value)
    ? value
    : null;
}

export function venueProfileFromInput(body: Record<string, unknown>): VenueProfile {
  return {
    name: text(body.name, 120),
    businessType: text(body.businessType, 80),
    country: text(body.country, 80),
    countryCode: text(body.countryCode, 8),
    region: text(body.region, 100),
    city: text(body.city, 100),
    address: text(body.address, 180),
    district: text(body.district, 100),
    currency: normalizeAccountingCurrency(body.currency) ?? "",
    venueFormat: text(body.venueFormat, 160),
    seats: positiveNumber(body.seats),
    employees: positiveNumber(body.employees),
    openTime: text(body.openTime, 5) || "10:00",
    closeTime: text(body.closeTime, 5) || "23:00",
    areas: Array.isArray(body.areas) ? body.areas : [],
    competitors: Array.isArray(body.competitors) ? body.competitors : [],
    logoId: imageId(body.logoId),
    workingDays:
      body.workingDays && typeof body.workingDays === "object" && !Array.isArray(body.workingDays)
        ? body.workingDays as Record<string, unknown>
        : undefined,
  };
}
