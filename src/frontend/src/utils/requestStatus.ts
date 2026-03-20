import type { RequestStatus } from "../backend.d";

export type RequestStatusVariant = "pending" | "approved" | "denied";

export function getRequestStatusVariant(
  status: RequestStatus,
): RequestStatusVariant {
  if ("#pending" in status) return "pending";
  if ("#approved" in status) return "approved";
  return "denied";
}

export function isRequestPending(
  status: RequestStatus | null | undefined,
): boolean {
  if (!status) return false;
  return "#pending" in status;
}

export function isRequestApproved(
  status: RequestStatus | null | undefined,
): boolean {
  if (!status) return false;
  return "#approved" in status;
}

export function isRequestDenied(
  status: RequestStatus | null | undefined,
): boolean {
  if (!status) return false;
  return "#denied" in status;
}
