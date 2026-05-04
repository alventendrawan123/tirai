import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  TxStatus,
} from "@/components/ui";

export function PayErrorCard() {
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
          The transaction was rejected before reaching the network. No funds
          have moved. You can safely retry — your wallet was not charged.
        </p>
      </CardContent>
      <CardFooter className="justify-end">
        <Button variant="primary">Retry</Button>
      </CardFooter>
    </Card>
  );
}
