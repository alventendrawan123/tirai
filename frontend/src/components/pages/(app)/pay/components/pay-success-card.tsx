import Link from "next/link";
import {
  buttonVariants,
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
import type { PaySuccessTicket } from "../types";

export interface PaySuccessCardProps {
  ticket: PaySuccessTicket;
}

export function PaySuccessCard({ ticket }: PaySuccessCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Bounty paid</CardTitle>
          <TxStatus status="confirmed" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 lg:flex-row">
        <div className="flex flex-col items-start gap-4">
          <QrCode value={ticket.ticket} size={196} />
          <a
            href={solscanTxUrl(ticket.txSignature, "devnet")}
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
              Amount
            </p>
            <TokenAmount
              raw={ticket.amountRaw}
              decimals={ticket.decimals}
              symbol={ticket.symbol}
              size="xl"
              className="mt-2"
            />
          </div>
          <div>
            <p className="text-muted font-mono text-xs uppercase tracking-[0.18em]">
              Researcher label
            </p>
            <p className="text-primary mt-2 text-base">{ticket.label}</p>
          </div>
          <div>
            <p className="text-muted font-mono text-xs uppercase tracking-[0.18em]">
              Claim ticket
            </p>
            <div className="border-subtle bg-secondary mt-2 flex items-start gap-3 rounded-md border p-3">
              <code className="text-primary flex-1 break-all font-mono text-xs leading-relaxed">
                {ticket.ticket}
              </code>
              <CopyToClipboard value={ticket.ticket} label="Copy" />
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-secondary text-xs leading-relaxed">
          Send this ticket to the researcher off-chain (Signal, Discord DM, or
          QR scan). It is the only way to claim — there is no on-chain link.
        </p>
        <Link
          href="/pay"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Pay another bounty
        </Link>
      </CardFooter>
    </Card>
  );
}
