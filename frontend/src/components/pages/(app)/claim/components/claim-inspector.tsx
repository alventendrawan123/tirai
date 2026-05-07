"use client";

import { type ChangeEvent, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  FieldHint,
  FieldLabel,
  Spinner,
  Textarea,
} from "@/components/ui";

export interface ClaimInspectorProps {
  ticket: string;
  onTicketChange: (value: string) => void;
  isInspecting: boolean;
}

const DEBOUNCE_MS = 300;

export function ClaimInspector({
  ticket,
  onTicketChange,
  isInspecting,
}: ClaimInspectorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onTicketChange(value);
    }, DEBOUNCE_MS);
  };

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
            defaultValue={ticket}
            onChange={handleChange}
          />
          <FieldHint>
            Inspecting is read-only. No signature is requested until you
            proceed.
          </FieldHint>
        </Field>
        {isInspecting ? (
          <div className="text-secondary inline-flex items-center gap-2 text-xs">
            <Spinner size={12} />
            <span>Inspecting ticket…</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
