import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABELS, Role } from "@/lib/permissions";
import { fullName } from "@/lib/format";
import { startImpersonationAction } from "@/app/actions/auth";

export default async function UsersPage() {
  const ctx = await requireAuth();
  if (ctx.user.role !== "ADMIN" && !ctx.user.permissions.manageAgents) {
    return <p className="text-[var(--danger)]">Nuk keni leje.</p>;
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
          <h1 className="text-2xl font-bold">Përdoruesit</h1>
          <p className="muted text-sm">Menaxhimi i roleve dhe lejeve</p>
        </div>
        <Link href="/users/new" className="btn btn-primary">
          Përdorues i ri
        </Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="table text-sm">
          <thead>
            <tr>
              <th>Emri</th>
              <th>Email</th>
              <th>Roli</th>
              <th>Menaxheri</th>
              <th>Statusi</th>
              <th>Ngarkesa</th>
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
                <td>{ROLE_LABELS[u.role as Role]}</td>
                <td>
                  {u.manager
                    ? fullName(u.manager.firstName, u.manager.lastName)
                    : "—"}
                </td>
                <td>
                  <span className={`badge ${u.active ? "" : "badge-warn"}`}>
                    {u.active ? "Aktiv" : "Joaktiv"}
                  </span>
                </td>
                <td>
                  {u.role === "AGENT"
                    ? `${u._count.assignedClients} klientë`
                    : u.role === "MANAGER"
                      ? `${u._count.agents} agjentë`
                      : "—"}
                </td>
                <td>
                  {(ctx.realUser.permissions.impersonate ||
                    ctx.realUser.role === "ADMIN") &&
                    u.id !== ctx.realUser.id &&
                    u.active && (
                      <form action={startImpersonationAction}>
                        <input type="hidden" name="targetUserId" value={u.id} />
                        <button className="btn btn-secondary" type="submit">
                          Impersono
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
