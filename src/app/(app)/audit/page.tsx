import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, fullName } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function AuditPage() {
  const ctx = await requireAuth();
  const { locale, t } = await getDictionary();
  if (ctx.user.role !== "ADMIN") {
    return <p className="text-[var(--danger)]">{t.audit.adminOnly}</p>;
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
        <h1 className="text-2xl font-bold">{t.audit.title}</h1>
        <p className="muted text-sm">{t.audit.subtitle}</p>
      </div>
      <div className="card overflow-x-auto">
        <table className="table text-sm">
          <thead>
            <tr>
              <th>{t.audit.time}</th>
              <th>{t.audit.action}</th>
              <th>{t.audit.actor}</th>
              <th>{t.audit.target}</th>
              <th>{t.audit.details}</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{formatDateTime(l.createdAt, locale)}</td>
                <td>
                  <span className="badge">{l.action}</span>
                </td>
                <td>
                  {l.actor
                    ? fullName(l.actor.firstName, l.actor.lastName)
                    : t.common.none}
                </td>
                <td>
                  {l.targetUser
                    ? fullName(l.targetUser.firstName, l.targetUser.lastName)
                    : t.common.none}
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
