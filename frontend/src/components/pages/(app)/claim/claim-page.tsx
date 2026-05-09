"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useRef, useState } from "react";
import {
  Container,
  SaveKeyDialog,
  SectionEyebrow,
  SectionLead,
} from "@/components/ui";
import { useClaimMutation, useInspectTicketQuery } from "@/features/claim";
import { mapTiraiError } from "@/lib/errors";
import { useCluster } from "@/providers";
import {
  ClaimErrorCard,
  ClaimInspector,
  ClaimPreviewCard,
  ClaimProgressCard,
  ClaimSuccessCard,
} from "./components";
import type { WalletMode } from "./types";

export function ClaimPage() {
  const wallet = useWallet();
  const { cluster } = useCluster();
  const [ticket, setTicket] = useState("");
  const [mode, setMode] = useState<WalletMode>("fresh");
  const [pendingSecret, setPendingSecret] = useState<{
    destination: string;
    secretKey: Uint8Array;
  } | null>(null);
  const [reveal, setReveal] = useState(false);

  const inspect = useInspectTicketQuery({ ticketRaw: ticket });
  const claim = useClaimMutation();

  const lastSecretRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    return () => {
      if (lastSecretRef.current) {
        lastSecretRef.current.fill(0);
        lastSecretRef.current = null;
      }
    };
  }, []);

  const handleTicketChange = (next: string) => {
    setTicket(next);
    if (claim.data) claim.reset();
  };

  const handleClaim = async () => {
    if (!ticket) return;
    const result = await claim.submit({ ticket, mode });
    if (result.ok && result.value.mode === "fresh") {
      lastSecretRef.current = result.value.secretKey;
      setPendingSecret({
        destination: result.value.destination,
        secretKey: result.value.secretKey,
      });
      setReveal(true);
    }
  };

  const handleAcknowledgeKey = () => {
    if (lastSecretRef.current) {
      lastSecretRef.current.fill(0);
      lastSecretRef.current = null;
    }
    setPendingSecret(null);
    setReveal(false);
  };

  const handleReset = () => {
    if (lastSecretRef.current) {
      lastSecretRef.current.fill(0);
      lastSecretRef.current = null;
    }
    setTicket("");
    setMode("fresh");
    setPendingSecret(null);
    setReveal(false);
    claim.reset();
  };

  const expectedAmountLamports = inspect.data?.ok
    ? inspect.data.value.amountLamports
    : 0n;

  return (
    <Container size="md" className="py-16 md:py-20">
      <div>
        <SectionEyebrow>Researcher · /claim</SectionEyebrow>
        <h1 className="mt-4 text-3xl font-medium tracking-tight md:text-4xl">
          Claim a bounty
        </h1>
      </div>
      <SectionLead>
        Paste a claim ticket or scan its QR code to inspect the payout. You
        choose whether the funds land on a brand-new wallet or your existing
        one.
      </SectionLead>
      <div className="mt-8 flex flex-col gap-6">
        {claim.isPending ? <ClaimProgressCard current={claim.step} /> : null}
        {!claim.isPending && claim.data?.ok ? (
          <ClaimSuccessCard
            result={claim.data.value}
            expectedAmountLamports={expectedAmountLamports}
            cluster={cluster}
            onReset={handleReset}
          />
        ) : null}
        {!claim.isPending && claim.data && !claim.data.ok ? (
          <ClaimErrorCard
            error={mapTiraiError(claim.data.error)}
            onRetry={() => claim.reset()}
          />
        ) : null}
        {!claim.isPending && !claim.data ? (
          <>
            <ClaimInspector
              ticket={ticket}
              onTicketChange={handleTicketChange}
              isInspecting={inspect.isFetching && ticket.length > 0}
            />
            {inspect.data?.ok ? (
              <ClaimPreviewCard
                preview={inspect.data.value}
                mode={mode}
                onModeChange={setMode}
                walletConnected={Boolean(wallet.publicKey)}
                onClaim={handleClaim}
                disabled={claim.isPending}
              />
            ) : null}
            {inspect.data && !inspect.data.ok ? (
              <ClaimErrorCard
                error={mapTiraiError(inspect.data.error)}
                onRetry={() => setTicket("")}
              />
            ) : null}
          </>
        ) : null}
      </div>
      {pendingSecret ? (
        <SaveKeyDialog
          open={reveal}
          destination={pendingSecret.destination}
          secretKey={pendingSecret.secretKey}
          onAcknowledge={handleAcknowledgeKey}
        />
      ) : null}
    </Container>
  );
}
