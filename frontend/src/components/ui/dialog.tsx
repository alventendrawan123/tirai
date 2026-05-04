"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;

export type DialogContentSide = "center" | "right";

export interface DialogContentProps
  extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: DialogContentSide;
  showClose?: boolean;
  preventClose?: boolean;
}

const SIDE_CLASSES: Record<DialogContentSide, string> = {
  center:
    "left-1/2 top-1/2 w-[min(92vw,480px)] -translate-x-1/2 -translate-y-1/2 rounded-md",
  right:
    "right-0 top-0 h-dvh w-[min(92vw,420px)] border-l border-y-0 border-r-0 rounded-none",
};

export function DialogOverlay({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-[var(--color-overlay,rgba(0,0,0,0.6))]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

export function DialogContent({
  side = "center",
  showClose = true,
  preventClose = false,
  className,
  children,
  ...props
}: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        onEscapeKeyDown={preventClose ? (e) => e.preventDefault() : undefined}
        onPointerDownOutside={
          preventClose ? (e) => e.preventDefault() : undefined
        }
        onInteractOutside={preventClose ? (e) => e.preventDefault() : undefined}
        className={cn(
          "bg-main text-primary border-subtle fixed z-50 flex flex-col border p-6 shadow-md outline-none",
          SIDE_CLASSES[side],
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          className,
        )}
        {...props}
      >
        {children}
        {showClose && !preventClose ? (
          <DialogPrimitive.Close
            className="text-secondary hover:text-primary focus-visible:ring-strong absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

export interface DialogHeaderProps {
  className?: string;
  children?: ReactNode;
}

export function DialogHeader({ className, children }: DialogHeaderProps) {
  return (
    <div className={cn("mb-4 flex flex-col gap-1.5 pr-8", className)}>
      {children}
    </div>
  );
}

export function DialogFooter({ className, children }: DialogHeaderProps) {
  return (
    <div
      className={cn(
        "mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DialogTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn(
        "text-primary text-lg leading-tight font-medium tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-secondary text-sm leading-relaxed", className)}
      {...props}
    />
  );
}
