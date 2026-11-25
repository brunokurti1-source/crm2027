"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthContext, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity, logAudit } from "@/lib/audit";
import { findDuplicateClients } from "@/lib/duplicates";
import { clientUpsertSchema, normalizeOptional } from "@/lib/validation";
import { ScopeError, assertClientInScope } from "@/lib/scope";
import { recordSoftDelete } from "@/lib/soft-delete";
import { clearTextDraftAction } from "@/app/actions/drafts";

function formToObject(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    if (v === null || v === "") return null;
    return String(v);
  };
  return {
    clientIdNumber: get("clientIdNumber"),
    firstName: get("firstName"),
    lastName: get("lastName"),
    phone: get("phone"),
    email: get("email"),
    company: get("company"),
    address: get("address"),
    country: get("country"),
    leadSource: get("leadSource"),
    status: get("status") || "NEW",
    notes: get("notes"),
    agentId: get("agentId"),
    managerId: get("managerId"),
    creditBalance: get("creditBalance"),
  };
}

function errMsg(e: unknown, fallback: string) {
  if (e instanceof ScopeError) return e.message;
  if (e instanceof Error) return e.message;
  return fallback;
}

export async function createClientAction(formData: FormData) {
  const ctx = await requireAuth();
  if (!ctx.user.permissions.clientAdd && ctx.user.role !== "ADMIN") {
    return { error: "Nuk keni leje për të shtuar klientë." };
  }

  const parsed = clientUpsertSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Të dhëna të pavlefshme" };
  }

  const data = parsed.data;
  const email = normalizeOptional(data.email ?? null);
  const phone = normalizeOptional(data.phone ?? null);

  const statusExists = await prisma.clientStatus.findFirst({
    where: { code: data.status, active: true },
  });
  if (!statusExists) {
    return { error: "Statusi i zgjedhur nuk është i vlefshëm." };
  }

  const dups = await findDuplicateClients({
    clientIdNumber: data.clientIdNumber,
    phone,
    email,
  });
  const acknowledge = formData.get("acknowledgeDuplicates") === "1";
  if (dups.length && !acknowledge) {
    return {
      error: "U gjetën klientë të ngjashëm. Kontrolloni dublikatat para se të vazhdoni.",
      duplicates: dups,
      needsDuplicateAck: true as const,
    };
  }

  let agentId = data.agentId || null;
  let managerId = data.managerId || null;

  if (ctx.user.role === "AGENT") {
    agentId = ctx.user.id;
    managerId = ctx.user.managerId;
  }
  if (ctx.user.role === "MANAGER" && !managerId) {
    managerId = ctx.user.id;
  }

  const client = await prisma.client.create({
    data: {
      clientIdNumber: data.clientIdNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      phone,
      email,
      company: normalizeOptional(data.company ?? null),
      address: normalizeOptional(data.address ?? null),
      country: normalizeOptional(data.country ?? null),
      leadSource: normalizeOptional(data.leadSource ?? null),
      status: data.status,
      notes: normalizeOptional(data.notes ?? null),
      agentId,
      managerId,
      creditBalance: data.creditBalance ?? 0,
    },
  });

  await logActivity({
    clientId: client.id,
    actorId: ctx.realUser.id,
    action: "CLIENT_CREATED",
    description: `Klienti ${client.firstName} ${client.lastName} u krijua`,
  });

  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function updateClientAction(clientId: string, formData: FormData) {
  const ctx = await requireAuth();
  if (!ctx.user.permissions.clientEdit && ctx.user.role !== "ADMIN") {
    return { error: "Nuk keni leje për të ndryshuar klientë." };
  }

  try {
    const existing = await assertClientInScope(ctx, clientId);
    const expectedVersion = Number(formData.get("expectedVersion") || "");
    if (
      Number.isFinite(expectedVersion) &&
      expectedVersion > 0 &&
      expectedVersion !== existing.version
    ) {
      const latest = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          activityLogs: {
            orderBy: { createdAt: "desc" },
            take: 5,
            include: {
              actor: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });
      return {
        error:
          "Klienti u ndryshua nga një përdorues tjetër. Rifreskoni të dhënat para se të ruani.",
        conflict: true as const,
        serverVersion: existing.version,
        serverUpdatedAt: existing.updatedAt.toISOString(),
        recentChanges: (latest?.activityLogs || []).map((a) => ({
          action: a.action,
          description: a.description,
          at: a.createdAt.toISOString(),
          actor: a.actor
            ? `${a.actor.firstName} ${a.actor.lastName}`
            : null,
        })),
        serverSnapshot: {
          firstName: existing.firstName,
          lastName: existing.lastName,
          status: existing.status,
          notes: existing.notes,
          version: existing.version,
        },
      };
    }

    const parsed = clientUpsertSchema.safeParse(formToObject(formData));
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Të dhëna të pavlefshme" };
    }
    const data = parsed.data;
    const email = normalizeOptional(data.email ?? null);
    const phone = normalizeOptional(data.phone ?? null);

    const statusExists = await prisma.clientStatus.findFirst({
      where: { code: data.status, active: true },
    });
    if (!statusExists) {
      return { error: "Statusi i zgjedhur nuk është i vlefshëm." };
    }

    const dups = await findDuplicateClients({
      clientIdNumber: data.clientIdNumber,
      phone,
      email,
      excludeId: clientId,
    });
    const acknowledge = formData.get("acknowledgeDuplicates") === "1";
    if (dups.length && !acknowledge) {
      return {
        error: "U gjetën klientë të ngjashëm. Kontrolloni dublikatat.",
        duplicates: dups,
        needsDuplicateAck: true as const,
      };
    }

    const statusChanged = existing.status !== data.status;

    const updated = await prisma.client.updateMany({
      where: {
        id: clientId,
        version: existing.version,
      },
      data: {
        clientIdNumber: data.clientIdNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        phone,
        email,
        company: normalizeOptional(data.company ?? null),
        address: normalizeOptional(data.address ?? null),
        country: normalizeOptional(data.country ?? null),
        leadSource: normalizeOptional(data.leadSource ?? null),
        status: data.status,
        notes: normalizeOptional(data.notes ?? null),
        agentId: data.agentId || null,
        managerId: data.managerId || null,
        lastContactAt: new Date(),
        version: { increment: 1 },
      },
    });

    if (updated.count === 0) {
      return {
        error:
          "Klienti u ndryshua nga një përdorues tjetër gjatë ruajtjes. Rifreskoni faqen.",
        conflict: true as const,
        serverVersion: existing.version,
      };
    }

    if (statusChanged) {
      await logActivity({
        clientId,
        actorId: ctx.realUser.id,
        action: "STATUS_CHANGED",
        description: `Statusi: ${existing.status} → ${data.status}`,
        metadata: { from: existing.status, to: data.status },
      });
    } else {
      await logActivity({
        clientId,
        actorId: ctx.realUser.id,
        action: "CLIENT_UPDATED",
        description: "Klienti u përditësua",
      });
    }

    await clearTextDraftAction({ clientId, kind: "NOTES" }).catch(() => null);

    // Notify other assignees that the client changed (they may have the page open)
    const notifyIds = new Set<string>();
    if (existing.agentId && existing.agentId !== ctx.realUser.id) {
      notifyIds.add(existing.agentId);
    }
    if (existing.managerId && existing.managerId !== ctx.realUser.id) {
      notifyIds.add(existing.managerId);
    }
    for (const userId of notifyIds) {
      await prisma.notification.create({
        data: {
          userId,
          title: "Klienti u ndryshua",
          body: `${existing.clientIdNumber} u përditësua nga ${ctx.realUser.firstName} ${ctx.realUser.lastName}. Rifreskoni para se të ruani.`,
          kind: "SYSTEM",
          href: `/clients/${clientId}`,
        },
      });
    }

    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/clients");
    return { ok: true, version: existing.version + 1 };
  } catch (e) {
    return { error: errMsg(e, "Gabim gjatë ruajtjes") };
  }
}

export async function checkDuplicatesAction(formData: FormData) {
  const ctx = await requireAuth();
  if (
    !ctx.user.permissions.clientAdd &&
    !ctx.user.permissions.clientEdit &&
    ctx.user.role !== "ADMIN"
  ) {
    return { error: "Nuk keni leje.", duplicates: [] };
  }
  const clientIdNumber = String(formData.get("clientIdNumber") || "").trim() || null;
  const phone = String(formData.get("phone") || "").trim() || null;
  const email = String(formData.get("email") || "").trim() || null;
  const excludeId = String(formData.get("excludeId") || "") || undefined;
  const duplicates = await findDuplicateClients({
    clientIdNumber,
    phone,
    email,
    excludeId,
  });
  return { duplicates };
}

export async function archiveClientAction(clientId: string) {
  const ctx = await requireAuth();
  if (!ctx.user.permissions.clientDelete && ctx.user.role !== "ADMIN") {
    return { error: "Nuk keni leje për të arkivuar." };
  }
  try {
    await assertClientInScope(ctx, clientId);
    await prisma.client.update({
      where: { id: clientId },
      data: { archived: true, status: "ARCHIVED" },
    });
    await logActivity({
      clientId,
      actorId: ctx.realUser.id,
      action: "CLIENT_ARCHIVED",
      description: "Klienti u arkivua",
    });
    revalidatePath("/clients");
    redirect("/clients");
  } catch (e) {
    return { error: errMsg(e, "Gabim") };
  }
}

/** Soft-delete → recycle bin (not permanent) */
export async function softDeleteClientAction(
  clientId: string,
  confirm: string,
) {
  const ctx = await requireAuth();
  if (!ctx.user.permissions.clientDelete && ctx.user.role !== "ADMIN") {
    return { error: "Nuk keni leje për fshirje." };
  }
  if (confirm !== "FSHIJ" && confirm !== "DELETE") {
    return { error: "Shkruani FSHIJ ose DELETE për konfirmim." };
  }

  try {
    const client = await assertClientInScope(ctx, clientId);
    const full = await prisma.client.findUnique({ where: { id: clientId } });
    await prisma.client.update({
      where: { id: clientId },
      data: { deletedAt: new Date(), deletedById: ctx.realUser.id },
    });
    await recordSoftDelete({
      entityType: "CLIENT",
      entityId: clientId,
      label: `${client.clientIdNumber} — ${client.firstName} ${client.lastName}`,
      payload: full,
      deletedById: ctx.realUser.id,
    });
    await logActivity({
      clientId,
      actorId: ctx.realUser.id,
      action: "CLIENT_SOFT_DELETED",
      description: "Klienti u zhvendos te Të fshira",
    });
    await logAudit({
      actorId: ctx.realUser.id,
      action: "CLIENT_SOFT_DELETED",
      details: `Soft-delete ${client.clientIdNumber}`,
    });
    revalidatePath("/clients");
    revalidatePath("/recycle-bin");
    redirect("/clients");
  } catch (e) {
    return { error: errMsg(e, "Gabim") };
  }
}

export async function adjustCreditsAction(
  clientId: string,
  formData: FormData,
) {
  const ctx = await requireAuth();
  const amount = Number(formData.get("amount"));
  const reason = String(formData.get("reason") || "").trim();

  if (Number.isNaN(amount) || amount === 0) {
    return { error: "Shuma e pavlefshme." };
  }
  if (!reason) {
    return { error: "Arsyeja / shënimi është i detyrueshëm." };
  }
  if (amount > 0 && !ctx.user.permissions.creditsAdd && ctx.user.role !== "ADMIN") {
    return { error: "Nuk keni leje për të shtuar kredi." };
  }
  if (amount < 0 && !ctx.user.permissions.creditsRemove && ctx.user.role !== "ADMIN") {
    return { error: "Nuk keni leje për të hequr kredi." };
  }

  try {
    const client = await assertClientInScope(ctx, clientId);
    const previous = client.creditBalance;
    const next = previous + amount;

    await prisma.$transaction([
      prisma.client.update({
        where: { id: clientId },
        data: { creditBalance: next },
      }),
      prisma.creditLedger.create({
        data: {
          clientId,
          actorId: ctx.realUser.id,
          direction: amount > 0 ? "ADD" : "REMOVE",
          amount: Math.abs(amount),
          previousBalance: previous,
          newBalance: next,
          reason,
        },
      }),
    ]);

    await logActivity({
      clientId,
      actorId: ctx.realUser.id,
      action: amount > 0 ? "CREDITS_ADDED" : "CREDITS_REMOVED",
      description: `${amount > 0 ? "Shtuar" : "Hequr"} ${Math.abs(amount)} kredi. ${previous} → ${next}. ${reason}`,
      metadata: { amount, previous, next, reason },
    });

    revalidatePath(`/clients/${clientId}`);
    return { ok: true };
  } catch (e) {
    return { error: errMsg(e, "Gabim") };
  }
}

export async function addCommentAction(clientId: string, formData: FormData) {
  const ctx = await requireAuth();
  if (!ctx.user.permissions.commentsAdd && ctx.user.role !== "ADMIN") {
    return { error: "Nuk keni leje për komente." };
  }
  const body = String(formData.get("body") || "").trim();
  if (!body) return { error: "Komenti është bosh." };

  try {
    await assertClientInScope(ctx, clientId);
    await prisma.comment.create({
      data: { clientId, authorId: ctx.user.id, body },
    });
    await logActivity({
      clientId,
      actorId: ctx.realUser.id,
      action: "COMMENT_ADDED",
      description: `Koment: ${body.slice(0, 120)}`,
    });
    await prisma.client.update({
      where: { id: clientId },
      data: { lastContactAt: new Date() },
    });
    await clearTextDraftAction({ clientId, kind: "COMMENT" }).catch(() => null);
    revalidatePath(`/clients/${clientId}`);
    return { ok: true };
  } catch (e) {
    return { error: errMsg(e, "Gabim") };
  }
}

export async function deleteCommentAction(commentId: string, clientId: string) {
  const ctx = await requireAuth();
  if (!ctx.user.permissions.commentsDelete && ctx.user.role !== "ADMIN") {
    return { error: "Nuk keni leje për të fshirë komente." };
  }
  try {
    await assertClientInScope(ctx, clientId);
    const comment = await prisma.comment.findFirst({
      where: { id: commentId, clientId, deletedAt: null },
    });
    if (!comment) return { error: "Komenti nuk u gjet." };

    await prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date(), deletedById: ctx.realUser.id },
    });
    await recordSoftDelete({
      entityType: "COMMENT",
      entityId: commentId,
      label: `Koment për klient ${clientId}`,
      payload: comment,
      deletedById: ctx.realUser.id,
    });
    await logActivity({
      clientId,
      actorId: ctx.realUser.id,
      action: "COMMENT_DELETED",
      description: "Komenti u zhvendos te Të fshira",
    });
    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/recycle-bin");
    return { ok: true };
  } catch (e) {
    return { error: errMsg(e, "Gabim") };
  }
}

export async function assignClientAction(formData: FormData) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!ctx.user.permissions.manageClients && ctx.user.role !== "ADMIN") {
    return { error: "Nuk keni leje për caktime." };
  }

  const clientId = String(formData.get("clientId") || "");
  const agentId = String(formData.get("agentId") || "") || null;
  const managerId = String(formData.get("managerId") || "") || null;

  try {
    await assertClientInScope(ctx, clientId);
    await prisma.client.update({
      where: { id: clientId },
      data: { agentId, managerId },
    });
    await logActivity({
      clientId,
      actorId: ctx.realUser.id,
      action: "CLIENT_ASSIGNED",
      description: `Caktim: agjent=${agentId ?? "—"}, menaxher=${managerId ?? "—"}`,
    });
    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/clients");
    revalidatePath("/team");
    return { ok: true };
  } catch (e) {
    return { error: errMsg(e, "Gabim") };
  }
}
