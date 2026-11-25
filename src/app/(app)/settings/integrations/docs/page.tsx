import { requireAuth } from "@/lib/auth";
import Link from "next/link";

export default async function IntegrationDocsPage() {
  const ctx = await requireAuth();
  if (ctx.user.role !== "ADMIN" && ctx.user.role !== "MANAGER") {
    return <p className="flash-err">Nuk keni leje.</p>;
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <Link href="/settings/integrations" className="text-sm muted">
          ← Integrimet
        </Link>
        <h1 className="page-title mt-1">Dokumentimi i API &amp; webhook</h1>
        <p className="page-sub">
          Si të lidhni një sistem të ri me CRM-në, me ndarje sipas menaxherit.
        </p>
      </div>

      <section className="card p-4 space-y-2 text-sm">
        <h2 className="font-semibold">1. Krijoni grupin</h2>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Administratori krijon menaxherin dhe agjentët e tij.</li>
          <li>
            Cakton klientët te agjentët; menaxheri sheh vetëm grupin e vet.
          </li>
          <li>
            Në <strong>Integrimet</strong> krijon një integrim dhe e lidh me atë
            menaxher + agjentët e lejuar.
          </li>
        </ol>
      </section>

      <section className="card p-4 space-y-2 text-sm">
        <h2 className="font-semibold">2. Autentikimi</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <code>X-API-Key</code> ose <code>Authorization: Bearer …</code> për
            API-në e CRM-së (<code>/api/v1/clients</code>).
          </li>
          <li>
            Çelësi i integrimit (i shfaqur një herë) me header{" "}
            <code>X-Integration-Key</code> për webhook hyrës.
          </li>
          <li>
            API key e lidhur me menaxher kufizon leximin/shkrimin vetëm te grupi
            i tij.
          </li>
          <li>Kredencialet e partnerit ruhen të enkriptuara; nuk logohen.</li>
        </ul>
      </section>

      <section className="card p-4 space-y-2 text-sm">
        <h2 className="font-semibold">3. Webhook hyrës</h2>
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
  "agentEmail": "agjent1@crm.local"
}`}
        </pre>
        <p>
          Fushat hartohen sipas JSON-it të konfigurimit. Nëse menaxheri/agjenti
          nuk përcaktohet, rekordi shkon te <em>Lista e pritjes</em>.
        </p>
      </section>

      <section className="card p-4 space-y-2 text-sm">
        <h2 className="font-semibold">4. API REST e CRM-së</h2>
        <pre className="text-xs overflow-x-auto bg-[var(--surface-2)] p-3 rounded">
{`GET  /api/v1/clients?q=&status=&limit=50
POST /api/v1/clients
PATCH /api/v1/clients/{id|clientIdNumber}

Headers: X-API-Key: …`}
        </pre>
        <p>
          Dublikatat kthejnë <code>409</code> me listën e përputhjeve; dërgoni{" "}
          <code>acknowledgeDuplicates: true</code> pas kontrollit.
        </p>
      </section>

      <section className="card p-4 space-y-2 text-sm">
        <h2 className="font-semibold">5. Dalje (outbound)</h2>
        <p>
          Kur klienti ndryshohet në CRM, sistemet me drejtim OUTBOUND /
          BIDIRECTIONAL dhe sync aktiv marrin një POST në <code>baseUrl</code>{" "}
          me fushat e hartuara. Dështimet logohen dhe mund të riprovohen.
        </p>
      </section>

      <section className="card p-4 space-y-2 text-sm">
        <h2 className="font-semibold">6. Konflikte &amp; dublikata</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Identiteti i qëndrueshëm: <code>externalId</code> për integrim +{" "}
            <code>clientIdNumber</code>.
          </li>
          <li>
            Politika: CRM_WINS / REMOTE_WINS / NEWEST_WINS.
          </li>
          <li>
            Ndryshimi ndër-grupesh (menaxher tjetër) nuk mbishkruhet — shkon në
            pritje.
          </li>
        </ul>
      </section>
    </div>
  );
}
