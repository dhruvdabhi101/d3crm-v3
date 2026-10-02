import type { LeadStatus } from "@prisma/client";

export const LEAD_STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST", "SPAM"];
export function statusLabel(value: string) { return value.charAt(0) + value.slice(1).toLowerCase(); }
export function pageNumber(value?: string) { const page = Number(value); return Number.isSafeInteger(page) && page > 0 ? page : 1; }
