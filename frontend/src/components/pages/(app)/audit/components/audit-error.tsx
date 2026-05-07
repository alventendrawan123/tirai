import { EmptyState } from "@/components/ui";

export interface AuditErrorProps {
  message?: string;
}

export function AuditError({ message }: AuditErrorProps) {
  return (
    <EmptyState
      title="Could not scan history"
      description={
        message ??
        "The viewing key could not be parsed or returned an unexpected response. Verify the key with the project and try again."
      }
    />
  );
}
