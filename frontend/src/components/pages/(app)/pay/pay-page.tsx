"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import {
  Container,
  SectionEyebrow,
  SectionLead,
  WalletButton,
} from "@/components/ui";
import {
  type PayBountyAdapterInput,
  useBountyMutation,
} from "@/features/bounty";
import { mapTiraiError } from "@/lib/errors";
import { useCluster } from "@/providers";
import {
  PayErrorCard,
  PayFormCard,
  PayProgressCard,
  PaySuccessCard,
} from "./components";
import type { PayFormValues } from "./types";

const LAMPORTS_PER_SOL = 1_000_000_000;
const VK_STORAGE_NAMESPACE = "tirai:vk:";

interface SubmittedSnapshot {
  amountLamports: bigint;
  label: string;
}

export function PayPage() {
  const wallet = useWallet();
  const { cluster } = useCluster();
  const { submit, isPending, data, step, reset } = useBountyMutation();
  const [submitted, setSubmitted] = useState<SubmittedSnapshot | null>(null);

  const handleSubmit = async (values: PayFormValues) => {
    const input: PayBountyAdapterInput = {
      amountSol: Number(values.amountSol),
      label: values.label,
      ...(values.memo.length > 0 ? { memo: values.memo } : {}),
    };
    setSubmitted({
      amountLamports: BigInt(Math.floor(input.amountSol * LAMPORTS_PER_SOL)),
      label: input.label,
    });
    const result = await submit(input);
    if (result.ok && wallet.publicKey) {
      persistViewingKey(wallet.publicKey.toBase58(), result.value.viewingKey);
    }
  };

  const handleReset = () => {
    setSubmitted(null);
    reset();
  };

  return (
    <Container size="md" className="py-16 md:py-20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <SectionEyebrow>Project · /pay</SectionEyebrow>
          <h1 className="mt-4 text-3xl font-medium tracking-tight md:text-4xl">
            Pay a bounty
          </h1>
        </div>
        <WalletButton />
      </div>
      <SectionLead>
        Connect your treasury wallet to fund a private bounty payment. The
        recipient will not be linkable to your wallet on-chain.
      </SectionLead>
      <div className="mt-8">
        {renderPayState({
          isPending,
          data,
          step,
          submitted,
          cluster,
          walletConnected: Boolean(wallet.publicKey),
          onSubmit: handleSubmit,
          onReset: handleReset,
        })}
      </div>
    </Container>
  );
}

interface RenderArgs {
  isPending: boolean;
  data: ReturnType<typeof useBountyMutation>["data"];
  step: ReturnType<typeof useBountyMutation>["step"];
  submitted: SubmittedSnapshot | null;
  cluster: ReturnType<typeof useCluster>["cluster"];
  walletConnected: boolean;
  onSubmit: (values: PayFormValues) => Promise<void>;
  onReset: () => void;
}

function renderPayState({
  isPending,
  data,
  step,
  submitted,
  cluster,
  walletConnected,
  onSubmit,
  onReset,
}: RenderArgs) {
  if (isPending) {
    return <PayProgressCard current={step} />;
  }
  if (data?.ok && submitted) {
    return (
      <PaySuccessCard
        result={data.value}
        amountLamports={submitted.amountLamports}
        label={submitted.label}
        cluster={cluster}
        onReset={onReset}
      />
    );
  }
  if (data && !data.ok) {
    return <PayErrorCard error={mapTiraiError(data.error)} onRetry={onReset} />;
  }
  return (
    <PayFormCard
      walletConnected={walletConnected}
      onSubmit={onSubmit}
      disabled={isPending}
    />
  );
}

function persistViewingKey(walletPubkey: string, viewingKey: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${VK_STORAGE_NAMESPACE}${walletPubkey}`,
      viewingKey,
    );
  } catch {
    return;
  }
}
