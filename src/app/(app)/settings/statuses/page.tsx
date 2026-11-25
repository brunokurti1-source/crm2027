import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createStatusAction,
  toggleStatusAction,
} from "@/app/actions/statuses";

export default async function StatusesPage() {
  const ctx = await requireAuth();
  if (ctx.user.role !== "ADMIN" && !ctx.user.permissions.manageStatuses) {
    return <p className="flash-err">Nuk keni leje.</p>;
  }

  const statuses = await prisma.clientStatus.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="page-title">Statuset e klientit</h1>
        <p className="page-sub">
          Menaxhoni fazat e klientit. Statuset e sistemit nuk fshihen.
        </p>
      </div>

      <form action={createStatusAction} className="card p-4 grid gap-3 md:grid-cols-3">
        <div className="field">
          <label>Kodi</label>
          <input name="code" required placeholder="CUSTOM_STAGE" />
        </div>
        <div className="field">
          <label>Emri (SQ)</label>
          <input name="labelSq" required />
        </div>
        <div className="field">
          <label>Emri (EN)</label>
          <input name="labelEn" />
        </div>
        <button className="btn btn-primary" type="submit">
          Shto status
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="table text-sm">
          <thead>
            <tr>
              <th>Kod</th>
              <th>Emri</th>
              <th>Renditja</th>
              <th>Statusi</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {statuses.map((s) => (
              <tr key={s.id}>
                <td>
                  <code>{s.code}</code>
                </td>
                <td>{s.labelSq}</td>
                <td>{s.sortOrder}</td>
                <td>
                  <span className={`badge ${s.active ? "badge-ok" : "badge-warn"}`}>
                    {s.active ? "Aktiv" : "Joaktiv"}
                  </span>
                </td>
                <td>
                  {!s.isSystem ? (
                    <form action={toggleStatusAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className="btn btn-secondary" type="submit">
                        {s.active ? "Çaktivizo" : "Aktivizo"}
                      </button>
                    </form>
                  ) : (
                    <span className="muted text-xs">sistem</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
