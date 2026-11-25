"use client";

import { useState, useTransition } from "react";
import { createMeetingAction, createReminderAction } from "@/app/actions/meetings";
import { useT } from "@/components/i18n-provider";

export function AgendaForms({
  clients,
}: {
  clients: { id: string; label: string }[];
}) {
  const t = useT();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {msg ? (
        <div className="lg:col-span-2 card p-3 text-sm bg-[var(--brand-soft)]">
          {msg}
        </div>
      ) : null}

      <form
        className="card p-4 space-y-3"
        action={(fd) => {
          setMsg(null);
          startTransition(async () => {
            const res = await createMeetingAction(fd);
            setMsg(res?.error || t.agenda.meetingScheduled);
          });
        }}
      >
        <h3 className="font-semibold">{t.agenda.newMeeting}</h3>
        <div className="field">
          <label>{t.agenda.client}</label>
          <select name="clientId" required defaultValue="">
            <option value="" disabled>
              {t.agenda.choose}
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid-form">
          <div className="field">
            <label>{t.common.date}</label>
            <input name="date" type="date" required />
          </div>
          <div className="field">
            <label>{t.common.time}</label>
            <input name="time" type="time" defaultValue="10:00" />
          </div>
        </div>
        <div className="field">
          <label>{t.agenda.notes}</label>
          <input name="notes" />
        </div>
        <button className="btn btn-primary" disabled={pending}>
          {t.agenda.schedule}
        </button>
      </form>

      <form
        className="card p-4 space-y-3"
        action={(fd) => {
          setMsg(null);
          startTransition(async () => {
            const res = await createReminderAction(fd);
            setMsg(res?.error || t.agenda.reminderAdded);
          });
        }}
      >
        <h3 className="font-semibold">{t.agenda.privateReminder}</h3>
        <div className="field">
          <label>{t.agenda.reminderTitle}</label>
          <input name="title" required />
        </div>
        <div className="grid-form">
          <div className="field">
            <label>{t.common.date}</label>
            <input name="date" type="date" required />
          </div>
          <div className="field">
            <label>{t.common.time}</label>
            <input name="time" type="time" defaultValue="09:00" />
          </div>
        </div>
        <div className="field">
          <label>{t.agenda.notes}</label>
          <input name="notes" />
        </div>
        <button className="btn btn-secondary" disabled={pending}>
          {t.agenda.addReminder}
        </button>
      </form>
    </div>
  );
}
