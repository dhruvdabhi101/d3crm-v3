import { z } from "zod";

const profileSchema = z.object({
  name: z.string().trim().min(2),
  address: z.string().trim().min(10),
  email: z.email().refine(value => !/(?:@|\.)(?:example\.(?:com|org|net)|test|invalid|localhost)$/i.test(value)),
  grievanceContact: z.string().trim().min(2),
  infrastructure: z.string().trim().min(2),
  locations: z.string().trim().min(2),
});

export function legalProfile(env: Record<string, string | undefined> = process.env) {
  const parsed = profileSchema.safeParse({ name: env.LEGAL_OPERATOR_NAME, address: env.LEGAL_OPERATOR_ADDRESS, email: env.LEGAL_CONTACT_EMAIL, grievanceContact: env.LEGAL_GRIEVANCE_CONTACT, infrastructure: env.LEGAL_INFRASTRUCTURE_PROVIDERS, locations: env.LEGAL_PROCESSING_LOCATIONS });
  return parsed.success ? parsed.data : null;
}
