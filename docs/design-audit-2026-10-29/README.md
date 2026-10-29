# Copy and hierarchy cleanup — 29 October 2026

Remove supporting text when it repeats a title or control. Keep text that explains a decision, constraint, consequence, recovery action, or the meaning of data.

## Captured review

1. **Sign-in — simplified.** The original repeated “Welcome back” and surrounded a familiar form with slogans and a numbered workflow. The revised screen has a single action title, labelled fields, password recovery, and account navigation. The shared authentication panel now uses one plain heading.
   - [Before](01-sign-in-before.png) · [After](07-sign-in-after.png)
2. **Homepage — simplified.** Repeated section eyebrows, an explanatory strip, decorative diagram captions, repeated promises, and footer slogans competed with the product and demo. Keep the product explanation, feature-specific information, sample-data labels, FAQ answers, and working calls to action.
   - [Before](02-home-before.png) · [After](08-home-after.png)
3. **Settings and workspace — simplified.** Titles such as Settings, Forms, Reports, and Reply templates stand alone. Dashboard metrics retain their labels and values; page headers retain useful counts, dates, or form identity. UTC moves next to the relevant report filters and follow-up heading. Role guidance, ownership-transfer consequences, and privacy links remain visible.
   - [Settings before](04-settings-before.png) · [Settings after](05-settings-after.png)
4. **Website setup — working, with optional detail.** Shortened the route choices and step introductions. The handoff feature list is available in a native disclosure; copy actions, the missing-key warning, and Back/Continue remain visible. Verified that the disclosure opens and closes.
   - [Setup after](06-setup-after.png)

## Scope

Applied the same editing rule to the public feature, comparison, guide index, tool index, and tool pages; authentication; dashboard; form list, builder, detail, and connection pages; clients; reply templates; reports; follow-ups; sample demo; and shared header/footer. Kept substantive guide instructions, legal documents, consent text, validation, errors, security notices, and action confirmations.

The comparison heading now names the comparison without implying that d3CRM guarantees replies. Native semantic headings, input labels, disclosure controls, screen-reader descriptions, and recovery links remain in place.

## Verification

- TypeScript and ESLint pass (excluding the existing `.claude` worktree directory).
- All 45 unit tests pass.
- Browser review of all ten top-level workspace routes, form detail and connection screens, and nine public/authentication routes.
- No page-level horizontal overflow at 320, 375, 414, or 768px on the reviewed homepage, features, guides, comparison, tools, demo, password recovery, overview, builder, settings, reports, form detail, and connection screens.
- Successful sign-in; setup step navigation and disclosure; mobile navigation; and FAQ expansion checked in the in-app browser.

This is a copy and hierarchy pass, not a complete accessibility certification or an end-to-end exercise of billing, invitations, notifications, and third-party integrations. Screenshots use disposable local test data. Legal content was retained, not legally re-reviewed.
