"use client";

import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

export interface QrCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function QrCode({ value, size = 224, className }: QrCodeProps) {
  return (
    <div
      className={cn(
        "border-subtle bg-main inline-flex items-center justify-center rounded-md border p-4",
        className,
      )}
    >
      <QRCodeSVG
        value={value}
        size={size}
        bgColor="transparent"
        fgColor="currentColor"
        level="M"
        marginSize={0}
      />
    </div>
  );
}
