"use client";

import { useState, useTransition } from "react";
import {
  createStatusAction,
  updateStatusAction,
  toggleStatusAction,
  deleteStatusAction,
} from "@/app/actions/statuses";

type StatusRow = {
  id: string;
  code: string;
  labelSq: string;
  labelEn: string | null;
  color: string | null;
  sortOrder: number;
  active: boolean;
  isSystem: boolean;
  clientCount: number;
};

export function StatusesAdmin({ statuses }: { statuses: StatusRow[] }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <form
        className="card p-4 grid gap-3 md:grid-cols-4"
        action={(fd) => {
          setMsg(null);
          startTransition(async () => {
            const res = await createStatusAction(fd);
            setMsg(res.error || "Statusi u shtua.");
          });
        }}
      >
        <div className="field">
          <label>Kodi</label>
          <input name="code" required placeholder="NO_ANSWER" />
        </div>
        <div className="field">
          <label>Etiketa</label>
          <input name="labelSq" required placeholder="No answer" />
        </div>
        <div className="field">
          <label>EN</label>
          <input name="labelEn" />
        </div>
        <button className="btn btn-primary self-end" disabled={pending}>
          Shto status
        </button>
      </form>

      {msg ? (
        <div className={msg.includes("u ") ? "flash-ok" : "flash-err"}>{msg}</div>
      ) : null}

      <div className="space-y-3">
        {statuses.map((s) => (
          <div key={s.id} className="card p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <code className="text-sm">{s.code}</code>
                <span className="ml-2 font-semibold">{s.labelSq}</span>
                <span className="muted text-sm ml-2">
                  {s.clientCount} klientë
                  {s.isSystem ? " · sistem" : ""}
                </span>
              </div>
              <span className={`badge ${s.active ? "badge-ok" : "badge-warn"}`}>
                {s.active ? "Aktiv" : "Joaktiv"}
              </span>
            </div>

            <form
              className="grid gap-2 md:grid-cols-5 items-end"
              action={(fd) => {
                startTransition(async () => {
                  const res = await updateStatusAction(fd);
                  setMsg(res.error || "U përditësua.");
                });
              }}
            >
              <input type="hidden" name="id" value={s.id} />
              <div className="field">
                <label>Etiketa</label>
                <input name="labelSq" defaultValue={s.labelSq} required />
              </div>
              <div className="field">
                <label>EN</label>
                <input name="labelEn" defaultValue={s.labelEn || ""} />
              </div>
              <div className="field">
                <label>Renditja</label>
                <input
                  name="sortOrder"
                  type="number"
                  defaultValue={s.sortOrder}
                />
              </div>
              <div className="field">
                <label>Ngjyra</label>
                <input name="color" defaultValue={s.color || ""} />
              </div>
              <button className="btn btn-secondary" disabled={pending}>
                Ruaj
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              {!s.isSystem ? (
                <form
                  action={(fd) => {
                    startTransition(async () => {
                      const res = await toggleStatusAction(fd);
                      setMsg(res.error || "U ndryshua.");
                    });
                  }}
                >
                  <input type="hidden" name="id" value={s.id} />
                  <button className="btn btn-secondary" disabled={pending}>
                    {s.active ? "Çaktivizo" : "Aktivizo"}
                  </button>
                </form>
              ) : null}

              {!s.isSystem ? (
                <form
                  className="flex flex-wrap gap-2 items-end"
                  action={(fd) => {
                    startTransition(async () => {
                      const res = await deleteStatusAction(fd);
                      setMsg(
                        res.error ||
                          (res.needsReplacement
                            ? "Zgjidhni zëvendësuesin."
                            : "U fshi."),
                      );
                    });
                  }}
                >
                  <input type="hidden" name="id" value={s.id} />
                  {s.clientCount > 0 ? (
                    <div className="field">
                      <label>Zëvendëso me</label>
                      <select name="replaceWith" required>
                        <option value="">—</option>
                        {statuses
                          .filter((x) => x.id !== s.id && x.active)
                          .map((x) => (
                            <option key={x.id} value={x.code}>
                              {x.labelSq}
                            </option>
                          ))}
                      </select>
                    </div>
                  ) : null}
                  <div className="field">
                    <label>Konfirmim (PO)</label>
                    <input name="confirm" placeholder="PO" required />
                  </div>
                  <button className="btn btn-secondary" disabled={pending}>
                    Fshi
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
