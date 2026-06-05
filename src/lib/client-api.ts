type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  message?: string;
  code?: string;
};

export async function parseApiResponse<T>(res: Response): Promise<ApiResponse<T>> {
  const text = await res.text();
  if (!text.trim()) {
    return {
      ok: false,
      message:
        res.status >= 500
          ? "Server error while processing your request. Please try again."
          : "Empty response from server.",
    };
  }
  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    return {
      ok: false,
      message: text.slice(0, 240) || "Invalid response from server.",
    };
  }
}

/** True when the server returned `{ ok: true, data }` — use instead of `res.ok` when delivery status lives in `data`. */
export function isApiSuccess<T>(payload: ApiResponse<T>): payload is ApiResponse<T> & { ok: true; data: T } {
  return payload.ok === true;
}

export function getFriendlyApiMessage(payload: { message?: string; code?: string }, fallback: string) {
  if (payload.code === "CONFIG") {
    return payload.message ?? "Application is not configured. Check .env.local.";
  }
  if (payload.code === "DB_UNAVAILABLE") {
    return payload.message ?? "Database is unavailable. Try again later.";
  }
  return payload.message ?? fallback;
}
