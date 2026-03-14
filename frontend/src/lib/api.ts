import type { ApiErrorResponse, ApiResponse } from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiRequestError extends Error {
  status: number;
  payload?: Partial<ApiErrorResponse>;

  /**
   * Create a typed API request error with HTTP status context.
   * @param {number} status HTTP status code from fetch response.
   * @param {string} message Error message used by UI boundary.
   * @param {Partial<ApiErrorResponse> | undefined} payload Optional backend error payload.
   */
  constructor(status: number, message: string, payload?: Partial<ApiErrorResponse>) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.payload = payload;
  }
}

/**
 * Build absolute API URL with optional query parameters.
 * @param {string} path API path with leading slash.
 * @param {Record<string, string | number | undefined>} [params] Query params map.
 * @returns {string} Fully-qualified request URL.
 */
function buildApiUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(`${API_BASE_URL}${path}`);

  if (!params) {
    return url.toString();
  }

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function readJsonBody<T>(response: Response): Promise<T | undefined> {
  const rawBody = await response.text();
  if (!rawBody.trim()) {
    return undefined;
  }

  return JSON.parse(rawBody) as T;
}

async function buildRequestInit(init: RequestInit): Promise<RequestInit> {
  if (typeof window !== "undefined") {
    return { ...init, credentials: "include" };
  }

  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((item) => `${item.name}=${item.value}`)
      .join("; ");

    return {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {})
      },
      credentials: "include"
    };
  } catch {
    return { ...init, credentials: "include" };
  }
}

/**
 * Execute GET request to backend API.
 * @template T Type of response data payload.
 * @param {string} path API path with leading slash.
 * @param {Record<string, string | number | undefined>} [params] Query params map.
 * @returns {Promise<ApiResponse<T>>} Parsed API response payload.
 */
export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<ApiResponse<T>> {
  const response = await fetch(buildApiUrl(path, params), await buildRequestInit({
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    cache: "no-store"
  }));

  if (!response.ok) {
    let payload: Partial<ApiErrorResponse> | undefined;
    try {
      payload = await readJsonBody<Partial<ApiErrorResponse>>(response);
    } catch {
      payload = undefined;
    }

    throw new ApiRequestError(
      response.status,
      payload?.message ?? `Request failed with status ${response.status}`,
      payload
    );
  }

  const payload = await readJsonBody<ApiResponse<T>>(response);
  if (!payload) {
    throw new ApiRequestError(response.status, "Response body was empty");
  }

  return payload;
}

export async function apiPost<T, B>(path: string, body: B): Promise<ApiResponse<T>> {
  const response = await fetch(buildApiUrl(path), await buildRequestInit({
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    cache: "no-store"
  }));

  if (!response.ok) {
    throw new ApiRequestError(response.status, `Request failed with status ${response.status}`);
  }

  const payload = await readJsonBody<ApiResponse<T>>(response);
  if (!payload) {
    throw new ApiRequestError(response.status, "Response body was empty");
  }

  return payload;
}

export async function apiDelete<T>(path: string): Promise<ApiResponse<T>> {
  const response = await fetch(buildApiUrl(path), await buildRequestInit({
    method: "DELETE",
    headers: {
      Accept: "application/json"
    },
    cache: "no-store"
  }));

  if (!response.ok) {
    throw new ApiRequestError(response.status, `Request failed with status ${response.status}`);
  }

  const payload = await readJsonBody<ApiResponse<T>>(response);
  if (!payload) {
    throw new ApiRequestError(response.status, "Response body was empty");
  }

  return payload;
}
