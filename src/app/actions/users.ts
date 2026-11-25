"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  DEFAULT_AGENT_PERMISSIONS,
  DEFAULT_MANAGER_PERMISSIONS,
  PERMISSION_KEYS,
  PermissionFlags,
  serializePermissions,
} from "@/lib/permissions";

function permissionsFromForm(formData: FormData): PermissionFlags {
  const base = { ...DEFAULT_AGENT_PERMISSIONS };
  for (const key of PERMISSION_KEYS) {
    base[key] = formData.get(`perm_${key}`) === "on";
  }
  return base;
}

const userSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["ADMIN", "MANAGER", "AGENT"]),
  managerId: z.string().optional().nullable(),
  password: z.string().min(6).optional(),
  active: z.boolean().optional(),
});

export async function createUserAction(formData: FormData) {
  const ctx = await requireAuth();
  if (ctx.user.role !== "ADMIN" && !ctx.user.permissions.manageAgents) {
    return { error: "Nuk keni leje për të krijuar përdorues." };
  }

  const role = String(formData.get("role") || "AGENT") as
    | "ADMIN"
    | "MANAGER"
    | "AGENT";

  if (ctx.user.role === "MANAGER" && role !== "AGENT") {
    return { error: "Menaxheri mund të krijojë vetëm agjentë." };
  }

  const password = String(formData.get("password") || "Demo123!");
  const parsed = userSchema.safeParse({
    email: String(formData.get("email") || "")
      .trim()
      .toLowerCase(),
    firstName: String(formData.get("firstName") || "").trim(),
    lastName: String(formData.get("lastName") || "").trim(),
    role,
    managerId: String(formData.get("managerId") || "") || null,
    password,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Të dhëna të pavlefshme" };
  }

  const exists = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (exists) return { error: "Email ekziston tashmë." };

  let managerId = parsed.data.managerId;
  if (ctx.user.role === "MANAGER") {
    managerId = ctx.user.id;
  }

  let permissions = permissionsFromForm(formData);
  if (role === "MANAGER" && !formData.get("perm_clientView")) {
    permissions = { ...DEFAULT_MANAGER_PERMISSIONS };
  }
  if (role === "ADMIN") {
    permissions = {
      clientView: true,
      clientAdd: true,
      clientEdit: true,
      clientDelete: true,
      creditsAdd: true,
      creditsRemove: true,
      commentsAdd: true,
      commentsDelete: true,
      dataUpload: true,
      dataDelete: true,
      manageAgents: true,
      manageClients: true,
      impersonate: true,
    };
  }

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      role,
      managerId: role === "AGENT" ? managerId : null,
      passwordHash: await bcrypt.hash(password, 10),
      permissions: serializePermissions(permissions),
    },
  });

  await logAudit({
    actorId: ctx.realUser.id,
    targetUserId: user.id,
    action: "USER_CREATED",
    details: `U krijua ${role}: ${user.email}`,
  });

  revalidatePath("/users");
  revalidatePath("/team");
  redirect("/users");
}

export async function updateUserAction(userId: string, formData: FormData) {
  const ctx = await requireAuth();
  if (ctx.user.role !== "ADMIN" && !ctx.user.permissions.manageAgents) {
    return { error: "Nuk keni leje." };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "Përdoruesi nuk u gjet." };

  if (ctx.user.role === "MANAGER") {
    if (target.role !== "AGENT" || target.managerId !== ctx.user.id) {
      return { error: "Mund të menaxhoni vetëm agjentët e grupit tuaj." };
    }
  }

  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const active = formData.get("active") === "on";
  const managerId = String(formData.get("managerId") || "") || null;
  const password = String(formData.get("password") || "");
  const permissions = permissionsFromForm(formData);

  await prisma.user.update({
    where: { id: userId },
    data: {
      firstName,
      lastName,
      active,
      managerId: target.role === "AGENT" ? managerId : null,
      permissions: serializePermissions(permissions),
      ...(password.length >= 6
        ? { passwordHash: await bcrypt.hash(password, 10) }
        : {}),
    },
  });

  await logAudit({
    actorId: ctx.realUser.id,
    targetUserId: userId,
    action: "USER_UPDATED",
    details: `Përditësua ${target.email}`,
  });

  revalidatePath("/users");
  revalidatePath(`/users/${userId}`);
  return { ok: true };
}

export async function assignAgentToManagerAction(formData: FormData) {
  const ctx = await requireAuth();
  if (ctx.user.role !== "ADMIN" && !ctx.user.permissions.manageAgents) {
    return { error: "Nuk keni leje." };
  }

  const agentId = String(formData.get("agentId") || "");
  const managerId = String(formData.get("managerId") || "") || null;

  if (ctx.user.role === "MANAGER") {
    // Managers can only add/remove agents in their own group
    const agent = await prisma.user.findUnique({ where: { id: agentId } });
    if (!agent || agent.role !== "AGENT") return { error: "Agjent i pavlefshëm." };
    if (agent.managerId && agent.managerId !== ctx.user.id && managerId !== ctx.user.id) {
      return { error: "Agjenti i përket një grupi tjetër." };
    }
    await prisma.user.update({
      where: { id: agentId },
      data: { managerId: managerId ? ctx.user.id : null },
    });
  } else {
    await prisma.user.update({
      where: { id: agentId },
      data: { managerId },
    });
  }

  await logAudit({
    actorId: ctx.realUser.id,
    targetUserId: agentId,
    action: "AGENT_ASSIGNED",
    details: `Agjenti u caktua te menaxheri ${managerId ?? "—"}`,
  });

  revalidatePath("/team");
  revalidatePath("/users");
  return { ok: true };
}
