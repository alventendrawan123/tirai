export const queryKeys = {
  inspectTicket: (raw: string) => ["claim", "inspect", raw] as const,
  auditHistory: (vk: string) => ["audit", vk] as const,
};
