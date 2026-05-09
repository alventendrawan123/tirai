"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AddressPill,
  Button,
  Container,
  EmptyState,
  SectionEyebrow,
  SectionLead,
  Skeleton,
  WalletAuthButton,
  WalletButton,
} from "@/components/ui";
import {
  useApplicationsQuery,
  useBountyQuery,
  useUpdateApplicationStatusMutation,
} from "@/features/bounty-board";
import { mapTiraiError } from "@/lib/errors";
import { useAuth, useCluster } from "@/providers";
import type { Application, Bounty } from "@/types/api";

const LAMPORTS_PER_SOL = 1_000_000_000;

export interface BountyDetailPageProps {
  bountyId: string;
}

export function BountyDetailPage({ bountyId }: BountyDetailPageProps) {
  const wallet = useWallet();
  const { cluster } = useCluster();
  const bountyQuery = useBountyQuery({ id: bountyId });
  const applicationsQuery = useApplicationsQuery({ bountyId });

  const isOwner =
    wallet.publicKey !== null &&
    bountyQuery.data?.ok === true &&
    bountyQuery.data.value !== null &&
    bountyQuery.data.value.ownerWallet === wallet.publicKey.toBase58();

  return (
    <Container size="xl" className="py-16 md:py-20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <SectionEyebrow>
            <Link href="/bounties" className="hover:text-primary">
              ← Bounty board
            </Link>
          </SectionEyebrow>
          <h1 className="mt-4 text-3xl font-medium tracking-tight md:text-4xl">
            {bountyQuery.data?.ok && bountyQuery.data.value
              ? bountyQuery.data.value.title
              : "Bounty"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <WalletAuthButton />
          <WalletButton />
        </div>
      </div>

      <div className="mt-8">
        {renderBounty({
          bountyQuery,
          applicationsQuery,
          cluster,
          isOwner,
          bountyId,
        })}
      </div>
    </Container>
  );
}

interface RenderArgs {
  bountyQuery: ReturnType<typeof useBountyQuery>;
  applicationsQuery: ReturnType<typeof useApplicationsQuery>;
  cluster: ReturnType<typeof useCluster>["cluster"];
  isOwner: boolean;
  bountyId: string;
}

function renderBounty({
  bountyQuery,
  applicationsQuery,
  cluster,
  isOwner,
  bountyId,
}: RenderArgs) {
  if (bountyQuery.isLoading) {
    return <Skeleton className="h-96 w-full rounded-md" />;
  }
  if (!bountyQuery.data) return null;
  if (!bountyQuery.data.ok) {
    return (
      <EmptyState
        title="Could not load bounty"
        description={mapTiraiError(bountyQuery.data.error).message}
      />
    );
  }
  const bounty = bountyQuery.data.value;
  if (!bounty) {
    return (
      <EmptyState
        title="Bounty not found"
        description="It may have been deleted, or the link is wrong."
      />
    );
  }
  const rewardSol = Number(bounty.rewardLamports) / LAMPORTS_PER_SOL;
  const deadlineDate = new Date(bounty.deadline).toLocaleString();

  return (
    <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      <div className="flex flex-col gap-6">
        <BountyMeta bounty={bounty} cluster={cluster} />
        <div className="border-subtle bg-main rounded-md border p-6">
          <h2 className="text-primary text-base font-medium uppercase tracking-[0.18em]">
            Description
          </h2>
          <p className="text-secondary mt-3 whitespace-pre-wrap text-sm leading-relaxed">
            {bounty.description}
          </p>
          {bounty.eligibility ? (
            <>
              <h3 className="text-primary mt-6 text-sm font-medium uppercase tracking-[0.18em]">
                Eligibility
              </h3>
              <p className="text-secondary mt-2 text-sm leading-relaxed">
                {bounty.eligibility}
              </p>
            </>
          ) : null}
        </div>

        <ApplicationsSection
          applicationsQuery={applicationsQuery}
          isOwner={isOwner}
          bountyId={bountyId}
          bounty={bounty}
        />
      </div>

      <aside className="flex flex-col gap-4">
        <div className="border-subtle bg-secondary rounded-md border p-5">
          <p className="text-muted font-mono text-xs uppercase tracking-[0.18em]">
            Reward
          </p>
          <p className="text-primary mt-2 font-mono text-2xl">
            {rewardSol.toFixed(4)} SOL
          </p>
          <p className="text-muted mt-3 font-mono text-xs uppercase tracking-[0.18em]">
            Deadline
          </p>
          <p className="text-primary mt-1 text-sm">{deadlineDate}</p>
          <p className="text-muted mt-3 font-mono text-xs uppercase tracking-[0.18em]">
            Status
          </p>
          <p className="text-primary mt-1 text-sm">{bounty.status}</p>
        </div>

        {bounty.status === "open" && !isOwner ? (
          <Link href={`/bounties/${bounty.id}/apply`}>
            <Button variant="primary" size="md" className="w-full">
              Apply to bounty
            </Button>
          </Link>
        ) : null}

        {isOwner && bounty.status === "open" ? (
          <Link href={`/pay?bountyId=${bounty.id}`}>
            <Button variant="primary" size="md" className="w-full">
              Pay accepted researcher
            </Button>
          </Link>
        ) : null}

        {bounty.paymentSignature ? (
          <div className="border-subtle bg-main rounded-md border p-4">
            <p className="text-muted font-mono text-xs uppercase tracking-[0.18em]">
              Payment signature
            </p>
            <p className="text-primary mt-1 break-all font-mono text-xs">
              {bounty.paymentSignature}
            </p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function BountyMeta({
  bounty,
  cluster,
}: {
  bounty: Bounty;
  cluster: "mainnet" | "devnet" | "localnet";
}) {
  const explorerCluster = cluster === "localnet" ? "devnet" : cluster;
  return (
    <div className="text-muted flex flex-wrap items-center gap-2 font-mono text-xs">
      <span>Owner</span>
      <AddressPill
        address={bounty.ownerWallet}
        cluster={explorerCluster}
        withExplorer
      />
    </div>
  );
}

interface AppsArgs {
  applicationsQuery: ReturnType<typeof useApplicationsQuery>;
  isOwner: boolean;
  bountyId: string;
  bounty: Bounty;
}

function ApplicationsSection({
  applicationsQuery,
  isOwner,
  bountyId,
  bounty,
}: AppsArgs) {
  const updateMutation = useUpdateApplicationStatusMutation();
  const { session } = useAuth();
  const router = useRouter();

  if (!isOwner) return null;
  if (applicationsQuery.isLoading) {
    return <Skeleton className="h-44 w-full rounded-md" />;
  }
  if (!applicationsQuery.data) return null;
  if (!applicationsQuery.data.ok) {
    return (
      <EmptyState
        title="Could not load applications"
        description={mapTiraiError(applicationsQuery.data.error).message}
      />
    );
  }
  const apps = applicationsQuery.data.value;
  if (apps.length === 0) {
    return (
      <div className="border-subtle bg-main rounded-md border p-6">
        <h2 className="text-primary text-base font-medium uppercase tracking-[0.18em]">
          Applications (0)
        </h2>
        <p className="text-muted mt-3 text-sm">
          No applications yet. Share the bounty link with researchers.
        </p>
      </div>
    );
  }

  const handleAction = async (
    application: Application,
    next: "accepted" | "rejected",
  ) => {
    if (!session) {
      toast.error("Sign in with wallet first");
      return;
    }
    const result = await updateMutation.mutateAsync({
      applicationId: application.id,
      bountyId,
      status: next,
    });
    if (!result.ok) {
      toast.error(mapTiraiError(result.error).message);
      return;
    }
    toast.success(`Application ${next}`);
    if (next === "accepted") {
      router.push(`/pay?bountyId=${bounty.id}`);
    }
  };

  return (
    <div className="border-subtle bg-main rounded-md border p-6">
      <h2 className="text-primary text-base font-medium uppercase tracking-[0.18em]">
        Applications ({apps.length})
      </h2>
      <div className="mt-4 flex flex-col gap-3">
        {apps.map((app) => (
          <div
            key={app.id}
            className="border-subtle flex flex-col gap-3 rounded-md border p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted font-mono text-xs">
                {app.applicantWallet.slice(0, 4)}…{app.applicantWallet.slice(-4)}
              </span>
              <span className="text-muted font-mono text-xs uppercase tracking-[0.18em]">
                {app.status}
              </span>
            </div>
            <p className="text-secondary whitespace-pre-wrap text-sm">
              {app.submissionText}
            </p>
            {app.contactHandle ? (
              <p className="text-muted text-xs">Contact: {app.contactHandle}</p>
            ) : null}
            {app.status === "pending" ? (
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAction(app, "rejected")}
                  disabled={updateMutation.isPending}
                >
                  Reject
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleAction(app, "accepted")}
                  disabled={updateMutation.isPending}
                >
                  Accept
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
