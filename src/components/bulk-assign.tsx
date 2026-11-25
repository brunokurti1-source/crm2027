"use client";

import { useMemo, useState, useTransition } from "react";
import { bulkAssignClientsAction } from "@/app/actions/bulk";
import { useT } from "@/components/i18n-provider";

export function BulkAssignBar({
  agents,
  managers,
}: {
  agents: { id: string; label: string }[];
  managers: { id: string; label: string }[];
}) {
  const t = useT();
  const [selected, setSelected] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();
  const [agentLabel, setAgentLabel] = useState("");
  const [managerLabel, setManagerLabel] = useState("");

  const count = selected.length;
  const summary = useMemo(
    () =>
      (count === 1 ? t.bulk.selectedOne : t.bulk.selectedMany).replace(
        "{count}",
        String(count),
      ),
    [count, t.bulk.selectedMany, t.bulk.selectedOne],
  );

  function collectFromDom(): string[] {
    const boxes = document.querySelectorAll<HTMLInputElement>(
      'input[name="clientIds"]:checked',
    );
    return Array.from(boxes).map((b) => b.value);
  }

  if (!agents.length && !managers.length) return null;

  return (
    <div className="card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">{t.bulk.title}</h2>
          <p className="text-sm muted">
            {t.bulk.hint} {summary}.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setSelected(collectFromDom())}
        >
          {t.bulk.refreshSelection}
        </button>
      </div>

      {count > 0 ? (
        <div className="text-sm rounded-lg bg-[var(--surface-2)] p-3">
          <p className="font-medium">{t.bulk.summary}</p>
          <p className="muted">
            {t.bulk.willAssign.replace("{count}", String(count))}
            {agentLabel
              ? t.bulk.toAgent.replace("{agent}", agentLabel)
              : ""}
            {managerLabel
              ? t.bulk.toManager.replace("{manager}", managerLabel)
              : ""}
            {t.bulk.noAutoMerge}
          </p>
        </div>
      ) : null}

      <form
        className="grid gap-3 md:grid-cols-4 items-end"
        action={(fd) => {
          const ids = collectFromDom();
          if (!ids.length) {
            setOk(false);
            setMsg(t.bulk.selectAtLeastOne);
            return;
          }
          for (const id of ids) fd.append("clientIds", id);
          setMsg(null);
          setOk(false);
          startTransition(async () => {
            const res = await bulkAssignClientsAction(fd);
            if (res.error) {
              setOk(false);
              setMsg(res.error);
            } else {
              setOk(true);
              setMsg(
                t.bulk.assignedCount.replace(
                  "{count}",
                  String(res.assigned ?? 0),
                ),
              );
            }
            setSelected(ids);
          });
        }}
      >
        <div className="field">
          <label>{t.bulk.agent}</label>
          <select
            name="agentId"
            defaultValue=""
            onChange={(e) => {
              const opt = e.target.selectedOptions[0];
              setAgentLabel(opt?.value ? opt.text : "");
              setSelected(collectFromDom());
            }}
          >
            <option value="">{t.common.none}</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        {managers.length > 0 && (
          <div className="field">
            <label>{t.bulk.manager}</label>
            <select
              name="managerId"
              defaultValue=""
              onChange={(e) => {
                const opt = e.target.selectedOptions[0];
                setManagerLabel(opt?.value ? opt.text : "");
                setSelected(collectFromDom());
              }}
            >
              <option value="">{t.common.none}</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="field">
          <label>{t.bulk.confirmPo}</label>
          <input name="confirm" placeholder={t.common.confirmWord} required />
        </div>
        <button className="btn btn-primary" disabled={pending}>
          {pending ? t.bulk.assigning : t.bulk.assignSelected}
        </button>
      </form>
      {msg ? (
        <div className={ok ? "flash-ok" : "flash-err"}>
          {msg}
        </div>
      ) : null}
    </div>
  );
}
