import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CopyToClipboard,
  QrCode,
  TokenAmount,
  TxStatus,
} from "@/components/ui";
import { solscanTxUrl } from "@/lib/web3";
import type { BountyPaymentResult, Cluster } from "@/types/api";

export interface PaySuccessCardProps {
  result: BountyPaymentResult;
  amountLamports: bigint;
  label: string;
  cluster: Cluster;
  onReset: () => void;
  recipientContactHandle?: string;
  bountyTitle?: string;
}

export function PaySuccessCard({
  result,
  amountLamports,
  label,
  cluster,
  onReset,
  recipientContactHandle,
  bountyTitle,
}: PaySuccessCardProps) {
  const explorerCluster = cluster === "mainnet" ? "mainnet" : "devnet";
  const handoffMessage = buildHandoffMessage({
    bountyTitle: bountyTitle ?? label,
    ticket: result.ticket.raw,
  });
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Bounty paid</CardTitle>
          <TxStatus status="confirmed" />
        </div>
      </CardHeader>
      <CardContent className="border-subtle bg-secondary mb-6 flex flex-col gap-3 rounded-md border p-4">
        <p className="text-primary text-sm font-medium">
          Next step — deliver the ticket off-chain
        </p>
        <p className="text-secondary text-xs leading-relaxed">
          {recipientContactHandle ? (
            <>
              Send the claim ticket below to <strong>{recipientContactHandle}</strong> via
              Telegram / email / DM. <strong>Tirai never transmits tickets</strong> —
              that&apos;s how we keep the payment unlinkable to the recipient
              wallet on-chain.
            </>
          ) : (
            <>
              Send the claim ticket below to your accepted researcher via
              Telegram / email / DM. <strong>Tirai never transmits tickets</strong> —
              that&apos;s how we keep the payment unlinkable to the recipient
              wallet on-chain.
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <CopyToClipboard
            value={handoffMessage}
            label="Copy ready-to-send message"
          />
          <CopyToClipboard value={result.ticket.raw} label="Copy ticket only" />
        </div>
      </CardContent>
      <CardContent className="flex flex-col gap-6 lg:flex-row">
        <div className="flex flex-col items-start gap-4">
          <QrCode value={result.ticket.raw} size={196} />
          <a
            href={solscanTxUrl(result.signature, explorerCluster)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-secondary hover:text-primary text-xs underline-offset-2 hover:underline"
          >
            View transaction on Solscan
          </a>
        </div>
        <div className="flex flex-1 flex-col gap-5">
          <div>
            <p className="text-muted font-mono text-xs uppercase tracking-[0.18em]">
              Ticket amount
            </p>
            <TokenAmount
              raw={amountLamports}
              decimals={9}
              symbol="SOL"
              size="xl"
              className="mt-2"
            />
            <p className="text-muted mt-1 font-mono text-[10px]">
              Fee {formatLamports(result.feeLamports)} SOL · Label {label}
            </p>
          </div>
          <div>
            <p className="text-muted font-mono text-xs uppercase tracking-[0.18em]">
              Claim ticket
            </p>
            <div className="border-subtle bg-secondary mt-2 flex items-start gap-3 rounded-md border p-3">
              <code className="text-primary flex-1 break-all font-mono text-xs leading-relaxed">
                {result.ticket.raw}
              </code>
              <CopyToClipboard value={result.ticket.raw} label="Copy" />
            </div>
          </div>
          <div>
            <p className="text-muted font-mono text-xs uppercase tracking-[0.18em]">
              Viewing key (auditor)
            </p>
            <div className="border-subtle bg-secondary mt-2 flex items-start gap-3 rounded-md border p-3">
              <code className="text-primary flex-1 break-all font-mono text-xs leading-relaxed">
                {result.viewingKey}
              </code>
              <CopyToClipboard value={result.viewingKey} label="Copy" />
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-secondary text-xs leading-relaxed">
          Send the ticket off-chain to the researcher. Keep the viewing key
          private — it lets an auditor scan history without revealing the
          recipient.
        </p>
        <Button variant="outline" size="sm" onClick={onReset}>
          Pay another bounty
        </Button>
      </CardFooter>
    </Card>
  );
}

function formatLamports(lamports: bigint): string {
  const sol = Number(lamports) / 1_000_000_000;
  return sol.toLocaleString(undefined, { maximumFractionDigits: 9 });
}

function buildHandoffMessage({
  bountyTitle,
  ticket,
}: {
  bountyTitle: string;
  ticket: string;
}): string {
  return [
    `Bounty payout: ${bountyTitle}`,
    "",
    "Open https://tirai.app/claim and paste the ticket below to claim your reward.",
    "You can claim into your existing wallet, or generate a fresh wallet for max privacy.",
    "",
    "Ticket:",
    ticket,
  ].join("\n");
}
