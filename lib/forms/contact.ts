import { z } from "zod";
import { parseFormSchema } from "./validate.ts";

const contactEmail = z.string().email().max(254);

export function primaryContactEmail(schema: unknown, data: unknown): string | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  try {
    const answers = data as Record<string, unknown>;
    for (const field of parseFormSchema(schema).fields) {
      if (field.type !== "email" || !Object.prototype.hasOwnProperty.call(answers, field.id)) continue;
      const value = answers[field.id];
      if (typeof value !== "string" || /[\x00-\x1f\x7f,;]/.test(value)) continue;
      const parsed = contactEmail.safeParse(value.trim());
      if (parsed.success) return parsed.data.toLowerCase();
    }
  } catch {
    return null;
  }
  return null;
}
