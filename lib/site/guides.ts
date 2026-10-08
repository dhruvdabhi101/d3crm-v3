export const guides = [
  {
    slug: "connect-website-forms", title: "How to connect website contact forms to d3CRM",
    description: "Connect an existing website form to a shared enquiry inbox, test the connection, and capture campaign context without replacing your website.",
    intro: "d3CRM receives contact-form submissions from your existing website. Its connection wizard generates HTML and JavaScript for a new form, or a submit handler for an existing form. You need a website that supports custom JavaScript and a d3CRM workspace.",
    sections: [
      { title: "Create a form and match its fields", body: "Create a form in your workspace using the form builder, a template, or a reviewed AI-generated definition. Field IDs are the keys sent by your website: an email field with ID email needs a website control named email. Use email, number, checkbox, and other field types to match the values you collect. Keep required fields limited to the information needed to respond." },
      { title: "Configure access and make the form live", body: "Owners and admins can set allowed website origins and make a form live. An origin includes the protocol and host, such as https://example.com; a www address is a different origin. Copy the publishable key when it is created. It is visible to website visitors and identifies the form; it does not grant access to your workspace. Rotate a lost or replaced key and update the website snippet." },
      { title: "Generate and test your integration", body: "Open Connect website on the form. Choose complete HTML/JavaScript or a handler for an existing form ID. Add the generated test code on the actual website to check browser-origin rules and field validation. The test endpoint checks the payload without creating an enquiry or triggering email or webhooks. A dashboard check alone does not prove the snippet is installed on the website." },
      { title: "Switch to live mode", body: "Replace the test handler with the live handler. Keep one submit handler, show loading and success feedback, and preserve answers when a request fails. Submit one intentional test enquiry and confirm it reaches the inbox. Endpoint validation and notification delivery are separate checks. Use the form launch checklist before handing the website to a client." },
      { title: "Keep campaign context with the enquiry", body: "The generated snippet can include the landing page, referrer, and current-page UTM parameters in a separate _context object. Reports group submitted enquiries by reported source. This is enquiry attribution, not visitor analytics or advertising ROI. Avoid personal information in campaign names and page URLs; d3CRM strips query strings and fragments from stored page URLs." },
    ],
    related: "manage-client-enquiries",
  },
  {
    slug: "manage-client-enquiries", title: "How agencies can manage client website enquiries",
    description: "Set up separate client workspaces, assign website enquiries, and hand over access with d3CRM's existing roles and inbox workflows.",
    intro: "An agency can use d3CRM to look after enquiries from multiple client websites. Each client workspace has its own forms, enquiries, memberships, and settings. Your cross-client view includes only workspaces you can currently access.",
    sections: [
      { title: "Create a separate client workspace", body: "Verified owners and admins can create a client workspace from Clients. Creation makes you the new workspace owner. Your agency teammates are not automatically added: invite only the people who should see that client's enquiries. Open the client workspace before connecting its forms or changing its settings." },
      { title: "Choose the right role for each person", body: "Owners manage membership and ownership. Owners and admins manage forms and workspace settings. Members can work on enquiries, and viewers can read and export without editing. Give clients access to their own workspace and review membership before handing over a website. You can transfer ownership in Settings and choose whether to remain an admin." },
      { title: "Give incoming enquiries a clear owner", body: "Set each form to manual assignment, a default assignee, or round robin across selected writers. Automatic routing applies to new enquiries. If no eligible person remains in the routing pool, the enquiry stays unassigned. Use the unassigned inbox view to catch these cases and keep routing up to date as teammates leave." },
      { title: "Work the inbox and pipeline", body: "Search and filter by form, status, assignment, unread state, or follow-up due. Save private views for routines you repeat. The pipeline uses New, Contacted, Qualified, Won, Lost, and Spam. Its cards represent enquiries rather than deal values or revenue forecasts. Writers can update selected enquiries in a batch from the list." },
      { title: "Hand over a working process", body: "Confirm the live form reaches the correct inbox, check permissions, name a person responsible for new enquiries, and agree how often the team checks follow-ups. Export enquiries as CSV when the client needs a spreadsheet. Workspace plan limits and any configured billing remain separate for each client." },
    ],
    related: "follow-up-website-leads",
  },
  {
    slug: "follow-up-website-leads", title: "How to follow up on website leads with a shared inbox",
    description: "Use statuses, assignees, follow-up dates, reply templates, and saved inbox views to give every website enquiry a clear next step.",
    intro: "A contact form captures interest; a shared process makes the next action visible. d3CRM combines enquiry statuses, assignments, notes, reply drafts, and scheduled follow-ups so a small team can work from the same context.",
    sections: [
      { title: "Triage new enquiries", body: "Start with new or unread enquiries. Read the submitted answers, check same-email warnings for previous context, and assign a teammate. Same-email matches are prompts to review history, not proof that two submissions are duplicates. Mark irrelevant submissions as spam so they do not inflate the non-spam enquiry reports." },
      { title: "Prepare a useful first reply", body: "Use a workspace reply template or write a personalised draft. d3CRM can copy it or open your email app; it does not send replies automatically. Review the recipient, subject, and message before sending. Move the enquiry to Contacted when you have actually contacted the person, so the shared status reflects your work." },
      { title: "Schedule the next action", body: "Set a follow-up date and leave a note explaining the action. The agenda groups active enquiries into overdue, today, next seven days, and all scheduled. Dates use UTC. Won, Lost, and Spam enquiries are excluded. Changing a date schedules the task; it does not send a message or mark the lead contacted." },
      { title: "Build a repeatable daily view", body: "Save a private inbox view for assigned-to-me, unassigned, or follow-up-due enquiries. Review overdue items and today's agenda, then reschedule or clear dates after completing the next action. Saved views belong to their creator and do not expand workspace access." },
      { title: "Review the result", body: "Use Reports to review enquiry counts, current statuses, won enquiries, and reported campaign sources for a creation-date range. The lead-to-won rate describes that enquiry cohort, not website visitor conversion. First marked contacted measures the explicit status transition, not an independently tracked email or phone call." },
    ],
    related: "connect-website-forms",
  },
] as const;

export const publicPaths = ["/", "/demo", "/features", "/guides", ...guides.map(guide => `/guides/${guide.slug}`), "/tools", "/tools/campaign-url-builder", "/tools/form-launch-checklist"];
