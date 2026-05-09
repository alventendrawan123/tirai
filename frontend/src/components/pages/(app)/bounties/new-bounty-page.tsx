"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import {
  AutocompleteInput,
  Button,
  Container,
  Field,
  FieldError,
  FieldHint,
  FieldLabel,
  Input,
  SectionEyebrow,
  SectionLead,
  SolanaIcon,
  Textarea,
  WalletAuthButton,
  WalletButton,
} from "@/components/ui";
import { useCreateBountyMutation } from "@/features/bounty-board";
import { mapTiraiError } from "@/lib/errors";
import { useAuth } from "@/providers";

const LAMPORTS_PER_SOL = 1_000_000_000;

const TITLE_TEMPLATES: ReadonlyArray<{
  title: string;
  description: string;
}> = [
  {
    title: "Find XSS in admin panel",
    description:
      "Looking for stored or reflected XSS in /admin routes.\n\nScope:\n- /admin/users\n- /admin/settings\n\nProof required: working PoC with payload + impacted user role.",
  },
  {
    title: "SQL injection in API endpoints",
    description:
      "Hunt for SQLi in any public REST endpoint.\n\nScope: every route under /api/*.\nOut of scope: /api/internal/*.\n\nProof: extract version() or current_user() from prod-like environment.",
  },
  {
    title: "Authentication bypass",
    description:
      "Bypass session checks, JWT validation, or 2FA.\n\nScope: login flow, password reset, OAuth callbacks.\n\nProof: access another user's account without their credentials.",
  },
  {
    title: "Smart contract audit (Anchor program)",
    description:
      "Review the on-chain program for logic flaws, reentrancy, integer over/underflow, missing access control.\n\nScope: programs/* (devnet deployed).\n\nProof: failing test case or annotated PoC tx.",
  },
  {
    title: "RCE vulnerability hunt",
    description:
      "Remote code execution on any service we own.\n\nProof: callback to controlled DNS or file read of /etc/passwd equivalent.",
  },
  {
    title: "CSRF protection review",
    description:
      "Identify state-changing endpoints missing CSRF tokens or SameSite cookie protection.\n\nProof: cross-origin form that triggers state change.",
  },
  {
    title: "Privilege escalation bug",
    description:
      "Move from a low-privileged user role to higher privileges.\n\nProof: user → admin transition without admin credentials.",
  },
  {
    title: "Open redirect on login flow",
    description:
      "Find an open redirect chained with auth.\n\nProof: post-login redirect to attacker-controlled domain that leaks tokens.",
  },
  {
    title: "Sensitive data exposure",
    description:
      "Find PII, secrets, or API keys exposed in JS bundles, error pages, or public endpoints.\n\nProof: extracted credential + provenance.",
  },
  {
    title: "Broken access control review",
    description:
      "IDOR, missing object-level checks, exposed admin routes.\n\nProof: read or modify another tenant's data.",
  },
  {
    title: "SSRF in webhooks / image proxy",
    description:
      "Server-side request forgery via user-supplied URLs.\n\nProof: hit internal metadata endpoint (169.254.169.254) or internal-only service.",
  },
  {
    title: "Deserialization vulnerability",
    description:
      "Untrusted deserialization in any endpoint accepting binary or pickled payloads.\n\nProof: gadget chain → code execution or DoS.",
  },
];

const TITLE_SUGGESTIONS = TITLE_TEMPLATES.map((t) => t.title);
const TEMPLATE_BY_TITLE = new Map(TITLE_TEMPLATES.map((t) => [t.title, t]));

const ELIGIBILITY_SUGGESTIONS: ReadonlyArray<string> = [
  "Open to all",
  "Verified researchers only",
  "First-time submitters welcome",
  "KYC required for payout",
  "Solana-focused researchers preferred",
  "Whitelisted wallets only",
];

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
          <AutocompleteInput
            id="title"
            value={title}
            onChange={setTitle}
            onSelectSuggestion={(picked) => {
              const template = TEMPLATE_BY_TITLE.get(picked);
              if (template && description.trim().length === 0) {
                setDescription(template.description);
              }
            }}
            suggestions={TITLE_SUGGESTIONS}
            maxLength={120}
            placeholder="Find XSS in admin panel"
            emptyHint="No template matches — write your own"
          />
          <FieldHint>
            1-120 characters. Pick a template to autofill description, or write
            your own.
          </FieldHint>
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
            <FieldLabel htmlFor="rewardSol">
              <span className="inline-flex items-center gap-1.5">
                Reward (SOL)
                <SolanaIcon size={12} />
              </span>
            </FieldLabel>
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
          <AutocompleteInput
            id="eligibility"
            value={eligibility}
            onChange={setEligibility}
            suggestions={ELIGIBILITY_SUGGESTIONS}
            placeholder="Open to all"
          />
          <FieldHint>Free-form. Suggestions are common patterns.</FieldHint>
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
