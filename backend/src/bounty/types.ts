export type BountyStatus = "open" | "paid" | "expired" | "cancelled";
export type ApplicationStatus = "pending" | "accepted" | "rejected";

export interface Bounty {
  id: string;
  title: string;
  description: string;
  rewardLamports: bigint;
  deadline: number;
  eligibility?: string;
  ownerWallet: string;
  status: BountyStatus;
  paymentSignature?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Application {
  id: string;
  bountyId: string;
  applicantWallet: string;
  submissionText: string;
  contactHandle?: string;
  status: ApplicationStatus;
  createdAt: number;
  updatedAt: number;
}

export interface CreateBountyInput {
  title: string;
  description: string;
  rewardLamports: bigint;
  deadline: number;
  eligibility?: string;
}

export interface ListBountiesFilter {
  status?: BountyStatus;
  ownerWallet?: string;
  limit?: number;
  afterDeadline?: number;
}

export interface ApplyInput {
  bountyId: string;
  submissionText: string;
  contactHandle?: string;
}

export interface AuthChallenge {
  challenge: string;
  expiresAt: number;
}

export interface VerifyAuthInput {
  walletPubkey: string;
  signature: string;
  challenge: string;
}

export interface AuthSession {
  jwt: string;
  walletPubkey: string;
  expiresAt: number;
}

export interface BountyManageContext {
  supabaseUrl: string;
  jwt: string;
}

export interface BountyReadContext {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export interface AuthContext {
  authVerifierUrl: string;
}
