"use client";

import { useState, useTransition } from "react";
import {
  assignPendingItemAction,
  discardPendingItemAction,
} from "@/app/actions/integrations";

export function PendingAssignForm({
  itemId,
  managers,
  agents,
}: {
  itemId: string;
  managers: { id: string; label: string }[];
  agents: { id: string; label: string; managerId: string | null }[];
}) {
  const [managerId, setManagerId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const filtered = managerId
    ? agents.filter((a) => a.managerId === managerId)
    : agents;

  return (
    <div className="space-y-2">
      <form
        className="flex flex-wrap gap-2 items-end"
        action={(fd) => {
          setMsg(null);
          startTransition(async () => {
            const res = await assignPendingItemAction(fd);
            setMsg(res.error || "U caktua.");
          });
        }}
      >
        <input type="hidden" name="id" value={itemId} />
        <div className="field">
          <label>Menaxheri</label>
          <select
            name="managerId"
            required
            value={managerId}
            onChange={(e) => setManagerId(e.target.value)}
          >
            <option value="">—</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Agjenti</label>
          <select name="agentId" defaultValue="">
            <option value="">—</option>
            {filtered.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" disabled={pending}>
          Cakto te grupi
        </button>
      </form>
      <form
        className="flex flex-wrap gap-2 items-end"
        action={(fd) => {
          startTransition(async () => {
            const res = await discardPendingItemAction(fd);
            setMsg(res.error || "U hodh poshtë.");
          });
        }}
      >
        <input type="hidden" name="id" value={itemId} />
        <div className="field">
          <label>Konfirmim hedhjeje (PO)</label>
          <input name="confirm" placeholder="PO" required />
        </div>
        <button className="btn btn-secondary" disabled={pending}>
          Hidh poshtë
        </button>
      </form>
      {msg ? <div className="text-sm">{msg}</div> : null}
    </div>
  );
}
