"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Container,
  SectionEyebrow,
  SectionLead,
  WalletAuthButton,
  WalletButton,
} from "@/components/ui";
import {
  type PayBountyAdapterInput,
  useBountyMutation,
} from "@/features/bounty";
import {
  useApplicationsQuery,
  useBountyQuery,
  useUpdateBountyStatusMutation,
} from "@/features/bounty-board";
import { mapTiraiError } from "@/lib/errors";
import { useAuth, useCluster } from "@/providers";
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
  const { session } = useAuth();
  const searchParams = useSearchParams();
  const bountyId = searchParams.get("bountyId");
  const { submit, isPending, data, step, reset } = useBountyMutation();
  const updateBountyStatus = useUpdateBountyStatusMutation();
  const updateBountyStatusMutate = updateBountyStatus.mutate;
  const bountyQuery = useBountyQuery({ id: bountyId, enabled: Boolean(bountyId) });
  const applicationsQuery = useApplicationsQuery({
    bountyId,
    enabled: Boolean(bountyId),
  });
  const acceptedApplication =
    applicationsQuery.data?.ok === true
      ? applicationsQuery.data.value.find((app) => app.status === "accepted")
      : undefined;
  const [submitted, setSubmitted] = useState<SubmittedSnapshot | null>(null);
  const markedSignatureRef = useRef<string | null>(null);
  const pendingSignatureRef = useRef<string | null>(null);

  const bountyData =
    bountyQuery.data?.ok === true ? bountyQuery.data.value : undefined;

  const initialFormValues = useMemo<Partial<PayFormValues> | undefined>(() => {
    if (!bountyData) return undefined;
    const sol = Number(bountyData.rewardLamports) / LAMPORTS_PER_SOL;
    return {
      amountSol: sol.toString(),
      label: bountyData.title,
    };
  }, [bountyData]);

  const lockedFields = bountyData ? (["amountSol", "label"] as const) : undefined;

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

  useEffect(() => {
    if (!data?.ok || !bountyId) return;
    if (bountyData?.status !== "open") return;
    const signature = data.value.signature;
    if (markedSignatureRef.current === signature) return;

    if (!session) {
      pendingSignatureRef.current = signature;
      return;
    }

    pendingSignatureRef.current = null;
    markedSignatureRef.current = signature;
    updateBountyStatusMutate(
      {
        id: bountyId,
        status: "paid",
        paymentSignature: signature,
      },
      {
        onSuccess: (result) => {
          if (result.ok) {
            toast.success("Bounty marked as paid");
          } else {
            markedSignatureRef.current = null;
            pendingSignatureRef.current = signature;
            toast.error(
              `Could not mark bounty as paid: ${mapTiraiError(result.error).message}`,
            );
          }
        },
        onError: (error) => {
          markedSignatureRef.current = null;
          pendingSignatureRef.current = signature;
          toast.error(`Could not mark bounty as paid: ${error.message}`);
        },
      },
    );
  }, [
    data,
    bountyId,
    session,
    bountyData?.status,
    updateBountyStatusMutate,
  ]);

  const handleReset = () => {
    setSubmitted(null);
    reset();
    markedSignatureRef.current = null;
    pendingSignatureRef.current = null;
  };

  const eyebrow = bountyId
    ? `Project · /pay · bounty ${bountyId.slice(0, 8)}…`
    : "Project · /pay";

  const showAuthGateBanner =
    Boolean(bountyId) && wallet.connected && !session;
  const showSignInRequired =
    Boolean(data?.ok && bountyId && !session);

  return (
    <Container size="md" className="py-16 md:py-20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <SectionEyebrow>{eyebrow}</SectionEyebrow>
          <h1 className="mt-4 text-3xl font-medium tracking-tight md:text-4xl">
            {bountyData ? `Pay: ${bountyData.title}` : "Pay a bounty"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {bountyId ? <WalletAuthButton /> : null}
          <WalletButton />
        </div>
      </div>
      <SectionLead>
        {bountyData
          ? "Reward and label are locked from the bounty. Funds are sent privately via Cloak; the recipient is not linkable to your wallet on-chain."
          : "Connect your treasury wallet to fund a private bounty payment. The recipient will not be linkable to your wallet on-chain."}
      </SectionLead>

      {showAuthGateBanner ? (
        <div className="border-subtle bg-secondary text-secondary mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border p-4 text-sm">
          <span>
            Sign in with your wallet so we can mark this bounty as paid after
            the Cloak deposit confirms.
          </span>
          <WalletAuthButton />
        </div>
      ) : null}

      {showSignInRequired ? (
        <div className="border-subtle bg-secondary text-secondary mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border p-4 text-sm">
          <span>
            Cloak deposit confirmed. Sign in with your wallet to mark this
            bounty as paid in the public board.
          </span>
          <WalletAuthButton />
        </div>
      ) : null}

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
          initialFormValues,
          lockedFields: lockedFields ? Array.from(lockedFields) : undefined,
          recipientContactHandle: acceptedApplication?.contactHandle,
          bountyTitle: bountyData?.title,
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
  initialFormValues?: Partial<PayFormValues>;
  lockedFields?: Array<keyof PayFormValues>;
  recipientContactHandle?: string;
  bountyTitle?: string;
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
  initialFormValues,
  lockedFields,
  recipientContactHandle,
  bountyTitle,
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
        {...(recipientContactHandle !== undefined
          ? { recipientContactHandle }
          : {})}
        {...(bountyTitle !== undefined ? { bountyTitle } : {})}
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
      {...(initialFormValues !== undefined
        ? { initialValues: initialFormValues }
        : {})}
      {...(lockedFields !== undefined ? { lockedFields } : {})}
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
