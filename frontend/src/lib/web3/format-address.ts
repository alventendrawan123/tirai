export function formatAddress(
  address: string,
  options: { head?: number; tail?: number } = {},
): string {
  const head = options.head ?? 4;
  const tail = options.tail ?? 4;
  if (address.length <= head + tail + 1) {
    return address;
  }
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

export function solscanAddressUrl(
  address: string,
  cluster: "mainnet" | "devnet" = "mainnet",
): string {
  const suffix = cluster === "mainnet" ? "" : "?cluster=devnet";
  return `https://solscan.io/account/${address}${suffix}`;
}

export function solscanTxUrl(
  signature: string,
  cluster: "mainnet" | "devnet" = "mainnet",
): string {
  const suffix = cluster === "mainnet" ? "" : "?cluster=devnet";
  return `https://solscan.io/tx/${signature}${suffix}`;
}
