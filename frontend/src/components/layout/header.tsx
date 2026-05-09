"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container, NetworkBadge, WalletButton } from "@/components/ui";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/bounties", label: "Bounties" },
  { href: "/pay", label: "Pay" },
  { href: "/claim", label: "Claim" },
  { href: "/audit", label: "Audit" },
] as const;

function isActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const pathname = usePathname();
  return (
    <header className="border-subtle bg-main sticky top-0 z-30 border-b backdrop-blur-none">
      <Container size="xl" className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-10">
          <Link
            href="/"
            className="text-primary font-mono text-sm font-medium tracking-[0.18em] uppercase"
          >
            Tirai
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href, pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "text-primary bg-secondary border-strong border"
                      : "text-muted hover:text-primary hover:bg-secondary border border-transparent",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <NetworkBadge cluster="devnet" />
          <WalletButton />
        </div>
      </Container>
    </header>
  );
}
