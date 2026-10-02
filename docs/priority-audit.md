# Priority Audit and Implementation

Scope: d3CRM v3, audited on 2026-10-02. The existing hosted database was not modified; migrations and integration checks were run against a separate local test database.

| Priority | Finding | Implemented |
| --- | --- | --- |
| P0 | Known dependency advisories | Patched Next.js/React and overridden vulnerable transitive packages; production audit clean |
| P0 | Concurrent requests bypassed count-before-insert throttling; untrusted IP headers were accepted | Atomic PostgreSQL limits with an explicit trusted-proxy header configuration |
| P0 | Public JSON bodies could be buffered without bounds; validation accepted whitespace-only required fields and non-numeric types as numbers | Stream byte limits and strict validation |
| P0 | Password recovery, verified email ownership, and revocation of old password sessions were missing | Expiring, hashed, single-use tokens; encrypted email queue; session version checks |
| P0 | Existing-user membership could grant access to someone who registered an unverified address | Verified recipients, email invitations, removal, and transactional owner checks |
| P0 | No browser security headers; CSV formula detection missed leading whitespace | Security headers and stronger CSV sanitization |
| P1 | Enquiries arrived silently | Configurable alerts to verified members, durable delivery queue, retries, history |
| P1 | The inbox was limited to 200 responses and had no workflow | Search, filters, pagination, detail view, status, assignees, notes, follow-up dates and reminders |
| P1 | Existing forms could not be edited | Shared form editor with optimistic revision checks; historical schemas and CSV fields preserved |
| P1 | Teams had to register separately and could not be removed | Expiring invitations, acceptance, cancellation, and member removal |
| P2 | Integrations were manual CSV exports | Signed webhooks, pinned public destinations, retries, failure history, and replay |
| P2 | No subscription controls | Optional Stripe checkout/portal, signed events, usage counters, transactional quotas |

Required deployment configuration is documented in README.md and .env.example: email sender/domain, trusted proxy, cron schedule, actual billing prices/provider keys, database backups and monitoring. Hosted migrations and provider activation have not been performed. Real provider delivery and Stripe checkout need verification in their test accounts before activation.

Further product work should follow customer demand: WhatsApp alerts, attribution reports, attachments, agency branding and dashboards. These are not prerequisites for the current email/form workflow.
