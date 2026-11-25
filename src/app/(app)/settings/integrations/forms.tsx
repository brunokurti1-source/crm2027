"use client";

import { useState, useTransition } from "react";
import {
  createIntegrationAction,
  updateIntegrationAction,
  deleteIntegrationAction,
  testIntegrationAction,
  runSyncNowAction,
  runDueSyncsAction,
} from "@/app/actions/integrations";
import { CRM_MAPPABLE_FIELDS } from "@/lib/integration-constants";
import { useT } from "@/components/i18n-provider";

const defaultMappings = JSON.stringify(
  CRM_MAPPABLE_FIELDS.filter((f) => f !== "externalId").map((f) => ({
    remote: f,
    local: f,
  })),
  null,
  2,
);

export function RunDueSyncsButton() {
  const t = useT();
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="btn btn-secondary"
        disabled={pending}
        onClick={() => {
          setMsg(null);
          setOk(false);
          startTransition(async () => {
            const res = await runDueSyncsAction();
            if (res.error) {
              setMsg(res.error);
              setOk(false);
            } else {
              setMsg(
                t.integrationsPage.dueSyncResult
                  .replace("{checked}", String(res.checked ?? 0))
                  .replace("{ran}", String(res.ran ?? 0)),
              );
              setOk(true);
            }
          });
        }}
      >
        {pending ? t.integrationsPage.syncing : t.common.runDueSyncs}
      </button>
      {msg ? (
        <span className={`text-sm ${ok ? "flash-ok" : "muted"}`}>{msg}</span>
      ) : null}
    </div>
  );
}

export function CreateIntegrationForm({
  managers,
  agents,
}: {
  managers: { id: string; label: string }[];
  agents: { id: string; label: string; managerId: string | null }[];
}) {
  const t = useT();
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
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
        setOk(false);
        setInboundKey(null);
        startTransition(async () => {
          const res = await createIntegrationAction(fd);
          if (res.error) {
            setMsg(res.error);
            setOk(false);
          } else {
            setMsg(t.integrationsPage.created);
            setOk(true);
            if (res.inboundKey) setInboundKey(res.inboundKey);
          }
        });
      }}
    >
      <h2 className="font-semibold">{t.common.addIntegration}</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="field">
          <label>
            {t.common.name} {t.common.required}
          </label>
          <input name="name" required placeholder="Website leads" />
        </div>
        <div className="field">
          <label>{t.common.url}</label>
          <input name="baseUrl" placeholder="https://partner.example/api/leads" />
        </div>
        <div className="field">
          <label>{t.common.connection}</label>
          <select name="connectionType" defaultValue="BOTH">
            <option value="WEBHOOK">{t.integrationsPage.webhook}</option>
            <option value="REST_POLL">{t.integrationsPage.restPoll}</option>
            <option value="BOTH">{t.common.both}</option>
          </select>
        </div>
        <div className="field">
          <label>{t.common.direction}</label>
          <select name="direction" defaultValue="BIDIRECTIONAL">
            <option value="INBOUND">{t.common.inbound}</option>
            <option value="OUTBOUND">{t.common.outbound}</option>
            <option value="BIDIRECTIONAL">{t.common.bidirectional}</option>
          </select>
        </div>
        <div className="field">
          <label>{t.common.auth}</label>
          <select name="authType" defaultValue="API_KEY">
            <option value="API_KEY">{t.common.apiKey}</option>
            <option value="BEARER">{t.common.bearer}</option>
            <option value="OAUTH2">{t.integrationsPage.oauth2}</option>
            <option value="NONE">{t.common.noneAuth}</option>
          </select>
        </div>
        <div className="field">
          <label>{t.common.conflictPolicy}</label>
          <select name="conflictPolicy" defaultValue="NEWEST_WINS">
            <option value="NEWEST_WINS">{t.common.newestWins}</option>
            <option value="CRM_WINS">{t.common.crmWins}</option>
            <option value="REMOTE_WINS">{t.common.remoteWins}</option>
          </select>
        </div>
        <div className="field">
          <label>{t.common.managerGroup}</label>
          <select
            name="managerId"
            defaultValue=""
            onChange={(e) => setManagerFilter(e.target.value)}
          >
            <option value="">{t.common.choose}</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>{t.common.defaultAgent}</label>
          <select name="defaultAgentId" defaultValue="">
            <option value="">{t.common.none}</option>
            {filteredAgents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>{t.common.intervalMinutes}</label>
          <input name="syncIntervalMinutes" type="number" min={0} placeholder="15" />
        </div>
        <div className="field">
          <label>{t.integrationsPage.partnerApiKey}</label>
          <input name="apiKey" type="password" autoComplete="off" />
        </div>
        <div className="field">
          <label>{t.common.bearer}</label>
          <input name="bearerToken" type="password" autoComplete="off" />
        </div>
        <div className="field">
          <label>{t.integrationsPage.oauthAccessToken}</label>
          <input name="oauthAccessToken" type="password" autoComplete="off" />
        </div>
        <div className="field">
          <label>{t.integrationsPage.oauthRefreshToken}</label>
          <input name="oauthRefreshToken" type="password" autoComplete="off" />
        </div>
        <div className="field">
          <label>{t.common.oauthClientId}</label>
          <input name="oauthClientId" autoComplete="off" />
        </div>
        <div className="field">
          <label>{t.common.oauthClientSecret}</label>
          <input name="oauthClientSecret" type="password" autoComplete="off" />
        </div>
        <div className="field md:col-span-3">
          <label>{t.common.allowedAgents}</label>
          <div className="flex flex-wrap gap-3 text-sm">
            {filteredAgents.map((a) => (
              <label key={a.id} className="flex items-center gap-1">
                <input type="checkbox" name="allowedAgentIds" value={a.id} />
                {a.label}
              </label>
            ))}
            {!filteredAgents.length ? (
              <span className="muted">{t.common.pickManagerForAgents}</span>
            ) : null}
          </div>
        </div>
        <div className="field md:col-span-3">
          <label>{t.common.fieldMapping}</label>
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
        {t.common.syncEnabled}
      </label>
      <button className="btn btn-primary" disabled={pending}>
        {pending ? t.common.saving : t.common.create}
      </button>
      {msg ? <div className={ok ? "flash-ok" : "flash-err"}>{msg}</div> : null}
      {inboundKey ? (
        <div className="flash-ok text-sm">
          {t.common.inboundKeyOnce} <code>{inboundKey}</code>
          <div className="muted">{t.common.saveKeyOutside}</div>
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
  const t = useT();
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
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
        {t.integrationsPage.adminOnlyEdit}
      </div>
    );
  }

  const confirmLabel = `${t.common.confirm} (${t.common.confirmWord})`;

  return (
    <div className="space-y-4">
      <form
        className="card p-4 space-y-3"
        action={(fd) => {
          setMsg(null);
          setOk(false);
          setInboundKey(null);
          startTransition(async () => {
            const res = await updateIntegrationAction(fd);
            if (res.error) {
              setMsg(res.error);
              setOk(false);
            } else {
              setMsg(t.common.saved);
              setOk(true);
              if (res.inboundKey) setInboundKey(res.inboundKey);
            }
          });
        }}
      >
        <input type="hidden" name="id" value={integration.id} />
        <h2 className="font-semibold">{t.integrationsPage.configuration}</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="field">
            <label>{t.common.name}</label>
            <input name="name" defaultValue={integration.name} required />
          </div>
          <div className="field">
            <label>{t.common.url}</label>
            <input name="baseUrl" defaultValue={integration.baseUrl || ""} />
          </div>
          <div className="field">
            <label>{t.common.type}</label>
            <select name="connectionType" defaultValue={integration.connectionType}>
              <option value="WEBHOOK">{t.integrationsPage.webhook}</option>
              <option value="REST_POLL">REST</option>
              <option value="BOTH">{t.common.both}</option>
            </select>
          </div>
          <div className="field">
            <label>{t.common.direction}</label>
            <select name="direction" defaultValue={integration.direction}>
              <option value="INBOUND">{t.common.inbound}</option>
              <option value="OUTBOUND">{t.common.outbound}</option>
              <option value="BIDIRECTIONAL">{t.common.both}</option>
            </select>
          </div>
          <div className="field">
            <label>{t.common.auth}</label>
            <select name="authType" defaultValue={integration.authType}>
              <option value="API_KEY">{t.common.apiKey}</option>
              <option value="BEARER">{t.common.bearer}</option>
              <option value="OAUTH2">{t.integrationsPage.oauth2}</option>
              <option value="NONE">{t.common.noneAuth}</option>
            </select>
          </div>
          <div className="field">
            <label>{t.common.conflictPolicy}</label>
            <select name="conflictPolicy" defaultValue={integration.conflictPolicy}>
              <option value="NEWEST_WINS">{t.common.newestWins}</option>
              <option value="CRM_WINS">{t.common.crmWins}</option>
              <option value="REMOTE_WINS">{t.common.remoteWins}</option>
            </select>
          </div>
          <div className="field">
            <label>{t.common.manager}</label>
            <select name="managerId" defaultValue={integration.managerId || ""}>
              <option value="">{t.common.none}</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>{t.common.defaultAgent}</label>
            <select
              name="defaultAgentId"
              defaultValue={integration.defaultAgentId || ""}
            >
              <option value="">{t.common.none}</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>{t.common.intervalMinutes}</label>
            <input
              name="syncIntervalMinutes"
              type="number"
              defaultValue={integration.syncIntervalMinutes ?? ""}
            />
          </div>
          <div className="field">
            <label>{t.integrationsPage.newApiKeyOptional}</label>
            <input name="apiKey" type="password" autoComplete="off" />
          </div>
          <div className="field">
            <label>{t.integrationsPage.newBearerOptional}</label>
            <input name="bearerToken" type="password" autoComplete="off" />
          </div>
          <div className="field">
            <label>{t.integrationsPage.oauthAccessOptional}</label>
            <input name="oauthAccessToken" type="password" autoComplete="off" />
          </div>
          <div className="field">
            <label>{t.integrationsPage.oauthRefreshOptional}</label>
            <input name="oauthRefreshToken" type="password" autoComplete="off" />
          </div>
          <div className="field">
            <label>{t.common.oauthClientId}</label>
            <input name="oauthClientId" autoComplete="off" />
          </div>
          <div className="field">
            <label>{t.common.oauthClientSecret}</label>
            <input name="oauthClientSecret" type="password" autoComplete="off" />
          </div>
          <div className="field">
            <label>{t.common.inboundKey}</label>
            <input
              readOnly
              value={
                integration.inboundKeyPrefix
                  ? `${integration.inboundKeyPrefix}…`
                  : t.common.none
              }
            />
          </div>
        </div>
        <div className="field">
          <label>{t.common.allowedAgents}</label>
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
          <label>{t.integrationsPage.mapping}</label>
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
            {t.integrationsPage.syncActive}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="active" defaultChecked={integration.active} />
            {t.common.integrationActive}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="rotateInboundKey" />
            {t.common.rotateInboundKey}
          </label>
        </div>
        <button className="btn btn-primary" disabled={pending}>
          {t.common.save}
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <form
          action={(fd) => {
            fd.set("id", integration.id);
            startTransition(async () => {
              const res = await testIntegrationAction(fd);
              if (res.error) {
                setMsg(res.error);
                setOk(false);
              } else {
                setMsg(
                  t.integrationsPage.connectionOkHttp.replace(
                    "{status}",
                    String(res.status ?? ""),
                  ),
                );
                setOk(true);
              }
            });
          }}
        >
          <button className="btn btn-secondary" disabled={pending}>
            {t.common.testConnection}
          </button>
        </form>
        <form
          action={(fd) => {
            fd.set("id", integration.id);
            startTransition(async () => {
              const res = await runSyncNowAction(fd);
              if (res.error) {
                setMsg(res.error);
                setOk(false);
              } else {
                setMsg(t.common.syncDone);
                setOk(true);
              }
            });
          }}
        >
          <button className="btn btn-secondary" disabled={pending}>
            {t.common.sync}
          </button>
        </form>
        <form
          action={(fd) => {
            fd.set("id", integration.id);
            fd.set("retry", "1");
            startTransition(async () => {
              const res = await runSyncNowAction(fd);
              if (res.error) {
                setMsg(res.error);
                setOk(false);
              } else {
                setMsg(t.common.retryDone);
                setOk(true);
              }
            });
          }}
        >
          <button className="btn btn-secondary" disabled={pending}>
            {t.common.retryFailures}
          </button>
        </form>
      </div>

      <form
        className="card p-4 space-y-2"
        action={(fd) => {
          startTransition(async () => {
            const res = await deleteIntegrationAction(fd);
            if (res.error) {
              setMsg(res.error);
              setOk(false);
            } else {
              setMsg(t.common.deletedOk);
              setOk(true);
            }
          });
        }}
      >
        <h3 className="font-semibold text-[var(--danger)]">
          {t.common.deleteIntegration}
        </h3>
        <input type="hidden" name="id" value={integration.id} />
        <div className="field">
          <label>{confirmLabel}</label>
          <input name="confirm" required placeholder={t.common.confirmWord} />
        </div>
        <button className="btn btn-secondary" disabled={pending}>
          {t.common.delete}
        </button>
      </form>

      {msg ? (
        <div className={ok ? "flash-ok" : "flash-err"}>{msg}</div>
      ) : null}
      {inboundKey ? (
        <div className="flash-ok text-sm">
          {t.common.newInboundKey} <code>{inboundKey}</code>
        </div>
      ) : null}
    </div>
  );
}
