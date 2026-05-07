import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
} from "@/components/ui";
import type { PayProgressStep } from "../types";

interface StepDef {
  key: PayProgressStep;
  label: string;
}

const STEPS: ReadonlyArray<StepDef> = [
  { key: "validate", label: "Validate inputs" },
  { key: "generate-proof", label: "Generate ZK proof" },
  { key: "submit", label: "Submit transaction" },
  { key: "confirm", label: "Confirm on-chain" },
];

export interface PayProgressCardProps {
  current: PayProgressStep | null;
}

type StepStatus = "done" | "active" | "pending";

const ORDER: ReadonlyArray<PayProgressStep> = [
  "validate",
  "generate-proof",
  "submit",
  "confirm",
  "done",
];

function statusFor(
  step: PayProgressStep,
  current: PayProgressStep | null,
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

export function PayProgressCard({ current }: PayProgressCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Submitting bounty payment</CardTitle>
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
