"use client";

import { useMemo, useState, useTransition } from "react";
import { bulkAssignClientsAction } from "@/app/actions/bulk";

export function BulkAssignBar({
  agents,
  managers,
}: {
  agents: { id: string; label: string }[];
  managers: { id: string; label: string }[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [agentLabel, setAgentLabel] = useState("");
  const [managerLabel, setManagerLabel] = useState("");

  const count = selected.length;
  const summary = useMemo(
    () => `${count} klient${count === 1 ? "" : "ë"} të zgjedhur`,
    [count],
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
          <h2 className="font-semibold">Caktim masiv</h2>
          <p className="text-sm muted">
            Zgjidhni klientët në tabelë, shikoni përmbledhjen, pastaj shkruani PO
            për të konfirmuar. {summary}.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setSelected(collectFromDom())}
        >
          Përditëso zgjedhjen
        </button>
      </div>

      {count > 0 ? (
        <div className="text-sm rounded-lg bg-[var(--surface-2)] p-3">
          <p className="font-medium">Përmbledhje</p>
          <p className="muted">
            Do t&apos;u caktohen {count} klientëve
            {agentLabel ? ` agjenti «${agentLabel}»` : ""}
            {managerLabel ? ` dhe menaxherit «${managerLabel}»` : ""}. Nuk bashkohen
            automatikisht; çdo caktim regjistrohet në historik.
          </p>
        </div>
      ) : null}

      <form
        className="grid gap-3 md:grid-cols-4 items-end"
        action={(fd) => {
          const ids = collectFromDom();
          if (!ids.length) {
            setMsg("Zgjidhni të paktën një klient në tabelë.");
            return;
          }
          for (const id of ids) fd.append("clientIds", id);
          setMsg(null);
          startTransition(async () => {
            const res = await bulkAssignClientsAction(fd);
            if (res.error) setMsg(res.error);
            else setMsg(`U caktuan ${res.assigned ?? 0} klientë.`);
            setSelected(ids);
          });
        }}
      >
        <div className="field">
          <label>Agjenti</label>
          <select
            name="agentId"
            defaultValue=""
            onChange={(e) => {
              const opt = e.target.selectedOptions[0];
              setAgentLabel(opt?.value ? opt.text : "");
              setSelected(collectFromDom());
            }}
          >
            <option value="">—</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        {managers.length > 0 && (
          <div className="field">
            <label>Menaxheri</label>
            <select
              name="managerId"
              defaultValue=""
              onChange={(e) => {
                const opt = e.target.selectedOptions[0];
                setManagerLabel(opt?.value ? opt.text : "");
                setSelected(collectFromDom());
              }}
            >
              <option value="">—</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="field">
          <label>Konfirmim (shkruani PO)</label>
          <input name="confirm" placeholder="PO" required />
        </div>
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Duke caktuar…" : "Cakto të zgjedhurit"}
        </button>
      </form>
      {msg ? (
        <div className={msg.startsWith("U caktuan") ? "flash-ok" : "flash-err"}>
          {msg}
        </div>
      ) : null}
    </div>
  );
}
