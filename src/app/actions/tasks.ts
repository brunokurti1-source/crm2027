"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { assertClientInScope, ScopeError } from "@/lib/scope";

export async function createTaskAction(formData: FormData): Promise<void> {
  const ctx = await requireAuth();
  const title = String(formData.get("title") || "").trim();
  const type = String(formData.get("type") || "FOLLOW_UP");
  const priority = String(formData.get("priority") || "MEDIUM");
  const description = String(formData.get("description") || "").trim();
  const clientId = String(formData.get("clientId") || "") || null;
  const date = String(formData.get("date") || "");
  const time = String(formData.get("time") || "10:00");

  if (!title || !date) return;

  if (clientId) {
    try {
      await assertClientInScope(ctx, clientId);
    } catch (e) {
      if (e instanceof ScopeError) return;
      throw e;
    }
  }

  const dueAt = new Date(`${date}T${time}:00`);
  await prisma.task.create({
    data: {
      title,
      type,
      priority,
      description: description || null,
      clientId,
      assigneeId: ctx.user.id,
      createdById: ctx.realUser.id,
      dueAt,
      remindAt: new Date(dueAt.getTime() - 60 * 60 * 1000),
      status: "OPEN",
    },
  });

  if (clientId) {
    await logActivity({
      clientId,
      actorId: ctx.realUser.id,
      action: "TASK_CREATED",
      description: `Task: ${title}`,
    });
  }

  await prisma.notification.create({
    data: {
      userId: ctx.user.id,
      title: "New task",
      body: title,
      kind: "TASK",
      href: "/tasks",
    },
  });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function updateTaskStatusAction(formData: FormData): Promise<void> {
  const ctx = await requireAuth();
  const taskId = String(formData.get("taskId") || "");
  const status = String(formData.get("status") || "") as
    | "OPEN"
    | "DONE"
    | "POSTPONED"
    | "CANCELLED";

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  if (ctx.user.role === "AGENT" && task.assigneeId !== ctx.user.id) return;
  if (ctx.user.role === "MANAGER" && task.assigneeId !== ctx.user.id) {
    const assignee = await prisma.user.findUnique({
      where: { id: task.assigneeId },
    });
    if (!assignee || assignee.managerId !== ctx.user.id) return;
  }

  await prisma.task.update({
    where: { id: taskId },
    data: {
      status,
      completedAt: status === "DONE" ? new Date() : null,
    },
  });

  if (task.clientId) {
    await logActivity({
      clientId: task.clientId,
      actorId: ctx.realUser.id,
      action: "TASK_UPDATED",
      description: `Detyra «${task.title}»: ${status}`,
    });
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}
