"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  TokenAmount,
} from "@/components/ui";
import type { ClaimTicketPreview } from "@/types/api";
import type { WalletMode } from "../types";

export interface ClaimPreviewCardProps {
  preview: ClaimTicketPreview;
  mode: WalletMode;
  onModeChange: (mode: WalletMode) => void;
  walletConnected: boolean;
  onClaim: () => void;
  disabled?: boolean;
}

export function ClaimPreviewCard({
  preview,
  mode,
  onModeChange,
  walletConnected,
  onClaim,
  disabled,
}: ClaimPreviewCardProps) {
  const claimDisabled =
    Boolean(disabled) ||
    !preview.isClaimable ||
    (mode === "existing" && !walletConnected);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Ticket preview</CardTitle>
          <Badge variant={preview.isClaimable ? "outline" : "solid"}>
            {preview.isClaimable ? "Claimable" : "Already claimed"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div>
          <p className="text-muted font-mono text-xs uppercase tracking-[0.18em]">
            You will receive
          </p>
          <TokenAmount
            raw={preview.amountLamports}
            decimals={9}
            symbol={preview.tokenMint ?? "SOL"}
            size="xl"
            className="mt-2"
          />
        </div>
        <dl className="border-subtle grid grid-cols-2 gap-px border bg-border-subtle">
          <div className="bg-main p-4">
            <dt className="text-muted font-mono text-[11px] uppercase tracking-[0.16em]">
              Label
            </dt>
            <dd className="text-primary mt-2 text-sm">
              {preview.label || "—"}
            </dd>
          </div>
          <div className="bg-main p-4">
            <dt className="text-muted font-mono text-[11px] uppercase tracking-[0.16em]">
              Expiry
            </dt>
            <dd className="text-primary mt-2 text-sm">
              {preview.expiresAt
                ? new Date(preview.expiresAt).toLocaleString()
                : "None"}
            </dd>
          </div>
        </dl>
        <fieldset className="border-subtle flex flex-col gap-3 rounded-md border p-4">
          <legend className="text-muted px-1 font-mono text-[11px] uppercase tracking-[0.16em]">
            Wallet mode
          </legend>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="radio"
              name="wallet-mode"
              value="fresh"
              checked={mode === "fresh"}
              onChange={() => onModeChange("fresh")}
              className="mt-1 accent-current"
            />
            <span>
              <span className="text-primary block text-sm font-medium">
                Fresh wallet (recommended)
              </span>
              <span className="text-secondary mt-1 block text-xs leading-relaxed">
                Tirai generates a brand-new keypair. Maximum privacy. You must
                save the secret key — it is the only way to spend the funds.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="radio"
              name="wallet-mode"
              value="existing"
              checked={mode === "existing"}
              onChange={() => onModeChange("existing")}
              className="mt-1 accent-current"
            />
            <span>
              <span className="text-primary block text-sm font-medium">
                Existing wallet
              </span>
              <span className="text-secondary mt-1 block text-xs leading-relaxed">
                Funds land on your connected wallet. Less private. Requires a
                connected wallet adapter.
              </span>
            </span>
          </label>
        </fieldset>
      </CardContent>
      <CardFooter className="justify-end">
        <Button variant="primary" onClick={onClaim} disabled={claimDisabled}>
          {preview.isClaimable ? "Claim now" : "Already claimed"}
        </Button>
      </CardFooter>
    </Card>
  );
}
