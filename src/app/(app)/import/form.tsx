"use client";

import { useRef, useState, useTransition } from "react";
import {
  importClientsAction,
  previewClientsImportAction,
  ImportPreviewResult,
  ImportResult,
} from "@/app/actions/import";

export function ImportForm() {
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [ack, setAck] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const hasDupes = Boolean(
    preview?.rows.some((r) => r.duplicates.length > 0),
  );

  return (
    <div className="space-y-4">
      <form
        ref={formRef}
        className="card p-5 space-y-4"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="field">
          <label>Skedari (.xlsx / .csv)</label>
          <input name="file" type="file" accept=".xlsx,.xls,.csv" required />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={pending}
            onClick={() => {
              const fd = new FormData(formRef.current!);
              setResult(null);
              startTransition(async () => {
                const res = await previewClientsImportAction(fd);
                setPreview(res);
                setAck(false);
              });
            }}
          >
            {pending ? "Duke kontrolluar…" : "Parapamje & dublikata"}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={pending || (hasDupes && !ack)}
            onClick={() => {
              const fd = new FormData(formRef.current!);
              if (ack) fd.set("acknowledgeDuplicates", "1");
              startTransition(async () => {
                const res = await importClientsAction(fd);
                setResult(res);
              });
            }}
          >
            {pending ? "Duke importuar…" : "Importo"}
          </button>
        </div>
        {hasDupes ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
            />
            I kam kontrolluar dublikatat — lejo krijimin edhe kur ka përputhje
          </label>
        ) : null}
      </form>

      {preview ? (
        <div className="card p-4 space-y-3 text-sm">
          <h2 className="font-semibold">Parapamje importi</h2>
          {preview.errors.length > 0 && (
            <ul className="space-y-1 text-[var(--danger)]">
              {preview.errors.slice(0, 20).map((e, i) => (
                <li key={i}>
                  Rreshti {e.row}: {e.message}
                </li>
              ))}
            </ul>
          )}
          <div className="overflow-x-auto">
            <table className="table text-sm">
              <thead>
                <tr>
                  <th>Rreshti</th>
                  <th>ID</th>
                  <th>Emri</th>
                  <th>Veprimi</th>
                  <th>Dublikata</th>
                  <th>Shënim</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 50).map((r) => (
                  <tr key={r.row}>
                    <td>{r.row}</td>
                    <td>{r.clientIdNumber}</td>
                    <td>
                      {r.firstName} {r.lastName}
                    </td>
                    <td>{r.action}</td>
                    <td>
                      {r.duplicates.length
                        ? r.duplicates
                            .map((d) => d.clientIdNumber)
                            .join(", ")
                        : "—"}
                    </td>
                    <td className="muted">{r.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="card p-4 space-y-2 text-sm">
          <p>
            Krijuar: <strong>{result.created}</strong> · Përditësuar:{" "}
            <strong>{result.updated}</strong> · Anashkaluar:{" "}
            <strong>{result.skipped}</strong> · Gabime:{" "}
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
