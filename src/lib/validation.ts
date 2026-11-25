import { z } from "zod";

const phoneRegex = /^\+?[0-9\s\-()]{6,20}$/;

export const emailSchema = z
  .string()
  .trim()
  .email("Email i pavlefshëm")
  .or(z.literal(""))
  .nullable()
  .optional();

export const phoneSchema = z
  .string()
  .trim()
  .regex(phoneRegex, "Telefon i pavlefshëm")
  .or(z.literal(""))
  .nullable()
  .optional();

export const clientIdSchema = z
  .string()
  .trim()
  .min(1, "ID e klientit është e detyrueshme")
  .max(64, "ID shumë e gjatë")
  .regex(/^[A-Za-z0-9._\-]+$/, "ID lejon vetëm shkronja, numra, . _ -");

export const moneySchema = z.coerce.number().finite("Shuma e pavlefshme");

export const clientUpsertSchema = z.object({
  clientIdNumber: clientIdSchema,
  firstName: z.string().trim().min(1, "Emri është i detyrueshëm").max(100),
  lastName: z.string().trim().min(1, "Mbiemri është i detyrueshëm").max(100),
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
