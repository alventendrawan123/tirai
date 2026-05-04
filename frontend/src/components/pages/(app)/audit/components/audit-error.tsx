import { EmptyState } from "@/components/ui";

export function AuditError() {
  return (
    <EmptyState
      title="Could not scan history"
      description="The viewing key could not be parsed or returned an unexpected response. Verify the key with the project and try again."
    />
  );
}
