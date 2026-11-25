import { prisma } from "@/lib/db";
import { z } from "zod";

export const CUSTOM_FIELD_TYPES = [
  "TEXT",
  "NUMBER",
  "DATE",
  "BOOLEAN",
  "SELECT",
] as const;

export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];
export type CustomEntityType = "CLIENT" | "USER";

export type CustomFieldDef = {
  id: string;
  entityType: string;
  key: string;
  label: string;
  dataType: string;
  required: boolean;
  options: string | null;
  sortOrder: number;
  active: boolean;
  showInList: boolean;
  showInFilter: boolean;
};

export function parseSelectOptions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(String).map((s) => s.trim()).filter(Boolean);
    }
  } catch {
    // fall through — comma-separated
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function slugifyFieldKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

export async function listCustomFields(
  entityType: CustomEntityType,
  opts?: { activeOnly?: boolean; forFilter?: boolean; forList?: boolean },
) {
  return prisma.customFieldDefinition.findMany({
    where: {
      entityType,
      ...(opts?.activeOnly ? { active: true } : {}),
      ...(opts?.forFilter ? { showInFilter: true, active: true } : {}),
      ...(opts?.forList ? { showInList: true, active: true } : {}),
    },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getCustomFieldValues(
  entityType: CustomEntityType,
  entityId: string,
): Promise<Record<string, string>> {
  const fields = await listCustomFields(entityType, { activeOnly: false });
  if (!fields.length) return {};
  const values = await prisma.customFieldValue.findMany({
    where: {
      entityId,
      fieldId: { in: fields.map((f) => f.id) },
    },
  });
  const byId = Object.fromEntries(values.map((v) => [v.fieldId, v.value]));
  const out: Record<string, string> = {};
  for (const f of fields) {
    out[f.key] = byId[f.id] ?? "";
  }
  return out;
}

export function validateCustomFieldValue(
  field: CustomFieldDef,
  raw: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const value = raw.trim();
  if (!value) {
    if (field.required) {
      return { ok: false, error: `Fusha «${field.label}» është e detyrueshme.` };
    }
    return { ok: true, value: "" };
  }

  switch (field.dataType) {
    case "NUMBER": {
      if (Number.isNaN(Number(value))) {
        return { ok: false, error: `«${field.label}» duhet të jetë numër.` };
      }
      return { ok: true, value };
    }
    case "DATE": {
      if (Number.isNaN(Date.parse(value))) {
        return { ok: false, error: `«${field.label}» duhet të jetë datë e vlefshme.` };
      }
      return { ok: true, value };
    }
    case "BOOLEAN": {
      if (!["true", "false", "1", "0", "po", "jo"].includes(value.toLowerCase())) {
        return { ok: false, error: `«${field.label}» duhet të jetë po/jo.` };
      }
      const normalized =
        value.toLowerCase() === "true" ||
        value === "1" ||
        value.toLowerCase() === "po"
          ? "true"
          : "false";
      return { ok: true, value: normalized };
    }
    case "SELECT": {
      const opts = parseSelectOptions(field.options);
      if (opts.length && !opts.includes(value)) {
        return {
          ok: false,
          error: `«${field.label}» ka vlerë të palejuar.`,
        };
      }
      return { ok: true, value };
    }
    default:
      return { ok: true, value };
  }
}

/** Read cf_<key> values from FormData and validate against definitions */
export function extractCustomFieldInputs(
  formData: FormData,
  fields: CustomFieldDef[],
): { values: Record<string, string>; error?: string } {
  const values: Record<string, string> = {};
  for (const field of fields) {
    if (!field.active) continue;
    let raw = String(formData.get(`cf_${field.key}`) ?? "");
    if (field.dataType === "BOOLEAN" && formData.get(`cf_${field.key}`) === "on") {
      raw = "true";
    } else if (
      field.dataType === "BOOLEAN" &&
      formData.get(`cf_${field.key}`) === null
    ) {
      // unchecked checkbox — only required check later
      raw = formData.has(`cf_${field.key}`) ? raw : "";
      if (!formData.has(`cf_${field.key}_present`)) {
        // when checkbox not submitted, treat as false if field present in form via hidden
        raw = "";
      }
    }
    const checked = validateCustomFieldValue(field, raw);
    if (!checked.ok) return { values, error: checked.error };
    values[field.key] = checked.value;
  }
  return { values };
}

export async function saveCustomFieldValues(input: {
  entityType: CustomEntityType;
  entityId: string;
  values: Record<string, string>;
}) {
  const fields = await listCustomFields(input.entityType, { activeOnly: true });
  for (const field of fields) {
    if (!(field.key in input.values)) continue;
    const value = input.values[field.key] ?? "";
    await prisma.customFieldValue.upsert({
      where: {
        fieldId_entityId: { fieldId: field.id, entityId: input.entityId },
      },
      create: {
        fieldId: field.id,
        entityId: input.entityId,
        value,
      },
      update: { value },
    });
  }
}

export function customFieldDefinitionSchema() {
  return z.object({
    entityType: z.enum(["CLIENT", "USER"]),
    key: z.string().min(1).max(64),
    label: z.string().min(1).max(120),
    dataType: z.enum(CUSTOM_FIELD_TYPES),
    required: z.boolean(),
    options: z.string().nullable().optional(),
    sortOrder: z.number().int().optional(),
    showInList: z.boolean().optional(),
    showInFilter: z.boolean().optional(),
  });
}
