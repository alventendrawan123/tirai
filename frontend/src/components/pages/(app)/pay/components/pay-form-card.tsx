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
  Input,
  Textarea,
  TokenAmount,
} from "@/components/ui";
import type { PayFormErrors, PayFormValues } from "../types";

const LAMPORTS_PER_SOL = 1_000_000_000;

const AMOUNT_RE = /^\d+(?:\.\d{1,9})?$/u;

export interface PayFormCardProps {
  walletConnected: boolean;
  onSubmit: (values: PayFormValues) => void | Promise<void>;
  disabled?: boolean;
}

export function PayFormCard({
  walletConnected,
  onSubmit,
  disabled,
}: PayFormCardProps) {
  const [values, setValues] = useState<PayFormValues>({
    amountSol: "",
    label: "",
    memo: "",
  });
  const [errors, setErrors] = useState<PayFormErrors>({});

  const setField =
    <K extends keyof PayFormValues>(key: K) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((prev) => ({ ...prev, [key]: e.target.value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next: PayFormErrors = {};
    if (!walletConnected) {
      next.wallet = "Connect your treasury wallet first.";
    }
    if (!values.amountSol.trim()) {
      next.amountSol = "Amount is required.";
    } else if (!AMOUNT_RE.test(values.amountSol.trim())) {
      next.amountSol = "Enter a positive decimal (max 9 places).";
    }
    if (!values.label.trim()) {
      next.label = "Label is required.";
    } else if (values.label.trim().length > 64) {
      next.label = "Label must be at most 64 characters.";
    }
    if (values.memo.length > 140) {
      next.memo = "Memo must be at most 140 characters.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    await onSubmit({
      amountSol: values.amountSol.trim(),
      label: values.label.trim(),
      memo: values.memo.trim(),
    });
  };

  const previewLamports = previewAmount(values.amountSol);
  const submitDisabled = disabled || !walletConnected;

  return (
    <Card>
      <CardHeader>
        <CardTitle>New bounty payment</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="flex flex-col gap-5">
          <Field>
            <FieldLabel htmlFor="pay-amount">Amount</FieldLabel>
            <Input
              id="pay-amount"
              inputMode="decimal"
              placeholder="0.00"
              value={values.amountSol}
              onChange={setField("amountSol")}
              disabled={submitDisabled}
              aria-invalid={errors.amountSol ? "true" : undefined}
            />
            <FieldHint>
              SOL. Connect a treasury wallet on devnet to enable.
            </FieldHint>
            {errors.amountSol ? (
              <FieldError>{errors.amountSol}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="pay-label">Researcher label</FieldLabel>
            <Input
              id="pay-label"
              placeholder="e.g. Whitehat #042"
              maxLength={64}
              value={values.label}
              onChange={setField("label")}
              disabled={submitDisabled}
              aria-invalid={errors.label ? "true" : undefined}
            />
            <FieldHint>Internal reference. Max 64 characters.</FieldHint>
            {errors.label ? <FieldError>{errors.label}</FieldError> : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="pay-memo">Memo (optional)</FieldLabel>
            <Textarea
              id="pay-memo"
              placeholder="Free-form note encoded into the ticket."
              maxLength={140}
              value={values.memo}
              onChange={setField("memo")}
              disabled={submitDisabled}
              aria-invalid={errors.memo ? "true" : undefined}
            />
            {errors.memo ? <FieldError>{errors.memo}</FieldError> : null}
          </Field>
          <div className="border-subtle bg-secondary flex items-center justify-between rounded-md border px-4 py-3">
            <span className="text-secondary font-mono text-xs uppercase tracking-[0.16em]">
              Estimated total
            </span>
            <TokenAmount
              raw={previewLamports}
              decimals={9}
              symbol="SOL"
              size="md"
            />
          </div>
          {errors.wallet ? (
            <p className="text-danger text-sm">{errors.wallet}</p>
          ) : null}
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" variant="primary" disabled={submitDisabled}>
            {disabled ? "Submitting…" : "Pay bounty"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function previewAmount(input: string): bigint {
  const trimmed = input.trim();
  if (!trimmed || !AMOUNT_RE.test(trimmed)) return 0n;
  const [whole, fraction = ""] = trimmed.split(".");
  const wholeLamports = BigInt(whole) * BigInt(LAMPORTS_PER_SOL);
  if (fraction.length === 0) return wholeLamports;
  const padded = fraction.padEnd(9, "0").slice(0, 9);
  return wholeLamports + BigInt(padded);
}
