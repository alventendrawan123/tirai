import { notFound } from "next/navigation";
import {
  AddressPill,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Container,
  CopyToClipboard,
  EmptyState,
  Field,
  FieldHint,
  FieldLabel,
  Input,
  NetworkBadge,
  QrCode,
  Skeleton,
  Spinner,
  Textarea,
  TokenAmount,
  TxStatus,
  WalletButton,
} from "@/components/ui";
import { KitchenSection } from "./components";

const SAMPLE_ADDRESS = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";
const SAMPLE_TICKET = "tirai_v1_aT93dBcQ8R0M1nL4yX7bP2sUe5gKwHzQ_fA";

export function KitchenSinkPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Container size="xl" className="py-12">
      <header className="border-subtle border-b pb-6">
        <p className="text-secondary font-mono text-xs uppercase tracking-[0.2em]">
          Internal · /kitchen-sink
        </p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight">
          Design system review
        </h1>
        <p className="text-secondary mt-2 max-w-2xl text-sm leading-relaxed">
          Visual review surface for every primitive. Dev-only. Returns 404 in
          production builds.
        </p>
      </header>

      <KitchenSection title="Buttons">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button size="sm">Small</Button>
        <Button size="lg">Large</Button>
        <Button disabled>Disabled</Button>
      </KitchenSection>

      <KitchenSection title="Badges">
        <Badge>Default</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="solid">Solid</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="warning">Warning</Badge>
        <Badge variant="danger">Danger</Badge>
        <Badge variant="info">Info</Badge>
      </KitchenSection>

      <KitchenSection title="Network · Wallet">
        <NetworkBadge cluster="mainnet" />
        <NetworkBadge cluster="devnet" />
        <NetworkBadge cluster="localnet" />
        <WalletButton />
        <WalletButton address={SAMPLE_ADDRESS} cluster="devnet" />
      </KitchenSection>

      <KitchenSection title="Address · Token amount · Copy">
        <AddressPill address={SAMPLE_ADDRESS} cluster="devnet" />
        <TokenAmount raw={1_500_000_000n} decimals={9} symbol="SOL" size="lg" />
        <TokenAmount raw={42_000_000n} decimals={6} symbol="USDC" />
        <CopyToClipboard value={SAMPLE_TICKET} label="Copy ticket" />
      </KitchenSection>

      <KitchenSection title="Transaction status">
        <TxStatus status="idle" />
        <TxStatus status="submitting" />
        <TxStatus status="confirming" />
        <TxStatus status="confirmed" />
        <TxStatus status="failed" />
      </KitchenSection>

      <KitchenSection title="Inputs">
        <Field className="w-72">
          <FieldLabel htmlFor="ks-input">Amount</FieldLabel>
          <Input id="ks-input" placeholder="0.00" />
          <FieldHint>SOL</FieldHint>
        </Field>
        <Field className="w-72">
          <FieldLabel htmlFor="ks-textarea">Memo</FieldLabel>
          <Textarea id="ks-textarea" placeholder="Free-form note." rows={3} />
        </Field>
      </KitchenSection>

      <KitchenSection title="Cards">
        <Card className="w-80">
          <CardHeader>
            <CardTitle>Card title</CardTitle>
            <CardDescription>
              A short description that explains what this card is about.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-secondary text-sm">Body content goes here.</p>
          </CardContent>
        </Card>
      </KitchenSection>

      <KitchenSection title="Loading">
        <Spinner />
        <Spinner size={28} />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-72" />
      </KitchenSection>

      <KitchenSection title="Empty state">
        <div className="w-full">
          <EmptyState
            title="Nothing to show yet"
            description="When data is available, it will render here. The auditor never sees the destination wallet."
          />
        </div>
      </KitchenSection>

      <KitchenSection title="QR code">
        <QrCode value={SAMPLE_TICKET} size={180} />
      </KitchenSection>
    </Container>
  );
}
