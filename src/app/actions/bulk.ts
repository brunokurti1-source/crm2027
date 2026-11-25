"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity, logAudit } from "@/lib/audit";
import { assertClientInScope, ScopeError } from "@/lib/scope";
import { actionT } from "@/lib/i18n/action-t";

export async function bulkAssignClientsAction(formData: FormData): Promise<{
  ok?: boolean;
  error?: string;
  assigned?: number;
}> {
  const t = await actionT();
  const ctx = await requireAuth();
  if (!ctx.user.permissions.manageClients && ctx.user.role !== "ADMIN") {
    return { error: t.errors.bulkNoPermission };
  }

  const confirm = String(formData.get("confirm") || "");
  if (confirm !== "PO" && confirm !== "YES") {
    return { error: t.errors.confirmYes };
  }

  const ids = formData
    .getAll("clientIds")
    .map(String)
    .filter(Boolean);
  if (!ids.length) return { error: t.errors.bulkNone };

  const agentId = String(formData.get("agentId") || "") || null;
  const managerId = String(formData.get("managerId") || "") || null;

  if (ctx.user.role === "MANAGER") {
    if (managerId && managerId !== ctx.user.id) {
      return { error: t.errors.bulkGroupOnly };
    }
    if (agentId) {
      const agent = await prisma.user.findFirst({
        where: { id: agentId, role: "AGENT", managerId: ctx.user.id },
      });
      if (!agent) return { error: t.errors.agentNotInYourGroup };
    }
  }

  let assigned = 0;
  const errors: string[] = [];

  for (const clientId of ids) {
    try {
      await assertClientInScope(ctx, clientId);
      await prisma.client.update({
        where: { id: clientId },
        data: {
          agentId,
          managerId: managerId || (ctx.user.role === "MANAGER" ? ctx.user.id : null),
          version: { increment: 1 },
        },
      });
      await logActivity({
        clientId,
        actorId: ctx.realUser.id,
        action: "CLIENT_BULK_ASSIGNED",
        description: `Caktim masiv: agjent=${agentId ?? "—"}, menaxher=${managerId ?? "—"}`,
      });
      assigned++;
    } catch (e) {
      errors.push(
        e instanceof ScopeError ? `${clientId}: ${e.message}` : String(clientId),
      );
    }
  }

  await logAudit({
    actorId: ctx.realUser.id,
    action: "CLIENT_BULK_ASSIGN",
    details: `Bulk assign: ${assigned}/${ids.length} clients. Errors: ${errors.length}`,
  });

  revalidatePath("/clients");
  revalidatePath("/team");

  if (errors.length && !assigned) {
    return { error: errors.slice(0, 3).join("; ") };
  }
  return { ok: true, assigned };
}
