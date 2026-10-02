# d3CRM v3

A deliberately small contact-form CRM: one Next.js application, PostgreSQL, Prisma, and NextAuth.

## What is included

- Email/password authentication with a default organization created at sign-up
- Organization memberships with `OWNER`, `ADMIN`, `MEMBER`, and `VIEWER` roles, plus ownership transfer in Settings
- JSONB-backed form schemas and strict submission validation
- Hashed, rotatable publishable form keys and optional browser-origin allowlists
- Payload limits, a honeypot, per-IP throttling, and CSV formula-injection protection
- Per-form and unified submission inboxes with Excel-compatible CSV export
- Searchable, paginated enquiries with statuses, assignees, notes, unread flags, and follow-up dates
- Form editing with schema snapshots that preserve historical responses and exports
- Password recovery, email verification, expiring invitations, and member removal
- Durable email alerts, follow-up reminders, and signed webhooks with retries and delivery history
- Optional Stripe subscriptions, customer portal, and configurable plan limits

## Run locally

```bash
cp .env.example .env
# Generate NEXTAUTH_SECRET with: openssl rand -base64 32
docker compose up -d
pnpm install
pnpm db:deploy
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, and create a form.

For deployment, set `NEXTAUTH_URL` to the public HTTPS origin (for example, `https://crm.example.com`). The homepage canonical URL, Open Graph image URLs, `robots.txt`, and `sitemap.xml` use this value.

`pnpm build` generates the Prisma client, applies committed database migrations with `prisma migrate deploy`, then builds Next.js. It requires access to the database selected by `DATABASE_URL` and stops if generation or migration fails. Create and commit new migrations with `pnpm db:migrate` when changing `prisma/schema.prisma`; production builds do not create migrations or use `db push`.

## Submit from a website

The form detail screen generates the exact endpoint and sample payload. The request shape is:

```js
fetch("https://your-crm.example/api/v1/forms/FORM_SLUG/submissions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Form-Key": "d3f_your_publishable_key"
  },
  body: JSON.stringify({
    name: "Ada Lovelace",
    email: "ada@example.com",
    message: "Hello",
    _gotcha: ""
  })
});
```

The key identifies a form and is safe to embed in a browser, but it is not a secret: website visitors can inspect it. Origin checks and throttling reduce casual abuse; public production deployments should add an edge/WAF rate limiter for stronger abuse protection.

## Permissions

| Role | Read/export | Create/change forms | Organization details | Manage members |
| --- | --- | --- | --- | --- |
| Owner | Yes | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes | No |
| Member | Yes | No | No | No |
| Viewer | Yes | No | No | No |

Owners, admins, and members can update enquiry status, assignment, notes, and follow-up dates. Viewers have read-only access. Only owners/admins can delete enquiries.

Admins and owners can rename an organization in Settings. Names are unique across organizations, ignoring case and surrounding spaces. Owners can invite users, add existing users with verified emails, remove members, and transfer ownership. Invitations expire in seven days and must be accepted by the email address that received them. Members can manage enquiry statuses, assignees, notes, and follow-up dates; viewers cannot. Admins and owners can permanently delete enquiries and their queued deliveries.

## Email and delivery worker

Set `RESEND_API_KEY` and `MAIL_FROM` using a verified sending domain. Production registration requires email delivery configuration. New users receive verification links; existing users can request verification in Settings. Creating forms in production, sending invitations, configuring notifications/webhooks, and opening billing require email verification. Password reset links expire after 30 minutes, are consumed once, and revoke previous sessions. Verification links expire after 24 hours. Links are hashed in the token tables; queued email bodies and webhook signing secrets are encrypted with `NEXTAUTH_SECRET`. Keep that secret stable: rotating it invalidates sessions and requires regenerating pending account links and webhook secrets.

Choose verified workspace members as email recipients on each form. Alerts contain a link to the authenticated enquiry, rather than including personal submission data in email. Removing a member prevents queued alerts from being delivered to that member. A daily follow-up is queued once when its date is due, for the assigned member if their email is enabled on that form. Dates use UTC calendar days.

New deliveries are attempted after the request completes. Schedule an authenticated **POST** to `/api/jobs/deliveries` every minute with `Authorization: Bearer <CRON_SECRET>` (a separate random secret of at least 32 characters). The worker retries with exponential backoff, stops after five failed attempts, and cleans expired rate limits/tokens and sent/skipped deliveries older than 30 days. Webhook/email history appears on each form; admins can retry failed deliveries. Retries are at least once: webhook receivers must deduplicate using `X-D3-Delivery`.

Webhook destinations must be public HTTPS hostnames on port 443 and have public IPv4 DNS records. IP literals, credentials in URLs, private/reserved addresses, and redirects are rejected. Each connection pins the checked DNS address. Authenticate a webhook by parsing `X-D3-Signature: t=<unix_seconds>,v1=<hex_signature>` and checking HMAC-SHA256 of `<timestamp>.<raw_request_body>` with the one-time signing secret, using constant-time comparison and a short timestamp tolerance. Secret rotation applies to pending deliveries too. Disabling/changing a webhook skips deliveries to the old destination.

## Subscription Billing

Billing is inactive by default. Set `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID` (a recurring price), `STRIPE_WEBHOOK_SECRET`, and `BILLING_ENABLED=true` to activate it. Configure Stripe's customer portal, including cancellation, and subscribe `/api/billing/webhook` to `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`. Choose actual prices in Stripe; the app does not invent prices or charge without owner checkout.

Only verified workspace owners can open checkout or the portal. Plan changes come from signed webhooks; redirects from checkout do not grant access. The webhook retrieves current subscription state from Stripe and deduplicates events. `active` and `trialing` subscriptions to the configured price receive Pro. Free/Pro form and monthly submission limits are configurable in `.env.example`. Limits are checked under a database lock so concurrent requests cannot exceed them. Form limits count live and draft forms; monthly limits use UTC and count accepted submissions even after deletion. At the submission limit the endpoint returns HTTP 429 without accepting the enquiry, so connected websites must preserve visitor input and show the failure. Confirm your limits and existing customer usage before enabling billing. Archiving a form frees a form slot; historical data remains accessible.

## Security and Deployment

Public requests have byte limits and PostgreSQL-backed atomic throttling, including sign-in, registration, recovery, and submissions. Forwarded IP headers are ignored by default. Only set `TRUSTED_IP_HEADER` to a header your trusted proxy overwrites, and prevent direct access that bypasses the proxy. Without it, traffic shares an IP bucket. Keep edge/WAF protection for volume attacks; database throttling cannot protect the application before a request reaches it.

Deploy behind HTTPS with a strong `NEXTAUTH_SECRET`, run `pnpm build` (which applies database migrations) before starting the updated application, and configure the delivery schedule. Migrations preserve existing responses and backfill their original form schemas. Database backups, restore drills, error monitoring, email-domain verification, and Stripe account settings are deployment responsibilities; they are not configured by a code checkout. Do not expose the development PostgreSQL container to the internet.

## Local Workflow Verification

For isolated checks, create a local database named `d3crm_security_test` and a git-ignored `.env.test` with its `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, and `CRON_SECRET`. Apply migrations with that local URL explicitly set. Start the app with those same variables (the normal `.env` may point to a hosted database). `pnpm test:integration` refuses non-local databases and non-test database names; it creates and removes only its own fixtures. It checks workspace isolation, token replay/expiry, session invalidation, parallel throttling, request limits, historical CSV exports, delivery retries/claims, SSRF rejection, billing signatures, and quotas. Email provider requests are mocked; no real emails or charges are sent. To seed disposable preview data, run `node --env-file=.env.test --experimental-strip-types scripts/seed-demo.ts`.

## Checks

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

With the Docker Compose PostgreSQL container running, `pnpm test:migrations` creates an isolated temporary database, inserts an enquiry using the original schema, applies every new migration, and checks that the enquiry, historical field labels, defaults, and usage count are preserved. It removes its temporary database afterward.

## Build forms with your AI agent

1. Open **New form → Build with AI** (or **Start with a prompt** on the overview).
2. Describe the form and copy the generated prompt into your preferred AI agent.
3. Paste the agent's JSON response back, choose **Import form**, and review the fields and live preview.
4. Create the form, then copy the integration prompt from the success screen. It includes the real endpoint, schema, and one-time publishable key so a coding agent can connect your website.

Existing form pages also provide integration prompts and schema JSON. Their prompts use a key placeholder because saved keys cannot be retrieved; provide your saved publishable key to the agent. General agent documentation is available at `/llms.txt`.

AI generation runs in the user's chosen agent. The application validates and imports its JSON; it does not make model API calls or require an AI provider key.
