import { parseSelectOptions, type CustomFieldDef } from "@/lib/custom-fields";

export function CustomFieldsInput({
  fields,
  values,
}: {
  fields: CustomFieldDef[];
  values?: Record<string, string>;
}) {
  if (!fields.length) return null;

  return (
    <div className="grid-form">
      {fields.map((f) => {
        const name = `cf_${f.key}`;
        const val = values?.[f.key] ?? "";
        const opts = parseSelectOptions(f.options);
        return (
          <div className="field" key={f.id}>
            <label>
              {f.label}
              {f.required ? " *" : ""}
            </label>
            {f.dataType === "BOOLEAN" ? (
              <>
                <input type="hidden" name={`${name}_present`} value="1" />
                <input
                  type="checkbox"
                  name={name}
                  defaultChecked={val === "true"}
                />
              </>
            ) : f.dataType === "SELECT" ? (
              <select name={name} defaultValue={val} required={f.required}>
                <option value="">—</option>
                {opts.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : f.dataType === "DATE" ? (
              <input
                type="date"
                name={name}
                defaultValue={val}
                required={f.required}
              />
            ) : f.dataType === "NUMBER" ? (
              <input
                type="number"
                name={name}
                defaultValue={val}
                required={f.required}
              />
            ) : (
              <input
                name={name}
                defaultValue={val}
                required={f.required}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CustomFieldsDisplay({
  fields,
  values,
}: {
  fields: CustomFieldDef[];
  values: Record<string, string>;
}) {
  const rows = fields.filter((f) => f.active && (values[f.key] || f.required));
  if (!rows.length) return null;
  return (
    <dl className="grid sm:grid-cols-2 gap-3 text-sm mt-2">
      {rows.map((f) => (
        <div key={f.id}>
          <dt className="muted">{f.label}</dt>
          <dd>
            {f.dataType === "BOOLEAN"
              ? values[f.key] === "true"
                ? "Po"
                : "Jo"
              : values[f.key] || "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}
