export type SearchResult = { id: string; title: string; detail: string; href: string; kind: "form" | "enquiry" };

export function searchQuery(value: string | null) {
  const query = (value ?? "").trim();
  return query.length >= 2 && query.length <= 120 ? query : "";
}

export function searchTitle(data: unknown) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return "Enquiry";
  const values = Object.values(data).filter((value): value is string => typeof value === "string" && Boolean(value.trim()));
  return (values[0] ?? "Enquiry").slice(0, 100);
}
