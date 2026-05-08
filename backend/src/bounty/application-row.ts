import type { Application } from "./types";

export interface ApplicationRow {
  id: string;
  bounty_id: string;
  applicant_wallet: string;
  submission_text: string;
  contact_handle: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function rowToApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    bountyId: row.bounty_id,
    applicantWallet: row.applicant_wallet,
    submissionText: row.submission_text,
    ...(row.contact_handle !== null
      ? { contactHandle: row.contact_handle }
      : {}),
    status: row.status as Application["status"],
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}
