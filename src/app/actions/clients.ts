"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthContext, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity, logAudit } from "@/lib/audit";
import { findDuplicateClient } from "@/lib/clients";
import { CLIENT_STATUSES } from "@/lib/permissions";

const clientSchema = z.object({
  clientIdNumber: z.string().min(1, "ID e klientit është e detyrueshme"),
  firstName: z.string().min(1, "Emri është i detyrueshëm"),
  lastName: z.string().min(1, "Mbiemri është i detyrueshëm"),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  company: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  leadSource: z.string().optional().nullable(),
  status: z.enum(CLIENT_STATUSES).default("NEW"),
  notes: z.string().optional().nullable(),
  agentId: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  creditBalance: z.coerce.number().optional(),
});

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

export async function createClientAction(formData: FormData) {
  const ctx = await requireAuth();
  if (!ctx.user.permissions.clientAdd && ctx.user.role !== "ADMIN") {
    return { error: "Nuk keni leje për të shtuar klientë." };
  }

  const parsed = clientSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Të dhëna të pavlefshme" };
  }

  const data = parsed.data;
  const dup = await findDuplicateClient({
    clientIdNumber: data.clientIdNumber,
    phone: data.phone,
    email: data.email || null,
  });
  if (dup) {
    return {
      error: `Dublikatë: klienti ekziston (${dup.clientIdNumber}).`,
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
      phone: data.phone,
      email: data.email || null,
      company: data.company,
      address: data.address,
      country: data.country,
      leadSource: data.leadSource,
      status: data.status,
      notes: data.notes,
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

  const existing = await prisma.client.findUnique({ where: { id: clientId } });
  if (!existing) return { error: "Klienti nuk u gjet." };

  if (ctx.user.role === "AGENT" && existing.agentId !== ctx.user.id) {
    return { error: "Nuk mund të ndryshoni këtë klient." };
  }
  if (ctx.user.role === "MANAGER") {
    const inScope =
      existing.managerId === ctx.user.id ||
      (existing.agentId &&
        (await prisma.user.findFirst({
          where: { id: existing.agentId, managerId: ctx.user.id },
        })));
    if (!inScope) return { error: "Nuk mund të ndryshoni këtë klient." };
  }

  const parsed = clientSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Të dhëna të pavlefshme" };
  }
  const data = parsed.data;

  const dup = await findDuplicateClient({
    clientIdNumber: data.clientIdNumber,
    phone: data.phone,
    email: data.email || null,
    excludeId: clientId,
  });
  if (dup) {
    return { error: `Dublikatë me klientin ${dup.clientIdNumber}.` };
  }

  const changes: string[] = [];
  const track: Array<[string, unknown, unknown]> = [
    ["firstName", existing.firstName, data.firstName],
    ["lastName", existing.lastName, data.lastName],
    ["phone", existing.phone, data.phone],
    ["email", existing.email, data.email],
    ["company", existing.company, data.company],
    ["status", existing.status, data.status],
    ["country", existing.country, data.country],
    ["agentId", existing.agentId, data.agentId],
    ["managerId", existing.managerId, data.managerId],
  ];
  for (const [f, before, after] of track) {
    if (String(before ?? "") !== String(after ?? "")) {
      changes.push(`${f}: ${before ?? "—"} → ${after ?? "—"}`);
    }
  }

  await prisma.client.update({
    where: { id: clientId },
    data: {
      clientIdNumber: data.clientIdNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email || null,
      company: data.company,
      address: data.address,
      country: data.country,
      leadSource: data.leadSource,
      status: data.status,
      notes: data.notes,
      agentId: data.agentId || null,
      managerId: data.managerId || null,
      lastContactAt: new Date(),
    },
  });

  await logActivity({
    clientId,
    actorId: ctx.realUser.id,
    action: "CLIENT_UPDATED",
    description:
      changes.length > 0
        ? `Ndryshime: ${changes.join("; ")}`
        : "Klienti u përditësua",
    metadata: { changes },
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  return { ok: true };
}

export async function archiveClientAction(clientId: string) {
  const ctx = await requireAuth();
  if (!ctx.user.permissions.clientDelete && ctx.user.role !== "ADMIN") {
    return { error: "Nuk keni leje për të arkivuar." };
  }

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
}

export async function deleteClientAction(clientId: string, confirm: string) {
  const ctx = await requireAuth();
  if (!ctx.user.permissions.dataDelete && ctx.user.role !== "ADMIN") {
    return { error: "Nuk keni leje për fshirje." };
  }
  if (confirm !== "FSHIJ") {
    return { error: 'Shkruani FSHIJ për konfirmim.' };
  }

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { error: "Klienti nuk u gjet." };

  await prisma.client.delete({ where: { id: clientId } });
  await logAudit({
    actorId: ctx.realUser.id,
    action: "CLIENT_DELETED",
    details: `Fshi klientin ${client.clientIdNumber} (${client.firstName} ${client.lastName})`,
  });
  revalidatePath("/clients");
  redirect("/clients");
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
  if (amount > 0 && !ctx.user.permissions.creditsAdd && ctx.user.role !== "ADMIN") {
    return { error: "Nuk keni leje për të shtuar kredi." };
  }
  if (amount < 0 && !ctx.user.permissions.creditsRemove && ctx.user.role !== "ADMIN") {
    return { error: "Nuk keni leje për të hequr kredi." };
  }

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { error: "Klienti nuk u gjet." };

  const next = client.creditBalance + amount;
  await prisma.client.update({
    where: { id: clientId },
    data: { creditBalance: next },
  });

  await logActivity({
    clientId,
    actorId: ctx.realUser.id,
    action: amount > 0 ? "CREDITS_ADDED" : "CREDITS_REMOVED",
    description: `${amount > 0 ? "Shtuar" : "Hequr"} ${Math.abs(amount)} kredi. Bilanci: ${next}. ${reason}`,
    metadata: { amount, previous: client.creditBalance, next, reason },
  });

  revalidatePath(`/clients/${clientId}`);
  return { ok: true };
}

export async function addCommentAction(clientId: string, formData: FormData) {
  const ctx = await requireAuth();
  if (!ctx.user.permissions.commentsAdd && ctx.user.role !== "ADMIN") {
    return { error: "Nuk keni leje për komente." };
  }
  const body = String(formData.get("body") || "").trim();
  if (!body) return { error: "Komenti është bosh." };

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

  revalidatePath(`/clients/${clientId}`);
  return { ok: true };
}

export async function deleteCommentAction(commentId: string, clientId: string) {
  const ctx = await requireAuth();
  if (!ctx.user.permissions.commentsDelete && ctx.user.role !== "ADMIN") {
    return { error: "Nuk keni leje për të fshirë komente." };
  }
  await prisma.comment.delete({ where: { id: commentId } });
  await logActivity({
    clientId,
    actorId: ctx.realUser.id,
    action: "COMMENT_DELETED",
    description: "Komenti u fshi",
  });
  revalidatePath(`/clients/${clientId}`);
  return { ok: true };
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

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { error: "Klienti nuk u gjet." };

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
}
