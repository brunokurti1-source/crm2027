import Link from "next/link";
import { requireAuth, clientScopeWhere } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/stat-card";
import { STATUS_LABELS, ClientStatus } from "@/lib/permissions";
import { formatDateTime, fullName } from "@/lib/format";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const ctx = await requireAuth();
  const sp = await searchParams;
  const scope = clientScopeWhere(ctx);

  const [
    totalClients,
    byStatus,
    recentActivity,
    upcomingMeetings,
    agents,
    managers,
  ] = await Promise.all([
    prisma.client.count({ where: { ...scope, archived: false } }),
    prisma.client.groupBy({
      by: ["status"],
      where: { ...scope, archived: false },
      _count: { _all: true },
    }),
    prisma.activityLog.findMany({
      where:
        ctx.user.role === "ADMIN"
          ? {}
          : {
              OR: [
                { client: scope },
                { actorId: ctx.user.id },
              ],
            },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        actor: { select: { firstName: true, lastName: true } },
        client: { select: { firstName: true, lastName: true, clientIdNumber: true } },
      },
    }),
    prisma.meeting.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: { gte: new Date() },
        ...(ctx.user.role === "ADMIN"
          ? {}
          : ctx.user.role === "MANAGER"
            ? {
                OR: [
                  { agentId: ctx.user.id },
                  { agent: { managerId: ctx.user.id } },
                  { client: { managerId: ctx.user.id } },
                ],
              }
            : { agentId: ctx.user.id }),
      },
      orderBy: { scheduledAt: "asc" },
      take: 6,
      include: {
        client: { select: { firstName: true, lastName: true, id: true } },
        agent: { select: { firstName: true, lastName: true } },
      },
    }),
    ctx.user.role === "ADMIN" || ctx.user.role === "MANAGER"
      ? prisma.client.groupBy({
          by: ["agentId"],
          where: { ...scope, archived: false, agentId: { not: null } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    ctx.user.role === "ADMIN"
      ? prisma.client.groupBy({
          by: ["managerId"],
          where: { archived: false, managerId: { not: null } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);

  const agentIds = agents.map((a) => a.agentId).filter(Boolean) as string[];
  const managerIds = managers.map((m) => m.managerId).filter(Boolean) as string[];
  const people = await prisma.user.findMany({
    where: { id: { in: [...agentIds, ...managerIds] } },
    select: { id: true, firstName: true, lastName: true },
  });
  const nameById = Object.fromEntries(
    people.map((p) => [p.id, fullName(p.firstName, p.lastName)]),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Paneli</h1>
          <p className="muted text-sm">
            Mirë se vini, {ctx.user.firstName}. Të dhënat sipas rolit tuaj.
          </p>
        </div>
        <Link href="/clients" className="btn btn-primary">
          Shiko klientët
        </Link>
      </div>

      {sp.error === "permission" ? (
        <div className="card p-3 text-sm text-[var(--danger)] bg-[var(--danger-bg)]">
          Nuk keni leje për këtë veprim.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Klientë aktivë" value={totalClients} />
        {byStatus.slice(0, 3).map((s) => (
          <StatCard
            key={s.status}
            label={STATUS_LABELS[s.status as ClientStatus] || s.status}
            value={s._count._all}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="font-semibold mb-3">Sipas statusit</h2>
          <ul className="space-y-2 text-sm">
            {byStatus.map((s) => (
              <li key={s.status} className="flex justify-between">
                <span>{STATUS_LABELS[s.status as ClientStatus] || s.status}</span>
                <strong>{s._count._all}</strong>
              </li>
            ))}
            {!byStatus.length ? <li className="muted">Nuk ka të dhëna</li> : null}
          </ul>
        </section>

        {(ctx.user.role === "ADMIN" || ctx.user.role === "MANAGER") && (
          <section className="card p-4">
            <h2 className="font-semibold mb-3">Sipas agjentit</h2>
            <ul className="space-y-2 text-sm">
              {agents.map((a) => (
                <li key={String(a.agentId)} className="flex justify-between">
                  <span>{nameById[a.agentId!] || "—"}</span>
                  <strong>{a._count._all}</strong>
                </li>
              ))}
              {!agents.length ? <li className="muted">Nuk ka caktime</li> : null}
            </ul>
            {ctx.user.role === "ADMIN" ? (
              <>
                <h2 className="font-semibold mb-3 mt-5">Sipas menaxherit</h2>
                <ul className="space-y-2 text-sm">
                  {managers.map((m) => (
                    <li key={String(m.managerId)} className="flex justify-between">
                      <span>{nameById[m.managerId!] || "—"}</span>
                      <strong>{m._count._all}</strong>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        )}

        <section className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Takime të ardhshme</h2>
            <Link href="/agenda" className="text-sm text-[var(--brand)]">
              Agenda
            </Link>
          </div>
          <ul className="space-y-3 text-sm">
            {upcomingMeetings.map((m) => (
              <li key={m.id} className="border-b border-[var(--line)] pb-2">
                <div className="font-medium">
                  <Link href={`/clients/${m.client.id}`}>
                    {fullName(m.client.firstName, m.client.lastName)}
                  </Link>
                </div>
                <div className="muted">
                  {formatDateTime(m.scheduledAt)} ·{" "}
                  {fullName(m.agent.firstName, m.agent.lastName)}
                </div>
              </li>
            ))}
            {!upcomingMeetings.length ? (
              <li className="muted">Nuk ka takime të planifikuara</li>
            ) : null}
          </ul>
        </section>

        <section className="card p-4">
          <h2 className="font-semibold mb-3">Aktiviteti i fundit</h2>
          <ul className="space-y-3 text-sm">
            {recentActivity.map((a) => (
              <li key={a.id} className="border-b border-[var(--line)] pb-2">
                <div>{a.description}</div>
                <div className="muted text-xs">
                  {formatDateTime(a.createdAt)}
                  {a.actor
                    ? ` · ${fullName(a.actor.firstName, a.actor.lastName)}`
                    : ""}
                  {a.client
                    ? ` · ${a.client.clientIdNumber}`
                    : ""}
                </div>
              </li>
            ))}
            {!recentActivity.length ? (
              <li className="muted">Nuk ka aktivitet</li>
            ) : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
