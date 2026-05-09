"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Container,
  Field,
  FieldError,
  FieldHint,
  FieldLabel,
  Input,
  SectionEyebrow,
  SectionLead,
  Textarea,
  WalletAuthButton,
  WalletButton,
} from "@/components/ui";
import { useCreateBountyMutation } from "@/features/bounty-board";
import { mapTiraiError } from "@/lib/errors";
import { useAuth } from "@/providers";

const LAMPORTS_PER_SOL = 1_000_000_000;

export function NewBountyPage() {
  const wallet = useWallet();
  const { session } = useAuth();
  const router = useRouter();
  const createMutation = useCreateBountyMutation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rewardSol, setRewardSol] = useState("0.1");
  const [deadlineDays, setDeadlineDays] = useState("7");
  const [eligibility, setEligibility] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    const reward = Number(rewardSol);
    const days = Number(deadlineDays);
    const newErrors: Record<string, string> = {};
    if (title.trim().length === 0) newErrors.title = "Title required";
    if (description.trim().length === 0) newErrors.description = "Description required";
    if (!Number.isFinite(reward) || reward <= 0)
      newErrors.rewardSol = "Reward must be > 0 SOL";
    if (!Number.isFinite(days) || days <= 0)
      newErrors.deadlineDays = "Deadline must be > 0 days";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const result = await createMutation.mutateAsync({
      title: title.trim(),
      description: description.trim(),
      rewardLamports: BigInt(Math.floor(reward * LAMPORTS_PER_SOL)),
      deadline: Date.now() + days * 24 * 60 * 60 * 1000,
      ...(eligibility.trim().length > 0
        ? { eligibility: eligibility.trim() }
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
    toast.success("Bounty created");
    router.push(`/bounties/${result.value.id}`);
  };

  if (!wallet.connected) {
    return (
      <Container size="md" className="py-16 md:py-20">
        <SectionEyebrow>Bounty board · /bounties/new</SectionEyebrow>
        <h1 className="mt-4 text-3xl font-medium tracking-tight md:text-4xl">
          Connect wallet to post a bounty
        </h1>
        <SectionLead>
          You need a Solana wallet to sign in and post a bounty.
        </SectionLead>
        <div className="mt-6">
          <WalletButton />
        </div>
      </Container>
    );
  }

  if (!session) {
    return (
      <Container size="md" className="py-16 md:py-20">
        <SectionEyebrow>Bounty board · /bounties/new</SectionEyebrow>
        <h1 className="mt-4 text-3xl font-medium tracking-tight md:text-4xl">
          Sign in with your wallet
        </h1>
        <SectionLead>
          Bounty creation requires a one-time wallet signature. The signature
          never touches the chain — it just proves ownership for the next hour.
        </SectionLead>
        <div className="mt-6">
          <WalletAuthButton />
        </div>
      </Container>
    );
  }

  return (
    <Container size="md" className="py-16 md:py-20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <SectionEyebrow>Bounty board · /bounties/new</SectionEyebrow>
          <h1 className="mt-4 text-3xl font-medium tracking-tight md:text-4xl">
            Post a bounty
          </h1>
        </div>
        <WalletButton />
      </div>
      <SectionLead>
        Bounty metadata is public. Payment happens privately via Cloak after a
        researcher is accepted.
      </SectionLead>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
        <Field>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Find XSS in admin panel"
          />
          <FieldHint>1-120 characters</FieldHint>
          {errors.title ? <FieldError>{errors.title}</FieldError> : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={5000}
            rows={6}
            placeholder="Detailed description of the bug, scope, expected proof..."
          />
          <FieldHint>Markdown supported, 1-5000 chars</FieldHint>
          {errors.description ? (
            <FieldError>{errors.description}</FieldError>
          ) : null}
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="rewardSol">Reward (SOL)</FieldLabel>
            <Input
              id="rewardSol"
              type="number"
              step="0.01"
              min="0"
              value={rewardSol}
              onChange={(e) => setRewardSol(e.target.value)}
            />
            {errors.rewardSol ? (
              <FieldError>{errors.rewardSol}</FieldError>
            ) : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="deadlineDays">Deadline (days from now)</FieldLabel>
            <Input
              id="deadlineDays"
              type="number"
              step="1"
              min="1"
              value={deadlineDays}
              onChange={(e) => setDeadlineDays(e.target.value)}
            />
            {errors.deadlineDays ? (
              <FieldError>{errors.deadlineDays}</FieldError>
            ) : null}
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="eligibility">Eligibility (optional)</FieldLabel>
          <Input
            id="eligibility"
            value={eligibility}
            onChange={(e) => setEligibility(e.target.value)}
            placeholder="Open to all"
          />
        </Field>

        <div className="flex justify-end gap-2">
          <Button
            type="submit"
            variant="primary"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating…" : "Create bounty"}
          </Button>
        </div>
      </form>
    </Container>
  );
}
