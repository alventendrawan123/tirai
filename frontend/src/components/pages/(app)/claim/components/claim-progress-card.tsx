import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
} from "@/components/ui";

interface Step {
  label: string;
  status: "done" | "active" | "pending";
}

const STEPS: ReadonlyArray<Step> = [
  { label: "Generate ZK proof", status: "active" },
  { label: "Submit withdraw", status: "pending" },
  { label: "Confirm on-chain", status: "pending" },
];

export function ClaimProgressCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdrawing</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {STEPS.map((step) => (
          <div
            key={step.label}
            className="border-subtle flex items-center justify-between rounded-md border px-4 py-3"
          >
            <span className="text-sm">{step.label}</span>
            {step.status === "active" ? <Spinner size={14} /> : null}
            {step.status === "pending" ? (
              <span className="text-muted font-mono text-[11px] uppercase">
                Pending
              </span>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
