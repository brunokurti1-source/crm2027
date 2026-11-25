"use client";

import { useState, useTransition } from "react";
import { loginAction } from "@/app/actions/auth";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md card p-8 fade-up shadow-sm">
        <div className="mb-6">
          <div className="text-sm font-semibold text-[var(--brand)] tracking-wide">
            CRM 2027
          </div>
          <h1 className="text-2xl font-bold mt-1">Hyr në sistem</h1>
          <p className="muted text-sm mt-1">
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
              placeholder="••••••••"
            />
          </div>

          {error ? (
            <div className="text-sm text-[var(--danger)] bg-[var(--danger-bg)] rounded-lg px-3 py-2">
              {error}
            </div>
          ) : null}

          <button className="btn btn-primary w-full" type="submit" disabled={pending}>
            {pending ? "Duke u futur…" : "Hyr"}
          </button>
        </form>

        <p className="text-xs muted mt-6">
          Demo lokale: admin@crm.local / Demo123! — shih README.
        </p>
      </div>
    </div>
  );
}
