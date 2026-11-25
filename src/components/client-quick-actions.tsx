"use client";

import { useState } from "react";
import { useT } from "@/components/i18n-provider";

export function ClientQuickActions({
  phone,
  email,
  permissions,
}: {
  phone: string | null;
  email: string | null;
  permissions: {
    canComment: boolean;
    canMeet: boolean;
  };
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="card p-3 flex flex-wrap gap-2">
      {phone ? (
        <>
          <a className="btn btn-secondary" href={`tel:${phone.replace(/\s/g, "")}`}>
            {t.quickActions.call}
          </a>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(phone);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? t.quickActions.copied : t.quickActions.copyPhone}
          </button>
        </>
      ) : null}
      {email ? (
        <a className="btn btn-secondary" href={`mailto:${email}`}>
          {t.quickActions.email}
        </a>
      ) : null}
      {permissions.canComment ? (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => scrollTo("client-comment-box")}
        >
          {t.quickActions.addComment}
        </button>
      ) : null}
      {permissions.canMeet ? (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => scrollTo("client-meeting-box")}
        >
          {t.quickActions.schedule}
        </button>
      ) : null}
      {!phone && !email && !permissions.canComment && !permissions.canMeet ? (
        <span className="muted text-sm">{t.quickActions.none}</span>
      ) : null}
    </div>
  );
}
