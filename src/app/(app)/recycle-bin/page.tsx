import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, fullName } from "@/lib/format";
import {
  restoreSoftDeleteAction,
  purgeSoftDeleteAction,
} from "@/app/actions/recycle";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function RecycleBinPage() {
  const ctx = await requireAuth();
  const { locale, t } = await getDictionary();
  if (ctx.user.role !== "ADMIN") {
    return <p className="flash-err">{t.recycle.adminOnly}</p>;
  }

  const items = await prisma.softDelete.findMany({
    where: { purgedAt: null, restoredAt: null },
    orderBy: { deletedAt: "desc" },
    take: 100,
    include: {
      deletedBy: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">{t.recycle.title}</h1>
        <p className="page-sub">{t.recycle.subtitle}</p>
      </div>
      <div className="card overflow-x-auto">
        <table className="table text-sm">
          <thead>
            <tr>
              <th>{t.recycle.type}</th>
              <th>{t.recycle.name}</th>
              <th>{t.recycle.deletedBy}</th>
              <th>{t.recycle.when}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <span className="badge">{item.entityType}</span>
                </td>
                <td>{item.label}</td>
                <td>
                  {item.deletedBy
                    ? fullName(
                        item.deletedBy.firstName,
                        item.deletedBy.lastName,
                      )
                    : t.common.none}
                </td>
                <td>{formatDateTime(item.deletedAt, locale)}</td>
                <td>
                  <div className="flex gap-1">
                    <form action={restoreSoftDeleteAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <button className="btn btn-secondary" type="submit">
                        {t.recycle.restore}
                      </button>
                    </form>
                    <form action={purgeSoftDeleteAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <input
                        type="hidden"
                        name="confirm"
                        value={t.recycle.confirmValue}
                      />
                      <button className="btn btn-danger" type="submit">
                        {t.recycle.purge}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length ? (
              <tr>
                <td colSpan={5} className="muted">
                  {t.recycle.empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
