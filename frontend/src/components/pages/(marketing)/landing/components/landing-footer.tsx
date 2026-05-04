import { Container, NetworkBadge } from "@/components/ui";

export function LandingFooter() {
  return (
    <footer className="border-subtle border-t">
      <Container
        size="xl"
        className="flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <p className="text-base font-medium">Tirai</p>
          <p className="text-secondary mt-1 text-sm">
            Privacy-first bounty payouts on Solana.
          </p>
        </div>
        <div className="text-secondary flex items-center gap-4 text-sm">
          <a
            href="https://github.com/alventendrawan123/tirai"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            GitHub
          </a>
          <span aria-hidden="true">·</span>
          <NetworkBadge cluster="devnet" />
        </div>
      </Container>
    </footer>
  );
}
