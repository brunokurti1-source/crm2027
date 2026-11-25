import Link from "next/link";
import { requireAuth, clientScopeWhere } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function ReportsPage() {
  const ctx = await requireAuth();
  const { t } = await getDictionary();
  if (
    ctx.user.role !== "ADMIN" &&
    ctx.user.role !== "MANAGER" &&
    !ctx.user.permissions.dataExport
  ) {
    return <p className="flash-err">{t.reports.noPermission}</p>;
  }

  const scope = clientScopeWhere(ctx);
  const byStatus = await prisma.client.groupBy({
    by: ["status"],
    where: { ...scope, archived: false },
    _count: { _all: true },
  });

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="page-title">{t.reports.title}</h1>
        <p className="page-sub">{t.reports.subtitle}</p>
      </div>
      <section className="card p-4">
        <h2 className="font-semibold mb-3">{t.reports.byStatus}</h2>
        <ul className="space-y-2 text-sm">
          {byStatus.map((s) => (
            <li key={s.status} className="flex justify-between items-center">
              <StatusBadge
                code={s.status}
                label={t.status[s.status] || s.status}
              />
              <strong>{s._count._all}</strong>
            </li>
          ))}
        </ul>
      </section>
      <div className="flex gap-2">
        <Link href="/api/export/clients?format=csv" className="btn btn-primary">
          {t.reports.exportCsv}
        </Link>
        <Link
          href="/api/export/clients?format=xlsx"
          className="btn btn-secondary"
        >
          {t.reports.exportExcel}
        </Link>
        <Link href="/clients" className="btn btn-ghost">
          {t.reports.openClientFilters}
        </Link>
      </div>
    </div>
  );
}
