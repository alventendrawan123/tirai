import type {
  AuthContext,
  AuthSession,
  VerifyAuthInput,
} from "../bounty/types";
import { err, ok } from "../lib/result";
import type { Result } from "../types/api";
import type { AppError } from "../types/errors";
import { extractJwtExp, extractJwtSub } from "./jwt";

interface VerifyResponse {
  jwt: string;
}

export async function verifyAuthChallenge(
  input: VerifyAuthInput,
  ctx: AuthContext,
): Promise<Result<AuthSession, AppError>> {
  if (input.walletPubkey.length === 0) {
    return err({
      kind: "INVALID_INPUT",
      field: "walletPubkey",
      message: "Wallet pubkey required",
    });
  }
  if (input.signature.length === 0) {
    return err({
      kind: "INVALID_INPUT",
      field: "signature",
      message: "Signature required",
    });
  }
  if (input.challenge.length === 0) {
    return err({
      kind: "INVALID_INPUT",
      field: "challenge",
      message: "Challenge required",
    });
  }

  let response: Response;
  try {
    response = await fetch(`${ctx.authVerifierUrl}/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walletPubkey: input.walletPubkey,
        signature: input.signature,
        challenge: input.challenge,
      }),
    });
  } catch (error) {
    return err({
      kind: "RPC",
      message: `Auth verifier unreachable: ${error instanceof Error ? error.message : String(error)}`,
      retryable: true,
    });
  }

  if (response.status === 401) {
    return err({
      kind: "INVALID_INPUT",
      field: "signature",
      message: "Invalid signature",
    });
  }
  if (!response.ok) {
    return err({
      kind: "RPC",
      message: `Auth verifier returned ${response.status}`,
      retryable: response.status >= 500,
    });
  }

  let body: VerifyResponse;
  try {
    body = (await response.json()) as VerifyResponse;
  } catch {
    return err({
      kind: "UNKNOWN",
      message: "Auth verifier returned invalid JSON",
    });
  }

  if (typeof body.jwt !== "string" || body.jwt.length === 0) {
    return err({
      kind: "UNKNOWN",
      message: "Auth verifier did not return JWT",
    });
  }

  const sub = extractJwtSub(body.jwt);
  const exp = extractJwtExp(body.jwt);
  if (sub === null || exp === null) {
    return err({
      kind: "UNKNOWN",
      message: "JWT payload malformed",
    });
  }

  return ok({
    jwt: body.jwt,
    walletPubkey: sub,
    expiresAt: exp,
  });
}
