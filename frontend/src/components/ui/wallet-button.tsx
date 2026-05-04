"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { AddressPill } from "./address-pill";
import { Button } from "./button";
import { WalletConnectSheet } from "./wallet-connect-sheet";

export interface WalletButtonProps {
  address?: string;
  cluster?: "mainnet" | "devnet";
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function WalletButton({
  address: addressProp,
  cluster: clusterProp = "mainnet",
  onConnect,
  onDisconnect,
}: WalletButtonProps) {
  const { publicKey, connected, connecting, disconnect } = useWallet();
  const [open, setOpen] = useState(false);

  const liveAddress = publicKey?.toBase58();
  const address = addressProp ?? liveAddress;

  const handleConnect = () => {
    if (onConnect) {
      onConnect();
      return;
    }
    setOpen(true);
  };

  const handleDisconnect = async () => {
    if (onDisconnect) {
      onDisconnect();
      return;
    }
    await disconnect();
  };

  if (!address) {
    return (
      <>
        <Button
          size="sm"
          variant="primary"
          onClick={handleConnect}
          disabled={connecting}
        >
          {connecting ? "Connecting…" : "Connect wallet"}
        </Button>
        <WalletConnectSheet open={open} onOpenChange={setOpen} />
      </>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <AddressPill address={address} cluster={clusterProp} withCopy={false} />
      <Button
        size="sm"
        variant="outline"
        onClick={handleDisconnect}
        disabled={!connected && !addressProp}
      >
        Disconnect
      </Button>
    </span>
  );
}
