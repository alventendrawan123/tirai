import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Container,
  SectionEyebrow,
  SectionHeading,
} from "@/components/ui";

interface Boundary {
  label: string;
  title: string;
  body: string;
}

const BOUNDARIES: ReadonlyArray<Boundary> = [
  {
    label: "Boundary 1",
    title: "Project ↔ Researcher",
    body: "Cloak's shield pool decouples the deposit from the withdrawal. An on-chain observer sees two unrelated transactions.",
  },
  {
    label: "Boundary 2",
    title: "Researcher ↔ Public",
    body: "Fresh-wallet mode delivers funds to an address with no prior history, severing the link to any KYC'd identity.",
  },
  {
    label: "Boundary 3",
    title: "Auditor ↔ Researcher",
    body: "The viewing key is cryptographically scoped to read payment facts only. It cannot trace the destination wallet.",
  },
];

export function LandingPrivacyBoundaries() {
  return (
    <section className="border-subtle border-b">
      <Container size="xl" className="py-20 md:py-24">
        <SectionEyebrow>Privacy boundaries</SectionEyebrow>
        <SectionHeading>
          Three guarantees, enforced cryptographically.
        </SectionHeading>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {BOUNDARIES.map((b) => (
            <Card key={b.label}>
              <CardHeader>
                <p className="text-muted font-mono text-xs uppercase tracking-[0.18em]">
                  {b.label}
                </p>
                <CardTitle>{b.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{b.body}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
