"use client";

import { useState, useTransition } from "react";
import { loginAction } from "@/app/actions/auth";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeControls } from "@/components/theme-controls";
import { I18nProvider } from "@/components/i18n-provider";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages/en";

export function LoginForm({ locale, t }: { locale: Locale; t: Messages }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <I18nProvider locale={locale} t={t}>
      <div className="min-h-screen flex flex-col">
        <div className="flex justify-end gap-2 p-4">
          <LanguageSwitcher locale={locale} redirectTo="/login" label={t.nav.language} />
          <ThemeControls />
        </div>
        <div className="flex-1 flex items-center justify-center px-4 pb-16">
          <div className="w-full max-w-md card p-8">
            <div className="mb-6">
              <div className="text-sm font-semibold text-[var(--brand)] tracking-wide">{t.brand}</div>
              <h1 className="page-title mt-1">{t.login.title}</h1>
              <p className="page-sub">{t.login.subtitle}</p>
            </div>
            <form className="space-y-4" action={(fd) => {
              setError(null);
              startTransition(async () => {
                const res = await loginAction(fd);
                if (res?.error) {
                  const key = (res as { errorKey?: string }).errorKey;
                  setError((key && t.errors[key]) || t.errors.badCredentials || res.error);
                }
              });
            }}>
              <div className="field">
                <label htmlFor="email">{t.login.email}</label>
                <input id="email" name="email" type="email" required autoComplete="username" placeholder="admin@crm.local" />
              </div>
              <div className="field">
                <label htmlFor="password">{t.login.password}</label>
                <input id="password" name="password" type="password" required autoComplete="current-password" />
              </div>
              {error ? <div className="flash-err">{error}</div> : null}
              <button className="btn btn-primary w-full" type="submit" disabled={pending}>
                {pending ? t.login.submitting : t.login.submit}
              </button>
            </form>
            <p className="text-xs muted mt-6">{t.login.demoHint}</p>
          </div>
        </div>
      </div>
    </I18nProvider>
  );
}
