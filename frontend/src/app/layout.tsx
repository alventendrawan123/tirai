import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NetworkMismatchDialog } from "@/components/ui";
import { AppProviders } from "@/providers";
import "./globals.css";

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Tirai",
    template: "Tirai | %s",
  },
  description:
    "Tirai pays Solana whitehats privately. Built on the Cloak SDK with zero-knowledge proofs that decouple researcher identity from on-chain payouts.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-main text-primary flex min-h-full flex-col">
        <AppProviders>
          {children}
          <NetworkMismatchDialog />
        </AppProviders>
      </body>
    </html>
  );
}
