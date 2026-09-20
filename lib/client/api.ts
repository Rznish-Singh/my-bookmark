/** Browser-side fetch helper: JSON in/out, friendly errors. */
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public data?: Record<string, unknown>) {
    super(message);
  }
}

export async function api<T>(path: string, init?: Omit<RequestInit, "body"> & { body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { ...(init?.body !== undefined ? { "content-type": "application/json" } : {}), ...init?.headers },
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "network", "Can't reach the server. Check your connection and try again.");
  }
  if (res.ok) return (await res.json()) as T;
  let body: { error?: { code?: string; message?: string } & Record<string, unknown> } = {};
  try {
    body = await res.json();
  } catch {
    /* non-JSON error */
  }
  // Full reload on purpose: clears any stale client state after the session expires.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  if (res.status === 401 && typeof window !== "undefined") window.location.href = "/login";
  throw new ApiError(res.status, body.error?.code ?? "error", body.error?.message ?? "Something went wrong. Please try again.", body.error);
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");
