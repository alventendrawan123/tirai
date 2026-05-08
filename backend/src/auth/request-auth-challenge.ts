import type { AuthChallenge, AuthContext } from "../bounty/types";
import { err, ok } from "../lib/result";
import type { Result } from "../types/api";
import type { AppError } from "../types/errors";

interface ChallengeResponse {
  challenge: string;
  expiresAt: number;
}

export async function requestAuthChallenge(
  ctx: AuthContext,
): Promise<Result<AuthChallenge, AppError>> {
  let response: Response;
  try {
    response = await fetch(`${ctx.authVerifierUrl}/auth/challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return err({
      kind: "RPC",
      message: `Auth verifier unreachable: ${error instanceof Error ? error.message : String(error)}`,
      retryable: true,
    });
  }

  if (!response.ok) {
    return err({
      kind: "RPC",
      message: `Auth verifier returned ${response.status}`,
      retryable: response.status >= 500,
    });
  }

  let body: ChallengeResponse;
  try {
    body = (await response.json()) as ChallengeResponse;
  } catch {
    return err({
      kind: "UNKNOWN",
      message: "Auth verifier returned invalid JSON",
    });
  }

  if (
    typeof body.challenge !== "string" ||
    typeof body.expiresAt !== "number"
  ) {
    return err({
      kind: "UNKNOWN",
      message: "Auth verifier response missing fields",
    });
  }

  return ok({ challenge: body.challenge, expiresAt: body.expiresAt });
}
