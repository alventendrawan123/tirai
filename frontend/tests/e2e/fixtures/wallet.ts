import type { BrowserContext, Page } from "@playwright/test";

export interface MockedWalletOptions {
  publicKey?: string;
  cluster?: "mainnet" | "devnet" | "localnet";
}

const DEVNET_GENESIS_HASH = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";

export async function injectMockPhantom(
  context: BrowserContext,
  opts: MockedWalletOptions = {},
) {
  const publicKey = opts.publicKey ?? "11111111111111111111111111111112";
  const genesis =
    opts.cluster === "mainnet"
      ? "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"
      : DEVNET_GENESIS_HASH;
  await context.addInitScript(
    ({ publicKey, genesis }) => {
      const dispatch = (name: string, detail: unknown) => {
        window.dispatchEvent(new CustomEvent(name, { detail }));
      };

      const wallet = {
        publicKey: { toBase58: () => publicKey, toString: () => publicKey },
        isPhantom: true,
        isConnected: false,
        connect: async () => {
          (wallet as { isConnected: boolean }).isConnected = true;
          dispatch("phantom-connect", { publicKey });
          return { publicKey: wallet.publicKey };
        },
        disconnect: async () => {
          (wallet as { isConnected: boolean }).isConnected = false;
          dispatch("phantom-disconnect", null);
        },
        signTransaction: async (tx: unknown) => tx,
        signAllTransactions: async (txs: unknown[]) => txs,
        signMessage: async (msg: Uint8Array) => ({ signature: msg }),
        on: () => {},
        request: async ({ method }: { method: string }) => {
          if (method === "getGenesisHash") return genesis;
          return null;
        },
      };

      Object.defineProperty(window, "phantom", {
        value: { solana: wallet },
        configurable: true,
      });
      Object.defineProperty(window, "solana", {
        value: wallet,
        configurable: true,
      });
    },
    { publicKey, genesis },
  );
}

export async function waitForReady(page: Page) {
  await page.waitForLoadState("domcontentloaded");
}
