"use client";

import { useState, useTransition } from "react";
import {
  assignPendingItemAction,
  discardPendingItemAction,
} from "@/app/actions/integrations";
import { useT } from "@/components/i18n-provider";

export function PendingAssignForm({
  itemId,
  managers,
  agents,
}: {
  itemId: string;
  managers: { id: string; label: string }[];
  agents: { id: string; label: string; managerId: string | null }[];
}) {
  const t = useT();
  const [managerId, setManagerId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();
  const filtered = managerId
    ? agents.filter((a) => a.managerId === managerId)
    : agents;

  const discardLabel = t.pendingPage.discardConfirm.replace(
    "{word}",
    t.common.confirmWord,
  );

  return (
    <div className="space-y-2">
      <form
        className="flex flex-wrap gap-2 items-end"
        action={(fd) => {
          setMsg(null);
          setOk(false);
          startTransition(async () => {
            const res = await assignPendingItemAction(fd);
            if (res.error) {
              setMsg(res.error);
              setOk(false);
            } else {
              setMsg(t.pendingPage.assigned);
              setOk(true);
            }
          });
        }}
      >
        <input type="hidden" name="id" value={itemId} />
        <div className="field">
          <label>{t.pendingPage.manager}</label>
          <select
            name="managerId"
            required
            value={managerId}
            onChange={(e) => setManagerId(e.target.value)}
          >
            <option value="">{t.common.none}</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>{t.pendingPage.agent}</label>
          <select name="agentId" defaultValue="">
            <option value="">{t.common.none}</option>
            {filtered.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" disabled={pending}>
          {t.pendingPage.assignToGroup}
        </button>
      </form>
      <form
        className="flex flex-wrap gap-2 items-end"
        action={(fd) => {
          startTransition(async () => {
            const res = await discardPendingItemAction(fd);
            if (res.error) {
              setMsg(res.error);
              setOk(false);
            } else {
              setMsg(t.pendingPage.discarded);
              setOk(true);
            }
          });
        }}
      >
        <input type="hidden" name="id" value={itemId} />
        <div className="field">
          <label>{discardLabel}</label>
          <input name="confirm" placeholder={t.common.confirmWord} required />
        </div>
        <button className="btn btn-secondary" disabled={pending}>
          {t.pendingPage.reject}
        </button>
      </form>
      {msg ? (
        <div className={`text-sm ${ok ? "flash-ok" : "flash-err"}`}>{msg}</div>
      ) : null}
    </div>
  );
}
