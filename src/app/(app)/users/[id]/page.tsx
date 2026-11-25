import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  PERMISSION_KEYS,
  parsePermissions,
  Role,
} from "@/lib/permissions";
import { fullName } from "@/lib/format";
import { UserForm } from "../user-form";
import { startImpersonationAction } from "@/app/actions/auth";
import { getDictionary } from "@/lib/i18n/get-dictionary";

type Params = { params: Promise<{ id: string }> };

export default async function UserDetailPage({ params }: Params) {
  const ctx = await requireAuth();
  const { t } = await getDictionary();
  const { id } = await params;

  if (ctx.user.role !== "ADMIN" && !ctx.user.permissions.manageAgents) {
    return <p className="text-[var(--danger)]">{t.users.noPermission}</p>;
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      manager: true,
      agents: true,
      _count: {
        select: {
          assignedClients: true,
          managedClients: true,
          meetings: true,
        },
      },
    },
  });
  if (!user) notFound();

  if (
    ctx.user.role === "MANAGER" &&
    user.role === "AGENT" &&
    user.managerId !== ctx.user.id &&
    user.id !== ctx.user.id
  ) {
    return <p className="text-[var(--danger)]">{t.users.outOfGroup}</p>;
  }

  const managers =
    ctx.user.role === "ADMIN"
      ? await prisma.user.findMany({
          where: { role: "MANAGER", active: true },
        })
      : [];

  const permissions = parsePermissions(user.permissions);

  const permissionLabels = Object.fromEntries(
    PERMISSION_KEYS.map((key) => [key, t.permissions[key] || key]),
  ) as Record<(typeof PERMISSION_KEYS)[number], string>;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/users" className="text-sm text-[var(--brand)]">
            {t.users.backToList}
          </Link>
          <h1 className="text-2xl font-bold mt-1">
            {fullName(user.firstName, user.lastName)}
          </h1>
          <p className="muted text-sm">
            {t.roles[user.role as Role]} · {user.email}
          </p>
        </div>
        {(ctx.realUser.permissions.impersonate ||
          ctx.realUser.role === "ADMIN") &&
          user.id !== ctx.realUser.id &&
          user.active && (
            <form action={startImpersonationAction}>
              <input type="hidden" name="targetUserId" value={user.id} />
              <button className="btn btn-secondary" type="submit">
                {t.impersonation.impersonate}
              </button>
            </form>
          )}
      </div>

      <div className="card p-4 grid sm:grid-cols-3 gap-3 text-sm">
        <div>
          <div className="muted">{t.users.assignedClients}</div>
          <div className="text-xl font-bold">{user._count.assignedClients}</div>
        </div>
        <div>
          <div className="muted">{t.users.managedClients}</div>
          <div className="text-xl font-bold">{user._count.managedClients}</div>
        </div>
        <div>
          <div className="muted">{t.users.meetings}</div>
          <div className="text-xl font-bold">{user._count.meetings}</div>
        </div>
      </div>

      <UserForm
        mode="edit"
        userId={user.id}
        managers={managers.map((m) => ({
          id: m.id,
          label: fullName(m.firstName, m.lastName),
        }))}
        defaultPermissions={permissions}
        permissionKeys={[...PERMISSION_KEYS]}
        permissionLabels={permissionLabels}
        allowAdminRole={ctx.user.role === "ADMIN"}
        forceAgent={ctx.user.role === "MANAGER"}
        initial={{
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          managerId: user.managerId,
          active: user.active,
          permissions,
        }}
      />
    </div>
  );
}
