"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { useSignInMutation } from "@/features/auth";
import { mapTiraiError } from "@/lib/errors";
import { useAuth } from "@/providers";
import { Button } from "./button";

export function WalletAuthButton() {
  const wallet = useWallet();
  const { session, signOut, isAuthenticating } = useAuth();
  const signInMutation = useSignInMutation();

  if (!wallet.connected || !wallet.publicKey) {
    return (
      <Button variant="ghost" size="sm" disabled>
        Connect wallet first
      </Button>
    );
  }

  if (session) {
    return (
      <Button variant="outline" size="sm" onClick={signOut}>
        Signed in · sign out
      </Button>
    );
  }

  const handleSignIn = async () => {
    const result = await signInMutation.mutateAsync();
    if (!result.ok) {
      toast.error(mapTiraiError(result.error).message);
    } else {
      toast.success("Signed in");
    }
  };

  return (
    <Button
      variant="primary"
      size="sm"
      onClick={handleSignIn}
      disabled={isAuthenticating || signInMutation.isPending}
    >
      {isAuthenticating || signInMutation.isPending
        ? "Signing in…"
        : "Sign in with wallet"}
    </Button>
  );
}
