"use client";

import { AddressPill } from "./address-pill";
import { Button } from "./button";

export interface WalletButtonProps {
  address?: string;
  cluster?: "mainnet" | "devnet";
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function WalletButton({
  address,
  cluster = "mainnet",
  onConnect,
  onDisconnect,
}: WalletButtonProps) {
  if (!address) {
    return (
      <Button size="sm" variant="primary" onClick={onConnect}>
        Connect wallet
      </Button>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <AddressPill address={address} cluster={cluster} withCopy={false} />
      <Button size="sm" variant="outline" onClick={onDisconnect}>
        Disconnect
      </Button>
    </span>
  );
}
