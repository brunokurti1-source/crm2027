import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import {
  Role,
  PermissionFlags,
  effectivePermissions,
  hasPermission,
} from "@/lib/permissions";
import { redirect } from "next/navigation";

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  active: boolean;
  managerId: string | null;
  permissions: PermissionFlags;
  permissionsRaw: string;
};

export type AuthContext = {
  /** Effective user (impersonated if active) */
  user: AuthUser;
  /** Real logged-in user (admin/manager doing impersonation) */
  realUser: AuthUser;
  isImpersonating: boolean;
};

function toAuthUser(row: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  active: boolean;
  managerId: string | null;
  permissions: string;
}): AuthUser {
  const role = row.role as Role;
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    role,
    active: row.active,
    managerId: row.managerId,
    permissions: effectivePermissions(role, row.permissions),
    permissionsRaw: row.permissions,
  };
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return null;

  const realId = session.realUserId || session.userId;
  const effectiveId = session.impersonatingUserId || session.userId;

  const [realRow, effectiveRow] = await Promise.all([
    prisma.user.findUnique({ where: { id: realId } }),
    effectiveId === realId
      ? Promise.resolve(null)
      : prisma.user.findUnique({ where: { id: effectiveId } }),
  ]);

  if (!realRow || !realRow.active) return null;

  const realUser = toAuthUser(realRow);
  const user = effectiveRow && effectiveRow.active
    ? toAuthUser(effectiveRow)
    : realUser;

  return {
    user,
    realUser,
    isImpersonating: Boolean(
      session.impersonatingUserId && session.impersonatingUserId !== realId,
    ),
  };
}

export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  return ctx;
}

export async function requirePermission(
  key: keyof PermissionFlags,
): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!hasPermission(ctx.user.role, ctx.user.permissionsRaw, key)) {
    redirect("/dashboard?error=permission");
  }
  return ctx;
}

export function canAccessClient(
  ctx: AuthContext,
  client: { agentId: string | null; managerId: string | null },
): boolean {
  if (ctx.user.role === "ADMIN") return true;
  if (ctx.user.role === "MANAGER") {
    return (
      client.managerId === ctx.user.id ||
      client.agentId !== null /* checked via agent group below */
    );
  }
  if (ctx.user.role === "AGENT") {
    return client.agentId === ctx.user.id;
  }
  return false;
}

/** Build Prisma where clause for clients visible to the current user */
export function clientScopeWhere(ctx: AuthContext): Record<string, unknown> {
  if (ctx.user.role === "ADMIN") return {};
  if (ctx.user.role === "MANAGER") {
    return {
      OR: [
        { managerId: ctx.user.id },
        { agent: { managerId: ctx.user.id } },
      ],
    };
  }
  return { agentId: ctx.user.id };
}

export async function getAgentIdsInScope(ctx: AuthContext): Promise<string[] | "all"> {
  if (ctx.user.role === "ADMIN") return "all";
  if (ctx.user.role === "MANAGER") {
    const agents = await prisma.user.findMany({
      where: { managerId: ctx.user.id, role: "AGENT" },
      select: { id: true },
    });
    return [ctx.user.id, ...agents.map((a) => a.id)];
  }
  return [ctx.user.id];
}
