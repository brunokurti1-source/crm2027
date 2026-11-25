import { z } from "zod";

const phoneRegex = /^\+?[0-9\s\-()]{6,20}$/;

export const emailSchema = z
  .string()
  .trim()
  .email("Invalid email")
  .or(z.literal(""))
  .nullable()
  .optional();

export const phoneSchema = z
  .string()
  .trim()
  .regex(phoneRegex, "Invalid phone")
  .or(z.literal(""))
  .nullable()
  .optional();

export const clientIdSchema = z
  .string()
  .trim()
  .min(1, "Client ID is required")
  .max(64, "ID too long")
  .regex(/^[A-Za-z0-9._\-]+$/, "ID allows only letters, numbers, . _ -");

export const moneySchema = z.coerce.number().finite("Invalid amount");

export const clientUpsertSchema = z.object({
  clientIdNumber: clientIdSchema,
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  phone: phoneSchema,
  email: emailSchema,
  company: z.string().trim().max(200).nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
  country: z.string().trim().max(100).nullable().optional(),
  leadSource: z.string().trim().max(100).nullable().optional(),
  status: z.string().trim().min(1).max(64).default("NEW"),
  notes: z.string().trim().max(5000).nullable().optional(),
  agentId: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
  creditBalance: moneySchema.optional(),
});

export type ClientUpsertInput = z.infer<typeof clientUpsertSchema>;

export function normalizeOptional(value: string | null | undefined) {
  if (value === null || value === undefined) return null;
  const t = value.trim();
  return t === "" ? null : t;
}
