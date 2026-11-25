import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  DEFAULT_AGENT_PERMISSIONS,
  DEFAULT_MANAGER_PERMISSIONS,
  PERMISSION_KEYS,
  PERMISSION_LABELS,
} from "@/lib/permissions";
import { fullName } from "@/lib/format";
import { UserForm } from "../user-form";

export default async function NewUserPage() {
  const ctx = await requireAuth();
  if (ctx.user.role !== "ADMIN" && !ctx.user.permissions.manageAgents) {
    return <p className="text-[var(--danger)]">Nuk keni leje.</p>;
  }

  const managers =
    ctx.user.role === "ADMIN"
      ? await prisma.user.findMany({
          where: { role: "MANAGER", active: true },
          orderBy: { firstName: "asc" },
        })
      : [];

  const defaultPerms =
    ctx.user.role === "MANAGER"
      ? DEFAULT_AGENT_PERMISSIONS
      : DEFAULT_MANAGER_PERMISSIONS;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Përdorues i ri</h1>
        <Link href="/users" className="btn btn-secondary">
          Kthehu
        </Link>
      </div>
      <UserForm
        mode="create"
        managers={managers.map((m) => ({
          id: m.id,
          label: fullName(m.firstName, m.lastName),
        }))}
        defaultPermissions={defaultPerms}
        permissionKeys={[...PERMISSION_KEYS]}
        permissionLabels={PERMISSION_LABELS}
        allowAdminRole={ctx.user.role === "ADMIN"}
        forceAgent={ctx.user.role === "MANAGER"}
        defaultManagerId={ctx.user.role === "MANAGER" ? ctx.user.id : ""}
      />
    </div>
  );
}
