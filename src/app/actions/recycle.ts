"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function restoreSoftDeleteAction(
  formData: FormData,
): Promise<void> {
  const ctx = await requireAuth();
  if (ctx.user.role !== "ADMIN") return;

  const id = String(formData.get("id") || "");
  const item = await prisma.softDelete.findUnique({ where: { id } });
  if (!item || item.purgedAt || item.restoredAt) return;

  if (item.entityType === "CLIENT") {
    await prisma.client.update({
      where: { id: item.entityId },
      data: { deletedAt: null, deletedById: null },
    });
  } else if (item.entityType === "COMMENT") {
    await prisma.comment.update({
      where: { id: item.entityId },
      data: { deletedAt: null, deletedById: null },
    });
  } else if (item.entityType === "USER") {
    await prisma.user.update({
      where: { id: item.entityId },
      data: { deletedAt: null, deletedById: null, active: true },
    });
  }

  await prisma.softDelete.update({
    where: { id },
    data: { restoredAt: new Date() },
  });

  await logAudit({
    actorId: ctx.realUser.id,
    action: "SOFT_RESTORE",
    details: `Rikthyer ${item.entityType} ${item.label}`,
  });

  revalidatePath("/recycle-bin");
  revalidatePath("/clients");
}

export async function purgeSoftDeleteAction(formData: FormData): Promise<void> {
  const ctx = await requireAuth();
  if (ctx.user.role !== "ADMIN") return;

  const id = String(formData.get("id") || "");
  const confirm = String(formData.get("confirm") || "");
  if (confirm !== "FSHIJ" && confirm !== "DELETE") return;

  const item = await prisma.softDelete.findUnique({ where: { id } });
  if (!item || item.purgedAt) return;

  if (item.entityType === "CLIENT") {
    await prisma.client.delete({ where: { id: item.entityId } }).catch(() => null);
  } else if (item.entityType === "COMMENT") {
    await prisma.comment.delete({ where: { id: item.entityId } }).catch(() => null);
  } else if (item.entityType === "USER") {
    await prisma.user.delete({ where: { id: item.entityId } }).catch(() => null);
  }

  await prisma.softDelete.update({
    where: { id },
    data: { purgedAt: new Date() },
  });

  await logAudit({
    actorId: ctx.realUser.id,
    action: "SOFT_PURGE",
    details: `Permanent delete ${item.entityType} ${item.label}`,
  });

  revalidatePath("/recycle-bin");
}
