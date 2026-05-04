import Link from "next/link";
import {
  buttonVariants,
  Container,
  DotGrid,
  SectionEyebrow,
} from "@/components/ui";

export function LandingHero() {
  return (
    <section className="border-subtle relative overflow-hidden border-b">
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <DotGrid
          dotSize={2}
          gap={28}
          proximity={140}
          shockRadius={220}
          shockStrength={3}
        />
      </div>
      <Container size="xl" className="relative py-24 md:py-32">
        <SectionEyebrow>
          Tirai · Cloak Hackathon · Frontier Track
        </SectionEyebrow>
        <h1 className="mt-6 max-w-3xl text-4xl leading-[1.1] font-medium tracking-tight md:text-6xl">
          Privacy-first bounty payouts for Solana whitehats.
        </h1>
        <p className="text-secondary mt-6 max-w-2xl text-lg leading-relaxed">
          Tirai severs the on-chain link between a researcher&apos;s identity
          and the payment they receive — using zero-knowledge proofs over the
          Cloak Shield Pool. Observers see nothing. Auditors see what they need.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/pay" className={buttonVariants({ variant: "primary" })}>
            Pay a bounty
          </Link>
          <Link
            href="/claim"
            className={buttonVariants({ variant: "outline" })}
          >
            Claim a bounty
          </Link>
          <Link href="/audit" className={buttonVariants({ variant: "ghost" })}>
            Open audit dashboard
          </Link>
        </div>
      </Container>
    </section>
  );
}
