import Link from "next/link";
import { Container, SectionEyebrow, SectionLead } from "@/components/ui";
import { assertNever, cn, parseStateParam } from "@/lib/utils";
import { MOCK_PAYMENTS, MOCK_SUMMARY } from "./__fixtures__/audit";
import {
  AuditEmpty,
  AuditError,
  AuditKeyForm,
  AuditPaymentsTable,
  AuditScanning,
  AuditSummaryCards,
} from "./components";
import type { AuditPageProps, AuditPageState } from "./types";

const STATES: ReadonlyArray<AuditPageState> = [
  "empty",
  "scanning",
  "loaded",
  "error",
];

function renderState(state: AuditPageState) {
  switch (state) {
    case "empty":
      return <AuditEmpty />;
    case "scanning":
      return <AuditScanning />;
    case "loaded":
      return (
        <div className="flex flex-col gap-6">
          <AuditSummaryCards summary={MOCK_SUMMARY} />
          <AuditPaymentsTable payments={MOCK_PAYMENTS} />
        </div>
      );
    case "error":
      return <AuditError />;
    default:
      return assertNever(state);
  }
}

export function AuditPage({ searchParams }: AuditPageProps) {
  const state = parseStateParam(searchParams, STATES, "empty");
  return (
    <Container size="xl" className="py-16 md:py-20">
      <SectionEyebrow>Auditor · /audit</SectionEyebrow>
      <h1 className="mt-4 text-3xl font-medium tracking-tight md:text-4xl">
        Audit dashboard
      </h1>
      <SectionLead>
        Paste a viewing key to review payment history and export reports. The
        researcher&apos;s destination wallet is intentionally absent — that is a
        privacy invariant, not a missing feature.
      </SectionLead>
      <nav
        aria-label="Mock state"
        className="border-subtle bg-secondary text-secondary mt-8 flex flex-wrap items-center gap-2 rounded-md border p-2 font-mono text-xs"
      >
        <span className="text-muted px-2 uppercase tracking-[0.16em]">
          Mock state
        </span>
        {STATES.map((s) => (
          <Link
            key={s}
            href={s === "empty" ? "/audit" : `/audit?state=${s}`}
            className={cn(
              "hover:bg-main rounded px-2 py-1 transition-colors",
              s === state && "bg-main text-primary",
            )}
          >
            {s}
          </Link>
        ))}
      </nav>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_2fr]">
        <AuditKeyForm />
        <div>{renderState(state)}</div>
      </div>
    </Container>
  );
}
