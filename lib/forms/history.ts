import { parseFormSchema } from "./validate.ts";

export function historicalColumns(current: unknown, submissions: { schemaSnapshot: unknown; data: unknown }[]) {
  const columns = new Map(parseFormSchema(current).fields.map(field => [field.id, { id: field.id, labels: [field.label] }]));
  for (const submission of submissions) {
    const fields = submission.schemaSnapshot ? parseFormSchema(submission.schemaSnapshot).fields : [];
    for (const field of fields) {
      const previous = columns.get(field.id);
      if (previous && !previous.labels.includes(field.label)) previous.labels.push(field.label);
      else if (!previous) columns.set(field.id, { id: field.id, labels: [field.label] });
    }
    for (const key of Object.keys((submission.data ?? {}) as Record<string, unknown>)) if (!columns.has(key)) columns.set(key, { id: key, labels: [key] });
  }
  return [...columns.values()];
}
