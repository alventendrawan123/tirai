import Link from "next/link";
import { Container, SectionEyebrow, SectionLead } from "@/components/ui";
import { assertNever, cn, parseStateParam } from "@/lib/utils";
import { MOCK_PREVIEW, MOCK_SUCCESS_FRESH } from "./__fixtures__/claim";
import {
  ClaimErrorCard,
  ClaimInspector,
  ClaimPreviewCard,
  ClaimProgressCard,
  ClaimSuccessCard,
} from "./components";
import type { ClaimPageProps, ClaimPageState } from "./types";

const STATES: ReadonlyArray<ClaimPageState> = [
  "paste",
  "inspected",
  "submitting",
  "success",
  "error",
];

function renderState(state: ClaimPageState) {
  switch (state) {
    case "paste":
      return <ClaimInspector />;
    case "inspected":
      return <ClaimPreviewCard preview={MOCK_PREVIEW} />;
    case "submitting":
      return <ClaimProgressCard />;
    case "success":
      return <ClaimSuccessCard result={MOCK_SUCCESS_FRESH} />;
    case "error":
      return <ClaimErrorCard />;
    default:
      return assertNever(state);
  }
}

export function ClaimPage({ searchParams }: ClaimPageProps) {
  const state = parseStateParam(searchParams, STATES, "paste");
  return (
    <Container size="md" className="py-16 md:py-20">
      <SectionEyebrow>Researcher · /claim</SectionEyebrow>
      <h1 className="mt-4 text-3xl font-medium tracking-tight md:text-4xl">
        Claim a bounty
      </h1>
      <SectionLead>
        Paste a claim ticket or scan its QR code to inspect the payout. You
        choose whether the funds land on a brand-new wallet or your existing
        one.
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
            href={s === "paste" ? "/claim" : `/claim?state=${s}`}
            className={cn(
              "hover:bg-main rounded px-2 py-1 transition-colors",
              s === state && "bg-main text-primary",
            )}
          >
            {s}
          </Link>
        ))}
      </nav>
      <div className="mt-6">{renderState(state)}</div>
    </Container>
  );
}
