import type { Connection } from "@solana/web3.js";
import { inspectClaimTicket } from "@tirai/api";
import type {
  AppError,
  ClaimTicketPreview,
  Cluster,
  Result,
} from "@/types/api";

export async function inspectTicketAdapter(
  ticketRaw: string,
  ctx: { connection: Connection; cluster: Cluster },
): Promise<Result<ClaimTicketPreview, AppError>> {
  return inspectClaimTicket(ticketRaw, ctx);
}
