import { env } from "./env";

export const tiraiServices = {
  supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  authVerifierUrl: env.NEXT_PUBLIC_AUTH_VERIFIER_URL,
} as const;

export const supabaseReadCtx = {
  supabaseUrl: tiraiServices.supabaseUrl,
  supabaseAnonKey: tiraiServices.supabaseAnonKey,
} as const;
