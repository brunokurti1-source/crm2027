import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role } from "@/lib/permissions";
import { fullName } from "@/lib/format";
import { startImpersonationAction } from "@/app/actions/auth";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function UsersPage() {
  const ctx = await requireAuth();
  const { t } = await getDictionary();
  if (ctx.user.role !== "ADMIN" && !ctx.user.permissions.manageAgents) {
    return <p className="text-[var(--danger)]">{t.users.noPermission}</p>;
  }

  const users = await prisma.user.findMany({
    where:
      ctx.user.role === "ADMIN"
        ? {}
        : { OR: [{ managerId: ctx.user.id }, { id: ctx.user.id }] },
    orderBy: [{ role: "asc" }, { firstName: "asc" }],
    include: {
      manager: { select: { firstName: true, lastName: true } },
      _count: { select: { assignedClients: true, agents: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t.users.title}</h1>
          <p className="muted text-sm">{t.users.subtitle}</p>
        </div>
        <Link href="/users/new" className="btn btn-primary">
          {t.users.new}
        </Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="table text-sm">
          <thead>
            <tr>
              <th>{t.users.name}</th>
              <th>{t.users.email}</th>
              <th>{t.users.role}</th>
              <th>{t.users.manager}</th>
              <th>{t.users.status}</th>
              <th>{t.users.load}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-medium">
                  <Link href={`/users/${u.id}`} className="text-[var(--brand)]">
                    {fullName(u.firstName, u.lastName)}
                  </Link>
                </td>
                <td>{u.email}</td>
                <td>{t.roles[u.role as Role]}</td>
                <td>
                  {u.manager
                    ? fullName(u.manager.firstName, u.manager.lastName)
                    : t.common.none}
                </td>
                <td>
                  <span className={`badge ${u.active ? "" : "badge-warn"}`}>
                    {u.active ? t.users.active : t.users.inactive}
                  </span>
                </td>
                <td>
                  {u.role === "AGENT"
                    ? `${u._count.assignedClients} ${t.users.clientsAssigned}`
                    : u.role === "MANAGER"
                      ? `${u._count.agents} ${t.users.agentsCount}`
                      : t.common.none}
                </td>
                <td>
                  {(ctx.realUser.permissions.impersonate ||
                    ctx.realUser.role === "ADMIN") &&
                    u.id !== ctx.realUser.id &&
                    u.active && (
                      <form action={startImpersonationAction}>
                        <input type="hidden" name="targetUserId" value={u.id} />
                        <button className="btn btn-secondary" type="submit">
                          {t.impersonation.impersonate}
                        </button>
                      </form>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
