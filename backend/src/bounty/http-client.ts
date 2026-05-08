// Shared HTTP wrapper for auth-server requests. Handles error mapping
// to AppError consistently.

import { err, ok } from "../lib/result";
import type { Result } from "../types/api";
import type { AppError } from "../types/errors";

export interface AuthServerRequestOptions {
  method: "POST" | "PATCH" | "GET";
  url: string;
  jwt: string;
  body?: unknown;
}

export async function callAuthServer<T>(
  opts: AuthServerRequestOptions,
): Promise<Result<T, AppError>> {
  let response: Response;
  try {
    response = await fetch(opts.url, {
      method: opts.method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.jwt}`,
      },
      ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
    });
  } catch (error) {
    return err({
      kind: "RPC",
      message: `Auth server unreachable: ${error instanceof Error ? error.message : String(error)}`,
      retryable: true,
    });
  }

  if (!response.ok) {
    let message = `Auth server returned ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore parse error
    }
    if (response.status === 401) {
      return err({
        kind: "INVALID_INPUT",
        field: "jwt",
        message: "JWT invalid or expired — re-authenticate",
      });
    }
    if (response.status === 403) {
      return err({
        kind: "INVALID_INPUT",
        field: "owner",
        message,
      });
    }
    if (response.status === 400) {
      return err({ kind: "INVALID_INPUT", field: "input", message });
    }
    if (response.status === 404) {
      return err({ kind: "INVALID_INPUT", field: "id", message: "not found" });
    }
    return err({
      kind: "RPC",
      message,
      retryable: response.status >= 500,
    });
  }

  let json: T;
  try {
    json = (await response.json()) as T;
  } catch {
    return err({
      kind: "UNKNOWN",
      message: "auth server returned invalid JSON",
    });
  }
  return ok(json);
}
