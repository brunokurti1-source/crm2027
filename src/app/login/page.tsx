"use client";

import { useState, useTransition } from "react";
import { loginAction } from "@/app/actions/auth";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeControls } from "@/components/theme-controls";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex justify-end gap-2 p-4">
        <LanguageSwitcher locale="sq" redirectTo="/login" label="Gjuha" />
        <ThemeControls />
      </div>
      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md card p-8">
          <div className="mb-6">
            <div className="text-sm font-semibold text-[var(--brand)] tracking-wide">
              CRM 2027
            </div>
            <h1 className="page-title mt-1">Hyr në sistem</h1>
            <p className="page-sub">
              Vetëm administratorë, menaxherë dhe agjentë.
            </p>
          </div>

          <form
            className="space-y-4"
            action={(fd) => {
              setError(null);
              startTransition(async () => {
                const res = await loginAction(fd);
                if (res?.error) setError(res.error);
              });
            }}
          >
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="username"
                placeholder="admin@crm.local"
              />
            </div>
            <div className="field">
              <label htmlFor="password">Fjalëkalimi</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>

            {error ? <div className="flash-err">{error}</div> : null}

            <button
              className="btn btn-primary w-full"
              type="submit"
              disabled={pending}
            >
              {pending ? "Duke u futur…" : "Hyr"}
            </button>
          </form>

          <p className="text-xs muted mt-6">
            Demo lokale: admin@crm.local / Demo123!
          </p>
        </div>
      </div>
    </div>
  );
}
