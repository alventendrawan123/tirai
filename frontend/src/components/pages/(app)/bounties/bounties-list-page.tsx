"use client";

import Link from "next/link";
import {
  Button,
  Container,
  EmptyState,
  SectionEyebrow,
  SectionLead,
  Skeleton,
  WalletButton,
} from "@/components/ui";
import { useBountiesQuery } from "@/features/bounty-board";
import { mapTiraiError } from "@/lib/errors";
import type { Bounty } from "@/types/api";

const LAMPORTS_PER_SOL = 1_000_000_000;

export function BountiesListPage() {
  const { data, isLoading } = useBountiesQuery({
    filter: { status: "open", limit: 50 },
  });

  return (
    <Container size="xl" className="py-16 md:py-20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <SectionEyebrow>Bounty board · /bounties</SectionEyebrow>
          <h1 className="mt-4 text-3xl font-medium tracking-tight md:text-4xl">
            Open bounties
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/bounties/new">
            <Button variant="primary" size="md">
              New bounty
            </Button>
          </Link>
          <WalletButton />
        </div>
      </div>
      <SectionLead>
        Browse open bug bounties. Anyone can apply with a wallet — payouts are
        delivered privately via Cloak shielded transfers.
      </SectionLead>
      <div className="mt-8">{renderList({ data, isLoading })}</div>
    </Container>
  );
}

interface RenderArgs {
  data: ReturnType<typeof useBountiesQuery>["data"];
  isLoading: boolean;
}

function renderList({ data, isLoading }: RenderArgs) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full rounded-md" />
        ))}
      </div>
    );
  }
  if (!data) return null;
  if (!data.ok) {
    return (
      <EmptyState
        title="Could not load bounties"
        description={mapTiraiError(data.error).message}
      />
    );
  }
  if (data.value.length === 0) {
    return (
      <EmptyState
        title="No open bounties yet"
        description="Be the first to post one. Click 'New bounty' above."
      />
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data.value.map((b) => (
        <BountyCard key={b.id} bounty={b} />
      ))}
    </div>
  );
}

function BountyCard({ bounty }: { bounty: Bounty }) {
  const rewardSol = Number(bounty.rewardLamports) / LAMPORTS_PER_SOL;
  const deadlineDate = new Date(bounty.deadline).toLocaleDateString();
  return (
    <Link
      href={`/bounties/${bounty.id}`}
      className="border-subtle bg-main hover:border-strong flex flex-col gap-3 rounded-md border p-5 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-primary text-lg font-medium tracking-tight">
          {bounty.title}
        </h3>
        <span className="text-muted shrink-0 font-mono text-xs uppercase tracking-[0.18em]">
          {bounty.status}
        </span>
      </div>
      <p className="text-secondary line-clamp-3 text-sm">
        {bounty.description}
      </p>
      <div className="border-subtle text-muted mt-auto flex items-center justify-between border-t pt-3 text-xs">
        <span className="text-primary font-mono text-base">
          {rewardSol.toFixed(4)} SOL
        </span>
        <span>Deadline {deadlineDate}</span>
      </div>
    </Link>
  );
}
