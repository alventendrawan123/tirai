"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

export interface CopyToClipboardProps {
  value: string;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

export function CopyToClipboard({
  value,
  label = "Copy",
  className,
  size = "sm",
}: CopyToClipboardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }, [value]);

  const dimensions = size === "sm" ? "h-8 px-2.5 text-xs" : "h-10 px-3 text-sm";

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`${label} ${value}`}
      className={cn(
        "border-subtle bg-main hover:bg-secondary text-secondary cursor-pointer",
        "inline-flex items-center gap-1.5 rounded-md border font-mono",
        "transition-colors duration-(--duration-fast)",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-strong focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main",
        dimensions,
        className,
      )}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
