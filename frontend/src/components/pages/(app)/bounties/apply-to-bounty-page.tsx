"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Container,
  EmptyState,
  Field,
  FieldError,
  FieldHint,
  FieldLabel,
  Input,
  SectionEyebrow,
  SectionLead,
  Skeleton,
  Textarea,
  WalletAuthButton,
  WalletButton,
} from "@/components/ui";
import {
  useApplyToBountyMutation,
  useBountyQuery,
} from "@/features/bounty-board";
import { mapTiraiError } from "@/lib/errors";
import { useAuth } from "@/providers";

export interface ApplyToBountyPageProps {
  bountyId: string;
}

export function ApplyToBountyPage({ bountyId }: ApplyToBountyPageProps) {
  const wallet = useWallet();
  const { session } = useAuth();
  const router = useRouter();
  const bountyQuery = useBountyQuery({ id: bountyId });
  const applyMutation = useApplyToBountyMutation();

  const [submissionText, setSubmissionText] = useState("");
  const [contactHandle, setContactHandle] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (submissionText.trim().length === 0) {
      setErrors({ submissionText: "Submission required" });
      return;
    }
    const result = await applyMutation.mutateAsync({
      bountyId,
      submissionText: submissionText.trim(),
      ...(contactHandle.trim().length > 0
        ? { contactHandle: contactHandle.trim() }
        : {}),
    });
    if (!result.ok) {
      const mapped = mapTiraiError(result.error);
      toast.error(mapped.message);
      if (
        result.error.kind === "INVALID_INPUT" &&
        result.error.field !== "auth"
      ) {
        setErrors({ [result.error.field]: result.error.message });
      }
      return;
    }
    toast.success("Application submitted");
    router.push(`/bounties/${bountyId}`);
  };

  if (!wallet.connected) {
    return (
      <Container size="md" className="py-16 md:py-20">
        <SectionEyebrow>Bounty board · /apply</SectionEyebrow>
        <h1 className="mt-4 text-3xl font-medium tracking-tight md:text-4xl">
          Connect wallet to apply
        </h1>
        <SectionLead>You need a Solana wallet to apply.</SectionLead>
        <div className="mt-6">
          <WalletButton />
        </div>
      </Container>
    );
  }

  if (!session) {
    return (
      <Container size="md" className="py-16 md:py-20">
        <SectionEyebrow>Bounty board · /apply</SectionEyebrow>
        <h1 className="mt-4 text-3xl font-medium tracking-tight md:text-4xl">
          Sign in to apply
        </h1>
        <SectionLead>One-time wallet signature, valid 1 hour.</SectionLead>
        <div className="mt-6">
          <WalletAuthButton />
        </div>
      </Container>
    );
  }

  const bounty =
    bountyQuery.data?.ok === true ? bountyQuery.data.value : undefined;

  return (
    <Container size="md" className="py-16 md:py-20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <SectionEyebrow>
            Bounty board · /bounties/{bountyId.slice(0, 8)}…/apply
          </SectionEyebrow>
          <h1 className="mt-4 text-3xl font-medium tracking-tight md:text-4xl">
            Apply to bounty
          </h1>
        </div>
        <WalletButton />
      </div>

      {bountyQuery.isLoading ? (
        <Skeleton className="mt-8 h-32 w-full rounded-md" />
      ) : null}

      {bounty ? (
        <div className="border-subtle bg-secondary mt-8 rounded-md border p-5">
          <p className="text-muted font-mono text-xs uppercase tracking-[0.18em]">
            Applying to
          </p>
          <p className="text-primary mt-2 text-lg font-medium">
            {bounty.title}
          </p>
        </div>
      ) : null}

      {bountyQuery.data && !bountyQuery.data.ok ? (
        <EmptyState
          title="Could not load bounty"
          description={mapTiraiError(bountyQuery.data.error).message}
        />
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
        <Field>
          <FieldLabel htmlFor="submissionText">Submission</FieldLabel>
          <Textarea
            id="submissionText"
            value={submissionText}
            onChange={(e) => setSubmissionText(e.target.value)}
            maxLength={5000}
            rows={8}
            placeholder="Describe the bug, repro steps, impact, fix suggestion…"
          />
          <FieldHint>
            1-5000 chars. Markdown OK. Owner sees this; chain doesn’t.
          </FieldHint>
          {errors.submissionText ? (
            <FieldError>{errors.submissionText}</FieldError>
          ) : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="contactHandle">Contact handle (optional)</FieldLabel>
          <Input
            id="contactHandle"
            value={contactHandle}
            onChange={(e) => setContactHandle(e.target.value)}
            placeholder="@bima_telegram"
          />
          <FieldHint>
            Owner uses this to send you the Cloak ticket off-chain when accepted.
          </FieldHint>
        </Field>

        <div className="flex justify-end gap-2">
          <Button
            type="submit"
            variant="primary"
            disabled={applyMutation.isPending}
          >
            {applyMutation.isPending ? "Submitting…" : "Submit application"}
          </Button>
        </div>
      </form>
    </Container>
  );
}
