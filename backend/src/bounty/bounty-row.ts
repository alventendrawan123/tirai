// Shared row → domain mapping for bounty rows. Avoid duplicating
// snake_case → camelCase conversion across multiple read functions.

import type { Bounty } from "./types";

export interface BountyRow {
  id: string;
  title: string;
  description: string;
  reward_lamports: string;
  deadline: string;
  eligibility: string | null;
  owner_wallet: string;
  status: string;
  payment_signature: string | null;
  created_at: string;
  updated_at: string;
}

export function rowToBounty(row: BountyRow): Bounty {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    rewardLamports: BigInt(row.reward_lamports),
    deadline: new Date(row.deadline).getTime(),
    ...(row.eligibility !== null ? { eligibility: row.eligibility } : {}),
    ownerWallet: row.owner_wallet,
    status: row.status as Bounty["status"],
    ...(row.payment_signature !== null
      ? { paymentSignature: row.payment_signature }
      : {}),
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}
