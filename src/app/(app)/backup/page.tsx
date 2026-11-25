import { requireAuth } from "@/lib/auth";
import Link from "next/link";

export default async function BackupPage() {
  const ctx = await requireAuth();
  if (ctx.user.role !== "ADMIN") {
    return <p className="flash-err">Vetëm administratori.</p>;
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="page-title">Kopje rezervë</h1>
        <p className="page-sub">
          Shkarkoni një kopje JSON të të dhënave. Ruajeni jashtë sistemit (jo
          publikisht).
        </p>
      </div>
      <section className="card p-5 space-y-3 text-sm">
        <p>
          Kopja rezervë përfshin klientët, përdoruesit (pa fjalëkalime),
          statuset, takimet, detyrat, komentet, historikun e kredive dhe
          auditimin.
        </p>
        <p className="muted">
          Rikthimi: përdorni skedarin e shkarkuar me procedurën e dokumentuar
          në README (seksioni Backup). Mos e ekspozoni skedarin në ueb publik.
        </p>
        <Link href="/api/admin/backup" className="btn btn-primary inline-flex">
          Shkarko kopje rezervë (JSON)
        </Link>
      </section>
    </div>
  );
}
