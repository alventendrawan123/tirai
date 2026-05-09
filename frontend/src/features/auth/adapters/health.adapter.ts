import { tiraiServices } from "@/config";
import { safeAdapter } from "@/lib/errors";
import type { AppError, Result } from "@/types/api";

export interface AuthServerHealth {
  status: string;
  challenges: number;
}

export async function getAuthServerHealthAdapter(): Promise<
  Result<AuthServerHealth, AppError>
> {
  return safeAdapter(async () => {
    let response: Response;
    try {
      response = await fetch(`${tiraiServices.authVerifierUrl}/health`, {
        method: "GET",
        cache: "no-store",
      });
    } catch (error) {
      return {
        ok: false,
        error: {
          kind: "RPC",
          message: `Auth server unreachable: ${error instanceof Error ? error.message : String(error)}`,
          retryable: true,
        },
      };
    }
    if (!response.ok) {
      return {
        ok: false,
        error: {
          kind: "RPC",
          message: `Auth server health returned ${response.status}`,
          retryable: response.status >= 500,
        },
      };
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return {
        ok: false,
        error: {
          kind: "UNKNOWN",
          message: "Auth server health returned invalid JSON",
        },
      };
    }
    if (typeof body !== "object" || body === null) {
      return {
        ok: false,
        error: {
          kind: "UNKNOWN",
          message: "Auth server health response missing fields",
        },
      };
    }
    const obj = body as Record<string, unknown>;
    const status = typeof obj.status === "string" ? obj.status : "unknown";
    const challenges = typeof obj.challenges === "number" ? obj.challenges : 0;
    return { ok: true, value: { status, challenges } };
  });
}
