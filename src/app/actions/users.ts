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
import { actionT } from "@/lib/i18n/action-t";

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
  password: z.string().min(8).optional(),
  active: z.boolean().optional(),
});

export async function createUserAction(formData: FormData) {
  const t = await actionT();
  const ctx = await requireAuth();
  if (ctx.user.role !== "ADMIN" && !ctx.user.permissions.manageAgents) {
    return { error: t.errors.noUserCreate };
  }

  const role = String(formData.get("role") || "AGENT") as
    | "ADMIN"
    | "MANAGER"
    | "AGENT";

  if (ctx.user.role === "MANAGER" && role !== "AGENT") {
    return { error: t.errors.managerAgentsOnly };
  }

  const password = String(formData.get("password") || "");
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
    return { error: parsed.error.issues[0]?.message || t.errors.invalidData };
  }

  const exists = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (exists) return { error: t.errors.emailExists };

  let managerId = parsed.data.managerId;
  if (ctx.user.role === "MANAGER") {
    managerId = ctx.user.id;
  }

  let permissions = permissionsFromForm(formData);
  if (role === "MANAGER" && !formData.get("perm_clientView")) {
    permissions = { ...DEFAULT_MANAGER_PERMISSIONS };
  }
  if (role === "ADMIN") {
    const { ALL_PERMISSIONS } = await import("@/lib/permissions");
    permissions = { ...ALL_PERMISSIONS };
  }

  // Require explicit password (no predictable default)
  if (!String(formData.get("password") || "") || String(formData.get("password")).length < 8) {
    return { error: t.errors.passwordShort };
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
  const t = await actionT();
  const ctx = await requireAuth();
  if (ctx.user.role !== "ADMIN" && !ctx.user.permissions.manageAgents) {
    return { error: t.errors.permissionDenied };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: t.errors.userNotFound };

  if (ctx.user.role === "MANAGER") {
    if (target.role !== "AGENT" || target.managerId !== ctx.user.id) {
      return { error: t.errors.outOfGroup };
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
  const t = await actionT();
  const ctx = await requireAuth();
  if (ctx.user.role !== "ADMIN" && !ctx.user.permissions.manageAgents) {
    return { error: t.errors.permissionDenied };
  }

  const agentId = String(formData.get("agentId") || "");
  const managerId = String(formData.get("managerId") || "") || null;

  if (ctx.user.role === "MANAGER") {
    // Managers can only add/remove agents in their own group
    const agent = await prisma.user.findUnique({ where: { id: agentId } });
    if (!agent || agent.role !== "AGENT") return { error: t.errors.invalidAgent };
    if (agent.managerId && agent.managerId !== ctx.user.id && managerId !== ctx.user.id) {
      return { error: t.errors.agentOtherGroup };
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
