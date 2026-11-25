import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, fullName } from "@/lib/format";
import {
  restoreSoftDeleteAction,
  purgeSoftDeleteAction,
} from "@/app/actions/recycle";

export default async function RecycleBinPage() {
  const ctx = await requireAuth();
  if (ctx.user.role !== "ADMIN") {
    return <p className="flash-err">Vetëm administratori.</p>;
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
        <h1 className="page-title">Të fshira</h1>
        <p className="page-sub">
          Riktheni ose fshini përgjithmonë. Fshirja e përhershme është e
          pakthyeshme.
        </p>
      </div>
      <div className="card overflow-x-auto">
        <table className="table text-sm">
          <thead>
            <tr>
              <th>Lloji</th>
              <th>Emri</th>
              <th>Fshirë nga</th>
              <th>Kur</th>
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
                    : "—"}
                </td>
                <td>{formatDateTime(item.deletedAt)}</td>
                <td>
                  <div className="flex gap-1">
                    <form action={restoreSoftDeleteAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <button className="btn btn-secondary" type="submit">
                        Rikthe
                      </button>
                    </form>
                    <form action={purgeSoftDeleteAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="confirm" value="FSHIJ" />
                      <button className="btn btn-danger" type="submit">
                        Fshi përgjithmonë
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length ? (
              <tr>
                <td colSpan={5} className="muted">
                  Kuti e zbrazët
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
