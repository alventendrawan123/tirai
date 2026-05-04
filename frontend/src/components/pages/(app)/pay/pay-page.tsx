import Link from "next/link";
import { Container, SectionEyebrow, SectionLead } from "@/components/ui";
import { assertNever, cn, parseStateParam } from "@/lib/utils";
import { MOCK_TICKET } from "./__fixtures__/ticket";
import {
  PayErrorCard,
  PayFormCard,
  PayProgressCard,
  PaySuccessCard,
} from "./components";
import type { PayPageProps, PayPageState } from "./types";

const STATES: ReadonlyArray<PayPageState> = [
  "idle",
  "submitting",
  "success",
  "error",
];

function renderState(state: PayPageState) {
  switch (state) {
    case "idle":
      return <PayFormCard />;
    case "submitting":
      return <PayProgressCard />;
    case "success":
      return <PaySuccessCard ticket={MOCK_TICKET} />;
    case "error":
      return <PayErrorCard />;
    default:
      return assertNever(state);
  }
}

export function PayPage({ searchParams }: PayPageProps) {
  const state = parseStateParam(searchParams, STATES, "idle");
  return (
    <Container size="md" className="py-16 md:py-20">
      <SectionEyebrow>Project · /pay</SectionEyebrow>
      <h1 className="mt-4 text-3xl font-medium tracking-tight md:text-4xl">
        Pay a bounty
      </h1>
      <SectionLead>
        Connect your treasury wallet to fund a private bounty payment. The
        recipient will not be linkable to your wallet on-chain.
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
            href={s === "idle" ? "/pay" : `/pay?state=${s}`}
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
