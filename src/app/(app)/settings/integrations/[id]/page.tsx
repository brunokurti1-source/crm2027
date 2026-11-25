import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { IntegrationDetailActions } from "../forms";

type Params = { params: Promise<{ id: string }> };

export default async function IntegrationDetailPage({ params }: Params) {
  const ctx = await requireAuth();
  const { t } = await getDictionary();
  if (ctx.user.role !== "ADMIN" && ctx.user.role !== "MANAGER") {
    return <p className="flash-err">{t.integrationsPage.noPermission}</p>;
  }

  const { id } = await params;
  const integration = await prisma.integration.findUnique({ where: { id } });
  if (!integration) notFound();

  if (
    ctx.user.role === "MANAGER" &&
    integration.managerId !== ctx.user.id
  ) {
    return <p className="flash-err">{t.integrationsPage.accessDenied}</p>;
  }

  const [runs, logs, managers, agents] = await Promise.all([
    prisma.integrationSyncRun.findMany({
      where: { integrationId: id },
      orderBy: { startedAt: "desc" },
      take: 20,
    }),
    prisma.integrationLog.findMany({
      where: { integrationId: id },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    ctx.user.role === "ADMIN"
      ? prisma.user.findMany({
          where: { role: "MANAGER", active: true, deletedAt: null },
        })
      : Promise.resolve([]),
    prisma.user.findMany({
      where: {
        role: "AGENT",
        active: true,
        deletedAt: null,
        ...(integration.managerId
          ? { managerId: integration.managerId }
          : {}),
      },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/settings/integrations" className="text-sm muted">
          {t.integrationsPage.back}
        </Link>
        <h1 className="page-title mt-1">{integration.name}</h1>
        <p className="page-sub">
          {integration.description || t.integrationsPage.noDescription} ·{" "}
          {t.integrationsPage.keyPrefix}:{" "}
          {integration.inboundKeyPrefix || t.common.none}…
        </p>
      </div>

      <IntegrationDetailActions
        integration={integration}
        isAdmin={ctx.user.role === "ADMIN"}
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

      <section className="card p-4">
        <h2 className="font-semibold mb-3">{t.integrationsPage.runs}</h2>
        <div className="overflow-x-auto">
          <table className="table text-sm">
            <thead>
              <tr>
                <th>{t.integrationsPage.started}</th>
                <th>{t.integrationsPage.trigger}</th>
                <th>{t.integrationsPage.status}</th>
                <th>+</th>
                <th>~</th>
                <th>{t.integrationsPage.skipped}</th>
                <th>{t.integrationsPage.failed}</th>
                <th>{t.common.error}</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td>{formatDateTime(r.startedAt)}</td>
                  <td>{r.trigger}</td>
                  <td>
                    <span className="badge">{r.status}</span>
                  </td>
                  <td>{r.createdCount}</td>
                  <td>{r.updatedCount}</td>
                  <td>{r.skippedCount}</td>
                  <td>{r.failedCount}</td>
                  <td className="muted">{r.errorSummary || t.common.none}</td>
                </tr>
              ))}
              {!runs.length ? (
                <tr>
                  <td colSpan={8} className="muted">
                    {t.integrationsPage.noRuns}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-semibold mb-3">{t.integrationsPage.logs}</h2>
        <ul className="space-y-2 text-sm">
          {logs.map((l) => (
            <li key={l.id} className="border-b border-[var(--line-soft)] pb-2">
              <div className="flex flex-wrap gap-2">
                <span className="badge">{l.level}</span>
                <span className="font-medium">{l.action}</span>
                <span>{l.message}</span>
              </div>
              <div className="muted text-xs">{formatDateTime(l.createdAt)}</div>
            </li>
          ))}
          {!logs.length ? (
            <li className="muted">{t.integrationsPage.noLogs}</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
