export const ATTRIBUTION_KEYS = ["landing_page", "referrer", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
export type Attribution = Partial<Record<typeof ATTRIBUTION_KEYS[number], string>>;

export function submissionInput(input: unknown): { data: unknown; attribution: Attribution } {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { data: input, attribution: {} };
  const { _context, ...data } = input as Record<string, unknown>;
  if (_context === undefined) return { data, attribution: {} };
  if (!_context || typeof _context !== "object" || Array.isArray(_context)) throw new Error("Context must be an object.");
  const attribution: Attribution = {};
  for (const [key, value] of Object.entries(_context)) {
    if (!ATTRIBUTION_KEYS.includes(key as typeof ATTRIBUTION_KEYS[number])) throw new Error("Unknown context field.");
    const isUrl = key === "landing_page" || key === "referrer";
    if (typeof value !== "string" || value.length > (isUrl ? 2048 : 200)) throw new Error("Context values must be text within the allowed length.");
    let text = value.trim();
    if (!text) continue;
    if (isUrl) {
      const url = new URL(text);
      if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("Use HTTP or HTTPS context URLs without credentials.");
      // URL query strings and fragments can contain personal data or account tokens.
      text = `${url.origin}${url.pathname}`;
    } else if (key === "utm_source" || key === "utm_medium") text = text.toLowerCase();
    attribution[key as keyof Attribution] = text;
  }
  return { data, attribution };
}

export function attributionLabel(value: unknown, origin: string | null) {
  const context = value as Attribution | null;
  return context?.utm_source || origin || "Unknown";
}
