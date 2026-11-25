"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "fillEmailPassword", errorKey: "fillEmailPassword" as const };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    return { error: "badCredentials", errorKey: "badCredentials" as const };
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return { error: "badCredentials", errorKey: "badCredentials" as const };
  }

  if (!["ADMIN", "MANAGER", "AGENT"].includes(user.role)) {
    return { error: "roleNotAllowed", errorKey: "roleNotAllowed" as const };
  }

  const session = await getSession();
  session.userId = user.id;
  session.realUserId = undefined;
  session.impersonatingUserId = undefined;
  session.isLoggedIn = true;
  await session.save();

  await logAudit({
    actorId: user.id,
    action: "LOGIN",
    details: `Hyrje e suksesshme për ${user.email}`,
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  const ctx = await getAuthContext();
  const session = await getSession();
  if (ctx) {
    await logAudit({
      actorId: ctx.realUser.id,
      action: "LOGOUT",
      details: `Dalje për ${ctx.realUser.email}`,
    });
  }
  session.destroy();
  redirect("/login");
}

export async function startImpersonationAction(formData: FormData): Promise<void> {
  const targetUserId = String(formData.get("targetUserId") || "");
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  if (!ctx.realUser.permissions.impersonate && ctx.realUser.role !== "ADMIN") {
    redirect("/users?error=impersonate");
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target || !target.active) {
    redirect("/users?error=notfound");
  }

  if (ctx.realUser.role === "MANAGER") {
    const allowed =
      (target.role === "AGENT" && target.managerId === ctx.realUser.id) ||
      (target.role === "AGENT" &&
        (await prisma.client.count({
          where: { agentId: target.id, managerId: ctx.realUser.id },
        })) > 0);
    if (!allowed) {
      redirect("/users?error=scope");
    }
  }

  if (ctx.realUser.role === "AGENT") {
    redirect("/dashboard?error=permission");
  }

  const startedAt = new Date();
  const audit = await logAudit({
    actorId: ctx.realUser.id,
    targetUserId: target.id,
    action: "IMPERSONATION_START",
    details: `${ctx.realUser.email} filloi impersonimin e ${target.email} (${target.role})`,
    startedAt,
  });

  const session = await getSession();
  session.realUserId = ctx.realUser.id;
  session.userId = ctx.realUser.id;
  session.impersonatingUserId = target.id;
  session.impersonationAuditId = audit.id;
  session.isLoggedIn = true;
  await session.save();

  redirect("/dashboard");
}

export async function stopImpersonationAction(): Promise<void> {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const session = await getSession();
  const targetId = session.impersonatingUserId;
  const auditId = session.impersonationAuditId;
  const endedAt = new Date();

  if (auditId) {
    await prisma.auditLog.update({
      where: { id: auditId },
      data: {
        endedAt,
        details: `${ctx.realUser.email} ndaloi impersonimin e llogarisë ${targetId ?? "—"} (përfundoi ${endedAt.toISOString()})`,
      },
    });
  }

  await logAudit({
    actorId: ctx.realUser.id,
    targetUserId: targetId,
    action: "IMPERSONATION_STOP",
    details: `${ctx.realUser.email} ndaloi impersonimin`,
    endedAt,
  });

  session.impersonatingUserId = undefined;
  session.realUserId = undefined;
  session.impersonationAuditId = undefined;
  session.userId = ctx.realUser.id;
  await session.save();

  redirect("/dashboard");
}
