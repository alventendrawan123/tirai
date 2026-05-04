import Link from "next/link";
import { Container, NetworkBadge, WalletButton } from "@/components/ui";

const NAV_LINKS = [
  { href: "/pay", label: "Pay" },
  { href: "/claim", label: "Claim" },
  { href: "/audit", label: "Audit" },
] as const;

export function Header() {
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
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-secondary hover:text-primary hover:bg-secondary rounded-md px-3 py-2 text-sm font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}
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
