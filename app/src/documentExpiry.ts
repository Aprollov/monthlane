import { fromDateKey, toDateKey } from "./dates.ts";
import type { DocumentRecord } from "./types.ts";

export const documentCategories = { ids: "IDs & Passports", visas: "Visas & Permits", cards: "Bank Cards" } as const;
export type DocumentCategory = keyof typeof documentCategories;
export const categoryOf = (record?: DocumentRecord): DocumentCategory =>
  record?.category === "visas" || record?.category === "cards" ? record.category : "ids";

// A card stays valid throughout its printed expiry month. No day is inferred.
export function expiryStatus(record: DocumentRecord, today: string) {
  if (categoryOf(record) === "cards") {
    const month = today.slice(0, 7);
    return record.expiry < month ? "Expired" : record.expiry === month ? "Expires this month" : "";
  }
  const soon = fromDateKey(today);
  soon.setDate(soon.getDate() + 30);
  return record.expiry < today ? "Expired" : record.expiry <= toDateKey(soon) ? "Expiring soon" : "";
}
