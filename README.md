# d3CRM v3

A deliberately small contact-form CRM: one Next.js application, PostgreSQL, Prisma, and NextAuth.

## What is included

- Email/password authentication with a default organization created at sign-up
- Organization memberships with `OWNER`, `ADMIN`, `MEMBER`, and `VIEWER` roles
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

## Checks

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```
