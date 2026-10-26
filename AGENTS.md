# AGENTS.md

How to work in d3CRM so the code stays consistent. Read this before changing anything. When this file and the code disagree, follow the code, then fix this file.

## Product

d3CRM is a contact-form CRM for small businesses and the agencies that build their websites. A visitor fills in a form on the customer's site, the enquiry lands in d3CRM, and the owner follows it up.

Write the product for an owner-operator who isn't technical. Use plain language, say what happens next, and never leave someone at a dead end.

## Stack

- Next.js 15 App Router, React 19, TypeScript (strict)
- PostgreSQL + Prisma 6 (`prisma/schema.prisma`, committed migrations only)
- NextAuth 4 (credentials, JWT sessions)
- shadcn/ui on Radix (`components/ui/*`), Tailwind v4, lucide-react icons
- Zod 4 for input parsing
- Node `node:test` for unit tests, Playwright for UI tests
- pnpm, Node ≥ 22

## Where things live

| What | Where | Notes |
| --- | --- | --- |
| Routes and pages | `app/(app)/*` workspace, `app/(auth)/*` sign-in flows, `app/(public)/*` marketing and legal | Pages are server components. They load data and compose components. |
| HTTP APIs | `app/api/**/route.ts` | Public submission API is versioned under `app/api/v1`. |
| Server actions | `lib/actions/<domain>.ts` | One file per domain. Start with `"use server"`. |
| Domain logic | `lib/<domain>.ts` or `lib/<domain>/*.ts` | Pure functions plus Prisma queries. No React. |
| Form schema, validation, integration | `lib/forms/*` | `types.ts`, `validate.ts`, `endpoint.ts`, `integration.ts`, `agent.ts` |
| Public site content and SEO | `lib/site/*` | Guides, tools, metadata helpers |
| Domain types | Next to the code that owns them | Example: `lib/forms/types.ts`, `lib/inbox-filters.ts`. Don't make a global `types/` dump. |
| Ambient or module type overrides | `types/*.d.ts` | Only for augmenting third-party modules (for example `next-auth.d.ts`) |
| Action state types | Exported from the action file | `export type FormActionState = { error?: string; success?: string; ... }` |
| Feature components | `components/<feature-name>.tsx` | kebab-case file, PascalCase export, one main component per file |
| Primitive UI | `components/ui/*` | shadcn-generated. Change rarely, and only to fix a primitive. |
| Styles | `app/ui.css`, `app/globals.css`, `app/brand.css` | See CSS below |
| Unit tests | `lib/**/*.test.ts` next to the module | Security and permission tests live in `lib/security/*.test.ts` |
| UI tests | `tests/ui/*.spec.ts` | Need an isolated local `_test` database (see Testing) |
| Scripts | `scripts/*` | Seeding, integration, and migration checks |
| Design reviews | `docs/design-audit-YYYY-MM-DD/` | README plus screenshots |

### Rules for each layer

- **Pages** (`app/**/page.tsx`): check access first (`requireRole` or `getCurrentContext` from `lib/permissions`), always scope queries by `organizationId`, then render. Keep business rules out of pages. If a page computes something non-trivial, move it to `lib/`.
- **Server actions** (`lib/actions/*`): this order every time:
  1. `requireRole(...)` and, where needed, check `user.emailVerifiedAt`
  2. `rateLimit(...)` for anything that writes or sends
  3. Parse input (Zod or the domain parser)
  4. Write with `db` (use `db.$transaction` for multi-step writes)
  5. `revalidatePath(...)`
  6. Return a state object

  Catch `RequestError` and return `{ error: error.message }`. Re-throw anything else. Never return raw Prisma errors to the client.
- **Domain modules** (`lib/*`): no `"use client"`, no React. Code that must run under `node --test` imports siblings with explicit `.ts` extensions (`import { parseFormSchema } from "./validate.ts"`). Other code uses the `@/` alias.
- **Client components**: add `"use client"` only when the component needs state, effects, or browser APIs. Push it to the smallest component you can.

## TypeScript

- `strict` is on. No `any`. Use `unknown` and narrow it.
- Use `type` aliases (the codebase doesn't use `interface`).
- Derive types from constants: `export const FIELD_TYPES = [...] as const; export type FieldType = (typeof FIELD_TYPES)[number];`
- Derive input types from Zod schemas with `z.infer`.
- Use Prisma enums (`Role`, `FormStatus`, `LeadStatus`) instead of string literals when comparing database values.

## Security invariants (never break these)

- Every query on tenant data filters by the current `organizationId`.
- Publishable form keys are stored hashed and shown only once (on creation or rotation).
- The public submission endpoint validates against the stored schema, enforces payload limits, honours the `_gotcha` honeypot and origin allowlists, and is rate-limited.
- CSV exports stay formula-injection safe.
- Webhook secrets are encrypted at rest. Webhook URLs go through `webhookUrl()`.
- Production uses `prisma migrate deploy` only. Never use `db push` against a shared or production database.
- Never invent metrics, testimonials, or customer counts in product or marketing copy.

## CSS

There are three files, loaded in this order by `app/layout.tsx`:

1. **`app/ui.css`**: Tailwind import and the `@theme inline` mapping from our tokens to shadcn's colour names. Edit only to map a new token.
2. **`app/globals.css`**: base element styles and older layout rules. Don't add new feature styles here.
3. **`app/brand.css`**: the current identity and **where new styles go**. The authoritative colour tokens are in its `:root` block (`--ink`, `--muted`, `--faint`, `--canvas`, `--surface`, `--line`, `--line-strong`, `--accent`, `--accent-strong`, `--accent-soft`, `--danger`, `--radius`).

### Writing styles

- **Semantic class names per feature**, prefixed with the feature: `.guide-rail`, `.guide-panel`, `.route-option`, `.handoff-actions`. Put each feature in one commented block at the end of `brand.css`. Don't spread one feature across files.
- **Use tokens, not raw values.** Colours come from `var(--…)`. If you need a colour that doesn't exist yet, add a named token at the top of your feature block (as `--guide-*` does) and reference it. Don't put raw hex inside rules.
- **Tailwind utilities** belong in `components/ui/*` primitives. Feature components use semantic classes. Don't mix long utility strings into feature markup.
- **Spacing** uses 4px steps (4, 8, 12, 16, 20, 24, 28, 32, 40, 48).
- **Type sizes** use the existing rem scale: `.75`, `.8125`, `.875`, `.9375rem` for UI text; `1.1875`–`1.375rem` for panel headings; page titles come from `PageHeader`. Headings are never italic.
- **Layout**: use CSS grid with `minmax(0, 1fr)` tracks, add `min-width: 0` on grid children that hold text or code, and use `overflow-wrap: anywhere` for user content, URLs, and keys.
- **Breakpoints**: `900px` (two columns to one) and `620px` (phone). Reuse them; don't invent new ones.
- **States**: every interactive element needs hover, `:focus-visible` (the global outline uses `--accent`), active, and disabled styles. Style selected and checked states with `:has(input:checked)`, `[aria-current]`, `[aria-pressed]`, or `[data-state]`. Never use a colour-only signal.
- **Motion**: animate only `transform`, `opacity`, and colours, for 120–180ms, with `--ease-out`. Add a `prefers-reduced-motion: reduce` override for every transition you add.
- **No horizontal scroll** at 320, 375, 414, or 768px wide.

## Components and UX

- **JSX layout**: write new or substantially changed components on multiple lines, one block per element, so diffs stay readable. Don't reformat untouched files just for style.
- **Reuse before you build**: `PageHeader`, `EmptyState`, `StatusPill`, `CopyButton` (has a `primary` variant), and the shadcn primitives.
- **Forms**: always use a `<Label className="field">` wrapper with a visible label. Put help text in `<small id>` linked by `aria-describedby`. Show errors in `<Alert variant="destructive" role="alert">` and success in `role="status"`.
- **Multi-step flows** follow the setup-guide pattern (`components/integration-wizard.tsx`): a step rail with `aria-current="step"`, one panel at a time, Back and Continue in a footer, and a "Step N of M" live region on mobile.
- **Choices**: use native radio, checkbox, or select inputs (styled), not `div`s with click handlers.
- **Dates**: follow-ups and connection times are shown in **UTC** and labelled "UTC".
- **Copy**: write short sentences in the second person ("your website"). Name what happens next. Error messages say what went wrong and how to fix it. No eyebrow-label clutter, and no marketing filler inside the workspace.

## AI handoff prompts

`lib/forms/agent.ts` builds the prompts users paste into their AI tools. Keep them sectioned with Markdown headings (context, configuration, rules, done-when). Keep every validation rule in step with `lib/forms/validate.ts`. Update `lib/forms/agent.test.ts` whenever the prompt contract changes.

## Testing and checks

Run these before you call any change done:

```bash
pnpm typecheck
pnpm lint            # .claude/worktrees is noisy; lint changed files with: npx eslint <files>
pnpm test            # unit tests (node:test)
```

UI tests need the local Postgres and an isolated database whose name ends in `_test`:

```bash
docker compose up -d postgres
set -a && . ./.env.test && set +a && export NEXTAUTH_URL=http://127.0.0.1:3100
npx prisma migrate deploy && npx next dev -p 3100 -H 127.0.0.1 &
npx playwright test
```

Add or extend a test whenever you change permissions, validation, the public API, or a user flow covered in `tests/ui`.

## Git and deploy

- Write commit messages as a short imperative summary, one logical change per commit.
- Schema changes need a committed migration created with `pnpm db:migrate`.
- `pnpm build` runs `prisma generate`, `prisma migrate deploy`, and `next build`.

### Production (VPS)

The app lives in `/var/www/d3crm-v3`, owned by the `d3crm` user. It runs under that user's own pm2 daemon (`PM2_HOME=/var/lib/d3crm/.pm2`) as the process `d3crm`, which runs `next start` on `127.0.0.1:3000` behind https://d3crm.tech. A separate root pm2 daemon runs unrelated apps; never touch it.

**Run every command as `d3crm`, never as root.** Root-owned files in `.git` break the next `git pull` ("failed to write object").

```bash
sudo -u d3crm -H bash -lc 'set -eo pipefail
  cd /var/www/d3crm-v3 && export PM2_HOME=/var/lib/d3crm/.pm2
  git pull --ff-only origin main
  rm -rf /var/lib/d3crm/next-backup && cp -a .next /var/lib/d3crm/next-backup
  pnpm install --frozen-lockfile
  pnpm build
  pm2 reload d3crm --update-env'
```

To roll back, check out the previous commit, restore `/var/lib/d3crm/next-backup` to `.next`, and run `pm2 reload d3crm`. After a deploy, check that `/`, `/sign-in`, and https://d3crm.tech return 200, then read `pm2 logs d3crm --err --lines 20 --nostream`.
