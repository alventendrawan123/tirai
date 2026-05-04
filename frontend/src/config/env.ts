import { z } from "zod";

const ClusterSchema = z.enum(["mainnet", "devnet", "localnet"]);

const EnvSchema = z.object({
  NEXT_PUBLIC_SOLANA_CLUSTER: ClusterSchema.default("devnet"),
  NEXT_PUBLIC_SOLANA_RPC_URL: z.string().url(),
});

const parsed = EnvSchema.safeParse({
  NEXT_PUBLIC_SOLANA_CLUSTER: process.env.NEXT_PUBLIC_SOLANA_CLUSTER,
  NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
});

if (!parsed.success) {
  const formatted = parsed.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid environment variables:\n${formatted}`);
}

export const env = parsed.data;
export type Env = z.infer<typeof EnvSchema>;
