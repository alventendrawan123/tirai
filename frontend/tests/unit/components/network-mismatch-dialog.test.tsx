import type { WalletContextState } from "@solana/wallet-adapter-react";
import { ConnectionContext, WalletContext } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NetworkMismatchDialog } from "@/components/ui/network-mismatch-dialog";
import type { ClusterConfig } from "@/config";
import { ClusterProvider } from "@/providers/cluster-provider";

const MAINNET_GENESIS = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";
const DEVNET_GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";

function makeWallet(connected: boolean): WalletContextState {
  return {
    autoConnect: false,
    wallets: [],
    wallet: null,
    publicKey: connected
      ? new PublicKey("11111111111111111111111111111112")
      : null,
    connecting: false,
    connected,
    disconnecting: false,
    select: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    sendTransaction: vi.fn(),
  } as unknown as WalletContextState;
}

function makeCluster(
  cluster: "mainnet" | "devnet" | "localnet",
): ClusterConfig {
  return {
    cluster,
    rpcProxyPath: "/api/rpc",
    label: cluster,
    explorerBase: "x",
  };
}

function harness(opts: {
  appCluster: "mainnet" | "devnet" | "localnet";
  walletGenesis: string;
  connected: boolean;
}) {
  const connection = new Connection("http://localhost:8899");
  vi.spyOn(connection, "getGenesisHash").mockResolvedValue(opts.walletGenesis);
  return {
    ui: (
      <ClusterProvider value={makeCluster(opts.appCluster)}>
        <ConnectionContext.Provider value={{ connection }}>
          <WalletContext.Provider value={makeWallet(opts.connected)}>
            <NetworkMismatchDialog />
          </WalletContext.Provider>
        </ConnectionContext.Provider>
      </ClusterProvider>
    ),
  };
}

describe("NetworkMismatchDialog", () => {
  it("does NOT show when wallet cluster matches app cluster", async () => {
    const { ui } = harness({
      appCluster: "mainnet",
      walletGenesis: MAINNET_GENESIS,
      connected: true,
    });
    render(ui);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(/wrong network/i)).not.toBeInTheDocument();
  });

  it("shows when wallet on devnet but app on mainnet", async () => {
    const { ui } = harness({
      appCluster: "mainnet",
      walletGenesis: DEVNET_GENESIS,
      connected: true,
    });
    render(ui);
    await waitFor(() => {
      expect(screen.getByText(/wrong network/i)).toBeInTheDocument();
    });
  });

  it("does NOT show on localnet (skipped check)", async () => {
    const { ui } = harness({
      appCluster: "localnet",
      walletGenesis: DEVNET_GENESIS,
      connected: true,
    });
    render(ui);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(/wrong network/i)).not.toBeInTheDocument();
  });
});
