"use client";

import { type ChangeEvent, type FormEvent, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Field,
  FieldError,
  FieldHint,
  FieldLabel,
  Textarea,
} from "@/components/ui";

const HEX_64_RE = /^[0-9a-f]{64}$/iu;

export interface AuditKeyFormProps {
  initialKey?: string;
  isPending: boolean;
  onSubmit: (viewingKey: string) => void;
  onClear?: () => void;
}

export function AuditKeyForm({
  initialKey = "",
  isPending,
  onSubmit,
  onClear,
}: AuditKeyFormProps) {
  const [value, setValue] = useState(initialKey);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    setError(null);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!HEX_64_RE.test(trimmed)) {
      setError("Viewing key must be 64 hexadecimal characters.");
      return;
    }
    onSubmit(trimmed);
  };

  const handleClear = () => {
    setValue("");
    setError(null);
    onClear?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Viewing key</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit} noValidate>
        <CardContent>
          <Field>
            <FieldLabel htmlFor="audit-key">Paste the viewing key</FieldLabel>
            <Textarea
              id="audit-key"
              placeholder="64 hexadecimal characters provided by the project off-chain."
              rows={4}
              value={value}
              onChange={handleChange}
              disabled={isPending}
              aria-invalid={error ? "true" : undefined}
            />
            <FieldHint>
              The key cannot trace destination wallets — that is a privacy
              invariant, not a missing feature.
            </FieldHint>
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>
        </CardContent>
        <CardFooter className="justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={isPending || value.length === 0}
          >
            Clear
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? "Scanning…" : "Scan history"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
