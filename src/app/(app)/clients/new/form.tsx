"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  checkDuplicatesAction,
  createClientAction,
} from "@/app/actions/clients";
import type { DuplicateMatch } from "@/lib/duplicates";
import { useT } from "@/components/i18n-provider";

export function CreateClientForm({
  agents,
  managers,
  statuses,
  showAssignments,
}: {
  agents: { id: string; label: string }[];
  managers: { id: string; label: string }[];
  statuses: { id: string; label: string }[];
  showAssignments: boolean;
}) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [ack, setAck] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="card p-5 space-y-4"
      action={(fd) => {
        setError(null);
        if (ack) fd.set("acknowledgeDuplicates", "1");
        startTransition(async () => {
          const res = await createClientAction(fd);
          if (res?.duplicates) {
            setDuplicates(res.duplicates);
            setAck(false);
          }
          if (res?.error) setError(res.error);
        });
      }}
    >
      <div className="grid-form">
        <div className="field">
          <label>
            {t.clients.id} {t.clients.required}
          </label>
          <input name="clientIdNumber" required placeholder="CL-2001" />
        </div>
        <div className="field">
          <label>
            {t.common.firstName} {t.clients.required}
          </label>
          <input name="firstName" required />
        </div>
        <div className="field">
          <label>
            {t.common.lastName} {t.clients.required}
          </label>
          <input name="lastName" required />
        </div>
        <div className="field">
          <label>{t.clients.phone}</label>
          <input name="phone" />
        </div>
        <div className="field">
          <label>{t.clients.email}</label>
          <input name="email" type="email" />
        </div>
        <div className="field">
          <label>{t.clients.company}</label>
          <input name="company" />
        </div>
        <div className="field">
          <label>{t.clients.address}</label>
          <input name="address" />
        </div>
        <div className="field">
          <label>{t.clients.country}</label>
          <input name="country" />
        </div>
        <div className="field">
          <label>{t.clients.leadSource}</label>
          <input name="leadSource" />
        </div>
        <div className="field">
          <label>{t.clients.status}</label>
          <select name="status" defaultValue="NEW">
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>{t.clients.creditBalanceLabel}</label>
          <input name="creditBalance" type="number" step="0.01" defaultValue="0" />
        </div>
        {showAssignments && (
          <>
            <div className="field">
              <label>{t.clients.agent}</label>
              <select name="agentId" defaultValue="">
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
                <label>{t.clients.manager}</label>
                <select name="managerId" defaultValue="">
                  <option value="">{t.common.none}</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
      </div>
      <div className="field">
        <label>{t.clients.notes}</label>
        <textarea name="notes" rows={3} />
      </div>

      <button
        type="button"
        className="btn btn-secondary"
        disabled={pending}
        onClick={(e) => {
          const form = e.currentTarget.form;
          if (!form) return;
          const fd = new FormData(form);
          startTransition(async () => {
            const res = await checkDuplicatesAction(fd);
            setDuplicates(res.duplicates || []);
            if (!res.duplicates?.length) {
              setError(null);
            }
          });
        }}
      >
        {t.clients.checkDuplicates}
      </button>

      {duplicates.length > 0 ? (
        <div className="flash-err space-y-2">
          <p className="font-semibold">{t.clients.similarClients}</p>
          <ul className="text-sm space-y-1">
            {duplicates.map((d) => (
              <li key={d.id}>
                <Link href={`/clients/${d.id}`} className="underline">
                  {d.clientIdNumber}
                </Link>{" "}
                — {d.firstName} {d.lastName} ({d.matchedOn.join(", ")})
              </li>
            ))}
          </ul>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
            />
            {t.clients.acknowledgeDuplicates}
          </label>
        </div>
      ) : null}

      {error ? <div className="flash-err">{error}</div> : null}
      <button
        className="btn btn-primary"
        type="submit"
        disabled={pending || (duplicates.length > 0 && !ack)}
      >
        {pending ? t.common.saving : t.clients.createSubmit}
      </button>
    </form>
  );
}
