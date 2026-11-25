"use client";

import { useState, useTransition } from "react";
import { createClientAction } from "@/app/actions/clients";

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
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="card p-5 space-y-4"
      action={(fd) => {
        setError(null);
        startTransition(async () => {
          const res = await createClientAction(fd);
          if (res?.error) setError(res.error);
        });
      }}
    >
      <div className="grid-form">
        <div className="field">
          <label>ID klienti *</label>
          <input name="clientIdNumber" required placeholder="CL-2001" />
        </div>
        <div className="field">
          <label>Emri *</label>
          <input name="firstName" required />
        </div>
        <div className="field">
          <label>Mbiemri *</label>
          <input name="lastName" required />
        </div>
        <div className="field">
          <label>Telefon</label>
          <input name="phone" />
        </div>
        <div className="field">
          <label>Email</label>
          <input name="email" type="email" />
        </div>
        <div className="field">
          <label>Kompania</label>
          <input name="company" />
        </div>
        <div className="field">
          <label>Adresa</label>
          <input name="address" />
        </div>
        <div className="field">
          <label>Shteti</label>
          <input name="country" />
        </div>
        <div className="field">
          <label>Burimi</label>
          <input name="leadSource" />
        </div>
        <div className="field">
          <label>Statusi</label>
          <select name="status" defaultValue="NEW">
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Bilanci kredie</label>
          <input name="creditBalance" type="number" step="0.01" defaultValue="0" />
        </div>
        {showAssignments && (
          <>
            <div className="field">
              <label>Agjenti</label>
              <select name="agentId" defaultValue="">
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
                <select name="managerId" defaultValue="">
                  <option value="">—</option>
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
        <label>Shënime</label>
        <textarea name="notes" rows={3} />
      </div>
      {error ? (
        <div className="text-sm text-[var(--danger)] bg-[var(--danger-bg)] rounded-lg px-3 py-2">
          {error}
        </div>
      ) : null}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Duke ruajtur…" : "Krijo klientin"}
      </button>
    </form>
  );
}
