"use client";

import { useState, useTransition } from "react";
import {
  createStatusAction,
  updateStatusAction,
  toggleStatusAction,
  deleteStatusAction,
} from "@/app/actions/statuses";
import { useT } from "@/components/i18n-provider";

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
  const t = useT();
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  const confirmLabel = t.statusesPage.confirmDelete.replace(
    "{word}",
    t.common.confirmWord,
  );

  return (
    <div className="space-y-4">
      <form
        className="card p-4 grid gap-3 md:grid-cols-4"
        action={(fd) => {
          setMsg(null);
          setOk(false);
          startTransition(async () => {
            const res = await createStatusAction(fd);
            if (res.error) {
              setMsg(res.error);
              setOk(false);
            } else {
              setMsg(t.statusesPage.added);
              setOk(true);
            }
          });
        }}
      >
        <div className="field">
          <label>{t.statusesPage.code}</label>
          <input name="code" required placeholder="NO_ANSWER" />
        </div>
        <div className="field">
          <label>{t.statusesPage.label}</label>
          <input name="labelSq" required placeholder="No answer" />
        </div>
        <div className="field">
          <label>{t.statusesPage.labelEn}</label>
          <input name="labelEn" />
        </div>
        <button className="btn btn-primary self-end" disabled={pending}>
          {t.statusesPage.add}
        </button>
      </form>

      {msg ? (
        <div className={ok ? "flash-ok" : "flash-err"}>{msg}</div>
      ) : null}

      <div className="space-y-3">
        {statuses.map((s) => (
          <div key={s.id} className="card p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <code className="text-sm">{s.code}</code>
                <span className="ml-2 font-semibold">{s.labelSq}</span>
                <span className="muted text-sm ml-2">
                  {t.statusesPage.clientsCount.replace(
                    "{count}",
                    String(s.clientCount),
                  )}
                  {s.isSystem ? ` · ${t.statusesPage.systemTag}` : ""}
                </span>
              </div>
              <span className={`badge ${s.active ? "badge-ok" : "badge-warn"}`}>
                {s.active ? t.common.active : t.common.inactive}
              </span>
            </div>

            <form
              className="grid gap-2 md:grid-cols-5 items-end"
              action={(fd) => {
                startTransition(async () => {
                  const res = await updateStatusAction(fd);
                  if (res.error) {
                    setMsg(res.error);
                    setOk(false);
                  } else {
                    setMsg(t.statusesPage.updated);
                    setOk(true);
                  }
                });
              }}
            >
              <input type="hidden" name="id" value={s.id} />
              <div className="field">
                <label>{t.statusesPage.label}</label>
                <input name="labelSq" defaultValue={s.labelSq} required />
              </div>
              <div className="field">
                <label>{t.statusesPage.labelEn}</label>
                <input name="labelEn" defaultValue={s.labelEn || ""} />
              </div>
              <div className="field">
                <label>{t.common.sortOrder}</label>
                <input
                  name="sortOrder"
                  type="number"
                  defaultValue={s.sortOrder}
                />
              </div>
              <div className="field">
                <label>{t.statusesPage.color}</label>
                <input name="color" defaultValue={s.color || ""} />
              </div>
              <button className="btn btn-secondary" disabled={pending}>
                {t.common.save}
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              {!s.isSystem ? (
                <form
                  action={(fd) => {
                    startTransition(async () => {
                      const res = await toggleStatusAction(fd);
                      if (res.error) {
                        setMsg(res.error);
                        setOk(false);
                      } else {
                        setMsg(t.statusesPage.toggled);
                        setOk(true);
                      }
                    });
                  }}
                >
                  <input type="hidden" name="id" value={s.id} />
                  <button className="btn btn-secondary" disabled={pending}>
                    {s.active ? t.common.deactivate : t.common.activate}
                  </button>
                </form>
              ) : null}

              {!s.isSystem ? (
                <form
                  className="flex flex-wrap gap-2 items-end"
                  action={(fd) => {
                    startTransition(async () => {
                      const res = await deleteStatusAction(fd);
                      if (res.error) {
                        setMsg(res.error);
                        setOk(false);
                      } else if (res.needsReplacement) {
                        setMsg(t.statusesPage.needsReplacement);
                        setOk(false);
                      } else {
                        setMsg(t.statusesPage.deleted);
                        setOk(true);
                      }
                    });
                  }}
                >
                  <input type="hidden" name="id" value={s.id} />
                  {s.clientCount > 0 ? (
                    <div className="field">
                      <label>{t.statusesPage.replaceWith}</label>
                      <select name="replaceWith" required>
                        <option value="">{t.common.none}</option>
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
                    <label>{confirmLabel}</label>
                    <input
                      name="confirm"
                      placeholder={t.common.confirmWord}
                      required
                    />
                  </div>
                  <button className="btn btn-secondary" disabled={pending}>
                    {t.common.delete}
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
