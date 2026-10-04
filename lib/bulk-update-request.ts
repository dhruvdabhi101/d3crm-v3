import type { SubmissionState } from "./actions/submissions";

export async function requestBulkUpdate(data: FormData): Promise<SubmissionState> {
  const response = await fetch("/api/submissions/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: String(data.get("payload") ?? ""),
  });
  const result: unknown = await response.json();
  if (result && typeof result === "object") {
    if ("error" in result && typeof result.error === "string") return { error: result.error };
    if (response.ok && "success" in result && typeof result.success === "string") return { success: result.success };
  }
  throw new Error("Invalid bulk update response.");
}
