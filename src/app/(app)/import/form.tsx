"use client";

import { useState, useTransition } from "react";
import { importClientsAction, ImportResult } from "@/app/actions/import";

export function ImportForm() {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <form
        className="card p-5 space-y-4"
        action={(fd) => {
          startTransition(async () => {
            const res = await importClientsAction(fd);
            setResult(res);
          });
        }}
      >
        <div className="field">
          <label>Skedari (.xlsx / .csv)</label>
          <input name="file" type="file" accept=".xlsx,.xls,.csv" required />
        </div>
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Duke importuar…" : "Importo"}
        </button>
      </form>

      {result ? (
        <div className="card p-4 space-y-2 text-sm">
          <p>
            Krijuar: <strong>{result.created}</strong> · Përditësuar:{" "}
            <strong>{result.updated}</strong> · Gabime:{" "}
            <strong>{result.errors.length}</strong>
          </p>
          {result.errors.length > 0 && (
            <ul className="space-y-1 text-[var(--danger)]">
              {result.errors.slice(0, 30).map((e, i) => (
                <li key={i}>
                  Rreshti {e.row}: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
