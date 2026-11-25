import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, fullName } from "@/lib/format";

export default async function AuditPage() {
  const ctx = await requireAuth();
  if (ctx.user.role !== "ADMIN") {
    return <p className="text-[var(--danger)]">Vetëm administratori.</p>;
  }

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      actor: { select: { firstName: true, lastName: true, email: true } },
      targetUser: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Audit log</h1>
        <p className="muted text-sm">
          Hyrje, impersonim dhe veprime të rëndësishme.
        </p>
      </div>
      <div className="card overflow-x-auto">
        <table className="table text-sm">
          <thead>
            <tr>
              <th>Koha</th>
              <th>Veprimi</th>
              <th>Aktori</th>
              <th>Objektivi</th>
              <th>Detaje</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{formatDateTime(l.createdAt)}</td>
                <td>
                  <span className="badge">{l.action}</span>
                </td>
                <td>
                  {l.actor
                    ? fullName(l.actor.firstName, l.actor.lastName)
                    : "—"}
                </td>
                <td>
                  {l.targetUser
                    ? fullName(l.targetUser.firstName, l.targetUser.lastName)
                    : "—"}
                </td>
                <td>{l.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
