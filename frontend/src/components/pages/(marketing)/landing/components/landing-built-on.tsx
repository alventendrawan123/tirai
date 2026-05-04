import {
  Container,
  type LogoItem,
  LogoLoop,
  SectionEyebrow,
} from "@/components/ui";

const LOGOS: LogoItem[] = [
  { node: "Solana" },
  { node: "Cloak SDK" },
  { node: "Groth16" },
  { node: "Poseidon" },
  { node: "Phantom" },
  { node: "Solflare" },
  { node: "Surfpool" },
  { node: "Helius" },
];

export function LandingBuiltOn() {
  return (
    <section className="border-subtle border-b">
      <Container size="xl" className="flex flex-col gap-6 py-12 md:py-14">
        <SectionEyebrow>Built on</SectionEyebrow>
        <LogoLoop
          logos={LOGOS}
          speed={40}
          gap={56}
          logoHeight={18}
          ariaLabel="Tirai is built on these primitives"
          className="font-mono"
        />
      </Container>
    </section>
  );
}
