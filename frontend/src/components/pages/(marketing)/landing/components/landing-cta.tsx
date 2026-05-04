import {
  AnimatedContent,
  Container,
  RoleCtaButton,
  SectionEyebrow,
} from "@/components/ui";

export function LandingCta() {
  return (
    <section className="border-subtle border-b">
      <Container size="xl" className="py-20 md:py-28">
        <AnimatedContent>
          <div className="border-strong bg-secondary flex flex-col gap-8 rounded-md border p-10 md:p-14">
            <SectionEyebrow>Ready to ship</SectionEyebrow>
            <h2 className="max-w-3xl text-3xl leading-[1.1] font-medium tracking-tight md:text-5xl">
              Three roles. Three routes. Zero coordination.
            </h2>
            <p className="text-secondary max-w-2xl text-base leading-relaxed">
              Pick a flow and start exploring. No signup, no API key — every
              path runs entirely in your browser against the Cloak Shield Pool.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
          </div>
        </AnimatedContent>
      </Container>
    </section>
  );
}
