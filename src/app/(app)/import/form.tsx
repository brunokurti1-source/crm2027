"use client";

import { useRef, useState, useTransition } from "react";
import {
  importClientsAction,
  previewClientsImportAction,
  ImportPreviewResult,
  ImportResult,
} from "@/app/actions/import";
import { useT } from "@/components/i18n-provider";

export function ImportForm() {
  const t = useT();
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
          <label>{t.importPage.file}</label>
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
            {pending ? t.importPage.checking : t.importPage.preview}
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
            {pending ? t.importPage.importing : t.importPage.submit}
          </button>
        </div>
        {hasDupes ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
            />
            {t.importPage.ackDuplicates}
          </label>
        ) : null}
      </form>

      {preview ? (
        <div className="card p-4 space-y-3 text-sm">
          <h2 className="font-semibold">{t.importPage.previewTitle}</h2>
          {preview.errors.length > 0 && (
            <ul className="space-y-1 text-[var(--danger)]">
              {preview.errors.slice(0, 20).map((e, i) => (
                <li key={i}>
                  {t.importPage.row} {e.row}: {e.message}
                </li>
              ))}
            </ul>
          )}
          <div className="overflow-x-auto">
            <table className="table text-sm">
              <thead>
                <tr>
                  <th>{t.importPage.row}</th>
                  <th>{t.importPage.id}</th>
                  <th>{t.importPage.name}</th>
                  <th>{t.importPage.action}</th>
                  <th>{t.importPage.duplicates}</th>
                  <th>{t.importPage.note}</th>
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
                        : t.common.none}
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
            {t.importPage.created}: <strong>{result.created}</strong> ·{" "}
            {t.importPage.updated}: <strong>{result.updated}</strong> ·{" "}
            {t.importPage.skipped}: <strong>{result.skipped}</strong> ·{" "}
            {t.importPage.errors}: <strong>{result.errors.length}</strong>
          </p>
          {result.errors.length > 0 && (
            <ul className="space-y-1 text-[var(--danger)]">
              {result.errors.slice(0, 30).map((e, i) => (
                <li key={i}>
                  {t.importPage.row} {e.row}: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
