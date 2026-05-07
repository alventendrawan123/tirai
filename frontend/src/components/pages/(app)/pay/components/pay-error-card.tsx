import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  TxStatus,
} from "@/components/ui";
import type { MappedTiraiError } from "@/lib/errors";

export interface PayErrorCardProps {
  error: MappedTiraiError;
  onRetry: () => void;
}

export function PayErrorCard({ error, onRetry }: PayErrorCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Payment failed</CardTitle>
          <TxStatus status="failed" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-secondary text-sm leading-relaxed">
          {error.message}
        </p>
        {error.field ? (
          <p className="text-muted mt-2 font-mono text-xs">
            Field: {error.field}
          </p>
        ) : null}
        {error.detail ? (
          <details className="border-subtle mt-4 rounded-md border p-3">
            <summary className="text-muted cursor-pointer font-mono text-[11px] uppercase tracking-[0.16em]">
              Technical detail
            </summary>
            <pre className="text-secondary mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed">
              {error.detail}
            </pre>
          </details>
        ) : null}
      </CardContent>
      <CardFooter className="justify-end">
        <Button variant="primary" onClick={onRetry}>
          {error.retryable ? "Retry" : "Back to form"}
        </Button>
      </CardFooter>
    </Card>
  );
}
