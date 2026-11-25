import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildClientWhere, clientSort, ClientFilters } from "@/lib/clients";
import { STATUS_LABELS } from "@/lib/permissions";
import { formatDate, formatMoney, fullName } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<ClientFilters>;
}) {
  const ctx = await requireAuth();
  if (!ctx.user.permissions.clientView) {
    return <p className="flash-err">Nuk keni leje për të parë klientët.</p>;
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
          <h1 className="page-title">Klientët</h1>
          <p className="page-sub">{clients.length} rezultate</p>
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
              Eksporto
            </Link>
          )}
          {(ctx.user.permissions.clientAdd || ctx.user.role === "ADMIN") && (
            <Link href="/clients/new" className="btn btn-primary">
              Klient i ri
            </Link>
          )}
        </div>
      </div>

      <form className="card p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
          <div className="field md:col-span-2">
            <label>Kërko</label>
            <input
              name="q"
              defaultValue={filters.q || ""}
              placeholder="Emër, telefon, email, ID…"
            />
          </div>
          <div className="field">
            <label>Statusi</label>
            <select name="status" defaultValue={filters.status || ""}>
              <option value="">Të gjitha</option>
              {statuses.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.labelSq}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Shteti</label>
            <input name="country" defaultValue={filters.country || ""} />
          </div>
          <div className="field">
            <label>Kredi min</label>
            <input
              name="creditMin"
              defaultValue={filters.creditMin || ""}
              type="number"
              step="0.01"
            />
          </div>
          <div className="field">
            <label>Kredi max</label>
            <input
              name="creditMax"
              defaultValue={filters.creditMax || ""}
              type="number"
              step="0.01"
            />
          </div>
          {agents.length > 0 && (
            <div className="field">
              <label>Agjenti</label>
              <select name="agentId" defaultValue={filters.agentId || ""}>
                <option value="">Të gjithë</option>
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
              <label>Menaxheri</label>
              <select name="managerId" defaultValue={filters.managerId || ""}>
                <option value="">Të gjithë</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {fullName(m.firstName, m.lastName)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="field">
            <label>Rendit</label>
            <select name="sort" defaultValue={filters.sort || "updated"}>
              <option value="updated">Përditësuar</option>
              <option value="name">Emri</option>
              <option value="status">Statusi</option>
              <option value="credit">Kredi</option>
              <option value="registered">Regjistrimi</option>
              <option value="contact">Kontakti i fundit</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" type="submit">
            Filtro
          </button>
          {hasFilters ? (
            <Link href="/clients" className="btn btn-secondary">
              Pastro filtrat
            </Link>
          ) : null}
        </div>
      </form>

      <div className="card overflow-x-auto">
        <table className="table text-sm">
          <thead>
            <tr>
              <th>ID</th>
              <th>Emri</th>
              <th>Kontakt</th>
              <th>Statusi</th>
              <th>Kredi</th>
              <th>Agjent</th>
              <th>Menaxher</th>
              <th>Regjistruar</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id}>
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
                    {c.company || c.country || "—"}
                  </div>
                </td>
                <td>
                  <div>{c.phone || "—"}</div>
                  <div className="muted text-xs">{c.email || ""}</div>
                </td>
                <td>
                  <StatusBadge
                    code={c.status}
                    label={c.statusRef?.labelSq || STATUS_LABELS[c.status]}
                  />
                </td>
                <td>{formatMoney(c.creditBalance)}</td>
                <td>
                  {c.agent
                    ? fullName(c.agent.firstName, c.agent.lastName)
                    : "—"}
                </td>
                <td>
                  {c.manager
                    ? fullName(c.manager.firstName, c.manager.lastName)
                    : "—"}
                </td>
                <td>{formatDate(c.registrationDate)}</td>
              </tr>
            ))}
            {!clients.length ? (
              <tr>
                <td colSpan={8} className="muted">
                  Nuk u gjetën klientë.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
