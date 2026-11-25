"use client";

import { useState, useTransition } from "react";
import {
  createCustomFieldAction,
  updateCustomFieldAction,
  deleteCustomFieldAction,
} from "@/app/actions/custom-fields";
import { CUSTOM_FIELD_TYPES } from "@/lib/custom-fields";

type FieldRow = {
  id: string;
  entityType: string;
  key: string;
  label: string;
  dataType: string;
  required: boolean;
  options: string;
  sortOrder: number;
  active: boolean;
  showInList: boolean;
  showInFilter: boolean;
};

export function CustomFieldsAdmin({ fields }: { fields: FieldRow[] }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <form
        className="card p-4 grid gap-3 md:grid-cols-3"
        action={(fd) => {
          setMsg(null);
          startTransition(async () => {
            const res = await createCustomFieldAction(fd);
            setMsg(res.error || "Fusha u shtua.");
          });
        }}
      >
        <div className="field">
          <label>Entiteti</label>
          <select name="entityType" defaultValue="CLIENT">
            <option value="CLIENT">Klient</option>
            <option value="USER">Përdorues</option>
          </select>
        </div>
        <div className="field">
          <label>Emri i fushës</label>
          <input name="label" required placeholder="Preferenca gjuhe" />
        </div>
        <div className="field">
          <label>Çelësi (opsional)</label>
          <input name="key" placeholder="language_pref" />
        </div>
        <div className="field">
          <label>Lloji</label>
          <select name="dataType" defaultValue="TEXT">
            {CUSTOM_FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="field md:col-span-2">
          <label>Opsione SELECT (ndarë me presje)</label>
          <input name="options" placeholder="option1, option2" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="required" /> E detyrueshme
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="showInList" /> Në tabelë
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="showInFilter" /> Në filtra
        </label>
        <button className="btn btn-primary" disabled={pending}>
          Shto fushë
        </button>
      </form>

      {msg ? (
        <div className={msg.includes("u ") ? "flash-ok" : "flash-err"}>{msg}</div>
      ) : null}

      {fields.map((f) => (
        <div key={f.id} className="card p-4 space-y-3">
          <div className="font-semibold">
            {f.entityType}.{f.key} — {f.label}
          </div>
          <form
            className="grid gap-2 md:grid-cols-3"
            action={(fd) => {
              startTransition(async () => {
                const res = await updateCustomFieldAction(fd);
                setMsg(res.error || "U ruajt.");
              });
            }}
          >
            <input type="hidden" name="id" value={f.id} />
            <div className="field">
              <label>Emri</label>
              <input name="label" defaultValue={f.label} required />
            </div>
            <div className="field">
              <label>Lloji</label>
              <select name="dataType" defaultValue={f.dataType}>
                {CUSTOM_FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Renditja</label>
              <input name="sortOrder" type="number" defaultValue={f.sortOrder} />
            </div>
            <div className="field md:col-span-3">
              <label>Opsione</label>
              <input name="options" defaultValue={f.options} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="required"
                defaultChecked={f.required}
              />{" "}
              Detyrueshme
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="showInList"
                defaultChecked={f.showInList}
              />{" "}
              Tabelë
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="showInFilter"
                defaultChecked={f.showInFilter}
              />{" "}
              Filtra
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked={f.active} />{" "}
              Aktive
            </label>
            <button className="btn btn-secondary" disabled={pending}>
              Ruaj
            </button>
          </form>
          <form
            className="flex gap-2 items-end"
            action={(fd) => {
              startTransition(async () => {
                const res = await deleteCustomFieldAction(fd);
                setMsg(res.error || "U fshi.");
              });
            }}
          >
            <input type="hidden" name="id" value={f.id} />
            <div className="field">
              <label>Konfirmim (PO)</label>
              <input name="confirm" required placeholder="PO" />
            </div>
            <button className="btn btn-secondary" disabled={pending}>
              Fshi fushën
            </button>
          </form>
        </div>
      ))}
    </div>
  );
}
