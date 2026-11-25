"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/audit";

export async function createMeetingAction(formData: FormData) {
  const ctx = await requireAuth();
  const clientId = String(formData.get("clientId") || "");
  const date = String(formData.get("date") || "");
  const time = String(formData.get("time") || "09:00");
  const notes = String(formData.get("notes") || "").trim();

  if (!clientId || !date) return { error: "Klienti dhe data janë të detyrueshme." };

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { error: "Klienti nuk u gjet." };

  if (ctx.user.role === "AGENT" && client.agentId !== ctx.user.id) {
    return { error: "Mund të planifikoni takime vetëm për klientët tuaj." };
  }

  const scheduledAt = new Date(`${date}T${time}:00`);
  const agentId =
    ctx.user.role === "AGENT" ? ctx.user.id : client.agentId || ctx.user.id;

  const meeting = await prisma.meeting.create({
    data: {
      clientId,
      agentId,
      scheduledAt,
      notes: notes || null,
      status: "SCHEDULED",
    },
  });

  await prisma.reminder.create({
    data: {
      userId: agentId,
      title: `Takim: ${client.firstName} ${client.lastName}`,
      dueAt: scheduledAt,
      meetingId: meeting.id,
      notes: notes || null,
    },
  });

  await logActivity({
    clientId,
    actorId: ctx.realUser.id,
    action: "MEETING_SCHEDULED",
    description: `Takim i planifikuar më ${scheduledAt.toISOString()}`,
  });

  await prisma.client.update({
    where: { id: clientId },
    data: { lastContactAt: new Date() },
  });

  revalidatePath("/agenda");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateMeetingStatusAction(
  meetingId: string,
  status: "SCHEDULED" | "DONE" | "CANCELLED",
) {
  const ctx = await requireAuth();
  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) return { error: "Takimi nuk u gjet." };

  if (ctx.user.role === "AGENT" && meeting.agentId !== ctx.user.id) {
    return { error: "Nuk keni akses në këtë takim." };
  }

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { status },
  });

  if (status === "DONE") {
    await prisma.reminder.updateMany({
      where: { meetingId },
      data: { done: true },
    });
  }

  await logActivity({
    clientId: meeting.clientId,
    actorId: ctx.realUser.id,
    action: "MEETING_UPDATED",
    description: `Statusi i takimit: ${status}`,
  });

  revalidatePath("/agenda");
  revalidatePath(`/clients/${meeting.clientId}`);
  return { ok: true };
}

export async function createReminderAction(formData: FormData) {
  const ctx = await requireAuth();
  const title = String(formData.get("title") || "").trim();
  const date = String(formData.get("date") || "");
  const time = String(formData.get("time") || "09:00");
  const notes = String(formData.get("notes") || "").trim();

  if (!title || !date) return { error: "Titulli dhe data janë të detyrueshme." };

  await prisma.reminder.create({
    data: {
      userId: ctx.user.id,
      title,
      dueAt: new Date(`${date}T${time}:00`),
      notes: notes || null,
    },
  });

  revalidatePath("/agenda");
  return { ok: true };
}

export async function toggleReminderAction(reminderId: string) {
  const ctx = await requireAuth();
  const reminder = await prisma.reminder.findUnique({
    where: { id: reminderId },
  });
  if (!reminder || reminder.userId !== ctx.user.id) {
    return { error: "Kujtesa nuk u gjet." };
  }
  await prisma.reminder.update({
    where: { id: reminderId },
    data: { done: !reminder.done },
  });
  revalidatePath("/agenda");
  return { ok: true };
}
