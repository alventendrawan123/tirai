"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Container,
  NetworkBadge,
  ThemeToggle,
  WalletButton,
} from "@/components/ui";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/bounties", label: "Bounties" },
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
          <Link href="/" aria-label="Tirai home" className="inline-flex items-center">
            <Image
              src="/Assets/Images/Logo/tirai-logo.svg"
              alt="Tirai"
              width={32}
              height={32}
              priority
              className="h-8 w-8 dark:invert"
            />
          </Link>
          <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href, pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative py-2 text-sm font-medium transition-colors",
                    active ? "text-primary" : "text-muted hover:text-primary",
                  )}
                >
                  {link.label}
                  {active ? (
                    <span
                      aria-hidden="true"
                      className="border-strong absolute -bottom-px left-0 right-0 border-b"
                    />
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <NetworkBadge cluster="devnet" />
          <ThemeToggle />
          <WalletButton />
        </div>
      </Container>
    </header>
  );
}
