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

export interface ClaimErrorCardProps {
  error: MappedTiraiError;
  onRetry: () => void;
}

export function ClaimErrorCard({ error, onRetry }: ClaimErrorCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Claim failed</CardTitle>
          <TxStatus status="failed" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-secondary text-sm leading-relaxed">
          {error.message}
        </p>
      </CardContent>
      <CardFooter className="justify-end">
        <Button variant="primary" onClick={onRetry}>
          {error.retryable ? "Retry" : "Back"}
        </Button>
      </CardFooter>
    </Card>
  );
}
