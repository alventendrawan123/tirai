import type { WalletContextState } from "@solana/wallet-adapter-react";
import { ConnectionContext, WalletContext } from "@solana/wallet-adapter-react";
import { Connection, type PublicKey } from "@solana/web3.js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderOptions, render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import type { ClusterConfig } from "@/config";
import { ClusterProvider } from "@/providers/cluster-provider";
import type { Cluster } from "@/types/api";
import { makeMockWallet } from "./mock-wallet";

export interface ProviderOptions {
  cluster?: Cluster;
  rpcProxyPath?: string;
  wallet?: Partial<{
    publicKey: PublicKey | null;
    connected: boolean;
    connecting: boolean;
  }>;
  walletOverride?: WalletContextState;
  queryClient?: QueryClient;
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function buildClusterConfig(
  cluster: Cluster,
  rpcProxyPath: string,
): ClusterConfig {
  const labels: Record<Cluster, string> = {
    mainnet: "Mainnet",
    devnet: "Devnet",
    localnet: "Localnet",
  };
  const explorers: Record<Cluster, string> = {
    mainnet: "https://solscan.io",
    devnet: "https://solscan.io?cluster=devnet",
    localnet:
      "https://solscan.io?cluster=custom&customUrl=http://localhost:8899",
  };
  return {
    cluster,
    rpcProxyPath,
    wsEndpoint: "ws://localhost:8900",
    label: labels[cluster],
    explorerBase: explorers[cluster],
  };
}

export function buildProviderTree(opts: ProviderOptions = {}) {
  const cluster = opts.cluster ?? "devnet";
  const rpcProxyPath = opts.rpcProxyPath ?? "/api/rpc";
  const queryClient = opts.queryClient ?? createTestQueryClient();
  const wallet = opts.walletOverride ?? makeMockWallet(opts.wallet ?? {});
  const connection = new Connection("http://localhost:8899", "confirmed");
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ClusterProvider value={buildClusterConfig(cluster, rpcProxyPath)}>
        <ConnectionContext.Provider value={{ connection }}>
          <WalletContext.Provider value={wallet}>
            {children}
          </WalletContext.Provider>
        </ConnectionContext.Provider>
      </ClusterProvider>
    </QueryClientProvider>
  );
  return { Wrapper, queryClient, wallet, connection };
}

export function renderWithProviders(
  ui: ReactElement,
  options: ProviderOptions = {},
  renderOptions?: RenderOptions,
) {
  const { Wrapper, queryClient, wallet, connection } =
    buildProviderTree(options);
  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
    wallet,
    connection,
  };
}
