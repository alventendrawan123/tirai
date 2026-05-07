import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
} from "@/components/ui";
import type { ClaimProgressStep } from "../types";

interface StepDef {
  key: ClaimProgressStep;
  label: string;
}

const STEPS: ReadonlyArray<StepDef> = [
  { key: "validate", label: "Validate ticket" },
  { key: "generate-proof", label: "Generate ZK proof" },
  { key: "submit", label: "Submit withdraw" },
  { key: "confirm", label: "Confirm on-chain" },
];

const ORDER: ReadonlyArray<ClaimProgressStep> = [
  "validate",
  "generate-proof",
  "submit",
  "confirm",
  "done",
];

type StepStatus = "done" | "active" | "pending";

function statusFor(
  step: ClaimProgressStep,
  current: ClaimProgressStep | null,
): StepStatus {
  if (current === null) return "pending";
  const stepIdx = ORDER.indexOf(step);
  const currentIdx = ORDER.indexOf(current);
  if (currentIdx < 0) return "pending";
  if (current === "done") return "done";
  if (currentIdx > stepIdx) return "done";
  if (currentIdx === stepIdx) return "active";
  return "pending";
}

export interface ClaimProgressCardProps {
  current: ClaimProgressStep | null;
}

export function ClaimProgressCard({ current }: ClaimProgressCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdrawing</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {STEPS.map((step) => {
          const status = statusFor(step.key, current);
          return (
            <div
              key={step.key}
              className="border-subtle flex items-center justify-between rounded-md border px-4 py-3"
            >
              <span className="text-sm">{step.label}</span>
              {status === "active" ? <Spinner size={14} /> : null}
              {status === "done" ? (
                <span
                  aria-hidden="true"
                  className="text-success font-mono text-xs"
                >
                  ✓
                </span>
              ) : null}
              {status === "pending" ? (
                <span className="text-muted font-mono text-[11px] uppercase">
                  Pending
                </span>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
