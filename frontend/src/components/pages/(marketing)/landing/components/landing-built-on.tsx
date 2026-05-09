import {
  CloakIcon,
  Container,
  type LogoItem,
  LogoLoop,
  SectionEyebrow,
  SolanaIcon,
} from "@/components/ui";

const LOGOS: LogoItem[] = [
  {
    node: (
      <span className="inline-flex items-center gap-2">
        <SolanaIcon size={20} />
        Solana
      </span>
    ),
    ariaLabel: "Solana",
  },
  {
    node: (
      <span className="inline-flex items-center gap-2">
        <CloakIcon size={20} />
        Cloak SDK
      </span>
    ),
    ariaLabel: "Cloak SDK",
  },
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
