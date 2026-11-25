import Link from "next/link";
import { requireAuth, clientScopeWhere } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime, fullName } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const ctx = await requireAuth();
  const { t } = await getDictionary();
  const sp = await searchParams;
  const scope = clientScopeWhere(ctx);

  const staleDaysSetting = await prisma.appSetting
    .findUnique({ where: { key: "staleContactDays" } })
    .catch(() => null);
  const staleDays = Number(staleDaysSetting?.value || 14);
  const staleBefore = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);

  const [
    totalClients,
    newClients,
    upcomingMeetings,
    openTasks,
    overdueTasks,
    unreadNotifs,
    staleClients,
    recentActivity,
  ] = await Promise.all([
    prisma.client.count({ where: { ...scope, archived: false } }),
    prisma.client.findMany({
      where: { ...scope, archived: false, status: "NEW" },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        clientIdNumber: true,
        status: true,
        createdAt: true,
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
                  { agent: { managerId: ctx.user.id } },
                  { client: { managerId: ctx.user.id } },
                ],
              }
            : { agentId: ctx.user.id }),
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.task.findMany({
      where: {
        status: "OPEN",
        dueAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(24, 0, 0, 0)),
        },
        ...(ctx.user.role === "ADMIN" ? {} : { assigneeId: ctx.user.id }),
      },
      orderBy: { dueAt: "asc" },
      take: 6,
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
      },
    }).catch(() => []),
    prisma.task.count({
      where: {
        status: "OPEN",
        dueAt: { lt: new Date() },
        ...(ctx.user.role === "ADMIN" ? {} : { assigneeId: ctx.user.id }),
      },
    }).catch(() => 0),
    prisma.notification.findMany({
      where: { userId: ctx.user.id, readAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
    }).catch(() => []),
    prisma.client.findMany({
      where: {
        ...scope,
        archived: false,
        OR: [{ lastContactAt: null }, { lastContactAt: { lt: staleBefore } }],
      },
      take: 5,
      orderBy: { lastContactAt: "asc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        clientIdNumber: true,
        lastContactAt: true,
      },
    }),
    prisma.activityLog.findMany({
      where:
        ctx.user.role === "ADMIN"
          ? {}
          : { OR: [{ client: scope }, { actorId: ctx.user.id }] },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        actor: { select: { firstName: true, lastName: true } },
        client: {
          select: { firstName: true, lastName: true, clientIdNumber: true },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">{t.dashboard.title}</h1>
          <p className="page-sub">
            {t.dashboard.welcome}, {ctx.user.firstName}. {t.dashboard.scopedHint}
          </p>
        </div>
        <Link href="/clients" className="btn btn-primary">
          {t.nav.clients}
        </Link>
      </div>

      {sp.error === "permission" ? (
        <div className="flash-err">{t.common.permissionDenied}</div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t.dashboard.activeClients} value={totalClients} />
        <StatCard label={t.dashboard.openTasks} value={openTasks.length} />
        <StatCard label={t.dashboard.overdueTasks} value={overdueTasks} />
        <StatCard
          label={t.dashboard.upcomingMeetings}
          value={upcomingMeetings.length}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-[var(--ink-strong)]">
              {t.clients.new}
            </h2>
            <Link href="/clients?status=NEW" className="text-sm text-[var(--brand)]">
              {t.nav.clients}
            </Link>
          </div>
          <ul className="space-y-2 text-sm">
            {newClients.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-2 border-b border-[var(--line-soft)] pb-2"
              >
                <Link href={`/clients/${c.id}`} className="font-medium">
                  {fullName(c.firstName, c.lastName)}
                  <span className="muted text-xs ml-2">{c.clientIdNumber}</span>
                </Link>
                <StatusBadge
                  code={c.status}
                  label={t.status[c.status] || c.status}
                />
              </li>
            ))}
            {!newClients.length ? (
              <li className="muted">{t.common.noData}</li>
            ) : null}
          </ul>
        </section>

        <section className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-[var(--ink-strong)]">
              Detyrat e sotme
            </h2>
            <Link href="/tasks" className="text-sm text-[var(--brand)]">
              Agjenda e detyrave
            </Link>
          </div>
          <ul className="space-y-2 text-sm">
            {openTasks.map((t) => (
              <li
                key={t.id}
                className="border-b border-[var(--line-soft)] pb-2"
              >
                <div className="font-medium">{t.title}</div>
                <div className="muted text-xs">
                  {formatDateTime(t.dueAt)}
                  {t.client
                    ? ` · ${fullName(t.client.firstName, t.client.lastName)}`
                    : ""}
                  {t.priority === "HIGH" ? " · Prioritet i lartë" : ""}
                </div>
              </li>
            ))}
            {!openTasks.length ? (
              <li className="muted">Nuk ka detyra për sot</li>
            ) : null}
          </ul>
        </section>

        <section className="card p-4">
          <h2 className="font-semibold text-[var(--ink-strong)] mb-3">
            Takime të ardhshme
          </h2>
          <ul className="space-y-2 text-sm">
            {upcomingMeetings.map((m) => (
              <li
                key={m.id}
                className="border-b border-[var(--line-soft)] pb-2"
              >
                <Link
                  href={`/clients/${m.client.id}`}
                  className="font-medium"
                >
                  {fullName(m.client.firstName, m.client.lastName)}
                </Link>
                <div className="muted text-xs">
                  {formatDateTime(m.scheduledAt)}
                </div>
              </li>
            ))}
            {!upcomingMeetings.length ? (
              <li className="muted">{t.dashboard.noMeetings}</li>
            ) : null}
          </ul>
        </section>

        <section className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-[var(--ink-strong)]">
              Njoftime
            </h2>
            <Link
              href="/notifications"
              className="text-sm text-[var(--brand)]"
            >
              Të gjitha
            </Link>
          </div>
          <ul className="space-y-2 text-sm">
            {unreadNotifs.map((n) => (
              <li
                key={n.id}
                className="border-b border-[var(--line-soft)] pb-2"
              >
                <div className="font-medium">{n.title}</div>
                <div className="muted text-xs">{n.body}</div>
              </li>
            ))}
            {!unreadNotifs.length ? (
              <li className="muted">Nuk ka njoftime të reja</li>
            ) : null}
          </ul>
          <h3 className="font-semibold text-sm mt-4 mb-2">
            Pa kontakt ≥ {staleDays} ditë
          </h3>
          <ul className="space-y-2 text-sm">
            {staleClients.map((c) => (
              <li key={c.id}>
                <Link href={`/clients/${c.id}`} className="text-[var(--brand)]">
                  {fullName(c.firstName, c.lastName)}
                </Link>
              </li>
            ))}
            {!staleClients.length ? (
              <li className="muted">Nuk ka klientë të vonuar</li>
            ) : null}
          </ul>
        </section>
      </div>

      <section className="card p-4">
        <h2 className="font-semibold text-[var(--ink-strong)] mb-3">
          {t.dashboard.recentActivity}
        </h2>
        <ul className="space-y-2 text-sm">
          {recentActivity.map((a) => (
            <li
              key={a.id}
              className="border-b border-[var(--line-soft)] pb-2 flex flex-wrap gap-2 justify-between"
            >
              <span>{a.description}</span>
              <span className="muted text-xs">
                {formatDateTime(a.createdAt)}
                {a.viaImpersonationOf ? " · (impersonim)" : ""}
              </span>
            </li>
          ))}
          {!recentActivity.length ? (
            <li className="muted">{t.dashboard.noActivity}</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
