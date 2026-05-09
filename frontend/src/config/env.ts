import { z } from "zod";

const ClusterSchema = z.enum(["mainnet", "devnet", "localnet"]);

const ClientEnvSchema = z.object({
  NEXT_PUBLIC_SOLANA_CLUSTER: ClusterSchema.default("devnet"),
  NEXT_PUBLIC_RPC_PROXY_PATH: z.string().min(1).default("/api/rpc"),
  NEXT_PUBLIC_SOLANA_WS_URL: z.string().optional(),
  NEXT_PUBLIC_SOLANA_RPC_URL: z.string().optional(),
  NEXT_PUBLIC_DOMAIN: z.string().url().default("https://tirai-frontier.app"),
});

const ServerEnvSchema = z.object({
  SOLANA_RPC_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  AUTH_VERIFIER_URL: z.string().url(),
});

const clientParsed = ClientEnvSchema.safeParse({
  NEXT_PUBLIC_SOLANA_CLUSTER: process.env.NEXT_PUBLIC_SOLANA_CLUSTER,
  NEXT_PUBLIC_RPC_PROXY_PATH: process.env.NEXT_PUBLIC_RPC_PROXY_PATH,
  NEXT_PUBLIC_SOLANA_WS_URL: process.env.NEXT_PUBLIC_SOLANA_WS_URL,
  NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
  NEXT_PUBLIC_DOMAIN: process.env.NEXT_PUBLIC_DOMAIN,
});

if (!clientParsed.success) {
  const formatted = clientParsed.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid client environment variables:\n${formatted}`);
}

export const env = clientParsed.data;
export type Env = z.infer<typeof ClientEnvSchema>;

export function readServerEnv(): z.infer<typeof ServerEnvSchema> {
  const parsed = ServerEnvSchema.safeParse({
    SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    AUTH_VERIFIER_URL: process.env.AUTH_VERIFIER_URL,
  });
  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid server environment variables:\n${formatted}`);
  }
  return parsed.data;
}
