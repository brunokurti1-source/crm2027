"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  CUSTOM_FIELD_TYPES,
  customFieldDefinitionSchema,
  slugifyFieldKey,
} from "@/lib/custom-fields";
import { actionT } from "@/lib/i18n/action-t";

function assertAdmin(ctx: Awaited<ReturnType<typeof requireAuth>>) {
  return ctx.user.role === "ADMIN";
}

export async function createCustomFieldAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const t = await actionT();
  const ctx = await requireAuth();
  if (!assertAdmin(ctx)) return { error: t.errors.adminOnly };

  const entityType = String(formData.get("entityType") || "CLIENT");
  const label = String(formData.get("label") || "").trim();
  const keyRaw = String(formData.get("key") || label);
  const key = slugifyFieldKey(keyRaw);
  const dataType = String(formData.get("dataType") || "TEXT");
  const required = formData.get("required") === "on";
  const showInList = formData.get("showInList") === "on";
  const showInFilter = formData.get("showInFilter") === "on";
  const optionsRaw = String(formData.get("options") || "").trim();
  const options = optionsRaw
    ? JSON.stringify(
        optionsRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      )
    : null;

  const parsed = customFieldDefinitionSchema().safeParse({
    entityType,
    key,
    label,
    dataType,
    required,
    options,
    showInList,
    showInFilter,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || t.errors.invalidData };
  }
  if (!CUSTOM_FIELD_TYPES.includes(parsed.data.dataType as (typeof CUSTOM_FIELD_TYPES)[number])) {
    return { error: t.errors.invalidFieldType };
  }

  const exists = await prisma.customFieldDefinition.findUnique({
    where: {
      entityType_key: {
        entityType: parsed.data.entityType,
        key: parsed.data.key,
      },
    },
  });
  if (exists) return { error: t.errors.fieldExists };

  const max = await prisma.customFieldDefinition.aggregate({
    where: { entityType: parsed.data.entityType },
    _max: { sortOrder: true },
  });

  await prisma.customFieldDefinition.create({
    data: {
      entityType: parsed.data.entityType,
      key: parsed.data.key,
      label: parsed.data.label,
      dataType: parsed.data.dataType,
      required: parsed.data.required,
      options: parsed.data.options ?? null,
      showInList: parsed.data.showInList ?? false,
      showInFilter: parsed.data.showInFilter ?? false,
      sortOrder: (max._max.sortOrder || 0) + 10,
      active: true,
    },
  });

  await logAudit({
    actorId: ctx.realUser.id,
    action: "CUSTOM_FIELD_CREATED",
    details: `${parsed.data.entityType}.${parsed.data.key} (${parsed.data.dataType})`,
  });

  revalidatePath("/settings/fields");
  revalidatePath("/clients");
  revalidatePath("/users");
  return { ok: true };
}

export async function updateCustomFieldAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const t = await actionT();
  const ctx = await requireAuth();
  if (!assertAdmin(ctx)) return { error: t.errors.adminOnly };

  const id = String(formData.get("id") || "");
  const field = await prisma.customFieldDefinition.findUnique({ where: { id } });
  if (!field) return { error: t.errors.fieldNotFound };

  const label = String(formData.get("label") || "").trim();
  const dataType = String(formData.get("dataType") || field.dataType);
  const required = formData.get("required") === "on";
  const showInList = formData.get("showInList") === "on";
  const showInFilter = formData.get("showInFilter") === "on";
  const active = formData.get("active") === "on";
  const sortOrder = Number(formData.get("sortOrder") || field.sortOrder);
  const optionsRaw = String(formData.get("options") || "").trim();
  const options = optionsRaw
    ? JSON.stringify(
        optionsRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      )
    : null;

  if (!label) return { error: t.errors.fieldLabelRequired };
  if (!CUSTOM_FIELD_TYPES.includes(dataType as (typeof CUSTOM_FIELD_TYPES)[number])) {
    return { error: t.errors.invalidFieldType };
  }

  await prisma.customFieldDefinition.update({
    where: { id },
    data: {
      label,
      dataType,
      required,
      showInList,
      showInFilter,
      active,
      options,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : field.sortOrder,
    },
  });

  await logAudit({
    actorId: ctx.realUser.id,
    action: "CUSTOM_FIELD_UPDATED",
    details: `${field.entityType}.${field.key} → «${label}»`,
  });

  revalidatePath("/settings/fields");
  revalidatePath("/clients");
  revalidatePath("/users");
  return { ok: true };
}

export async function deleteCustomFieldAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const t = await actionT();
  const ctx = await requireAuth();
  if (!assertAdmin(ctx)) return { error: t.errors.adminOnly };

  const id = String(formData.get("id") || "");
  const confirm = String(formData.get("confirm") || "");
  if (confirm !== "PO" && confirm !== "YES") {
    return { error: t.errors.confirmYes };
  }

  const field = await prisma.customFieldDefinition.findUnique({ where: { id } });
  if (!field) return { error: t.errors.fieldNotFound };

  await prisma.customFieldDefinition.delete({ where: { id } });

  await logAudit({
    actorId: ctx.realUser.id,
    action: "CUSTOM_FIELD_DELETED",
    details: `U fshi ${field.entityType}.${field.key} («${field.label}»)`,
  });

  revalidatePath("/settings/fields");
  revalidatePath("/clients");
  revalidatePath("/users");
  return { ok: true };
}
