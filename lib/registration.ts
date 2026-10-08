import { z } from "zod";
import { validPassword } from "./security.ts";
import { legalVersion } from "./legal.ts";

export const registrationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  password: z.string().refine(validPassword, "Use at least 8 characters and at most 72 bytes."),
  organization: z.string().trim().min(2).max(100),
  acceptedTerms: z.literal(true),
  accountConsent: z.literal(true),
  legalVersion: z.literal(legalVersion),
});
