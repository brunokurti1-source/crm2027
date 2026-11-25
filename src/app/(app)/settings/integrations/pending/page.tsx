import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { PendingAssignForm } from "./pending-form";

export default async function PendingIntegrationsPage() {
  const ctx = await requireAuth();
  if (ctx.user.role !== "ADMIN") {
    return <p className="flash-err">Vetëm administratori.</p>;
  }

  const [items, managers, agents] = await Promise.all([
    prisma.integrationPendingItem.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { integration: { select: { name: true } } },
    }),
    prisma.user.findMany({
      where: { role: "MANAGER", active: true, deletedAt: null },
    }),
    prisma.user.findMany({
      where: { role: "AGENT", active: true, deletedAt: null },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Lista e pritjes (API)</h1>
        <p className="page-sub">
          Të dhëna që nuk u caktuan te asnjë menaxher/grup. Nuk shfaqen te
          agjentët derisa t&apos;i caktoni.
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="card p-4 space-y-2">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <div className="font-semibold">
                  {item.integration?.name || "Pa integrim"} ·{" "}
                  {item.externalId || "pa ID"}
                </div>
                <div className="text-sm muted">{item.reason}</div>
                <div className="text-xs muted">
                  {formatDateTime(item.createdAt)}
                </div>
              </div>
            </div>
            <pre className="text-xs overflow-x-auto bg-[var(--surface-2)] p-2 rounded">
              {item.payload.slice(0, 800)}
            </pre>
            <PendingAssignForm
              itemId={item.id}
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
          </div>
        ))}
        {!items.length ? (
          <p className="muted">Nuk ka artikuj në pritje.</p>
        ) : null}
      </div>
    </div>
  );
}
