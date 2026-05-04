import {
  AddressPill,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CopyToClipboard,
  TokenAmount,
  TxStatus,
} from "@/components/ui";
import { solscanTxUrl } from "@/lib/web3";
import type { ClaimSuccess } from "../types";

export interface ClaimSuccessCardProps {
  result: ClaimSuccess;
}

export function ClaimSuccessCard({ result }: ClaimSuccessCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Withdrawal complete</CardTitle>
          <TxStatus status="confirmed" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div>
          <p className="text-muted font-mono text-xs uppercase tracking-[0.18em]">
            Received
          </p>
          <TokenAmount
            raw={result.amountRaw}
            decimals={result.decimals}
            symbol={result.symbol}
            size="xl"
            className="mt-2"
          />
        </div>
        <div>
          <p className="text-muted font-mono text-xs uppercase tracking-[0.18em]">
            Destination wallet
          </p>
          <div className="mt-2">
            <AddressPill address={result.destination} cluster="devnet" />
          </div>
        </div>
        {result.mode === "fresh" && result.generatedSecret ? (
          <div className="border-strong rounded-md border p-4">
            <p className="text-primary text-sm font-medium">
              Save your secret key
            </p>
            <p className="text-secondary mt-2 text-xs leading-relaxed">
              This is the only copy. Without it, the funds are unrecoverable.
              Tirai never stores it.
            </p>
            <div className="border-subtle bg-secondary mt-3 flex items-start gap-3 rounded-md border p-3">
              <code className="text-primary flex-1 break-all font-mono text-[11px] leading-relaxed">
                {result.generatedSecret}
              </code>
              <CopyToClipboard value={result.generatedSecret} label="Copy" />
            </div>
          </div>
        ) : null}
      </CardContent>
      <CardFooter>
        <a
          href={solscanTxUrl(result.txSignature, "devnet")}
          target="_blank"
          rel="noopener noreferrer"
          className="text-secondary hover:text-primary text-xs underline-offset-2 hover:underline"
        >
          View transaction on Solscan
        </a>
      </CardFooter>
    </Card>
  );
}
