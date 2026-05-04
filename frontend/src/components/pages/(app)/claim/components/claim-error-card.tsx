import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  TxStatus,
} from "@/components/ui";

export function ClaimErrorCard() {
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
          The withdrawal could not be completed. The ticket has not been
          consumed — you can safely retry.
        </p>
      </CardContent>
      <CardFooter className="justify-end">
        <Button variant="primary">Retry</Button>
      </CardFooter>
    </Card>
  );
}
