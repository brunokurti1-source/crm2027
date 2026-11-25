import { requireAuth } from "@/lib/auth";
import Link from "next/link";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function BackupPage() {
  const ctx = await requireAuth();
  const { t } = await getDictionary();
  if (ctx.user.role !== "ADMIN") {
    return <p className="flash-err">{t.backup.adminOnly}</p>;
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="page-title">{t.backup.title}</h1>
        <p className="page-sub">{t.backup.subtitle}</p>
      </div>
      <section className="card p-5 space-y-3 text-sm">
        <p>{t.backup.includes}</p>
        <p className="muted">{t.backup.restoreHint}</p>
        <Link href="/api/admin/backup" className="btn btn-primary inline-flex">
          {t.backup.download}
        </Link>
      </section>
    </div>
  );
}
