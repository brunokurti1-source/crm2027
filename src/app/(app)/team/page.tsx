import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fullName } from "@/lib/format";
import { assignAgentToManagerAction } from "@/app/actions/users";
import { assignClientAction } from "@/app/actions/clients";
import { startImpersonationAction } from "@/app/actions/auth";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function TeamPage() {
  const ctx = await requireAuth();
  const { t } = await getDictionary();
  if (ctx.user.role !== "ADMIN" && ctx.user.role !== "MANAGER") {
    return <p className="text-[var(--danger)]">{t.team.noPermission}</p>;
  }

  const managers =
    ctx.user.role === "ADMIN"
      ? await prisma.user.findMany({
          where: { role: "MANAGER" },
          include: {
            agents: {
              include: {
                _count: { select: { assignedClients: true, meetings: true } },
              },
            },
            _count: { select: { managedClients: true } },
          },
          orderBy: { firstName: "asc" },
        })
      : await prisma.user.findMany({
          where: { id: ctx.user.id },
          include: {
            agents: {
              include: {
                _count: { select: { assignedClients: true, meetings: true } },
              },
            },
            _count: { select: { managedClients: true } },
          },
        });

  const unassignedAgents =
    ctx.user.role === "ADMIN"
      ? await prisma.user.findMany({
          where: { role: "AGENT", managerId: null },
        })
      : [];

  const clients = await prisma.client.findMany({
    where:
      ctx.user.role === "ADMIN"
        ? { archived: false }
        : {
            archived: false,
            OR: [
              { managerId: ctx.user.id },
              { agent: { managerId: ctx.user.id } },
            ],
          },
    include: {
      agent: { select: { firstName: true, lastName: true } },
    },
    take: 100,
    orderBy: { updatedAt: "desc" },
  });

  const agentsForAssign =
    ctx.user.role === "ADMIN"
      ? await prisma.user.findMany({ where: { role: "AGENT", active: true } })
      : await prisma.user.findMany({
          where: { role: "AGENT", managerId: ctx.user.id, active: true },
        });

  const managersForAssign =
    ctx.user.role === "ADMIN"
      ? await prisma.user.findMany({ where: { role: "MANAGER", active: true } })
      : [
          {
            id: ctx.user.id,
            firstName: ctx.user.firstName,
            lastName: ctx.user.lastName,
          },
        ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t.team.title}</h1>
        <p className="muted text-sm">{t.team.subtitle}</p>
      </div>

      <div className="grid gap-4">
        {managers.map((m) => (
          <section key={m.id} className="card p-4">
            <div className="flex flex-wrap justify-between gap-2 mb-3">
              <div>
                <h2 className="font-semibold text-lg">
                  {fullName(m.firstName, m.lastName)}
                </h2>
                <p className="muted text-sm">
                  {m.email} · {m._count.managedClients} {t.team.clients} ·{" "}
                  {m.agents.length} {t.team.agents}
                </p>
              </div>
              {(ctx.realUser.permissions.impersonate ||
                ctx.realUser.role === "ADMIN") &&
                m.id !== ctx.realUser.id && (
                  <form action={startImpersonationAction}>
                    <input type="hidden" name="targetUserId" value={m.id} />
                    <button className="btn btn-secondary" type="submit">
                      {t.impersonation.impersonateManager}
                    </button>
                  </form>
                )}
            </div>
            <table className="table text-sm">
              <thead>
                <tr>
                  <th>{t.team.agent}</th>
                  <th>{t.team.status}</th>
                  <th>{t.team.clients}</th>
                  <th>{t.team.meetings}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {m.agents.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link
                        href={`/users/${a.id}`}
                        className="text-[var(--brand)]"
                      >
                        {fullName(a.firstName, a.lastName)}
                      </Link>
                      <div className="muted text-xs">{a.email}</div>
                    </td>
                    <td>
                      {a.active ? t.common.active : t.common.inactive}
                    </td>
                    <td>{a._count.assignedClients}</td>
                    <td>{a._count.meetings}</td>
                    <td>
                      {(ctx.realUser.permissions.impersonate ||
                        ctx.realUser.role === "ADMIN") && (
                        <form action={startImpersonationAction}>
                          <input
                            type="hidden"
                            name="targetUserId"
                            value={a.id}
                          />
                          <button className="btn btn-secondary" type="submit">
                            {t.impersonation.impersonate}
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
                {!m.agents.length ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      {t.team.noAgents}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        ))}
      </div>

      {ctx.user.role === "ADMIN" && unassignedAgents.length > 0 && (
        <section className="card p-4 space-y-3">
          <h2 className="font-semibold">{t.team.unassigned}</h2>
          {unassignedAgents.map((a) => (
            <form
              key={a.id}
              action={async (fd) => {
                "use server";
                await assignAgentToManagerAction(fd);
              }}
              className="flex flex-wrap gap-2 items-end"
            >
              <input type="hidden" name="agentId" value={a.id} />
              <div className="field">
                <label>{fullName(a.firstName, a.lastName)}</label>
                <select name="managerId" required defaultValue="">
                  <option value="" disabled>
                    {t.team.chooseManager}
                  </option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {fullName(m.firstName, m.lastName)}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn btn-primary" type="submit">
                {t.team.assign}
              </button>
            </form>
          ))}
        </section>
      )}

      {(ctx.user.permissions.manageClients || ctx.user.role === "ADMIN") && (
        <section className="card p-4 space-y-3">
          <h2 className="font-semibold">{t.team.assignClients}</h2>
          <div className="overflow-x-auto">
            <table className="table text-sm">
              <thead>
                <tr>
                  <th>{t.team.client}</th>
                  <th>{t.team.currentAgent}</th>
                  <th>{t.team.newAssignment}</th>
                </tr>
              </thead>
              <tbody>
                {clients.slice(0, 20).map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link
                        href={`/clients/${c.id}`}
                        className="text-[var(--brand)]"
                      >
                        {c.clientIdNumber}
                      </Link>{" "}
                      {fullName(c.firstName, c.lastName)}
                    </td>
                    <td>
                      {c.agent
                        ? fullName(c.agent.firstName, c.agent.lastName)
                        : t.common.none}
                    </td>
                    <td>
                      <form
                        action={async (fd) => {
                          "use server";
                          await assignClientAction(fd);
                        }}
                        className="flex flex-wrap gap-2"
                      >
                        <input type="hidden" name="clientId" value={c.id} />
                        <select name="agentId" defaultValue={c.agentId || ""}>
                          <option value="">{t.common.none}</option>
                          {agentsForAssign.map((a) => (
                            <option key={a.id} value={a.id}>
                              {fullName(a.firstName, a.lastName)}
                            </option>
                          ))}
                        </select>
                        <select
                          name="managerId"
                          defaultValue={c.managerId || ""}
                        >
                          <option value="">{t.common.none}</option>
                          {managersForAssign.map((m) => (
                            <option key={m.id} value={m.id}>
                              {fullName(m.firstName, m.lastName)}
                            </option>
                          ))}
                        </select>
                        <button className="btn btn-secondary" type="submit">
                          {t.common.save}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
