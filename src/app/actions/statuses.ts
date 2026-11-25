"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

function canManageStatuses(ctx: Awaited<ReturnType<typeof requireAuth>>) {
  return ctx.user.role === "ADMIN" || ctx.user.permissions.manageStatuses;
}

export async function createStatusAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const ctx = await requireAuth();
  if (!canManageStatuses(ctx)) return { error: "Nuk keni leje." };

  const code = String(formData.get("code") || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  const labelSq = String(formData.get("labelSq") || "").trim();
  const labelEn = String(formData.get("labelEn") || "").trim() || null;
  const color = String(formData.get("color") || "").trim() || null;
  if (!code || !labelSq) return { error: "Kodi dhe emri janë të detyrueshëm." };

  const exists = await prisma.clientStatus.findUnique({ where: { code } });
  if (exists) return { error: "Ky kod statusi ekziston tashmë." };

  const max = await prisma.clientStatus.aggregate({ _max: { sortOrder: true } });
  await prisma.clientStatus.create({
    data: {
      code,
      labelSq,
      labelEn,
      color,
      sortOrder: (max._max.sortOrder || 100) + 10,
      active: true,
      isSystem: false,
    },
  });

  await logAudit({
    actorId: ctx.realUser.id,
    action: "STATUS_CREATED",
    details: `Status ${code} («${labelSq}»)`,
  });

  revalidatePath("/settings/statuses");
  revalidatePath("/clients");
  return { ok: true };
}

export async function updateStatusAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const ctx = await requireAuth();
  if (!canManageStatuses(ctx)) return { error: "Nuk keni leje." };

  const id = String(formData.get("id") || "");
  const status = await prisma.clientStatus.findUnique({ where: { id } });
  if (!status) return { error: "Statusi nuk u gjet." };

  const labelSq = String(formData.get("labelSq") || "").trim();
  const labelEn = String(formData.get("labelEn") || "").trim() || null;
  const color = String(formData.get("color") || "").trim() || null;
  const sortOrder = Number(formData.get("sortOrder") || status.sortOrder);
  if (!labelSq) return { error: "Emri është i detyrueshëm." };

  await prisma.clientStatus.update({
    where: { id },
    data: {
      labelSq,
      labelEn,
      color,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : status.sortOrder,
    },
  });

  await logAudit({
    actorId: ctx.realUser.id,
    action: "STATUS_UPDATED",
    details: `Status ${status.code}: «${status.labelSq}» → «${labelSq}»`,
  });

  revalidatePath("/settings/statuses");
  revalidatePath("/clients");
  return { ok: true };
}

export async function toggleStatusAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const ctx = await requireAuth();
  if (!canManageStatuses(ctx)) return { error: "Nuk keni leje." };

  const id = String(formData.get("id") || "");
  const status = await prisma.clientStatus.findUnique({ where: { id } });
  if (!status) return { error: "Statusi nuk u gjet." };
  if (status.isSystem && status.active) {
    return { error: "Statuset e sistemit nuk çaktivizohen." };
  }

  await prisma.clientStatus.update({
    where: { id },
    data: { active: !status.active },
  });

  await logAudit({
    actorId: ctx.realUser.id,
    action: status.active ? "STATUS_DEACTIVATED" : "STATUS_ACTIVATED",
    details: `Status ${status.code}`,
  });

  revalidatePath("/settings/statuses");
  revalidatePath("/clients");
  return { ok: true };
}

export async function deleteStatusAction(
  formData: FormData,
): Promise<{
  error?: string;
  ok?: boolean;
  needsReplacement?: boolean;
  clientCount?: number;
}> {
  const ctx = await requireAuth();
  if (!canManageStatuses(ctx)) return { error: "Nuk keni leje." };

  const id = String(formData.get("id") || "");
  const confirm = String(formData.get("confirm") || "");
  const replaceWith = String(formData.get("replaceWith") || "").trim();
  const status = await prisma.clientStatus.findUnique({ where: { id } });
  if (!status) return { error: "Statusi nuk u gjet." };
  if (status.isSystem) {
    return { error: "Statuset e sistemit nuk fshihen. Riemërtoni ose çaktivizoni." };
  }

  const clientCount = await prisma.client.count({
    where: { status: status.code, deletedAt: null },
  });

  if (clientCount > 0 && !replaceWith) {
    return {
      error: `${clientCount} klientë kanë këtë status. Zgjidhni një status zëvendësues ose riemërtoni.`,
      needsReplacement: true,
      clientCount,
    };
  }

  if (confirm !== "PO" && confirm !== "YES") {
    return { error: "Shkruani PO për të konfirmuar fshirjen." };
  }

  if (clientCount > 0) {
    const replacement = await prisma.clientStatus.findUnique({
      where: { code: replaceWith },
    });
    if (!replacement || !replacement.active) {
      return { error: "Statusi zëvendësues nuk është i vlefshëm." };
    }
    if (replacement.code === status.code) {
      return { error: "Zgjidhni një status tjetër si zëvendësues." };
    }

    await prisma.client.updateMany({
      where: { status: status.code },
      data: { status: replacement.code, version: { increment: 1 } },
    });

    await logAudit({
      actorId: ctx.realUser.id,
      action: "STATUS_REPLACED_ON_CLIENTS",
      details: `${clientCount} klientë: ${status.code} → ${replacement.code}`,
    });
  }

  await prisma.clientStatus.delete({ where: { id } });

  await logAudit({
    actorId: ctx.realUser.id,
    action: "STATUS_DELETED",
    details: `U fshi statusi ${status.code} («${status.labelSq}»)`,
  });

  revalidatePath("/settings/statuses");
  revalidatePath("/clients");
  return { ok: true };
}
