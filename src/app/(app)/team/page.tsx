import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fullName } from "@/lib/format";
import { assignAgentToManagerAction } from "@/app/actions/users";
import { assignClientAction } from "@/app/actions/clients";
import { startImpersonationAction } from "@/app/actions/auth";

export default async function TeamPage() {
  const ctx = await requireAuth();
  if (ctx.user.role !== "ADMIN" && ctx.user.role !== "MANAGER") {
    return <p className="text-[var(--danger)]">Nuk keni leje.</p>;
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
      : [{ id: ctx.user.id, firstName: ctx.user.firstName, lastName: ctx.user.lastName }];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Ekipi</h1>
        <p className="muted text-sm">
          Agjentët, grupet e menaxherëve dhe ngarkesa e punës.
        </p>
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
                  {m.email} · {m._count.managedClients} klientë · {m.agents.length}{" "}
                  agjentë
                </p>
              </div>
              {(ctx.realUser.permissions.impersonate ||
                ctx.realUser.role === "ADMIN") &&
                m.id !== ctx.realUser.id && (
                  <form action={startImpersonationAction}>
                    <input type="hidden" name="targetUserId" value={m.id} />
                    <button className="btn btn-secondary" type="submit">
                      Impersono menaxherin
                    </button>
                  </form>
                )}
            </div>
            <table className="table text-sm">
              <thead>
                <tr>
                  <th>Agjenti</th>
                  <th>Statusi</th>
                  <th>Klientë</th>
                  <th>Takime</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {m.agents.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link href={`/users/${a.id}`} className="text-[var(--brand)]">
                        {fullName(a.firstName, a.lastName)}
                      </Link>
                      <div className="muted text-xs">{a.email}</div>
                    </td>
                    <td>{a.active ? "Aktiv" : "Joaktiv"}</td>
                    <td>{a._count.assignedClients}</td>
                    <td>{a._count.meetings}</td>
                    <td>
                      {(ctx.realUser.permissions.impersonate ||
                        ctx.realUser.role === "ADMIN") && (
                        <form action={startImpersonationAction}>
                          <input type="hidden" name="targetUserId" value={a.id} />
                          <button className="btn btn-secondary" type="submit">
                            Impersono
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
                {!m.agents.length ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      Nuk ka agjentë në këtë grup
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
          <h2 className="font-semibold">Agjentë pa menaxher</h2>
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
                    Zgjidh menaxherin
                  </option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {fullName(m.firstName, m.lastName)}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn btn-primary" type="submit">
                Cakto
              </button>
            </form>
          ))}
        </section>
      )}

      {(ctx.user.permissions.manageClients || ctx.user.role === "ADMIN") && (
        <section className="card p-4 space-y-3">
          <h2 className="font-semibold">Cakto klientë</h2>
          <div className="overflow-x-auto">
            <table className="table text-sm">
              <thead>
                <tr>
                  <th>Klienti</th>
                  <th>Agjenti aktual</th>
                  <th>Caktim i ri</th>
                </tr>
              </thead>
              <tbody>
                {clients.slice(0, 20).map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/clients/${c.id}`} className="text-[var(--brand)]">
                        {c.clientIdNumber}
                      </Link>{" "}
                      {fullName(c.firstName, c.lastName)}
                    </td>
                    <td>
                      {c.agent
                        ? fullName(c.agent.firstName, c.agent.lastName)
                        : "—"}
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
                          <option value="">—</option>
                          {agentsForAssign.map((a) => (
                            <option key={a.id} value={a.id}>
                              {fullName(a.firstName, a.lastName)}
                            </option>
                          ))}
                        </select>
                        <select name="managerId" defaultValue={c.managerId || ""}>
                          <option value="">—</option>
                          {managersForAssign.map((m) => (
                            <option key={m.id} value={m.id}>
                              {fullName(m.firstName, m.lastName)}
                            </option>
                          ))}
                        </select>
                        <button className="btn btn-secondary" type="submit">
                          Ruaj
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
