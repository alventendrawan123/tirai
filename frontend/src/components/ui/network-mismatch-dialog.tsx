"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import type { Cluster } from "@/config";
import { useCluster } from "@/providers";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";

const GENESIS_CLUSTER: Record<string, Cluster> = {
  "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d": "mainnet",
  EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG: "devnet",
};

export function NetworkMismatchDialog() {
  const { connection } = useConnection();
  const { connected, disconnect } = useWallet();
  const { cluster, label } = useCluster();
  const [walletCluster, setWalletCluster] = useState<Cluster | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!connected) {
      setWalletCluster(null);
      setOpen(false);
      return;
    }
    connection
      .getGenesisHash()
      .then((hash) => {
        if (cancelled) return;
        const detected = GENESIS_CLUSTER[hash] ?? null;
        setWalletCluster(detected);
        if (detected && detected !== cluster && cluster !== "localnet") {
          setOpen(true);
        }
      })
      .catch(() => {
        if (!cancelled) setWalletCluster(null);
      });
    return () => {
      cancelled = true;
    };
  }, [connection, connected, cluster]);

  const handleDisconnect = async () => {
    await disconnect();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Wrong network</DialogTitle>
          <DialogDescription>
            Tirai is set to <span className="font-medium">{label}</span>, but
            your wallet is connected to{" "}
            <span className="font-medium">{walletCluster ?? "another"}</span>{" "}
            network. Switch your wallet network to continue.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Dismiss
          </Button>
          <Button variant="primary" size="sm" onClick={handleDisconnect}>
            Disconnect wallet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
