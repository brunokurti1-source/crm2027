import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildClientWhere, clientSort, ClientFilters } from "@/lib/clients";
import { formatDate, formatMoney, fullName } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { BulkAssignBar } from "@/components/bulk-assign";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<ClientFilters>;
}) {
  const ctx = await requireAuth();
  const { locale, t } = await getDictionary();
  if (!ctx.user.permissions.clientView) {
    return <p className="flash-err">{t.clients.noPermission}</p>;
  }

  const filters = await searchParams;
  const where = buildClientWhere(ctx, filters);
  const [clients, statuses, agents, managers] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: clientSort(filters),
      take: 100,
      include: {
        agent: { select: { firstName: true, lastName: true } },
        manager: { select: { firstName: true, lastName: true } },
        statusRef: { select: { labelSq: true } },
      },
    }),
    prisma.clientStatus.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
    ctx.user.role === "ADMIN"
      ? prisma.user.findMany({
          where: { role: "AGENT", active: true, deletedAt: null },
          orderBy: { firstName: "asc" },
        })
      : ctx.user.role === "MANAGER"
        ? prisma.user.findMany({
            where: {
              role: "AGENT",
              managerId: ctx.user.id,
              active: true,
              deletedAt: null,
            },
            orderBy: { firstName: "asc" },
          })
        : Promise.resolve([]),
    ctx.user.role === "ADMIN"
      ? prisma.user.findMany({
          where: { role: "MANAGER", active: true, deletedAt: null },
          orderBy: { firstName: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const hasFilters = Boolean(
    filters.q ||
      filters.status ||
      filters.country ||
      filters.agentId ||
      filters.managerId ||
      filters.phone ||
      filters.email ||
      filters.clientIdNumber ||
      filters.creditMin ||
      filters.creditMax ||
      filters.registeredFrom ||
      filters.registeredTo,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">{t.clients.title}</h1>
          <p className="page-sub">
            {clients.length} {t.clients.results}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(ctx.user.permissions.dataExport || ctx.user.role === "ADMIN") && (
            <Link
              href={`/api/export/clients?${new URLSearchParams(
                Object.entries(filters)
                  .filter(([, v]) => v)
                  .map(([k, v]) => [k, String(v)]),
              ).toString()}`}
              className="btn btn-secondary"
            >
              {t.common.export}
            </Link>
          )}
          {(ctx.user.permissions.clientAdd || ctx.user.role === "ADMIN") && (
            <Link href="/clients/new" className="btn btn-primary">
              {t.clients.new}
            </Link>
          )}
        </div>
      </div>

      <form className="card p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
          <div className="field md:col-span-2">
            <label>{t.common.search}</label>
            <input
              name="q"
              defaultValue={filters.q || ""}
              placeholder={t.nav.searchClients}
            />
          </div>
          <div className="field">
            <label>{t.clients.status}</label>
            <select name="status" defaultValue={filters.status || ""}>
              <option value="">{t.common.all}</option>
              {statuses.map((s) => (
                <option key={s.code} value={s.code}>
                  {t.status[s.code] || s.labelSq}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
<label>{t.clients.country}</label>
            <input name="country" defaultValue={filters.country || ""} />
          </div>
          <div className="field">
<label>{t.clients.creditMin}</label>
            <input
              name="creditMin"
              defaultValue={filters.creditMin || ""}
              type="number"
              step="0.01"
            />
          </div>
          <div className="field">
<label>{t.clients.creditMax}</label>
            <input
              name="creditMax"
              defaultValue={filters.creditMax || ""}
              type="number"
              step="0.01"
            />
          </div>
          {agents.length > 0 && (
            <div className="field">
<label>{t.clients.agent}</label>
              <select name="agentId" defaultValue={filters.agentId || ""}>
<option value="">{t.common.all}</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {fullName(a.firstName, a.lastName)}
                  </option>
                ))}
              </select>
            </div>
          )}
          {managers.length > 0 && (
            <div className="field">
<label>{t.clients.manager}</label>
              <select name="managerId" defaultValue={filters.managerId || ""}>
<option value="">{t.common.all}</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {fullName(m.firstName, m.lastName)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="field">
<label>{t.clients.sort}</label>
            <select name="sort" defaultValue={filters.sort || "updated"}>
<option value="updated">{t.clients.sortUpdated}</option>
<option value="name">{t.clients.sortName}</option>
<option value="status">{t.clients.sortStatus}</option>
<option value="credit">{t.clients.sortCredit}</option>
<option value="registered">{t.clients.sortRegistered}</option>
<option value="contact">{t.clients.sortContact}</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" type="submit">
            {t.common.filter}
          </button>
          {hasFilters ? (
            <Link href="/clients" className="btn btn-secondary">
              {t.clients.clearFilters}
            </Link>
          ) : null}
        </div>
      </form>

      {(ctx.user.permissions.manageClients || ctx.user.role === "ADMIN") && (
        <BulkAssignBar
          agents={agents.map((a) => ({
            id: a.id,
            label: fullName(a.firstName, a.lastName),
          }))}
          managers={
            managers.length
              ? managers.map((m) => ({
                  id: m.id,
                  label: fullName(m.firstName, m.lastName),
                }))
              : ctx.user.role === "MANAGER"
                ? [{ id: ctx.user.id, label: fullName(ctx.user.firstName, ctx.user.lastName) }]
                : []
          }
        />
      )}

      <div className="card overflow-x-auto">
        <table className="table text-sm">
          <thead>
            <tr>
              {(ctx.user.permissions.manageClients ||
                ctx.user.role === "ADMIN") && <th></th>}
              <th>{t.clients.id}</th>
              <th>{t.clients.name}</th>
              <th>{t.clients.contact}</th>
              <th>{t.clients.status}</th>
              <th>{t.clients.credit}</th>
              <th>{t.clients.agent}</th>
              <th>{t.clients.manager}</th>
              <th>{t.clients.registered}</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id}>
                {(ctx.user.permissions.manageClients ||
                  ctx.user.role === "ADMIN") && (
                  <td>
                    <input type="checkbox" name="clientIds" value={c.id} />
                  </td>
                )}
                <td>
                  <Link
                    className="text-[var(--brand)] font-semibold"
                    href={`/clients/${c.id}`}
                  >
                    {c.clientIdNumber}
                  </Link>
                </td>
                <td>
                  <div className="font-medium">
                    {fullName(c.firstName, c.lastName)}
                  </div>
                  <div className="muted text-xs">
{c.company || c.country || t.common.none}
                  </div>
                </td>
                <td>
<div>{c.phone || t.common.none}</div>
                  <div className="muted text-xs">{c.email || ""}</div>
                </td>
                <td>
                  <StatusBadge
                    code={c.status}
                    label={t.status[c.status] || c.statusRef?.labelSq}
                  />
                </td>
<td>{formatMoney(c.creditBalance, locale)}</td>
                <td>
                  {c.agent
                    ? fullName(c.agent.firstName, c.agent.lastName)
                    : t.common.none}
                </td>
                <td>
                  {c.manager
                    ? fullName(c.manager.firstName, c.manager.lastName)
                    : t.common.none}
                </td>
<td>{formatDate(c.registrationDate, locale)}</td>
              </tr>
            ))}
            {!clients.length ? (
              <tr>
                <td colSpan={8} className="muted">
                  {t.clients.notFound}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
