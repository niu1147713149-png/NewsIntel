import { ApiRequestError, apiGet } from "@/lib/api";
import type { AuthUser } from "@/types/auth";

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await apiGet<AuthUser>("/api/v1/auth/me");
    return response.data;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      return null;
    }
    return null;
  }
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiRequestError && error.status === 401;
}
