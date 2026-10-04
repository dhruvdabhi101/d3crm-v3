import type { Activity } from "@prisma/client";

export function activityLabel(activity: Pick<Activity, "action" | "details">) {
  const details = activity.details as Record<string, unknown>;
  const labels: Record<string, string> = {
    "lead.created": "Enquiry received", "lead.updated": "Enquiry updated", "lead.note_added": "Note added", "lead.deleted": "Enquiry deleted",
    "form.created": "Form created", "form.updated": "Form edited", "form.status_changed": "Form status changed", "form.key_rotated": "Publishable key rotated", "form.connections_changed": "Connections changed", "form.exported": "CSV export requested",
    "member.invited": "Teammate invited", "member.invitation_cancelled": "Invitation cancelled", "member.joined": "Teammate joined", "member.removed": "Teammate removed", "member.role_changed": "Member role changed", "organization.renamed": "Workspace renamed", "organization.ownership_transferred": "Ownership transferred",
  };
  const label = labels[activity.action] ?? "Workspace activity";
  return activity.action === "lead.updated" && details.previousStatus !== details.status ? `${label}: ${String(details.previousStatus).toLowerCase()} to ${String(details.status).toLowerCase()}` : label;
}
