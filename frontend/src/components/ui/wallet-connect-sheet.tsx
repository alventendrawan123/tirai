"use client";

import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog";

export interface WalletConnectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WalletConnectSheet({
  open,
  onOpenChange,
}: WalletConnectSheetProps) {
  const { wallets, select, connect, connected, connecting } = useWallet();

  useEffect(() => {
    if (connected) onOpenChange(false);
  }, [connected, onOpenChange]);

  const handleSelect = async (name: string) => {
    try {
      select(name as Parameters<typeof select>[0]);
      await connect();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Wallet connection failed";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side="right">
        <DialogHeader>
          <DialogTitle>Connect a wallet</DialogTitle>
          <DialogDescription>
            Pick the Solana wallet you want to use with Tirai.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2">
          {wallets.map((entry) => {
            const ready =
              entry.readyState === WalletReadyState.Installed ||
              entry.readyState === WalletReadyState.Loadable;
            return (
              <li key={entry.adapter.name}>
                <button
                  type="button"
                  onClick={() => handleSelect(entry.adapter.name)}
                  disabled={!ready || connecting}
                  className="border-subtle hover:bg-secondary focus-visible:ring-strong group flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors duration-(--duration-fast) focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="bg-secondary border-subtle flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border">
                    {entry.adapter.icon ? (
                      // biome-ignore lint/performance/noImgElement: wallet icons are inline data URLs
                      <img
                        src={entry.adapter.icon}
                        alt=""
                        className="h-6 w-6 grayscale"
                      />
                    ) : null}
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className="text-primary text-sm font-medium">
                      {entry.adapter.name}
                    </span>
                    <span className="text-muted text-xs">
                      {ready ? "Detected" : "Not installed"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
