"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getUserByClerkId } from "@/lib/auth";

export async function markNotificationRead(notificationId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not authenticated" };
  const user = await getUserByClerkId(userId);
  if (!user) return { ok: false, error: "User not found" };

  await prisma.notification.updateMany({
    where: { id: notificationId, userId: user.id },
    data: { readAt: new Date() },
  });
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not authenticated" };
  const user = await getUserByClerkId(userId);
  if (!user) return { ok: false, error: "User not found" };

  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
  return { ok: true };
}
