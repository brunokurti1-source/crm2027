import { requireAuth } from "@/lib/auth";
import Link from "next/link";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function IntegrationDocsPage() {
  const ctx = await requireAuth();
  const { t } = await getDictionary();
  if (ctx.user.role !== "ADMIN" && ctx.user.role !== "MANAGER") {
    return <p className="flash-err">{t.integrationsPage.noPermission}</p>;
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <Link href="/settings/integrations" className="text-sm muted">
          {t.docsPage.back}
        </Link>
        <h1 className="page-title mt-1">{t.docsPage.title}</h1>
        <p className="page-sub">{t.docsPage.subtitle}</p>
      </div>

      <section className="card p-4 space-y-2 text-sm">
        <h2 className="font-semibold">{t.docsPage.s1}</h2>
        <ol className="list-decimal pl-5 space-y-1">
          <li>{t.docsPage.s1a}</li>
          <li>{t.docsPage.s1b}</li>
          <li>{t.docsPage.s1c}</li>
        </ol>
      </section>

      <section className="card p-4 space-y-2 text-sm">
        <h2 className="font-semibold">{t.docsPage.s2}</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t.docsPage.s2a}</li>
          <li>{t.docsPage.s2b}</li>
          <li>{t.docsPage.s2c}</li>
          <li>{t.docsPage.s2d}</li>
        </ul>
      </section>

      <section className="card p-4 space-y-2 text-sm">
        <h2 className="font-semibold">{t.docsPage.s3}</h2>
        <pre className="text-xs overflow-x-auto bg-[var(--surface-2)] p-3 rounded">
{`POST /api/integrations/{integrationId}/inbound
X-Integration-Key: int_…
Content-Type: application/json

{
  "id": "ext-100",
  "firstName": "Ana",
  "lastName": "Krasniqi",
  "email": "ana@example.com",
  "phone": "+355…",
  "status": "HIGH_POTENTIAL",
  "agentEmail": "agent1@crm.local"
}`}
        </pre>
        <p>{t.docsPage.s3body}</p>
      </section>

      <section className="card p-4 space-y-2 text-sm">
        <h2 className="font-semibold">{t.docsPage.s4}</h2>
        <pre className="text-xs overflow-x-auto bg-[var(--surface-2)] p-3 rounded">
{`GET  /api/v1/clients?q=&status=&limit=50
POST /api/v1/clients
PATCH /api/v1/clients/{id|clientIdNumber}

Headers: X-API-Key: …`}
        </pre>
        <p>{t.docsPage.s4body}</p>
      </section>

      <section className="card p-4 space-y-2 text-sm">
        <h2 className="font-semibold">{t.docsPage.s5}</h2>
        <p>{t.docsPage.s5body}</p>
      </section>

      <section className="card p-4 space-y-2 text-sm">
        <h2 className="font-semibold">{t.docsPage.s6}</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t.docsPage.s6a}</li>
          <li>{t.docsPage.s6b}</li>
          <li>{t.docsPage.s6c}</li>
        </ul>
      </section>

      <section className="card p-4 space-y-2 text-sm">
        <h2 className="font-semibold">{t.docsPage.s7}</h2>
        <p>{t.docsPage.s7body}</p>
        <pre className="text-xs overflow-x-auto bg-[var(--surface-2)] p-3 rounded">
{`POST /api/integrations/tick
X-Cron-Secret: $INTEGRATION_CRON_SECRET

# or authenticated admin session (cookie)`}
        </pre>
        <p>{t.docsPage.s7extra}</p>
      </section>

      <section className="card p-4 space-y-2 text-sm">
        <h2 className="font-semibold">{t.docsPage.s8}</h2>
        <ol className="list-decimal pl-5 space-y-1">
          <li>{t.docsPage.s8a}</li>
          <li>{t.docsPage.s8b}</li>
          <li>{t.docsPage.s8c}</li>
          <li>{t.docsPage.s8d}</li>
          <li>{t.docsPage.s8e}</li>
        </ol>
      </section>
    </div>
  );
}
