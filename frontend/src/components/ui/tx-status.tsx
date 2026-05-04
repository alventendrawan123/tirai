import { assertNever, cn } from "@/lib/utils";
import { Spinner } from "./spinner";

export type TxStatusKind =
  | "idle"
  | "submitting"
  | "confirming"
  | "confirmed"
  | "failed";

export interface TxStatusProps {
  status: TxStatusKind;
  className?: string;
}

interface StatusDescriptor {
  label: string;
  className: string;
  icon: "spinner" | "check" | "cross" | "dot";
}

function describe(status: TxStatusKind): StatusDescriptor {
  switch (status) {
    case "idle":
      return { label: "Idle", className: "text-muted", icon: "dot" };
    case "submitting":
      return {
        label: "Submitting",
        className: "text-secondary",
        icon: "spinner",
      };
    case "confirming":
      return {
        label: "Confirming",
        className: "text-secondary",
        icon: "spinner",
      };
    case "confirmed":
      return { label: "Confirmed", className: "text-success", icon: "check" };
    case "failed":
      return { label: "Failed", className: "text-danger", icon: "cross" };
    default:
      return assertNever(status);
  }
}

export function TxStatus({ status, className }: TxStatusProps) {
  const d = describe(status);
  return (
    <span
      className={cn(
        "border-subtle inline-flex h-7 items-center gap-2 rounded-md border px-2.5",
        "font-mono text-[11px] uppercase tracking-[0.14em]",
        d.className,
        className,
      )}
    >
      {d.icon === "spinner" ? <Spinner size={10} /> : null}
      {d.icon === "dot" ? (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-current"
        />
      ) : null}
      {d.icon === "check" ? <span aria-hidden="true">✓</span> : null}
      {d.icon === "cross" ? <span aria-hidden="true">×</span> : null}
      {d.label}
    </span>
  );
}
