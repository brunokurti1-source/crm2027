"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function createStatusAction(formData: FormData): Promise<void> {
  const ctx = await requireAuth();
  if (ctx.user.role !== "ADMIN" && !ctx.user.permissions.manageStatuses) return;

  const code = String(formData.get("code") || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  const labelSq = String(formData.get("labelSq") || "").trim();
  const labelEn = String(formData.get("labelEn") || "").trim() || null;
  if (!code || !labelSq) return;

  const max = await prisma.clientStatus.aggregate({ _max: { sortOrder: true } });
  await prisma.clientStatus.create({
    data: {
      code,
      labelSq,
      labelEn,
      sortOrder: (max._max.sortOrder || 100) + 10,
      active: true,
      isSystem: false,
    },
  });

  await logAudit({
    actorId: ctx.realUser.id,
    action: "STATUS_CREATED",
    details: `Status ${code}`,
  });

  revalidatePath("/settings/statuses");
  revalidatePath("/clients");
}

export async function toggleStatusAction(formData: FormData): Promise<void> {
  const ctx = await requireAuth();
  if (ctx.user.role !== "ADMIN" && !ctx.user.permissions.manageStatuses) return;

  const id = String(formData.get("id") || "");
  const status = await prisma.clientStatus.findUnique({ where: { id } });
  if (!status || status.isSystem) return;

  await prisma.clientStatus.update({
    where: { id },
    data: { active: !status.active },
  });

  revalidatePath("/settings/statuses");
}
