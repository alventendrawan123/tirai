import {
  AddressPill,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  TokenAmount,
  TxStatus,
} from "@/components/ui";
import { solscanTxUrl } from "@/lib/web3";
import type { ClaimBountyResult, Cluster } from "@/types/api";

export interface ClaimSuccessCardProps {
  result: ClaimBountyResult;
  expectedAmountLamports: bigint;
  cluster: Cluster;
  onReset: () => void;
}

export function ClaimSuccessCard({
  result,
  expectedAmountLamports,
  cluster,
  onReset,
}: ClaimSuccessCardProps) {
  const explorerCluster = cluster === "mainnet" ? "mainnet" : "devnet";
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
            Received (before fee)
          </p>
          <TokenAmount
            raw={expectedAmountLamports}
            decimals={9}
            symbol="SOL"
            size="xl"
            className="mt-2"
          />
        </div>
        <div>
          <p className="text-muted font-mono text-xs uppercase tracking-[0.18em]">
            Destination wallet ({result.mode})
          </p>
          <div className="mt-2">
            <AddressPill
              address={result.destination}
              cluster={explorerCluster}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <a
          href={solscanTxUrl(result.signature, explorerCluster)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-secondary hover:text-primary text-xs underline-offset-2 hover:underline"
        >
          View transaction on Solscan
        </a>
        <Button variant="outline" size="sm" onClick={onReset}>
          Claim another
        </Button>
      </CardFooter>
    </Card>
  );
}
