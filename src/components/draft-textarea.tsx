"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  getTextDraftAction,
  saveTextDraftAction,
} from "@/app/actions/drafts";

type Status = "idle" | "saving" | "saved" | "error";

export function DraftTextarea({
  clientId,
  kind,
  name,
  rows = 3,
  label,
  placeholder,
  initialServerValue = "",
  required,
}: {
  clientId: string;
  kind: "COMMENT" | "NOTES";
  name: string;
  rows?: number;
  label: string;
  placeholder?: string;
  /** Published value already on the client (for NOTES) */
  initialServerValue?: string;
  required?: boolean;
}) {
  const [value, setValue] = useState(initialServerValue);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localKey = `crm2027_draft_${kind}_${clientId}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const local = localStorage.getItem(localKey);
        const remote = await getTextDraftAction({ clientId, kind });
        if (cancelled) return;
        if (remote.body) {
          setValue(remote.body);
          localStorage.setItem(localKey, remote.body);
          setStatus("saved");
        } else if (local && local !== initialServerValue) {
          setValue(local);
          setStatus("saved");
        }
      } catch {
        const local = localStorage.getItem(localKey);
        if (local) setValue(local);
      }
    })();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [clientId, kind, localKey, initialServerValue]);

  const persist = useCallback(
    (body: string) => {
      setStatus("saving");
      setError(null);
      try {
        localStorage.setItem(localKey, body);
      } catch {
        setStatus("error");
        setError("Nuk u ruajt drafti lokal.");
        return;
      }
      startTransition(async () => {
        const res = await saveTextDraftAction({ clientId, kind, body });
        if (res.error) {
          setStatus("error");
          setError(res.error);
        } else {
          setStatus("saved");
        }
      });
    },
    [clientId, kind, localKey],
  );

  function onChange(next: string) {
    setValue(next);
    setStatus("idle");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => persist(next), 700);
  }

  const statusLabel =
    status === "saving" || pending
      ? "Drafti po ruhet…"
      : status === "saved"
        ? "Drafti u ruajt"
        : status === "error"
          ? error || "Gabim gjatë ruajtjes së draftit"
          : "Draft i paruajtur";

  return (
    <div className="field">
      <div className="flex items-center justify-between gap-2">
        <label>{label}</label>
        <span
          className={`text-xs ${
            status === "error" ? "text-[var(--danger)]" : "muted"
          }`}
          aria-live="polite"
        >
          {statusLabel}
        </span>
      </div>
      <textarea
        name={name}
        rows={rows}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
