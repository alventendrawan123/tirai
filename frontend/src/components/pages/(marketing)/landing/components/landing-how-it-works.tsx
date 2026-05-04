import { Container, SectionEyebrow, SectionHeading } from "@/components/ui";

interface Step {
  index: string;
  title: string;
  body: string;
}

const STEPS: ReadonlyArray<Step> = [
  {
    index: "01",
    title: "Project deposits",
    body: "Treasury wallet funds the bounty into the Cloak shield pool. A claim ticket is generated and shared off-chain.",
  },
  {
    index: "02",
    title: "Cloak pool decouples",
    body: "Groth16 proofs and a Poseidon Merkle tree break the on-chain link between the depositor and the recipient.",
  },
  {
    index: "03",
    title: "Researcher withdraws",
    body: "Withdrawal lands on a fresh wallet with no prior history. The auditor sees the payment, not the destination.",
  },
];

export function LandingHowItWorks() {
  return (
    <section className="border-subtle border-b">
      <Container size="xl" className="py-20 md:py-24">
        <SectionEyebrow>How it works</SectionEyebrow>
        <SectionHeading>
          One deposit. One withdrawal. No traceable link.
        </SectionHeading>
        <ol className="border-subtle bg-border-subtle mt-12 grid gap-px border md:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.index} className="bg-main p-8">
              <p className="text-muted font-mono text-xs">{step.index}</p>
              <h3 className="mt-4 text-lg font-medium">{step.title}</h3>
              <p className="text-secondary mt-3 text-sm leading-relaxed">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
