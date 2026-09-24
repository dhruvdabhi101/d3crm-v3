# d3CRM v3

A deliberately small contact-form CRM: one Next.js application, PostgreSQL, Prisma, and NextAuth.

## What is included

- Email/password authentication with a default organization created at sign-up
- Organization memberships with `OWNER`, `ADMIN`, `MEMBER`, and `VIEWER` roles, plus ownership transfer in Settings
- JSONB-backed form schemas and strict submission validation
- Hashed, rotatable publishable form keys and optional browser-origin allowlists
- Payload limits, a honeypot, per-IP throttling, and CSV formula-injection protection
- Per-form and unified submission inboxes with Excel-compatible CSV export

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

Admins and owners can rename an organization in Settings. Names are unique across organizations, ignoring case and surrounding spaces. Owners can add existing d3CRM users and transfer ownership to an existing member; the previous owner becomes an admin.

## Checks

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## Build forms with your AI agent

1. Open **New form → Build with AI** (or **Start with a prompt** on the overview).
2. Describe the form and copy the generated prompt into your preferred AI agent.
3. Paste the agent's JSON response back, choose **Import form**, and review the fields and live preview.
4. Create the form, then copy the integration prompt from the success screen. It includes the real endpoint, schema, and one-time publishable key so a coding agent can connect your website.

Existing form pages also provide integration prompts and schema JSON. Their prompts use a key placeholder because saved keys cannot be retrieved; provide your saved publishable key to the agent. General agent documentation is available at `/llms.txt`.

AI generation runs in the user's chosen agent. The application validates and imports its JSON; it does not make model API calls or require an AI provider key.
