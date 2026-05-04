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

export function ClaimInspector() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Inspect a claim ticket</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="claim-ticket">Claim ticket</FieldLabel>
          <Textarea
            id="claim-ticket"
            placeholder="Paste the opaque ticket string shared with you, or scan its QR code."
            rows={5}
          />
          <FieldHint>
            Inspecting is read-only. No signature is requested until you
            proceed.
          </FieldHint>
        </Field>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="ghost" size="sm">
          Scan QR
        </Button>
        <Button variant="primary">Inspect ticket</Button>
      </CardFooter>
    </Card>
  );
}
