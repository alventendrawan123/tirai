"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  requestAuthChallengeAdapter,
  verifyAuthChallengeAdapter,
} from "@/features/auth/adapters";
import type { AppError, AuthSession, Result } from "@/types/api";

interface AuthContextValue {
  session: AuthSession | null;
  isAuthenticating: boolean;
  signIn(): Promise<Result<AuthSession, AppError>>;
  signOut(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const wallet = useWallet();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (!session) return;
    const remainingMs = session.expiresAt - Date.now();
    if (remainingMs <= 0) {
      setSession(null);
      return;
    }
    const cappedMs = Math.min(remainingMs, 2_147_483_000);
    const timer = window.setTimeout(() => setSession(null), cappedMs);
    return () => window.clearTimeout(timer);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    if (!wallet.publicKey) {
      setSession(null);
      return;
    }
    if (wallet.publicKey.toBase58() !== session.walletPubkey) {
      setSession(null);
    }
  }, [wallet.publicKey, session]);

  const signIn = useCallback(async (): Promise<Result<AuthSession, AppError>> => {
    if (!wallet.publicKey || !wallet.signMessage) {
      return {
        ok: false,
        error: {
          kind: "INVALID_INPUT",
          field: "wallet",
          message: "Connect a wallet that supports signMessage first",
        },
      };
    }
    setIsAuthenticating(true);
    try {
      const challengeResult = await requestAuthChallengeAdapter();
      if (!challengeResult.ok) return challengeResult;

      const messageBytes = new TextEncoder().encode(challengeResult.value.challenge);
      let signedBytes: Uint8Array;
      try {
        signedBytes = await wallet.signMessage(messageBytes);
      } catch (error) {
        return {
          ok: false,
          error: {
            kind: "USER_REJECTED",
          },
        };
      }
      const signatureBase58 = bs58.encode(signedBytes);

      const verifyResult = await verifyAuthChallengeAdapter({
        walletPubkey: wallet.publicKey.toBase58(),
        signature: signatureBase58,
        challenge: challengeResult.value.challenge,
      });
      if (!verifyResult.ok) return verifyResult;

      setSession(verifyResult.value);
      return verifyResult;
    } finally {
      setIsAuthenticating(false);
    }
  }, [wallet]);

  const signOut = useCallback(() => {
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, isAuthenticating, signIn, signOut }),
    [session, isAuthenticating, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return ctx;
}
