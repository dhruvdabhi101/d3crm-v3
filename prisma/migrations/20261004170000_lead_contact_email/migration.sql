ALTER TABLE "Submission" ADD COLUMN "contactEmail" TEXT;

-- A present, malformed snapshot never falls back to a newer form schema.
WITH sources AS (
  SELECT s.id, s.data, COALESCE(NULLIF(s."schemaSnapshot", 'null'::jsonb), f.schema) AS schema
  FROM "Submission" s JOIN "Form" f ON f.id = s."formId"
  WHERE jsonb_typeof(s.data) = 'object'
), fields AS (
  SELECT s.id, s.data, s.schema, entry.field, entry.position
  FROM sources s
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(s.schema->'fields') = 'array' THEN s.schema->'fields' ELSE '[]'::jsonb END
  ) WITH ORDINALITY AS entry(field, position)
  WHERE jsonb_typeof(s.schema) = 'object' AND s.schema->'version' = '1'::jsonb
), valid_schemas AS (
  SELECT id
  FROM fields
  GROUP BY id
  HAVING count(*) BETWEEN 1 AND 30
    AND count(DISTINCT field->>'id') = count(*)
    AND bool_and(COALESCE(
      jsonb_typeof(field) = 'object'
      AND jsonb_typeof(field->'id') = 'string'
      AND (field->>'id') ~ '^[a-z][a-z0-9_]{0,49}$'
      AND (field->>'id') NOT IN ('constructor', 'prototype', '__proto__')
      AND jsonb_typeof(field->'label') = 'string'
      AND length(field->>'label') BETWEEN 1 AND 80
      AND (field->>'label') !~ '^[[:space:]]*$'
      AND (field->>'type') IN ('text', 'email', 'tel', 'number', 'textarea', 'select', 'checkbox')
      AND jsonb_typeof(field->'required') = 'boolean'
      AND (
        NOT (field ? 'maxLength') OR
        CASE WHEN jsonb_typeof(field->'maxLength') = 'number' THEN
          (field->>'maxLength')::numeric BETWEEN 1 AND 10000
          AND (field->>'maxLength')::numeric = trunc((field->>'maxLength')::numeric)
        ELSE false END
      )
      AND (
        field->>'type' != 'select' OR
        CASE WHEN jsonb_typeof(field->'options') = 'array' THEN
          jsonb_array_length(field->'options') BETWEEN 1 AND 50
          AND NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements(field->'options') AS options(option_value)
            WHERE jsonb_typeof(option_value) != 'string' OR length(option_value #>> '{}') > 200
          )
          AND EXISTS (
            SELECT 1 FROM jsonb_array_elements(field->'options') AS options(option_value)
            WHERE jsonb_typeof(option_value) = 'string' AND (option_value #>> '{}') !~ '^[[:space:]]*$'
          )
        ELSE false END
      ), false
    ))
), candidates AS (
  SELECT f.id, f.position, f.data->>(f.field->>'id') AS original,
    btrim(f.data->>(f.field->>'id')) AS email
  FROM fields f JOIN valid_schemas v ON v.id = f.id
  WHERE f.field->>'type' = 'email' AND jsonb_typeof(f.data->(f.field->>'id')) = 'string'
), contacts AS (
  SELECT DISTINCT ON (id) id, lower(email) AS email
  FROM candidates
  WHERE length(email) BETWEEN 1 AND 254
    AND original !~ '[[:cntrl:],;]'
    AND email !~ '(^[.]|[.][.])'
    AND email ~ '^[A-Za-z0-9_''+.-]*[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*[.])+[A-Za-z]{2,}$'
  ORDER BY id, position
)
UPDATE "Submission" s SET "contactEmail" = c.email FROM contacts c WHERE c.id = s.id;

CREATE INDEX "Submission_formId_contactEmail_idx" ON "Submission"("formId", "contactEmail");
