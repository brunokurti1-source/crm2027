import { requireAuth } from "@/lib/auth";
import { ImportForm } from "./form";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function ImportPage() {
  const ctx = await requireAuth();
  const { t } = await getDictionary();
  if (!ctx.user.permissions.dataUpload && ctx.user.role !== "ADMIN") {
    return <p className="text-[var(--danger)]">{t.importPage.noPermission}</p>;
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t.importPage.title}</h1>
        <p className="muted text-sm">{t.importPage.hint}</p>
      </div>
      <ImportForm />
    </div>
  );
}
