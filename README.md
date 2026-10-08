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
- Enquiry timelines and owner/admin workspace activity for lead, form, and team changes
- Optional campaign attribution and date/form-filtered lead reports
- Client workspace creation, isolated access, and a cross-client enquiry overview
- A connection wizard with generated HTML/JavaScript and non-destructive endpoint tests
- Per-form default/round-robin assignment and optional unassigned-enquiry alerts
- Atomic bulk enquiry updates, private saved inbox views, and a filterable pipeline board
- Workspace reply templates, editable native-email drafts, and same-email enquiry warnings
- Safe form duplication with new publishable keys and separate draft configuration
- A UTC follow-up agenda with period/assignee filters and quick rescheduling

### Product identity and discovery

The public site, authentication screens, and workspace share a teal-and-neutral identity, system typography, accessible focus states, and reduced-motion/transparency fallbacks. The workspace uses a desktop sidebar and a collapsible mobile menu. Inbox filters disclose on demand; active filters remain expanded. Bulk controls appear only after selection.

- `/demo` is a public, interactive fictional workspace. Search, status filtering, pipeline moves, assignments, follow-up edits, overview, and reset work entirely in page-local React state. It never reads customer data, sends email, or writes a database or browser storage. Reload resets it. The public product image is a screenshot of this demo, not customer data.
- Workspace search supports mouse, Tab, arrow keys, Enter, and Cmd/Ctrl+K. `GET /api/search` verifies authentication/session version and derives scope from current membership. It returns at most five forms and ten enquiries, treats SQL wildcards literally, rate-limits queries, and uses private/no-store responses. Short or oversized queries return no results.
- Overview shows the last seven UTC calendar days, zero-fills missing days, excludes spam from the chart, and links to the matching report range. No database schema or environment changes are required.

## Run locally

```bash
cp .env.example .env
# Generate NEXTAUTH_SECRET with: openssl rand -base64 32
docker compose up -d
pnpm install
pnpm db:generate
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

### Connection wizard

Owners/admins can open **Connect website** on a form or use the wizard immediately after creation, where the one-time publishable key is prefilled. Existing keys cannot be recovered: supply the original key or rotate it. Keys entered in the wizard are not saved in URLs, local storage, or additional database columns.

The wizard generates complete HTML/JavaScript or JavaScript for an existing form element ID. Existing form controls must have the exact schema field names. The generated handler validates inputs, converts number/checkbox values, prevents simultaneous submits, preserves answers on failures, and includes campaign context. It uses ordinary JavaScript, not native platform plugins; check your website builder's custom-code support. Install one handler, replacing the test script with the live script rather than keeping both.

Test mode posts to `/api/v1/forms/{slug}/verify`. It checks the current key, live status, browser-origin policy, schema, and metadata without creating an enquiry, consuming submission quota, assigning a lead, or sending an email/webhook. Public tests are throttled and record a schema-versioned endpoint-check event. The authenticated dashboard check validates a sample for the entered website origin; it does not fetch the website, prove code is installed there, or verify notification delivery. Use the generated test code on the real website to exercise CORS, then switch to live mode. **Endpoint checked** and **Last enquiry received** are deliberately separate signals. Schema edits and key rotations clear prior check status.

### Client workspaces

Verified owners/admins can create a client workspace from **Clients**. Creation makes that user its owner; source-workspace teammates do not automatically gain access. Each client uses the existing invitations, member roles, ownership transfer, forms, and billing controls. Open a client before inviting its team or transferring ownership in Settings. The agency user can remain an admin after transfer, or be removed by the new owner.

The Clients view summarizes only client workspaces where the signed-in user has a current membership. Counts include non-spam enquiries, unread enquiries, new unassigned enquiries, and overdue follow-ups. Website addresses are metadata only and are not fetched or automatically added to form allowlists. Existing workspaces are not relabeled as clients. Client creation stops when a user already owns 50 workspaces and is throttled to 10 per day. Free/Pro subscriptions and limits remain per workspace, with no invented shared agency subscription or consolidated invoice.

### Automatic assignment

Owners/admins configure **Lead routing** on each form: manual (the existing default), a default assignee, or round robin across selected writers. Only current owners/admins/members are eligible. Routing and quota reservation run within the submission transaction under the workspace lock, keeping concurrent round robin consistent; an empty or no-longer-eligible pool leaves the lead unassigned. Assignment writes an activity event and is included in webhook metadata. It applies only to new enquiries, not existing records. Removing a member or downgrading them to viewer unassigns their current leads; stale routing IDs are ignored until configuration is updated.

Optional alerts for still-new, unassigned enquiries use the form's verified notification recipients after the selected delay. They require the existing email configuration and authenticated delivery-worker schedule. A reminder is claimed transactionally once per unassigned cycle, queued durably, and skipped if the lead is assigned/contacted, the alert is disabled, or the recipient loses access before delivery. A delay is a threshold evaluated by the worker, not a promise of exact-time delivery. It is distinct from existing date-based follow-up reminders. Reassignment resets the unassigned reminder marker.

No additional environment variables are required for these agency workflows.

### Inbox and pipeline

Submissions supports list and pipeline layouts with the same search, status, form, and view filters. Views include unread, assigned to me, unassigned, and follow-up due. Follow-up due includes only active statuses (`NEW`, `CONTACTED`, `QUALIFIED`); it intersects with the chosen status rather than overriding it. Sorting supports newest, oldest, and follow-up date (UTC, empty dates last). Filter changes and pagination clear bulk selections.

Owners/admins/members can select up to 25 enquiries on the current list page and apply one update: status, assignee (including unassignment), read/unread, or follow-up date (including clearing). Current workspace membership and eligible assignees are rechecked inside the transaction. Each selected record carries its last-seen edit timestamp. A changed, deleted, or out-of-workspace record rejects the whole batch; there are no partial writes. Changes reuse the normal contact timestamp, reminder reset, and per-enquiry activity rules. No-op updates do not create activity. There is no bulk delete, mass email, or synthetic webhook event for manual updates.

Every member, including viewers, can save up to 20 named views per workspace. Saved filters and layout are private to their creator, persist across sessions, and never grant access to another workspace or form. Saving a view stores its search text, so avoid putting secrets in searches you save. View names are unique per user/workspace, ignoring case. Removing a saved view does not delete enquiries. Removing workspace access prevents reading or changing its saved views; records remain until deleted by their creator after regaining access, or until the user/workspace is deleted.

The pipeline uses the existing six statuses, with current matching counts and at most 25 enquiry cards per stage. **View all** opens the complete filtered, paginated list. Writers can change a card's status using its selector and move button; viewers remain read-only. Counts and statuses reflect enquiries, not deal values, forecasts, or custom sales stages. New workflows require no additional environment variables; the build applies the saved-view migration automatically.

### Follow-up agenda

Open **Follow-ups** from the Inbox or the overview. Overdue means dates before today; Today is the current UTC calendar date; Next 7 days covers tomorrow through the next seven UTC dates. All scheduled includes every dated active enquiry. Closed (`WON`, `LOST`) and spam enquiries and records with no follow-up date are excluded. Dates follow the existing UTC reminder convention, not the browser's local timezone.

Filter by form and everyone/me/unassigned. Counts use the same workspace and assignee/form filters as the rows. Lists are grouped by date, sorted oldest scheduled date first, and paginated at 25 enquiries. Foreign or removed form filters produce an unavailable-form empty state instead of silently showing all workspace data. The overview separates overdue and today's counts and shows the first five scheduled follow-ups.

Owners/admins/members can reschedule a date or clear it; viewers can read only. Changes use the existing transactional enquiry workflow and optimistic versions, preserve status/assignee/read state, reset the reminder marker when a date changes, and write normal enquiry activity. Opening or rescheduling does not send an email or mark a lead contacted. A live completion message remains visible even when the changed row leaves the selected period. No new environment variables or database tables are required.

UI refinements keep unsaved enquiry/template/date edits paired with the version that was loaded, rather than advancing the version on a background refresh. Save/copy labels reserve stable widths, controls expose busy/error/completion states, frequent navigation stays unanimated, and mobile inputs/touch targets are enlarged. Keyboard focus and reduced-motion/transparency/contrast preferences are supported. Note and deletion writes also recheck current roles under the workspace lock so a revoked user cannot write through an in-flight request.

### Replies and templates

Settings links to **Reply templates**. Verified owners/admins can create, edit, or delete up to 30 shared templates per workspace. Other members can read them. Names are unique within the workspace, ignoring case; subjects are one line up to 200 characters and messages up to 5,000. Saves and deletes check the last-seen edit timestamp, so a stale editor cannot overwrite a newer change. Changes record IDs in workspace activity, not message content or contact details.

Templates support `{{name}}`, `{{form_name}}`, `{{workspace_name}}`, and `{{sender_name}}`. The name uses a conventional `name`, `full_name`, or `first_name` answer, otherwise `there`; it is not inferred from an email address. Substitutions are one-pass and strip control characters. Starting-point templates are available without adding default records to the database.

Owners/admins/members can edit a reply draft on an enquiry with a supported email address. The recipient comes only from schema-declared email fields using the enquiry's historical snapshot. **Open email draft** creates a percent-encoded `mailto` link with only recipient, subject, and body; it requires a configured email application. **Copy message** is an alternative when a client cannot handle the draft link. These actions do not send through d3CRM, create outbound delivery jobs, change enquiry status, or claim delivery. Mark an enquiry contacted explicitly after the actual follow-up. Draft edits are local to the open page and are not saved across navigation or reloads. Viewers have no draft controls.

### Related enquiries

Enquiry details show **Same email** when other non-spam enquiries use the same normalized primary contact email within the current workspace, including across forms. It shows the latest five summaries and the total matching count. Email fields are considered in schema order; only the first supported single address is used. Text answers, display-name recipient lists, invalid schemas, control characters, and ambiguous addresses are never used to guess a contact. Answer data stays unchanged, while a separate indexed lowercase address supports matching.

The contact migration backfills supported historical addresses from schema snapshots, using the form schema only when a snapshot is absent. Malformed snapshots are not replaced by newer schemas. Matching is a warning, not identity verification: shared addresses can belong to different people. No enquiries are merged, rejected, or deleted, and other workspaces are never searched.

### Form duplication

Verified owners/admins can duplicate a form within its workspace. The new form has a fresh publishable key and unique slug and starts as **DRAFT**. Only validated fields and allowed browser origins are copied. Notification recipients, webhook URLs/secrets, routing, reminder settings, connection-check state, submission history, and delivery jobs are not copied. The source form is unchanged. Duplication shares the existing create-form rate limit and billing quota, and rechecks current access under the workspace lock even when billing is disabled.

Review the copied fields and origins, configure recipients and routing for the new use, and set the form live before testing its public connection. Its publishable key is returned once on the duplication screen; copy it into the connection wizard or rotate it later. It is not stored in URLs or browser storage. No new environment variables are required for replies, matching, or duplication. Local development needs the updated Prisma client and all migrations; deployment uses the existing generate/deploy/build sequence.

### Campaign attribution

Optionally send `_context` alongside the form fields:

```js
_context: {
  landing_page: location.origin + location.pathname,
  referrer: document.referrer || undefined,
  utm_source: "google",
  utm_medium: "cpc",
  utm_campaign: "autumn-enquiries"
}
```

The accepted keys are `landing_page`, `referrer`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, and `utm_content`. URLs must use HTTP/HTTPS, have no credentials, and be at most 2048 characters. Stored URLs exclude query strings and fragments. Campaign values are strings of at most 200 characters; source/medium are normalized to lowercase. Invalid metadata returns HTTP 422. Metadata is stored separately from answers, included in webhook events, and exported in `_context.*` CSV columns. Do not put personal information in campaign values or page paths. Existing clients without `_context` keep working; attribution is not retroactively reconstructed. The generated integration examples and AI handoff prompt include this optional payload. No cookies or persistent cross-page attribution are added.

### Reports and activity

Reports are available to all workspace members, filtered by enquiry creation date (inclusive UTC dates, up to 366 days) and optional form. They show current lead statuses for that cohort, spam-excluded enquiry/won counts, lead-to-won rate, overdue follow-ups, and daily/form/source breakdowns. Source means reported `utm_source`, otherwise the existing browser origin, otherwise `Unknown`; it is not independently verified traffic attribution. Form/source tables show the top 50 groups. These are not visitor conversion or advertising ROI reports.

Average first marked contacted measures the first explicit transition to `CONTACTED`; it does not measure an actual email or phone call. The sample count is displayed. Older enquiries have no invented contact timestamp or activity backfill. Historical leads already marked contacted remain unmeasured unless explicitly moved back to another status and later contacted.

Owners/admins can browse workspace activity; enquiry timelines are visible wherever enquiry read access is allowed. Lead, note, form, and team mutations record events in their database transactions. Export requests are logged before streaming starts; an event does not prove the download completed. Events contain actor IDs and change metadata, not form answers, note bodies, publishable keys, invitation tokens, or webhook secrets. Deleting an enquiry removes its answers, notes, and deliveries but retains activity with a detached reference. Activity currently remains until workspace deletion; there is no automatic retention policy. Configure an appropriate retention process before promising specific customer data-erasure guarantees.

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

For isolated checks, create a local database named `d3crm_security_test` and a git-ignored `.env.test` with its `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, and `CRON_SECRET`. Apply migrations with that local URL explicitly set. Start the app with those same variables (the normal `.env` may point to a hosted database). `pnpm test:integration` refuses non-local databases and non-test database names; it creates and removes only its own fixtures. It checks workspace isolation, token replay/expiry, session invalidation, parallel throttling, request limits, historical CSV exports, delivery retries/claims, SSRF rejection, billing signatures, quotas, attribution validation, transactional activity, concurrent lead edits, and scoped reporting. Email provider requests are mocked; no real emails or charges are sent. To seed disposable preview data, run `node --env-file=.env.test --experimental-strip-types scripts/seed-demo.ts`.

Agency checks also cover client isolation, non-destructive connection tests, routing authorization, parallel round robin, ineligible members, and obsolete alert suppression. For a separate-origin browser fixture, run `NEXTAUTH_URL=http://localhost:3100 node --env-file=.env.test --experimental-strip-types scripts/preview-integration.ts` with the local app running on port 3100, then open `http://localhost:3200`. Seed demo data first. This script refuses hosted/non-test databases and rotates only its own disposable preview form key. Test mode creates no enquiry; Live mode sends a dummy enquiry only to the local database.

Reply and reuse checks cover current verified-role checks, stale template edits, private audit data, concurrent template/form quotas, single-address draft encoding, conservative contact extraction, workspace-scoped related enquiries, read-only viewers, and fresh draft form defaults. Follow-up checks cover UTC period boundaries, scoped counts, pagination, rescheduling, reminder resets, and revoked-role note/delete rejection. Migration fixtures include historical snapshots, absent and malformed snapshots, ambiguous addresses, and typed text answers. Regenerate the Prisma client and migrate only the explicitly selected local test database before running these checks.

Browser regression checks should also verify two consecutive saves, navigation after a save, new templates appearing without a reload, clearing/rescheduling a follow-up out of the current period with visible confirmation, private saved-view creation/removal, and a duplicated form's one-time key. On an enquiry, edit the date using the native date picker or keyboard, add a note, and confirm the unsaved date and reply draft remain intact. Test viewer restrictions and layouts at 320px, 390px, and desktop widths. These interactions are browser checks, not coverage provided by the server integration suite. Run standalone type checks after a build completes, not while Next is regenerating its type files.

Bulk and pipeline changes use an authenticated, same-origin, size-limited JSON endpoint backed by the same atomic lead workflow. A confirmed save reloads the current filtered view; conflicts and validation errors preserve the selection. List/pipeline mode changes also use document navigation. This keeps these workflows usable when a production App Router transition does not commit. Other draft editors retain their local state during refreshes.

## Checks

### Privacy and service agreements

Public legal pages are `/privacy`, `/terms`, `/data-processing`, and `/account-data-notice`. Signup requires separate unchecked terms and account-data choices, validated on the server and recorded with the document version and timestamp. Existing users receive no invented acceptance. Set the six public `LEGAL_*` values in `.env.example` before opening production registration; both the signup screen and API keep it closed until the operator, contact, infrastructure, and location disclosures are complete.

Read [the privacy handover](docs/privacy-readiness.md) for current primary sources, DPDP commencement phases, provider/transfer agreements, request handling, deletion/retention gaps, and release prerequisites. The policies do not certify compliance; customers need their own collection notices and lawful grounds. This change is pushed on `codex/privacy-and-terms`, whose Vercel automatic deployments are disabled in `vercel.json`.

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

### Public SEO and free tools

The public site includes `/features`, `/guides`, three implementation-specific guides, `/tools`, a campaign URL builder, and a form launch checklist. All ten public pages are in `sitemap.xml`, linked from the public navigation/content, and rendered with route-specific canonical URLs, descriptions, and social metadata. Organization, website, software, article, and guide breadcrumb JSON-LD describe actual functionality; there are no invented ratings, prices, or testimonials. `/llms.txt` links to public resources and retains the form integration contract.

- The campaign builder validates HTTP(S) URLs without credentials, replaces existing UTM tags, lowercases source/medium, preserves unrelated query parameters/fragments, and limits tags and output length. It processes entered values in the browser and does not install tracking, persist tags across pages, or send them to a service.
- The launch checklist supports progress, reset, copy, printable output, and a text fallback. Checkmarks are page-local and reset on reload; it does not inspect websites or certify that checks passed.
- Authentication pages declare `noindex` and remain crawlable so crawlers can read it. Authenticated workspaces also declare `noindex`; robots excludes app routes and APIs. Membership checks remain the actual customer-data access control.

Before public deployment, set the existing `NEXTAUTH_URL` to the real HTTPS site origin. The same origin feeds canonical URLs, social URLs, schema, and the sitemap; localhost is only the development fallback. Preview deployments should have platform-level access protection or a noindex policy. Confirm the public host returns HTTP 200 for the public pages, `/robots.txt`, `/sitemap.xml`, and `/llms.txt`; check that CDN/WAF rules permit legitimate search crawlers including OAI-SearchBot. Deployments still require the existing strong `NEXTAUTH_SECRET` and database configuration. Public resource pages require no additional environment variables, services, or migrations.

After deployment, submit the sitemap in the site's existing search webmaster accounts if available and inspect canonical/indexing status. Rankings and AI citations are not guaranteed. Google's [AI search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) recommends ordinary crawlability, useful content, and clear site structure, and says Google does not use `llms.txt` for ranking. OpenAI's [crawler documentation](https://developers.openai.com/api/docs/bots) describes OAI-SearchBot access for ChatGPT search; access permission is not a promise of inclusion. No special AI schema or external SEO service is required.

Validation: `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm exec next build` (with the existing deployment environment configured). The focused site checks cover campaign edge cases, public resource coverage, guide links, metadata, and JSON-LD escaping.


### Interface system

The public site, account screens, and CRM share shadcn/ui components (Radix primitives), Tailwind CSS 4, and the d3CRM enquiry-desk identity. `components.json` records the registry configuration. Add future controls with `pnpm dlx shadcn@latest add <component>` and use the existing components rather than introducing another control style. Design tokens live in `app/brand.css` and map to Tailwind in `app/ui.css`; domain-specific layouts remain in `app/globals.css`.

Warm paper surfaces, teal primary actions, clear status badges, and editorial serif accents distinguish the product. Workspace navigation groups daily work, workspace tools, and management. Public navigation keeps resources in a menu. Keyboard search, mobile sheets, confirmations, and tooltips use accessible Radix behavior. Frequent work has no entry animation; motion and translucency respect system accessibility preferences.

`pnpm test:ui` runs the browser regression checks against an already-running local server. Supply `DATABASE_URL`, `NEXTAUTH_URL`, and `NEXTAUTH_SECRET` for an isolated local database whose name ends in `_test`; the suite refuses remote databases. Apply existing migrations and install Chromium with `pnpm exec playwright install chromium` first. Fixtures are created and cleaned up by the suite. Checks cover authentication, every work screen, keyboard search, mobile navigation, collapsed form values, bulk selection, routing, and confirmation cancellation. Use the same environment for the server and tests. Production data is never a test fixture.
