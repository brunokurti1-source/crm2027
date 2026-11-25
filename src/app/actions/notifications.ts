"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function markNotificationReadAction(
  formData: FormData,
): Promise<void> {
  const ctx = await requireAuth();
  const id = String(formData.get("id") || "");
  await prisma.notification.updateMany({
    where: { id, userId: ctx.user.id },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const ctx = await requireAuth();
  await prisma.notification.updateMany({
    where: { userId: ctx.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}
