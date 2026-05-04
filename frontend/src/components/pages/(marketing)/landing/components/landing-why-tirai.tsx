import { Eye, KeyRound, Layers, ShieldCheck, Wallet } from "lucide-react";
import {
  AnimatedContent,
  BentoCard,
  BentoGrid,
  Container,
  SectionEyebrow,
  SectionHeading,
  SectionLead,
} from "@/components/ui";

export function LandingWhyTirai() {
  return (
    <section className="border-subtle border-b">
      <Container size="xl" className="py-20 md:py-24">
        <AnimatedContent>
          <div className="max-w-2xl">
            <SectionEyebrow>Why Tirai</SectionEyebrow>
            <SectionHeading>
              Whitehat-grade privacy without the operational tax.
            </SectionHeading>
            <SectionLead>
              Tirai is a thin client over the Cloak Shield Pool. There&apos;s
              nothing to host, nothing to deploy, and nothing in your way.
            </SectionLead>
          </div>
        </AnimatedContent>
        <AnimatedContent delay={0.1} className="mt-12">
          <BentoGrid>
            <BentoCard
              icon={<Layers className="h-4 w-4" />}
              eyebrow="Architecture"
              title="No backend, no database"
              description="Every operation runs in the browser. Tirai stores nothing. The only deployed program is the Cloak Shield Pool."
              colSpan={2}
            />
            <BentoCard
              icon={<ShieldCheck className="h-4 w-4" />}
              eyebrow="Cryptography"
              title="Groth16 + Poseidon"
              description="Zero-knowledge proofs and a Poseidon Merkle tree decouple deposits from withdrawals at the protocol layer."
            />
            <BentoCard
              icon={<Wallet className="h-4 w-4" />}
              eyebrow="Wallet UX"
              title="Fresh-wallet by default"
              description="Researchers receive funds on a brand-new keypair with no prior history. KYC links are severed at the source."
            />
            <BentoCard
              icon={<Eye className="h-4 w-4" />}
              eyebrow="Auditor"
              title="Read-only viewing keys"
              description="Auditors see the payment, the amount, the label — never the destination wallet. Enforced in code."
            />
            <BentoCard
              icon={<KeyRound className="h-4 w-4" />}
              eyebrow="Custody"
              title="Non-custodial"
              description="Tirai never holds keys or balances. Funds move directly between wallets and the Cloak pool."
            />
          </BentoGrid>
        </AnimatedContent>
      </Container>
    </section>
  );
}
