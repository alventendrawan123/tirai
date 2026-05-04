import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Field,
  FieldHint,
  FieldLabel,
  Input,
  Textarea,
  TokenAmount,
} from "@/components/ui";

export function PayFormCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>New bounty payment</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <Field>
          <FieldLabel htmlFor="pay-amount">Amount</FieldLabel>
          <Input
            id="pay-amount"
            inputMode="decimal"
            placeholder="0.00"
            disabled
          />
          <FieldHint>SOL — connect a treasury wallet to enable.</FieldHint>
        </Field>
        <Field>
          <FieldLabel htmlFor="pay-label">Researcher label</FieldLabel>
          <Input
            id="pay-label"
            placeholder="e.g. Whitehat #042"
            maxLength={64}
            disabled
          />
          <FieldHint>Internal reference. Max 64 characters.</FieldHint>
        </Field>
        <Field>
          <FieldLabel htmlFor="pay-memo">Memo (optional)</FieldLabel>
          <Textarea
            id="pay-memo"
            placeholder="Free-form note shown to the auditor only."
            disabled
          />
        </Field>
        <div className="border-subtle bg-secondary flex items-center justify-between rounded-md border px-4 py-3">
          <span className="text-secondary text-xs uppercase tracking-[0.16em] font-mono">
            Estimated total
          </span>
          <TokenAmount raw={0n} decimals={9} symbol="SOL" size="md" />
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button variant="primary" disabled>
          Pay bounty
        </Button>
      </CardFooter>
    </Card>
  );
}
