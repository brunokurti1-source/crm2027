import Link from "next/link";
import { requireAuth, clientScopeWhere } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { STATUS_LABELS } from "@/lib/permissions";
import { StatusBadge } from "@/components/status-badge";

export default async function ReportsPage() {
  const ctx = await requireAuth();
  if (
    ctx.user.role !== "ADMIN" &&
    ctx.user.role !== "MANAGER" &&
    !ctx.user.permissions.dataExport
  ) {
    return <p className="flash-err">Nuk keni leje për raporte.</p>;
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
        <h1 className="page-title">Raportet</h1>
        <p className="page-sub">
          Përmbledhje sipas statusit dhe eksport sipas filtrave aktivë.
        </p>
      </div>
      <section className="card p-4">
        <h2 className="font-semibold mb-3">Klientë sipas statusit</h2>
        <ul className="space-y-2 text-sm">
          {byStatus.map((s) => (
            <li key={s.status} className="flex justify-between items-center">
              <StatusBadge
                code={s.status}
                label={STATUS_LABELS[s.status] || s.status}
              />
              <strong>{s._count._all}</strong>
            </li>
          ))}
        </ul>
      </section>
      <div className="flex gap-2">
        <Link href="/api/export/clients?format=csv" className="btn btn-primary">
          Eksporto CSV
        </Link>
        <Link
          href="/api/export/clients?format=xlsx"
          className="btn btn-secondary"
        >
          Eksporto Excel
        </Link>
        <Link href="/clients" className="btn btn-ghost">
          Hap filtrat e klientëve
        </Link>
      </div>
    </div>
  );
}
