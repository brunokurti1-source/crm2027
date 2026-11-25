import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth, clientScopeWhere } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { STATUS_LABELS } from "@/lib/permissions";
import { formatDate, formatDateTime, formatMoney, fullName } from "@/lib/format";
import { ClientDetailActions } from "./actions-panel";
import { StatusBadge } from "@/components/status-badge";
import { ClientQuickActions } from "@/components/client-quick-actions";

type Params = { params: Promise<{ id: string }> };

export default async function ClientDetailPage({ params }: Params) {
  const ctx = await requireAuth();
  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: { id, ...clientScopeWhere(ctx) },
    include: {
      agent: true,
      manager: true,
      statusRef: true,
      comments: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: { author: { select: { firstName: true, lastName: true } } },
      },
      meetings: {
        orderBy: { scheduledAt: "desc" },
        take: 10,
        include: { agent: { select: { firstName: true, lastName: true } } },
      },
      creditEntries: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { actor: { select: { firstName: true, lastName: true } } },
      },
      activityLogs: {
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { actor: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  if (!client) notFound();

  const canViewCredits =
    ctx.user.role === "ADMIN" ||
    ctx.user.permissions.creditHistoryView ||
    ctx.user.permissions.creditsAdd ||
    ctx.user.permissions.creditsRemove;

  const [agents, managers, statuses] = await Promise.all([
    ctx.user.role === "ADMIN"
      ? prisma.user.findMany({
          where: { role: "AGENT", active: true, deletedAt: null },
        })
      : ctx.user.role === "MANAGER"
        ? prisma.user.findMany({
            where: {
              role: "AGENT",
              managerId: ctx.user.id,
              active: true,
              deletedAt: null,
            },
          })
        : Promise.resolve([]),
    ctx.user.role === "ADMIN"
      ? prisma.user.findMany({
          where: { role: "MANAGER", active: true, deletedAt: null },
        })
      : Promise.resolve([]),
    prisma.clientStatus.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/clients" className="text-sm text-[var(--brand)]">
            ← Klientët
          </Link>
          <h1 className="page-title mt-1">
            {fullName(client.firstName, client.lastName)}
          </h1>
          <div className="flex flex-wrap gap-2 mt-2 text-sm">
            <span className="badge">{client.clientIdNumber}</span>
            <StatusBadge
              code={client.status}
              label={client.statusRef?.labelSq || STATUS_LABELS[client.status]}
            />
            <span className="badge">{formatMoney(client.creditBalance)}</span>
            {client.archived ? (
              <span className="badge badge-warn">Arkivuar</span>
            ) : null}
          </div>
        </div>
      </div>

      <ClientQuickActions
        phone={client.phone}
        email={client.email}
        permissions={{
          canComment:
            ctx.user.permissions.commentsAdd || ctx.user.role === "ADMIN",
          canMeet: true,
        }}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-4 lg:col-span-2 space-y-4">
          <div>
            <h2 className="font-semibold text-[var(--ink-strong)]">
              Të dhënat e kontaktit
            </h2>
            <dl className="grid sm:grid-cols-2 gap-3 text-sm mt-2">
              <div>
                <dt className="muted">Telefon</dt>
                <dd>{client.phone || "—"}</dd>
              </div>
              <div>
                <dt className="muted">Email</dt>
                <dd>{client.email || "—"}</dd>
              </div>
              <div>
                <dt className="muted">Kompania</dt>
                <dd>{client.company || "—"}</dd>
              </div>
              <div>
                <dt className="muted">Adresa</dt>
                <dd>{client.address || "—"}</dd>
              </div>
              <div>
                <dt className="muted">Shteti</dt>
                <dd>{client.country || "—"}</dd>
              </div>
              <div>
                <dt className="muted">Burimi</dt>
                <dd>{client.leadSource || "—"}</dd>
              </div>
            </dl>
          </div>
          <div className="border-t border-[var(--line-soft)] pt-3">
            <h2 className="font-semibold text-[var(--ink-strong)]">
              Statusi & llogaria
            </h2>
            <dl className="grid sm:grid-cols-2 gap-3 text-sm mt-2">
              <div>
                <dt className="muted">Statusi</dt>
                <dd>
                  <StatusBadge
                    code={client.status}
                    label={
                      client.statusRef?.labelSq || STATUS_LABELS[client.status]
                    }
                  />
                </dd>
              </div>
              <div>
                <dt className="muted">Gjendja e llogarisë</dt>
                <dd>{formatMoney(client.creditBalance)}</dd>
              </div>
              <div>
                <dt className="muted">Agjenti</dt>
                <dd>
                  {client.agent
                    ? fullName(client.agent.firstName, client.agent.lastName)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="muted">Menaxheri</dt>
                <dd>
                  {client.manager
                    ? fullName(
                        client.manager.firstName,
                        client.manager.lastName,
                      )
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="muted">Regjistruar</dt>
                <dd>{formatDate(client.registrationDate)}</dd>
              </div>
              <div>
                <dt className="muted">Kontakti i fundit</dt>
                <dd>{formatDateTime(client.lastContactAt)}</dd>
              </div>
            </dl>
            {client.notes ? (
              <p className="text-sm mt-3 muted">{client.notes}</p>
            ) : null}
          </div>
        </section>

        <ClientDetailActions
          client={{
            id: client.id,
            clientIdNumber: client.clientIdNumber,
            firstName: client.firstName,
            lastName: client.lastName,
            phone: client.phone,
            email: client.email,
            company: client.company,
            address: client.address,
            country: client.country,
            leadSource: client.leadSource,
            status: client.status,
            notes: client.notes,
            agentId: client.agentId,
            managerId: client.managerId,
            creditBalance: client.creditBalance,
            version: client.version,
          }}
          agents={agents.map((a) => ({
            id: a.id,
            label: fullName(a.firstName, a.lastName),
          }))}
          managers={managers.map((m) => ({
            id: m.id,
            label: fullName(m.firstName, m.lastName),
          }))}
          statuses={statuses.map((s) => ({
            id: s.code,
            label: s.labelSq,
          }))}
          permissions={{
            canEdit: ctx.user.permissions.clientEdit || ctx.user.role === "ADMIN",
            canCreditsAdd:
              ctx.user.permissions.creditsAdd || ctx.user.role === "ADMIN",
            canCreditsRemove:
              ctx.user.permissions.creditsRemove || ctx.user.role === "ADMIN",
            canComment:
              ctx.user.permissions.commentsAdd || ctx.user.role === "ADMIN",
            canDeleteComment:
              ctx.user.permissions.commentsDelete || ctx.user.role === "ADMIN",
            canAssign:
              ctx.user.permissions.manageClients || ctx.user.role === "ADMIN",
            canArchive:
              ctx.user.permissions.clientDelete || ctx.user.role === "ADMIN",
            canDelete:
              ctx.user.permissions.clientDelete || ctx.user.role === "ADMIN",
            canMeet: true,
          }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="font-semibold mb-3">Komentet</h2>
          <ul className="space-y-3 text-sm">
            {client.comments.map((c) => (
              <li key={c.id} className="border-b border-[var(--line-soft)] pb-2">
                <div>{c.body}</div>
                <div className="muted text-xs">
                  {fullName(c.author.firstName, c.author.lastName)} ·{" "}
                  {formatDateTime(c.createdAt)}
                </div>
              </li>
            ))}
            {!client.comments.length ? (
              <li className="muted">Nuk ka komente</li>
            ) : null}
          </ul>
        </section>

        <section className="card p-4">
          <h2 className="font-semibold mb-3">Takimet</h2>
          <ul className="space-y-3 text-sm">
            {client.meetings.map((m) => (
              <li key={m.id} className="border-b border-[var(--line-soft)] pb-2">
                <div className="font-medium">{formatDateTime(m.scheduledAt)}</div>
                <div className="muted">
                  <span className="badge">{m.status}</span> ·{" "}
                  {fullName(m.agent.firstName, m.agent.lastName)}
                </div>
                {m.notes ? <div>{m.notes}</div> : null}
              </li>
            ))}
            {!client.meetings.length ? (
              <li className="muted">Nuk ka takime</li>
            ) : null}
          </ul>
        </section>
      </div>

      {canViewCredits ? (
        <section className="card p-4">
          <h2 className="font-semibold mb-3">Historiku i kredive</h2>
          <div className="overflow-x-auto">
            <table className="table text-sm">
              <thead>
                <tr>
                  <th>Kur</th>
                  <th>Lloji</th>
                  <th>Shuma</th>
                  <th>Para</th>
                  <th>Pas</th>
                  <th>Kush</th>
                  <th>Arsyeja</th>
                </tr>
              </thead>
              <tbody>
                {client.creditEntries.map((e) => (
                  <tr key={e.id}>
                    <td>{formatDateTime(e.createdAt)}</td>
                    <td>
                      <span className="badge">
                        {e.direction === "ADD" ? "Shtim" : "Heqje"}
                      </span>
                    </td>
                    <td>{formatMoney(e.amount)}</td>
                    <td>{formatMoney(e.previousBalance)}</td>
                    <td>{formatMoney(e.newBalance)}</td>
                    <td>
                      {e.actor
                        ? fullName(e.actor.firstName, e.actor.lastName)
                        : "—"}
                    </td>
                    <td>{e.reason}</td>
                  </tr>
                ))}
                {!client.creditEntries.length ? (
                  <tr>
                    <td colSpan={7} className="muted">
                      Nuk ka lëvizje kredie
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="card p-4">
        <h2 className="font-semibold mb-3">Historia e aktivitetit</h2>
        <ul className="space-y-3 text-sm">
          {client.activityLogs.map((a) => (
            <li key={a.id} className="border-b border-[var(--line-soft)] pb-2">
              <div className="flex flex-wrap gap-2 items-baseline">
                <span className="badge">{a.action}</span>
                <span>{a.description}</span>
              </div>
              <div className="muted text-xs">
                {formatDateTime(a.createdAt)}
                {a.actor
                  ? ` · ${fullName(a.actor.firstName, a.actor.lastName)}`
                  : ""}
                {a.viaImpersonationOf ? " · gjatë impersonimit" : ""}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
