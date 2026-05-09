import { requestAuthChallenge, verifyAuthChallenge } from "@tirai/api";
import { tiraiServices } from "@/config";
import { safeAdapter } from "@/lib/errors";
import type {
  AppError,
  AuthChallenge,
  AuthSession,
  Result,
  VerifyAuthInput,
} from "@/types/api";

export async function requestAuthChallengeAdapter(): Promise<
  Result<AuthChallenge, AppError>
> {
  return safeAdapter(() =>
    requestAuthChallenge({ authVerifierUrl: tiraiServices.authVerifierUrl }),
  );
}

export async function verifyAuthChallengeAdapter(
  input: VerifyAuthInput,
): Promise<Result<AuthSession, AppError>> {
  return safeAdapter(() =>
    verifyAuthChallenge(input, {
      authVerifierUrl: tiraiServices.authVerifierUrl,
    }),
  );
}
