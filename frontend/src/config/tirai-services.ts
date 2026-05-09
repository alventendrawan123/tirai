const PROXY_AUTH_PATH = "/api/auth";
const PROXY_SUPABASE_PATH = "/api/supabase";
const SSR_FALLBACK_ORIGIN = "http://localhost:3000";

function origin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return SSR_FALLBACK_ORIGIN;
}

export const tiraiServices = {
  get supabaseUrl(): string {
    return `${origin()}${PROXY_SUPABASE_PATH}`;
  },
  get supabaseAnonKey(): string {
    return "proxied";
  },
  get authVerifierUrl(): string {
    return `${origin()}${PROXY_AUTH_PATH}`;
  },
} as const;

export const supabaseReadCtx = {
  get supabaseUrl(): string {
    return tiraiServices.supabaseUrl;
  },
  get supabaseAnonKey(): string {
    return tiraiServices.supabaseAnonKey;
  },
} as const;
