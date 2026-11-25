import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { CreateIntegrationForm, RunDueSyncsButton } from "./forms";

export default async function IntegrationsPage() {
  const ctx = await requireAuth();
  const { t } = await getDictionary();
  if (ctx.user.role !== "ADMIN" && ctx.user.role !== "MANAGER") {
    return <p className="flash-err">{t.integrationsPage.noPermission}</p>;
  }

  const where =
    ctx.user.role === "ADMIN"
      ? {}
      : { managerId: ctx.user.id };

  const [integrations, managers, agents, pendingCount] = await Promise.all([
    prisma.integration.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    }),
    ctx.user.role === "ADMIN"
      ? prisma.user.findMany({
          where: { role: "MANAGER", active: true, deletedAt: null },
          orderBy: { firstName: "asc" },
        })
      : Promise.resolve([]),
    ctx.user.role === "ADMIN"
      ? prisma.user.findMany({
          where: { role: "AGENT", active: true, deletedAt: null },
          orderBy: { firstName: "asc" },
        })
      : prisma.user.findMany({
          where: {
            role: "AGENT",
            managerId: ctx.user.id,
            active: true,
            deletedAt: null,
          },
          orderBy: { firstName: "asc" },
        }),
    ctx.user.role === "ADMIN"
      ? prisma.integrationPendingItem.count({ where: { status: "PENDING" } })
      : Promise.resolve(0),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">{t.integrationsPage.title}</h1>
          <p className="page-sub">
            {ctx.user.role === "ADMIN"
              ? t.integrationsPage.subtitle
              : t.integrationsPage.managerSubtitle}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="btn btn-secondary" href="/settings/integrations/docs">
            {t.integrationsPage.docs}
          </Link>
          {ctx.user.role === "ADMIN" ? (
            <Link
              className="btn btn-secondary"
              href="/settings/integrations/pending"
            >
              {t.integrationsPage.pendingCount.replace(
                "{count}",
                String(pendingCount),
              )}
            </Link>
          ) : null}
        </div>
      </div>

      {ctx.user.role === "ADMIN" ? <RunDueSyncsButton /> : null}

      {ctx.user.role === "ADMIN" ? (
        <CreateIntegrationForm
          managers={managers.map((m) => ({
            id: m.id,
            label: `${m.firstName} ${m.lastName}`,
          }))}
          agents={agents.map((a) => ({
            id: a.id,
            label: `${a.firstName} ${a.lastName}`,
            managerId: a.managerId,
          }))}
        />
      ) : null}

      <div className="card overflow-x-auto">
        <table className="table text-sm">
          <thead>
            <tr>
              <th>{t.integrationsPage.name}</th>
              <th>{t.common.direction}</th>
              <th>{t.integrationsPage.manager}</th>
              <th>{t.integrationsPage.sync}</th>
              <th>{t.integrationsPage.status}</th>
              <th>{t.integrationsPage.lastError}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {integrations.map((i) => (
              <tr key={i.id}>
                <td className="font-medium">{i.name}</td>
                <td>
                  <span className="badge">{i.direction}</span>
                </td>
                <td className="muted">
                  {i.managerId
                    ? managers.find((m) => m.id === i.managerId)
                      ? `${managers.find((m) => m.id === i.managerId)!.firstName} ${managers.find((m) => m.id === i.managerId)!.lastName}`
                      : i.managerId.slice(0, 8)
                    : ctx.user.role === "MANAGER"
                      ? t.integrationsPage.yourGroup
                      : t.integrationsPage.global}
                </td>
                <td className="muted">
                  {i.lastSyncAt ? formatDateTime(i.lastSyncAt) : t.common.none}
                  {i.syncEnabled ? (
                    <span className="badge badge-ok ml-1">
                      {t.integrationsPage.syncOn}
                    </span>
                  ) : (
                    <span className="badge badge-warn ml-1">
                      {t.integrationsPage.syncOff}
                    </span>
                  )}
                </td>
                <td>
                  <span
                    className={`badge ${
                      i.lastSyncStatus === "OK"
                        ? "badge-ok"
                        : i.lastSyncStatus
                          ? "badge-warn"
                          : ""
                    }`}
                  >
                    {i.lastSyncStatus ||
                      (i.active
                        ? t.integrationsPage.active
                        : t.integrationsPage.inactive)}
                  </span>
                </td>
                <td className="muted max-w-[14rem] truncate">
                  {i.lastError || t.common.none}
                </td>
                <td>
                  <Link
                    className="text-[var(--brand)] font-semibold"
                    href={`/settings/integrations/${i.id}`}
                  >
                    {t.integrationsPage.view}
                  </Link>
                </td>
              </tr>
            ))}
            {!integrations.length ? (
              <tr>
                <td colSpan={7} className="muted">
                  {t.integrationsPage.empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
