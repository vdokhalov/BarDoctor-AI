import type { AccessRole } from "./access-control";

export type AuthBootstrapState = "ready" | "onboarding_required" | "recovery_required";

export type AuthBootstrapClassification = {
  state: AuthBootstrapState;
  reason:
    | "active_venue_ready"
    | "primary_venue_profile_required"
    | "active_venue_profile_unavailable"
    | "confirmed_owner_venue_inactive"
    | "new_owner_without_venue"
    | "membership_required";
};

export function classifyAuthBootstrap(input: {
  ownsVenue: boolean;
  activeVenue: null | { role: AccessRole; isPrimary: boolean; hasProfile: boolean };
  confirmedOwnedVenueStatuses: string[];
}): AuthBootstrapClassification {
  if (input.activeVenue?.hasProfile) {
    return { state: "ready", reason: "active_venue_ready" };
  }
  if (input.activeVenue) {
    return input.activeVenue.isPrimary && input.activeVenue.role === "owner"
      ? { state: "onboarding_required", reason: "primary_venue_profile_required" }
      : { state: "recovery_required", reason: "active_venue_profile_unavailable" };
  }
  if (input.confirmedOwnedVenueStatuses.length > 0) {
    return { state: "recovery_required", reason: "confirmed_owner_venue_inactive" };
  }
  return input.ownsVenue
    ? { state: "onboarding_required", reason: "new_owner_without_venue" }
    : { state: "recovery_required", reason: "membership_required" };
}
