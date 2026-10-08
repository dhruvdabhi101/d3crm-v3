export const campaignFields = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
export type CampaignInput = Record<(typeof campaignFields)[number], string>;

export function campaignUrl(input: string, campaign: CampaignInput) {
  let url: URL;
  try { url = new URL(input.trim()); } catch { throw new Error("Enter a complete website URL, starting with https:// or http://."); }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("Use an HTTP or HTTPS URL without a username or password.");
  if (input.length > 2048) throw new Error("Keep the website URL under 2,048 characters.");
  for (const key of campaignFields) {
    const value = campaign[key].trim();
    if (value.length > 200) throw new Error("Keep each campaign value under 200 characters.");
    if (["utm_source", "utm_medium", "utm_campaign"].includes(key) && !value) throw new Error("Add a source, medium, and campaign name.");
    url.searchParams.delete(key);
    if (value) url.searchParams.set(key, ["utm_source", "utm_medium"].includes(key) ? value.toLowerCase() : value);
  }
  if (url.href.length > 2048) throw new Error("The campaign URL exceeds 2,048 characters. Shorten the URL or campaign values.");
  return url.href;
}

export const launchChecklist = [
  { title: "Fields match the website", detail: "Confirm field IDs, types, and required values match the controls on your website." },
  { title: "Privacy notice and collection basis are in place", detail: "Publish the collecting business’s own privacy notice beside the form. Explain fields, purposes, d3CRM processing, recipients, retention, and rights. Obtain and record consent where required; keep optional marketing separate. Use dummy data until international-transfer safeguards are agreed." },
  { title: "The form is live", detail: "Check the current publishable key and replace any older key in the website snippet." },
  { title: "Website origins are correct", detail: "Allow the actual protocol and host, including www if used. Test on the production website." },
  { title: "The endpoint passes test mode", detail: "Run the generated test handler on the website. This validates the connection without creating a lead." },
  { title: "One live handler is installed", detail: "Replace test mode with the live handler. Check loading, errors, preserved answers, and success feedback." },
  { title: "An intentional live enquiry arrives", detail: "Send a clearly labelled test enquiry and confirm its answers and campaign context in the correct inbox." },
  { title: "The team has access and an owner", detail: "Review workspace roles and lead routing, and agree who checks unassigned enquiries and follow-ups." },
  { title: "Optional delivery is checked separately", detail: "If email alerts or webhooks are configured, check their delivery history. An endpoint check does not verify delivery." },
] as const;
