"use client";

import { useState, useTransition } from "react";
import {
  createIntegrationAction,
  updateIntegrationAction,
  deleteIntegrationAction,
  testIntegrationAction,
  runSyncNowAction,
} from "@/app/actions/integrations";
import { CRM_MAPPABLE_FIELDS } from "@/lib/integration-constants";

const defaultMappings = JSON.stringify(
  CRM_MAPPABLE_FIELDS.filter((f) => f !== "externalId").map((f) => ({
    remote: f,
    local: f,
  })),
  null,
  2,
);

export function CreateIntegrationForm({
  managers,
  agents,
}: {
  managers: { id: string; label: string }[];
  agents: { id: string; label: string; managerId: string | null }[];
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [inboundKey, setInboundKey] = useState<string | null>(null);
  const [managerFilter, setManagerFilter] = useState("");
  const [pending, startTransition] = useTransition();

  const filteredAgents = managerFilter
    ? agents.filter((a) => a.managerId === managerFilter)
    : agents;

  return (
    <form
      className="card p-4 space-y-3"
      action={(fd) => {
        setMsg(null);
        setInboundKey(null);
        startTransition(async () => {
          const res = await createIntegrationAction(fd);
          if (res.error) setMsg(res.error);
          else {
            setMsg("Integrimi u krijua.");
            if (res.inboundKey) setInboundKey(res.inboundKey);
          }
        });
      }}
    >
      <h2 className="font-semibold">Shto integrim</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="field">
          <label>Emri *</label>
          <input name="name" required placeholder="Website leads" />
        </div>
        <div className="field">
          <label>URL e API-së / webhook</label>
          <input name="baseUrl" placeholder="https://partner.example/api/leads" />
        </div>
        <div className="field">
          <label>Lloji i lidhjes</label>
          <select name="connectionType" defaultValue="BOTH">
            <option value="WEBHOOK">Webhook</option>
            <option value="REST_POLL">REST (poll)</option>
            <option value="BOTH">Të dyja</option>
          </select>
        </div>
        <div className="field">
          <label>Drejtimi</label>
          <select name="direction" defaultValue="BIDIRECTIONAL">
            <option value="INBOUND">Drejt CRM-së</option>
            <option value="OUTBOUND">Nga CRM-ja</option>
            <option value="BIDIRECTIONAL">Të dy drejtimet</option>
          </select>
        </div>
        <div className="field">
          <label>Autentikimi</label>
          <select name="authType" defaultValue="API_KEY">
            <option value="API_KEY">API key</option>
            <option value="BEARER">Bearer</option>
            <option value="OAUTH2">OAuth2</option>
            <option value="NONE">Asnjë</option>
          </select>
        </div>
        <div className="field">
          <label>Konfliktet</label>
          <select name="conflictPolicy" defaultValue="NEWEST_WINS">
            <option value="NEWEST_WINS">Më i riu fiton</option>
            <option value="CRM_WINS">CRM fiton</option>
            <option value="REMOTE_WINS">Sistemi tjetër fiton</option>
          </select>
        </div>
        <div className="field">
          <label>Menaxheri (grupi)</label>
          <select
            name="managerId"
            defaultValue=""
            onChange={(e) => setManagerFilter(e.target.value)}
          >
            <option value="">— zgjidhni —</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Agjenti i parazgjedhur</label>
          <select name="defaultAgentId" defaultValue="">
            <option value="">—</option>
            {filteredAgents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Intervali (minuta)</label>
          <input name="syncIntervalMinutes" type="number" min={0} placeholder="15" />
        </div>
        <div className="field">
          <label>API key e partnerit (ruhet e enkriptuar)</label>
          <input name="apiKey" type="password" autoComplete="off" />
        </div>
        <div className="field">
          <label>Bearer / OAuth token</label>
          <input name="bearerToken" type="password" autoComplete="off" />
        </div>
        <div className="field md:col-span-3">
          <label>Agjentët e lejuar (grupi)</label>
          <div className="flex flex-wrap gap-3 text-sm">
            {filteredAgents.map((a) => (
              <label key={a.id} className="flex items-center gap-1">
                <input type="checkbox" name="allowedAgentIds" value={a.id} />
                {a.label}
              </label>
            ))}
            {!filteredAgents.length ? (
              <span className="muted">Zgjidhni menaxherin për të parë agjentët.</span>
            ) : null}
          </div>
        </div>
        <div className="field md:col-span-3">
          <label>Hartëzimi i fushave (JSON)</label>
          <textarea
            name="fieldMappings"
            rows={6}
            defaultValue={defaultMappings}
            className="font-mono text-xs"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="syncEnabled" />
        Aktivizo sinkronizimin
      </label>
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Duke ruajtur…" : "Krijo"}
      </button>
      {msg ? <div className={msg.includes("u krijua") ? "flash-ok" : "flash-err"}>{msg}</div> : null}
      {inboundKey ? (
        <div className="flash-ok text-sm">
          Çelësi hyrës (shfaqet vetëm tani): <code>{inboundKey}</code>
          <div className="muted">Ruajeni jashtë — nuk shfaqet më në UI.</div>
        </div>
      ) : null}
    </form>
  );
}

export function IntegrationDetailActions({
  integration,
  managers,
  agents,
  isAdmin,
}: {
  integration: {
    id: string;
    name: string;
    description: string | null;
    managerId: string | null;
    defaultAgentId: string | null;
    allowedAgentIds: string;
    connectionType: string;
    direction: string;
    baseUrl: string | null;
    authType: string;
    fieldMappings: string;
    conflictPolicy: string;
    syncIntervalMinutes: number | null;
    syncEnabled: boolean;
    active: boolean;
    inboundKeyPrefix: string | null;
  };
  managers: { id: string; label: string }[];
  agents: { id: string; label: string; managerId: string | null }[];
  isAdmin: boolean;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [inboundKey, setInboundKey] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const allowed = (() => {
    try {
      return JSON.parse(integration.allowedAgentIds) as string[];
    } catch {
      return [];
    }
  })();

  if (!isAdmin) {
    return (
      <div className="card p-4 text-sm muted">
        Vetëm administratori mund të ndryshojë konfigurimin. Ju shihni
        aktivitetin e grupit tuaj më poshtë.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form
        className="card p-4 space-y-3"
        action={(fd) => {
          setMsg(null);
          setInboundKey(null);
          startTransition(async () => {
            const res = await updateIntegrationAction(fd);
            if (res.error) setMsg(res.error);
            else {
              setMsg("U ruajt.");
              if (res.inboundKey) setInboundKey(res.inboundKey);
            }
          });
        }}
      >
        <input type="hidden" name="id" value={integration.id} />
        <h2 className="font-semibold">Konfigurimi</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="field">
            <label>Emri</label>
            <input name="name" defaultValue={integration.name} required />
          </div>
          <div className="field">
            <label>URL</label>
            <input name="baseUrl" defaultValue={integration.baseUrl || ""} />
          </div>
          <div className="field">
            <label>Lloji</label>
            <select name="connectionType" defaultValue={integration.connectionType}>
              <option value="WEBHOOK">Webhook</option>
              <option value="REST_POLL">REST</option>
              <option value="BOTH">Të dyja</option>
            </select>
          </div>
          <div className="field">
            <label>Drejtimi</label>
            <select name="direction" defaultValue={integration.direction}>
              <option value="INBOUND">Drejt CRM-së</option>
              <option value="OUTBOUND">Nga CRM-ja</option>
              <option value="BIDIRECTIONAL">Të dyja</option>
            </select>
          </div>
          <div className="field">
            <label>Auth</label>
            <select name="authType" defaultValue={integration.authType}>
              <option value="API_KEY">API key</option>
              <option value="BEARER">Bearer</option>
              <option value="OAUTH2">OAuth2</option>
              <option value="NONE">Asnjë</option>
            </select>
          </div>
          <div className="field">
            <label>Konfliktet</label>
            <select name="conflictPolicy" defaultValue={integration.conflictPolicy}>
              <option value="NEWEST_WINS">Më i riu</option>
              <option value="CRM_WINS">CRM</option>
              <option value="REMOTE_WINS">Remote</option>
            </select>
          </div>
          <div className="field">
            <label>Menaxheri</label>
            <select name="managerId" defaultValue={integration.managerId || ""}>
              <option value="">—</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Agjenti default</label>
            <select
              name="defaultAgentId"
              defaultValue={integration.defaultAgentId || ""}
            >
              <option value="">—</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Intervali (min)</label>
            <input
              name="syncIntervalMinutes"
              type="number"
              defaultValue={integration.syncIntervalMinutes ?? ""}
            />
          </div>
          <div className="field">
            <label>API key e re (opsionale)</label>
            <input name="apiKey" type="password" autoComplete="off" />
          </div>
          <div className="field">
            <label>Bearer i ri (opsional)</label>
            <input name="bearerToken" type="password" autoComplete="off" />
          </div>
          <div className="field">
            <label>Çelësi hyrës</label>
            <input
              readOnly
              value={
                integration.inboundKeyPrefix
                  ? `${integration.inboundKeyPrefix}…`
                  : "—"
              }
            />
          </div>
        </div>
        <div className="field">
          <label>Agjentët e lejuar</label>
          <div className="flex flex-wrap gap-3 text-sm">
            {agents.map((a) => (
              <label key={a.id} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  name="allowedAgentIds"
                  value={a.id}
                  defaultChecked={allowed.includes(a.id)}
                />
                {a.label}
              </label>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Hartëzimi</label>
          <textarea
            name="fieldMappings"
            rows={6}
            defaultValue={integration.fieldMappings}
            className="font-mono text-xs"
          />
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="syncEnabled"
              defaultChecked={integration.syncEnabled}
            />
            Sinkronizimi aktiv
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="active" defaultChecked={integration.active} />
            Integrimi aktiv
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="rotateInboundKey" />
            Rirotullo çelësin hyrës
          </label>
        </div>
        <button className="btn btn-primary" disabled={pending}>
          Ruaj
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <form
          action={(fd) => {
            fd.set("id", integration.id);
            startTransition(async () => {
              const res = await testIntegrationAction(fd);
              setMsg(res.error || `Lidhja OK (HTTP ${res.status})`);
            });
          }}
        >
          <button className="btn btn-secondary" disabled={pending}>
            Provo lidhjen
          </button>
        </form>
        <form
          action={(fd) => {
            fd.set("id", integration.id);
            startTransition(async () => {
              const res = await runSyncNowAction(fd);
              setMsg(res.error || "Sinkronizimi përfundoi.");
            });
          }}
        >
          <button className="btn btn-secondary" disabled={pending}>
            Sinkronizo tani
          </button>
        </form>
        <form
          action={(fd) => {
            fd.set("id", integration.id);
            fd.set("retry", "1");
            startTransition(async () => {
              const res = await runSyncNowAction(fd);
              setMsg(res.error || "Riprovimi përfundoi.");
            });
          }}
        >
          <button className="btn btn-secondary" disabled={pending}>
            Riprovo dështimet
          </button>
        </form>
      </div>

      <form
        className="card p-4 space-y-2"
        action={(fd) => {
          startTransition(async () => {
            const res = await deleteIntegrationAction(fd);
            setMsg(res.error || "U fshi.");
          });
        }}
      >
        <h3 className="font-semibold text-[var(--danger)]">Fshi integrimin</h3>
        <input type="hidden" name="id" value={integration.id} />
        <div className="field">
          <label>Konfirmim (PO)</label>
          <input name="confirm" required placeholder="PO" />
        </div>
        <button className="btn btn-secondary" disabled={pending}>
          Fshi
        </button>
      </form>

      {msg ? (
        <div className={msg.includes("OK") || msg.includes("U ") || msg.includes("përfundoi") ? "flash-ok" : "flash-err"}>
          {msg}
        </div>
      ) : null}
      {inboundKey ? (
        <div className="flash-ok text-sm">
          Çelësi i ri hyrës: <code>{inboundKey}</code>
        </div>
      ) : null}
    </div>
  );
}
