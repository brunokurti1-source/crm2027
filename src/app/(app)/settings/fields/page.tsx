import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseSelectOptions } from "@/lib/custom-fields";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { CustomFieldsAdmin } from "./fields-admin";

export default async function CustomFieldsPage() {
  const ctx = await requireAuth();
  const { t } = await getDictionary();
  if (ctx.user.role !== "ADMIN") {
    return <p className="flash-err">{t.fieldsPage.adminOnly}</p>;
  }

  const fields = await prisma.customFieldDefinition.findMany({
    orderBy: [{ entityType: "asc" }, { sortOrder: "asc" }],
  });

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="page-title">{t.fieldsPage.title}</h1>
        <p className="page-sub">{t.fieldsPage.subtitle}</p>
      </div>
      <CustomFieldsAdmin
        fields={fields.map((f) => ({
          id: f.id,
          entityType: f.entityType,
          key: f.key,
          label: f.label,
          dataType: f.dataType,
          required: f.required,
          options: parseSelectOptions(f.options).join(", "),
          sortOrder: f.sortOrder,
          active: f.active,
          showInList: f.showInList,
          showInFilter: f.showInFilter,
        }))}
      />
    </div>
  );
}
