export const FIELD_TYPES = ["text", "email", "tel", "number", "textarea", "select", "checkbox"] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export type FormField = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  maxLength?: number;
};

export type FormSchema = {
  version: 1;
  fields: FormField[];
};

export type ValidationResult =
  | { success: true; data: Record<string, string | number | boolean> }
  | { success: false; errors: Record<string, string> };
