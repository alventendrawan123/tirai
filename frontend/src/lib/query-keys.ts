import type { ListBountiesFilter } from "@/types/api";

export const queryKeys = {
  inspectTicket: (raw: string) => ["claim", "inspect", raw] as const,
  auditHistory: (vk: string) => ["audit", vk] as const,
  bountyList: (filter: ListBountiesFilter) =>
    [
      "bounties",
      "list",
      filter.status ?? null,
      filter.ownerWallet ?? null,
      filter.limit ?? null,
      filter.afterDeadline ?? null,
    ] as const,
  bountyById: (id: string) => ["bounties", "detail", id] as const,
  applications: (bountyId: string) => ["applications", bountyId] as const,
};
