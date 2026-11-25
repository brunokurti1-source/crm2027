"use client";

import { useState, useTransition } from "react";
import {
  createCustomFieldAction,
  updateCustomFieldAction,
  deleteCustomFieldAction,
} from "@/app/actions/custom-fields";
import { CUSTOM_FIELD_TYPES } from "@/lib/custom-fields";
import { useT } from "@/components/i18n-provider";

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
  const t = useT();
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  const confirmLabel = t.fieldsPage.confirmDelete.replace(
    "{word}",
    t.common.confirmWord,
  );

  return (
    <div className="space-y-4">
      <form
        className="card p-4 grid gap-3 md:grid-cols-3"
        action={(fd) => {
          setMsg(null);
          setOk(false);
          startTransition(async () => {
            const res = await createCustomFieldAction(fd);
            if (res.error) {
              setMsg(res.error);
              setOk(false);
            } else {
              setMsg(t.fieldsPage.added);
              setOk(true);
            }
          });
        }}
      >
        <div className="field">
          <label>{t.fieldsPage.entity}</label>
          <select name="entityType" defaultValue="CLIENT">
            <option value="CLIENT">{t.fieldsPage.entityClient}</option>
            <option value="USER">{t.fieldsPage.entityUser}</option>
          </select>
        </div>
        <div className="field">
          <label>{t.fieldsPage.fieldLabel}</label>
          <input name="label" required placeholder="Language preference" />
        </div>
        <div className="field">
          <label>{t.fieldsPage.fieldKey}</label>
          <input name="key" placeholder="language_pref" />
        </div>
        <div className="field">
          <label>{t.fieldsPage.dataType}</label>
          <select name="dataType" defaultValue="TEXT">
            {CUSTOM_FIELD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="field md:col-span-2">
          <label>{t.fieldsPage.selectOptions}</label>
          <input name="options" placeholder="option1, option2" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="required" /> {t.fieldsPage.required}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="showInList" /> {t.fieldsPage.inTable}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="showInFilter" /> {t.fieldsPage.inFilters}
        </label>
        <button className="btn btn-primary" disabled={pending}>
          {t.fieldsPage.add}
        </button>
      </form>

      {msg ? (
        <div className={ok ? "flash-ok" : "flash-err"}>{msg}</div>
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
                if (res.error) {
                  setMsg(res.error);
                  setOk(false);
                } else {
                  setMsg(t.fieldsPage.saved);
                  setOk(true);
                }
              });
            }}
          >
            <input type="hidden" name="id" value={f.id} />
            <div className="field">
              <label>{t.common.name}</label>
              <input name="label" defaultValue={f.label} required />
            </div>
            <div className="field">
              <label>{t.common.type}</label>
              <select name="dataType" defaultValue={f.dataType}>
                {CUSTOM_FIELD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t.common.sortOrder}</label>
              <input name="sortOrder" type="number" defaultValue={f.sortOrder} />
            </div>
            <div className="field md:col-span-3">
              <label>{t.common.options}</label>
              <input name="options" defaultValue={f.options} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="required"
                defaultChecked={f.required}
              />{" "}
              {t.fieldsPage.required}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="showInList"
                defaultChecked={f.showInList}
              />{" "}
              {t.fieldsPage.tableShort}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="showInFilter"
                defaultChecked={f.showInFilter}
              />{" "}
              {t.fieldsPage.filtersShort}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked={f.active} />{" "}
              {t.fieldsPage.activeField}
            </label>
            <button className="btn btn-secondary" disabled={pending}>
              {t.common.save}
            </button>
          </form>
          <form
            className="flex gap-2 items-end"
            action={(fd) => {
              startTransition(async () => {
                const res = await deleteCustomFieldAction(fd);
                if (res.error) {
                  setMsg(res.error);
                  setOk(false);
                } else {
                  setMsg(t.fieldsPage.deleted);
                  setOk(true);
                }
              });
            }}
          >
            <input type="hidden" name="id" value={f.id} />
            <div className="field">
              <label>{confirmLabel}</label>
              <input name="confirm" required placeholder={t.common.confirmWord} />
            </div>
            <button className="btn btn-secondary" disabled={pending}>
              {t.fieldsPage.deleteField}
            </button>
          </form>
        </div>
      ))}
    </div>
  );
}
