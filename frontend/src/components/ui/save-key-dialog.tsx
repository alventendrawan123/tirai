"use client";

import bs58 from "bs58";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { AddressPill } from "./address-pill";
import { Button } from "./button";
import { CopyToClipboard } from "./copy-to-clipboard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";

export interface SaveKeyDialogProps {
  open: boolean;
  destination: string;
  secretKey: Uint8Array;
  onAcknowledge: () => void;
}

export function SaveKeyDialog({
  open,
  destination,
  secretKey,
  onAcknowledge,
}: SaveKeyDialogProps) {
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!open) setConfirmed(false);
  }, [open]);

  const secretBase58 = useMemo(() => bs58.encode(secretKey), [secretKey]);

  const handleConfirm = (e: ChangeEvent<HTMLInputElement>) => {
    setConfirmed(e.target.checked);
  };

  const handleDownload = () => {
    const blob = new Blob([secretBase58], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tirai-fresh-wallet-${destination.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <Dialog open={open}>
      <DialogContent
        showClose={false}
        preventClose
        className="w-[min(96vw,560px)]"
      >
        <DialogHeader>
          <DialogTitle>Save your fresh wallet secret key</DialogTitle>
          <DialogDescription>
            This is the only copy. Tirai never stores it. Without this key the
            funds are lost forever.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-muted font-mono text-xs uppercase tracking-[0.18em]">
              Destination address
            </p>
            <div className="mt-2">
              <AddressPill
                address={destination}
                cluster="devnet"
                withCopy={false}
                withExplorer
              />
            </div>
          </div>
          <div>
            <p className="text-muted font-mono text-xs uppercase tracking-[0.18em]">
              Secret key (base58)
            </p>
            <div className="border-strong bg-secondary mt-2 flex items-start gap-3 rounded-md border p-3">
              <code className="text-primary flex-1 break-all font-mono text-[11px] leading-relaxed">
                {secretBase58}
              </code>
              <CopyToClipboard value={secretBase58} label="Copy" />
            </div>
            <div className="mt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                Download .txt
              </Button>
            </div>
          </div>
          <label className="border-subtle flex cursor-pointer items-start gap-3 rounded-md border p-3">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={handleConfirm}
              className="mt-1 accent-current"
            />
            <span className="text-secondary text-sm leading-relaxed">
              I have saved this key in a password manager or other safe place. I
              understand it cannot be recovered if lost.
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button
            variant="primary"
            disabled={!confirmed}
            onClick={onAcknowledge}
          >
            I have saved it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
