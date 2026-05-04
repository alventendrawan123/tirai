"use client";

import { useTheme } from "next-themes";
import { Toaster } from "sonner";

export function ToastProvider() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="top-right"
      gap={8}
      offset={16}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "bg-main text-primary border border-subtle rounded-md font-sans text-sm",
          title: "text-primary font-medium",
          description: "text-secondary",
          actionButton: "bg-inverse text-inverse rounded-md text-xs",
          cancelButton:
            "bg-secondary text-primary border border-subtle rounded-md text-xs",
          closeButton: "bg-main text-secondary border border-subtle",
        },
      }}
    />
  );
}
