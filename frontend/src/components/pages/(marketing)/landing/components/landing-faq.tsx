import { Container, SectionEyebrow, SectionHeading } from "@/components/ui";

interface Question {
  q: string;
  a: string;
}

const QUESTIONS: ReadonlyArray<Question> = [
  {
    q: "Is Tirai custodial?",
    a: "No. Funds move directly between the project's wallet, the Cloak shield pool, and the researcher's wallet. Tirai never holds keys or balances.",
  },
  {
    q: "Which chain does Tirai run on?",
    a: "Solana mainnet, via the Cloak Shield Pool program. There is no Tirai program — we consume the existing Cloak deployment.",
  },
  {
    q: "What can the auditor see?",
    a: "Payment amount, date, label, and status. The auditor cannot see the researcher's destination wallet — that field is intentionally absent from the API.",
  },
  {
    q: "What if I lose my fresh wallet's secret key?",
    a: "The funds are unrecoverable. The save-key dialog blocks progression until you confirm you have stored the key.",
  },
];

export function LandingFaq() {
  return (
    <section className="border-subtle border-b">
      <Container size="md" className="py-20 md:py-24">
        <SectionEyebrow>FAQ</SectionEyebrow>
        <SectionHeading>Common questions.</SectionHeading>
        <dl className="divide-border-subtle border-subtle mt-12 divide-y border-y">
          {QUESTIONS.map((item) => (
            <div key={item.q} className="grid gap-2 py-6 md:grid-cols-3">
              <dt className="text-base font-medium md:col-span-1">{item.q}</dt>
              <dd className="text-secondary text-sm leading-relaxed md:col-span-2">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
