import { RequestStatus } from "../backend.d";

export type RequestStatusVariant = "pending" | "approved" | "denied";

export function getRequestStatusVariant(
  status: RequestStatus,
): RequestStatusVariant {
  if (status === RequestStatus.pending) return "pending";
  if (status === RequestStatus.approved) return "approved";
  return "denied";
}

export function isRequestPending(
  status: RequestStatus | null | undefined,
): boolean {
  if (!status) return false;
  return status === RequestStatus.pending;
}

export function isRequestApproved(
  status: RequestStatus | null | undefined,
): boolean {
  if (!status) return false;
  return status === RequestStatus.approved;
}

export function isRequestDenied(
  status: RequestStatus | null | undefined,
): boolean {
  if (!status) return false;
  return status === RequestStatus.denied;
}
