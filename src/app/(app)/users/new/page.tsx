import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  DEFAULT_AGENT_PERMISSIONS,
  DEFAULT_MANAGER_PERMISSIONS,
  PERMISSION_KEYS,
} from "@/lib/permissions";
import { fullName } from "@/lib/format";
import { UserForm } from "../user-form";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function NewUserPage() {
  const ctx = await requireAuth();
  const { t } = await getDictionary();
  if (ctx.user.role !== "ADMIN" && !ctx.user.permissions.manageAgents) {
    return <p className="text-[var(--danger)]">{t.users.noPermission}</p>;
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

  const permissionLabels = Object.fromEntries(
    PERMISSION_KEYS.map((key) => [key, t.permissions[key] || key]),
  ) as Record<(typeof PERMISSION_KEYS)[number], string>;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.users.createTitle}</h1>
        <Link href="/users" className="btn btn-secondary">
          {t.common.back}
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
        permissionLabels={permissionLabels}
        allowAdminRole={ctx.user.role === "ADMIN"}
        forceAgent={ctx.user.role === "MANAGER"}
        defaultManagerId={ctx.user.role === "MANAGER" ? ctx.user.id : ""}
      />
    </div>
  );
}
