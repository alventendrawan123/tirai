import {
  Container,
  DotGrid,
  RoleCtaButton,
  SectionEyebrow,
  ShinyText,
  SplitText,
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
        <SplitText
          tag="h1"
          text="Privacy-first bounty payouts for Solana whitehats."
          className="text-primary mt-6 max-w-3xl text-4xl leading-[1.1] font-medium tracking-tight md:text-6xl"
          delay={28}
          duration={1}
          textAlign="left"
        />
        <p className="text-secondary mt-6 max-w-2xl text-lg leading-relaxed">
          Tirai severs the on-chain link between a researcher&apos;s identity
          and the payment they receive — using zero-knowledge proofs over the{" "}
          <ShinyText
            text="Cloak Shield Pool"
            className="font-medium"
            speed={4}
          />
          . Observers see nothing. Auditors see what they need.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <RoleCtaButton
            href="/pay"
            intent="pay"
            label="Pay a bounty"
            hint="Project treasury"
            variant="primary"
          />
          <RoleCtaButton
            href="/claim"
            intent="claim"
            label="Claim a bounty"
            hint="Researcher"
            variant="outline"
          />
          <RoleCtaButton
            href="/audit"
            intent="audit"
            label="Open audit dashboard"
            hint="Compliance"
            variant="ghost"
          />
        </div>
      </Container>
    </section>
  );
}
