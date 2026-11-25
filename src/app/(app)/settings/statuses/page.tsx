import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { StatusesAdmin } from "./statuses-admin";

export default async function StatusesPage() {
  const ctx = await requireAuth();
  const { t } = await getDictionary();
  if (ctx.user.role !== "ADMIN" && !ctx.user.permissions.manageStatuses) {
    return <p className="flash-err">{t.statusesPage.noPermission}</p>;
  }

  const statuses = await prisma.clientStatus.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { clients: true } } },
  });

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="page-title">{t.statusesPage.title}</h1>
        <p className="page-sub">{t.statusesPage.subtitle}</p>
      </div>
      <StatusesAdmin
        statuses={statuses.map((s) => ({
          id: s.id,
          code: s.code,
          labelSq: s.labelSq,
          labelEn: s.labelEn,
          color: s.color,
          sortOrder: s.sortOrder,
          active: s.active,
          isSystem: s.isSystem,
          clientCount: s._count.clients,
        }))}
      />
    </div>
  );
}
