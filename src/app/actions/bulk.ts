"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity, logAudit } from "@/lib/audit";
import { assertClientInScope, ScopeError } from "@/lib/scope";

export async function bulkAssignClientsAction(formData: FormData): Promise<{
  ok?: boolean;
  error?: string;
  assigned?: number;
}> {
  const ctx = await requireAuth();
  if (!ctx.user.permissions.manageClients && ctx.user.role !== "ADMIN") {
    return { error: "Nuk keni leje për caktim masiv." };
  }

  const confirm = String(formData.get("confirm") || "");
  if (confirm !== "PO" && confirm !== "YES") {
    return { error: "Shkruani PO për të konfirmuar caktimin masiv." };
  }

  const ids = formData
    .getAll("clientIds")
    .map(String)
    .filter(Boolean);
  if (!ids.length) return { error: "Nuk u zgjodh asnjë klient." };

  const agentId = String(formData.get("agentId") || "") || null;
  const managerId = String(formData.get("managerId") || "") || null;

  if (ctx.user.role === "MANAGER") {
    if (managerId && managerId !== ctx.user.id) {
      return { error: "Mund të caktoni vetëm në grupin tuaj." };
    }
    if (agentId) {
      const agent = await prisma.user.findFirst({
        where: { id: agentId, role: "AGENT", managerId: ctx.user.id },
      });
      if (!agent) return { error: "Agjenti nuk është në grupin tuaj." };
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
    details: `Caktim masiv: ${assigned}/${ids.length} klientë. Gabime: ${errors.length}`,
  });

  revalidatePath("/clients");
  revalidatePath("/team");

  if (errors.length && !assigned) {
    return { error: errors.slice(0, 3).join("; ") };
  }
  return { ok: true, assigned };
}
