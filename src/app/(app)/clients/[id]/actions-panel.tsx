"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import {
  updateClientAction,
  adjustCreditsAction,
  addCommentAction,
  archiveClientAction,
  softDeleteClientAction,
} from "@/app/actions/clients";
import { createMeetingAction } from "@/app/actions/meetings";
import { DraftTextarea } from "@/components/draft-textarea";
import type { DuplicateMatch } from "@/lib/duplicates";

type Client = {
  id: string;
  clientIdNumber: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  address: string | null;
  country: string | null;
  leadSource: string | null;
  status: string;
  notes: string | null;
  agentId: string | null;
  managerId: string | null;
  creditBalance: number;
  version: number;
};

type ConflictInfo = {
  recentChanges?: Array<{
    action: string;
    description: string;
    at: string;
    actor: string | null;
  }>;
  serverVersion?: number;
};

export function ClientDetailActions({
  client,
  agents,
  managers,
  statuses,
  permissions,
}: {
  client: Client;
  agents: { id: string; label: string }[];
  managers: { id: string; label: string }[];
  statuses: { id: string; label: string }[];
  permissions: {
    canEdit: boolean;
    canCreditsAdd: boolean;
    canCreditsRemove: boolean;
    canComment: boolean;
    canDeleteComment: boolean;
    canAssign: boolean;
    canArchive: boolean;
    canDelete: boolean;
    canMeet: boolean;
  };
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [ackDup, setAckDup] = useState(false);
  const [version, setVersion] = useState(client.version);
  const [pending, startTransition] = useTransition();

  function run(
    action: () => Promise<
      | {
          error?: string;
          ok?: boolean;
          conflict?: boolean;
          duplicates?: DuplicateMatch[];
          needsDuplicateAck?: boolean;
          version?: number;
          recentChanges?: ConflictInfo["recentChanges"];
          serverVersion?: number;
        }
      | void
    >,
  ) {
    setMsg(null);
    setConflict(null);
    startTransition(async () => {
      const res = await action();
      if (!res) return;
      if (res.duplicates?.length) {
        setDuplicates(res.duplicates);
        setAckDup(false);
      }
      if (res.conflict) {
        setConflict({
          recentChanges: res.recentChanges,
          serverVersion: res.serverVersion,
        });
        setMsg(res.error || "Konflikt ndryshimesh.");
        return;
      }
      if (res.error) {
        setMsg(res.error);
        return;
      }
      if (res.version) setVersion(res.version);
      setDuplicates([]);
      setMsg("U ruajt.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {msg ? (
        <div
          className={
            conflict ? "flash-err" : "flash-ok"
          }
        >
          {msg}
        </div>
      ) : null}

      {conflict ? (
        <div className="card p-4 space-y-2 border-[var(--warn)]">
          <p className="text-sm font-semibold text-[var(--warn)]">
            Ndryshim nga një përdorues tjetër
          </p>
          <ul className="text-sm space-y-1">
            {(conflict.recentChanges || []).map((c, i) => (
              <li key={i} className="muted">
                {c.actor || "—"} · {c.action}: {c.description}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setConflict(null);
              router.refresh();
            }}
          >
            Rifresko të dhënat
          </button>
        </div>
      ) : null}

      {duplicates.length > 0 ? (
        <div className="flash-err space-y-2">
          <p className="font-semibold">Klientë të ngjashëm:</p>
          <ul className="text-sm space-y-1">
            {duplicates.map((d) => (
              <li key={d.id}>
                <Link href={`/clients/${d.id}`} className="underline">
                  {d.clientIdNumber}
                </Link>{" "}
                — {d.firstName} {d.lastName} ({d.matchedOn.join(", ")})
              </li>
            ))}
          </ul>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={ackDup}
              onChange={(e) => setAckDup(e.target.checked)}
            />
            I kam kontrolluar dublikatat
          </label>
        </div>
      ) : null}

      {permissions.canEdit && (
        <form
          className="card p-4 space-y-3"
          action={(fd) => {
            fd.set("expectedVersion", String(version));
            if (ackDup) fd.set("acknowledgeDuplicates", "1");
            run(() => updateClientAction(client.id, fd));
          }}
        >
          <h3 className="font-semibold">Ndrysho</h3>
          <input type="hidden" name="expectedVersion" value={version} />
          <div className="grid-form">
            <div className="field">
              <label>ID</label>
              <input
                name="clientIdNumber"
                defaultValue={client.clientIdNumber}
                required
              />
            </div>
            <div className="field">
              <label>Emri</label>
              <input name="firstName" defaultValue={client.firstName} required />
            </div>
            <div className="field">
              <label>Mbiemri</label>
              <input name="lastName" defaultValue={client.lastName} required />
            </div>
            <div className="field">
              <label>Telefon</label>
              <input name="phone" defaultValue={client.phone || ""} />
            </div>
            <div className="field">
              <label>Email</label>
              <input name="email" defaultValue={client.email || ""} />
            </div>
            <div className="field">
              <label>Statusi</label>
              <select name="status" defaultValue={client.status}>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Kompania</label>
              <input name="company" defaultValue={client.company || ""} />
            </div>
            <div className="field">
              <label>Shteti</label>
              <input name="country" defaultValue={client.country || ""} />
            </div>
            <div className="field">
              <label>Adresa</label>
              <input name="address" defaultValue={client.address || ""} />
            </div>
            <div className="field">
              <label>Burimi</label>
              <input name="leadSource" defaultValue={client.leadSource || ""} />
            </div>
            {permissions.canAssign && (
              <>
                <div className="field">
                  <label>Agjenti</label>
                  <select name="agentId" defaultValue={client.agentId || ""}>
                    <option value="">—</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>
                {managers.length > 0 && (
                  <div className="field">
                    <label>Menaxheri</label>
                    <select
                      name="managerId"
                      defaultValue={client.managerId || ""}
                    >
                      <option value="">—</option>
                      {managers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}
          </div>
          <DraftTextarea
            clientId={client.id}
            kind="NOTES"
            name="notes"
            label="Shënime (draft automatik)"
            initialServerValue={client.notes || ""}
            rows={3}
          />
          <button
            className="btn btn-primary"
            disabled={pending || (duplicates.length > 0 && !ackDup)}
          >
            Ruaj ndryshimet
          </button>
        </form>
      )}

      {(permissions.canCreditsAdd || permissions.canCreditsRemove) && (
        <form
          className="card p-4 space-y-3"
          action={(fd) => run(() => adjustCreditsAction(client.id, fd))}
        >
          <h3 className="font-semibold">
            Kredi (bilanci: {client.creditBalance})
          </h3>
          <div className="field">
            <label>Shuma (+ shto / − hiq)</label>
            <input name="amount" type="number" step="0.01" required />
          </div>
          <div className="field">
            <label>Arsyeja / shënimi *</label>
            <input name="reason" required />
          </div>
          <button className="btn btn-secondary" disabled={pending}>
            Përditëso kredinë
          </button>
        </form>
      )}

      {permissions.canComment && (
        <form
          id="client-comment-box"
          className="card p-4 space-y-3"
          action={(fd) => run(() => addCommentAction(client.id, fd))}
        >
          <h3 className="font-semibold">Shto koment</h3>
          <DraftTextarea
            clientId={client.id}
            kind="COMMENT"
            name="body"
            label="Komenti (draft — publikohet vetëm pasi të shtoni)"
            rows={3}
            required
          />
          <button className="btn btn-secondary" disabled={pending}>
            Publiko komentin
          </button>
        </form>
      )}

      {permissions.canMeet && (
        <form
          id="client-meeting-box"
          className="card p-4 space-y-3"
          action={(fd) => {
            fd.set("clientId", client.id);
            run(() => createMeetingAction(fd));
          }}
        >
          <h3 className="font-semibold">Planifiko takim</h3>
          <input type="hidden" name="clientId" value={client.id} />
          <div className="grid-form">
            <div className="field">
              <label>Data</label>
              <input name="date" type="date" required />
            </div>
            <div className="field">
              <label>Ora</label>
              <input name="time" type="time" defaultValue="10:00" />
            </div>
          </div>
          <div className="field">
            <label>Shënime</label>
            <input name="notes" />
          </div>
          <button className="btn btn-secondary" disabled={pending}>
            Planifiko
          </button>
        </form>
      )}

      {permissions.canArchive && (
        <form
          className="card p-4"
          action={() => run(() => archiveClientAction(client.id))}
        >
          <button className="btn btn-secondary" disabled={pending}>
            Arkivo klientin
          </button>
        </form>
      )}

      {permissions.canDelete && (
        <form
          className="card p-4 space-y-2"
          action={(fd) =>
            run(() =>
              softDeleteClientAction(
                client.id,
                String(fd.get("confirm") || ""),
              ),
            )
          }
        >
          <h3 className="font-semibold text-[var(--danger)]">
            Zhvendos te Të fshira
          </h3>
          <div className="field">
            <label>Shkruani FSHIJ për konfirmim</label>
            <input name="confirm" required />
          </div>
          <button className="btn btn-danger" disabled={pending}>
            Konfirmo fshirjen
          </button>
        </form>
      )}
    </div>
  );
}
