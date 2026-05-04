import { EmptyState } from "@/components/ui";

export function AuditEmpty() {
  return (
    <EmptyState
      title="No payments visible to this viewing key yet"
      description="Once the project records bounty payments tied to this key, they will appear here. The destination wallet will never be shown."
    />
  );
}
