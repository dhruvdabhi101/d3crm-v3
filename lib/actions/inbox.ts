"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentContext } from "@/lib/permissions";
import { removeInboxView, saveInboxView } from "@/lib/inbox";
import { RequestError } from "@/lib/security";

type ViewState = { error?: string; success?: string };
export async function createInboxView(_state: ViewState, data: FormData): Promise<ViewState> {
  const { organization, user } = await getCurrentContext();
  let filters: unknown;
  const raw = String(data.get("filters") ?? "");
  if (raw.length > 2000) return { error: "Invalid view filters." };
  try { filters = JSON.parse(raw); } catch { return { error: "Invalid view filters." }; }
  try { await db.$transaction(tx => saveInboxView(tx, organization.id, user.id, String(data.get("name") ?? ""), filters)); }
  catch (error) { if (error instanceof RequestError) return { error: error.message }; throw error; }
  revalidatePath("/submissions");
  return { success: "View saved." };
}

export async function deleteInboxView(id: string): Promise<ViewState> {
  const { organization, user } = await getCurrentContext();
  try { await db.$transaction(tx => removeInboxView(tx, organization.id, user.id, id)); }
  catch (error) { if (error instanceof RequestError) return { error: error.message }; throw error; }
  revalidatePath("/submissions");
  return { success: "View removed." };
}
