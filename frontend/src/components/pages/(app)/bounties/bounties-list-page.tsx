"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";
import type { Bounty, BountyStatus, ListBountiesFilter } from "@/types/api";

const LAMPORTS_PER_SOL = 1_000_000_000;

type StatusFilter = "open" | "paid" | "all";
type ScopeFilter = "all" | "mine";

const STATUS_TABS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "open", label: "Open" },
  { value: "paid", label: "Paid" },
  { value: "all", label: "All" },
];

export function BountiesListPage() {
  const wallet = useWallet();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");

  const filter = useMemo<ListBountiesFilter>(() => {
    const next: ListBountiesFilter = { limit: 50 };
    if (statusFilter !== "all") {
      next.status = statusFilter satisfies BountyStatus;
    }
    if (scopeFilter === "mine" && wallet.publicKey) {
      next.ownerWallet = wallet.publicKey.toBase58();
    }
    return next;
  }, [statusFilter, scopeFilter, wallet.publicKey]);

  const { data, isLoading } = useBountiesQuery({ filter });

  const heading =
    scopeFilter === "mine"
      ? "My bounties"
      : statusFilter === "open"
        ? "Open bounties"
        : statusFilter === "paid"
          ? "Paid bounties"
          : "All bounties";

  return (
    <Container size="xl" className="py-16 md:py-20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <SectionEyebrow>Bounty board · /bounties</SectionEyebrow>
          <h1 className="mt-4 text-3xl font-medium tracking-tight md:text-4xl">
            {heading}
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

      <div className="mt-8 flex flex-wrap items-center gap-6">
        <FilterTabs
          label="Status"
          options={STATUS_TABS}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        {wallet.publicKey ? (
          <FilterTabs
            label="Scope"
            options={[
              { value: "all", label: "All" },
              { value: "mine", label: "Mine" },
            ]}
            value={scopeFilter}
            onChange={setScopeFilter}
          />
        ) : null}
      </div>

      <div className="mt-6">
        {renderList({ data, isLoading, statusFilter, scopeFilter })}
      </div>
    </Container>
  );
}

interface FilterTabsProps<T extends string> {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}

function FilterTabs<T extends string>({
  label,
  options,
  value,
  onChange,
}: FilterTabsProps<T>) {
  return (
    <div
      className="flex items-center gap-2"
      role="group"
      aria-label={label}
    >
      <span className="text-muted font-mono text-[11px] uppercase tracking-[0.18em]">
        {label}
      </span>
      <div className="border-subtle inline-flex items-center gap-1 rounded-md border p-0.5">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className={cn(
                "rounded px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "bg-secondary text-primary"
                  : "text-muted hover:text-primary hover:bg-secondary",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface RenderArgs {
  data: ReturnType<typeof useBountiesQuery>["data"];
  isLoading: boolean;
  statusFilter: StatusFilter;
  scopeFilter: ScopeFilter;
}

function renderList({
  data,
  isLoading,
  statusFilter,
  scopeFilter,
}: RenderArgs) {
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
    const description =
      scopeFilter === "mine"
        ? statusFilter === "all"
          ? "You haven't posted any bounties yet."
          : `You don't have any ${statusFilter} bounties.`
        : statusFilter === "open"
          ? "Be the first to post one. Click 'New bounty' above."
          : `No ${statusFilter} bounties yet.`;
    return (
      <EmptyState title="Nothing here" description={description} />
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
        <StatusBadge status={bounty.status} />
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

function StatusBadge({ status }: { status: BountyStatus }) {
  const tone = STATUS_TONE[status];
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]",
        tone,
      )}
    >
      {status}
    </span>
  );
}

const STATUS_TONE: Record<BountyStatus, string> = {
  open: "border-subtle text-secondary",
  paid: "border-subtle text-success",
  expired: "border-subtle text-muted",
  cancelled: "border-subtle text-muted",
};
