import { FIELD_TYPES, type FormField, type FormSchema, type ValidationResult } from "./types.ts";

const ID_PATTERN = /^[a-z][a-z0-9_]{0,49}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseFormSchema(input: unknown): FormSchema {
  if (!input || typeof input !== "object") throw new Error("Schema must be an object.");
  const candidate = input as Partial<FormSchema>;
  if (candidate.version !== 1 || !Array.isArray(candidate.fields)) throw new Error("Unsupported form schema.");
  if (candidate.fields.length === 0 || candidate.fields.length > 30) throw new Error("Use between 1 and 30 fields.");

  const ids = new Set<string>();
  const fields = candidate.fields.map((value, index) => {
    if (!value || typeof value !== "object") throw new Error(`Field ${index + 1} is invalid.`);
    const field = value as Partial<FormField>;
    if (typeof field.id !== "string" || !ID_PATTERN.test(field.id)) throw new Error(`Field ${index + 1} needs a valid key.`);
    if (["constructor", "prototype", "__proto__"].includes(field.id)) throw new Error("Use a different field key.");
    if (ids.has(field.id)) throw new Error(`Field key “${field.id}” is duplicated.`);
    ids.add(field.id);
    if (typeof field.label !== "string" || !field.label.trim() || field.label.length > 80) throw new Error(`Field ${index + 1} needs a label.`);
    if (!FIELD_TYPES.includes(field.type as FormField["type"])) throw new Error(`Field ${index + 1} has an invalid type.`);
    if (typeof field.required !== "boolean") throw new Error(`Field ${index + 1} has an invalid required value.`);

    const normalized: FormField = {
      id: field.id,
      label: field.label.trim(),
      type: field.type as FormField["type"],
      required: field.required,
    };
    if (field.type === "select") {
      if (!Array.isArray(field.options) || field.options.length < 1 || field.options.length > 50) throw new Error(`Select “${field.label}” needs options.`);
      if (field.options.some(option => typeof option !== "string" || option.length > 200)) throw new Error("Options must be text of at most 200 characters.");
      normalized.options = [...new Set(field.options.map((option) => option.trim()).filter(Boolean))];
      if (!normalized.options.length) throw new Error(`Select “${field.label}” needs options.`);
    }
    if (field.maxLength !== undefined) {
      if (!Number.isInteger(field.maxLength) || field.maxLength < 1 || field.maxLength > 10_000) throw new Error(`Field “${field.label}” has an invalid length.`);
      normalized.maxLength = field.maxLength;
    }
    return normalized;
  });

  return { version: 1, fields };
}

export function validateSubmission(schemaInput: unknown, input: unknown): ValidationResult {
  let schema: FormSchema;
  try {
    schema = parseFormSchema(schemaInput);
  } catch {
    return { success: false, errors: { _form: "This form is not configured correctly." } };
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) return { success: false, errors: { _form: "Submit a JSON object." } };

  const source = input as Record<string, unknown>;
  const allowed = new Set(schema.fields.map((field) => field.id));
  const errors: Record<string, string> = Object.create(null);
  const data: Record<string, string | number | boolean> = Object.create(null);

  for (const key of Object.keys(source)) {
    if (key !== "_gotcha" && !allowed.has(key)) errors[key] = "Unknown field.";
  }

  for (const field of schema.fields) {
    const raw = source[field.id];
    if (field.type === "checkbox") {
      if (raw === undefined && !field.required) continue;
      if (typeof raw !== "boolean") errors[field.id] = "Must be true or false.";
      else if (field.required && raw !== true) errors[field.id] = "Must be accepted.";
      else data[field.id] = raw;
      continue;
    }
    if (raw === undefined || raw === null || (typeof raw === "string" && !raw.trim())) {
      if (field.required) errors[field.id] = "Required.";
      continue;
    }
    if (field.type === "number") {
      const value = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
      if (!Number.isFinite(value)) errors[field.id] = "Must be a number.";
      else data[field.id] = value;
      continue;
    }
    if (typeof raw !== "string") {
      errors[field.id] = "Must be text.";
      continue;
    }
    const value = raw.trim();
    if (field.maxLength && value.length > field.maxLength) errors[field.id] = `Use ${field.maxLength} characters or fewer.`;
    else if (field.type === "email" && !EMAIL_PATTERN.test(value)) errors[field.id] = "Enter a valid email address.";
    else if (field.type === "select" && !field.options?.includes(value)) errors[field.id] = "Choose a valid option.";
    else data[field.id] = value;
  }

  return Object.keys(errors).length ? { success: false, errors: { ...errors } } : { success: true, data: { ...data } };
}
