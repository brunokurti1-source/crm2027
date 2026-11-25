"use client";

import { useState } from "react";

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
  const [copied, setCopied] = useState(false);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="card p-3 flex flex-wrap gap-2">
      {phone ? (
        <>
          <a className="btn btn-secondary" href={`tel:${phone.replace(/\s/g, "")}`}>
            Telefono
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
            {copied ? "U kopjua" : "Kopjo numrin"}
          </button>
        </>
      ) : null}
      {email ? (
        <a className="btn btn-secondary" href={`mailto:${email}`}>
          Dërgo email
        </a>
      ) : null}
      {permissions.canComment ? (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => scrollTo("client-comment-box")}
        >
          Shto koment
        </button>
      ) : null}
      {permissions.canMeet ? (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => scrollTo("client-meeting-box")}
        >
          Cakto takim
        </button>
      ) : null}
      {!phone && !email && !permissions.canComment && !permissions.canMeet ? (
        <span className="muted text-sm">Nuk ka veprime të shpejta të disponueshme.</span>
      ) : null}
    </div>
  );
}
