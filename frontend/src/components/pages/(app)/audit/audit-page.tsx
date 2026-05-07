"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import {
  Container,
  SectionEyebrow,
  SectionLead,
  WalletButton,
} from "@/components/ui";
import { useScanAuditQuery } from "@/features/audit";
import { mapTiraiError } from "@/lib/errors";
import { useCluster } from "@/providers";
import {
  AuditEmpty,
  AuditError,
  AuditExportCard,
  AuditKeyForm,
  AuditPaymentsTable,
  AuditScanning,
  AuditSummaryCards,
} from "./components";

const VK_STORAGE_NAMESPACE = "tirai:vk:";

export function AuditPage() {
  const wallet = useWallet();
  const { cluster } = useCluster();
  const [viewingKey, setViewingKey] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [autoLoaded, setAutoLoaded] = useState(false);

  useEffect(() => {
    if (autoLoaded) return;
    if (!wallet.publicKey) return;
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(
      `${VK_STORAGE_NAMESPACE}${wallet.publicKey.toBase58()}`,
    );
    if (stored) {
      setViewingKey(stored);
    }
    setAutoLoaded(true);
  }, [wallet.publicKey, autoLoaded]);

  const scan = useScanAuditQuery({
    viewingKey: submitted,
    enabled: submitted.length === 64,
  });

  const handleSubmit = (next: string) => {
    setViewingKey(next);
    setSubmitted(next);
  };

  const handleClear = () => {
    setViewingKey("");
    setSubmitted("");
  };

  return (
    <Container size="xl" className="py-16 md:py-20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <SectionEyebrow>Auditor · /audit</SectionEyebrow>
          <h1 className="mt-4 text-3xl font-medium tracking-tight md:text-4xl">
            Audit dashboard
          </h1>
        </div>
        <WalletButton />
      </div>
      <SectionLead>
        Paste a viewing key to review payment history and export reports. The
        researcher&apos;s destination wallet is intentionally absent — that is a
        privacy invariant, not a missing feature.
      </SectionLead>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="flex flex-col gap-6">
          <AuditKeyForm
            initialKey={viewingKey}
            isPending={scan.isFetching}
            onSubmit={handleSubmit}
            onClear={handleClear}
          />
          {scan.data?.ok ? <AuditExportCard history={scan.data.value} /> : null}
        </div>
        <div>
          {renderResult({
            scan,
            cluster,
            hasSubmitted: submitted.length === 64,
          })}
        </div>
      </div>
    </Container>
  );
}

interface RenderArgs {
  scan: ReturnType<typeof useScanAuditQuery>;
  cluster: ReturnType<typeof useCluster>["cluster"];
  hasSubmitted: boolean;
}

function renderResult({ scan, cluster, hasSubmitted }: RenderArgs) {
  if (!hasSubmitted) {
    return (
      <AuditScanningPlaceholder text="Paste a 64-character viewing key to load history." />
    );
  }
  if (scan.isFetching && !scan.data) {
    return <AuditScanning />;
  }
  if (scan.data?.ok) {
    if (scan.data.value.entries.length === 0) {
      return <AuditEmpty />;
    }
    return (
      <div className="flex flex-col gap-6">
        <AuditSummaryCards summary={scan.data.value.summary} />
        <AuditPaymentsTable
          entries={scan.data.value.entries}
          cluster={cluster}
        />
      </div>
    );
  }
  if (scan.data && !scan.data.ok) {
    const mapped = mapTiraiError(scan.data.error);
    return <AuditError message={mapped.message} />;
  }
  return <AuditError message={scan.error?.message ?? "Unexpected error."} />;
}

interface PlaceholderProps {
  text: string;
}

function AuditScanningPlaceholder({ text }: PlaceholderProps) {
  return (
    <div className="border-subtle bg-secondary text-secondary flex min-h-48 items-center justify-center rounded-md border p-6 text-center text-sm">
      {text}
    </div>
  );
}
