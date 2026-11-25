"use client";

import { useState, useTransition } from "react";
import { createUserAction, updateUserAction } from "@/app/actions/users";
import { PermissionFlags } from "@/lib/permissions";
import { useT } from "@/components/i18n-provider";

export function UserForm({
  mode,
  userId,
  managers,
  defaultPermissions,
  permissionKeys,
  permissionLabels,
  allowAdminRole,
  forceAgent,
  defaultManagerId,
  initial,
}: {
  mode: "create" | "edit";
  userId?: string;
  managers: { id: string; label: string }[];
  defaultPermissions: PermissionFlags;
  permissionKeys: (keyof PermissionFlags)[];
  permissionLabels: Record<keyof PermissionFlags, string>;
  allowAdminRole: boolean;
  forceAgent: boolean;
  defaultManagerId?: string;
  initial?: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    managerId: string | null;
    active: boolean;
    permissions: PermissionFlags;
  };
}) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const perms = initial?.permissions || defaultPermissions;

  return (
    <form
      className="card p-5 space-y-4"
      action={(fd) => {
        setError(null);
        startTransition(async () => {
          const res =
            mode === "create"
              ? await createUserAction(fd)
              : await updateUserAction(userId!, fd);
          if (res?.error) setError(res.error);
        });
      }}
    >
      <div className="grid-form">
        {mode === "create" && (
          <div className="field">
            <label>{t.users.emailRequired}</label>
            <input
              name="email"
              type="email"
              required
              defaultValue={initial?.email}
            />
          </div>
        )}
        <div className="field">
          <label>{t.users.firstName}</label>
          <input
            name="firstName"
            required
            defaultValue={initial?.firstName || ""}
          />
        </div>
        <div className="field">
          <label>{t.users.lastName}</label>
          <input
            name="lastName"
            required
            defaultValue={initial?.lastName || ""}
          />
        </div>
        <div className="field">
          <label>{t.users.role}</label>
          {mode === "edit" || forceAgent ? (
            <>
              <input
                type="hidden"
                name="role"
                value={forceAgent ? "AGENT" : initial?.role || "AGENT"}
              />
              <input
                value={
                  forceAgent
                    ? t.roles.AGENT
                    : t.roles[(initial?.role as keyof typeof t.roles) || "AGENT"] ||
                      initial?.role ||
                      "AGENT"
                }
                disabled
                readOnly
              />
            </>
          ) : (
            <select name="role" defaultValue={initial?.role || "AGENT"}>
              {allowAdminRole && (
                <option value="ADMIN">{t.roles.ADMIN}</option>
              )}
              <option value="MANAGER">{t.roles.MANAGER}</option>
              <option value="AGENT">{t.roles.AGENT}</option>
            </select>
          )}
        </div>
        {managers.length > 0 && (
          <div className="field">
            <label>{t.users.forAgent}</label>
            <select
              name="managerId"
              defaultValue={initial?.managerId || defaultManagerId || ""}
            >
              <option value="">{t.common.none}</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {forceAgent && (
          <input type="hidden" name="managerId" value={defaultManagerId || ""} />
        )}
        <div className="field">
          <label>
            {mode === "create" ? t.users.password : t.users.newPassword}
          </label>
          <input
            name="password"
            type="password"
            placeholder={
              mode === "create" ? "Demo123!" : t.users.leaveBlank
            }
            minLength={mode === "create" ? 6 : undefined}
          />
        </div>
        {mode === "edit" && (
          <label className="flex items-center gap-2 text-sm mt-6">
            <input
              type="checkbox"
              name="active"
              defaultChecked={initial?.active ?? true}
            />
            {t.users.active}
          </label>
        )}
      </div>

      <div>
        <h3 className="font-semibold mb-2">{t.users.permissions}</h3>
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          {permissionKeys.map((key) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                name={`perm_${key}`}
                defaultChecked={perms[key]}
              />
              {permissionLabels[key]}
            </label>
          ))}
        </div>
      </div>

      {error ? (
        <div className="text-sm text-[var(--danger)] bg-[var(--danger-bg)] rounded-lg px-3 py-2">
          {error}
        </div>
      ) : null}

      <button className="btn btn-primary" disabled={pending}>
        {pending
          ? t.common.saving
          : mode === "create"
            ? t.common.create
            : t.common.save}
      </button>
    </form>
  );
}
