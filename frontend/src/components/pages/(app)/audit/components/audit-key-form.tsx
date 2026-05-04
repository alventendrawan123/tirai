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
  Textarea,
} from "@/components/ui";

export function AuditKeyForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Viewing key</CardTitle>
      </CardHeader>
      <CardContent>
        <Field>
          <FieldLabel htmlFor="audit-key">Paste the viewing key</FieldLabel>
          <Textarea
            id="audit-key"
            placeholder="Provided by the project off-chain. Read-only scope: payment facts, never destination wallets."
            rows={4}
          />
          <FieldHint>
            The key cannot trace destination wallets — that is a privacy
            invariant, not a missing feature.
          </FieldHint>
        </Field>
      </CardContent>
      <CardFooter className="justify-end">
        <Button variant="primary">Scan history</Button>
      </CardFooter>
    </Card>
  );
}
