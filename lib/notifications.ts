import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  spaceId?: string | null;
  relatedId?: string | null;
}): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      spaceId: params.spaceId ?? undefined,
      relatedId: params.relatedId ?? undefined,
    },
  });
}

export async function createNotificationsForMembers(params: {
  memberIds: string[];
  type: NotificationType;
  spaceId: string;
  relatedId?: string | null;
}): Promise<void> {
  await prisma.notification.createMany({
    data: params.memberIds.map((userId) => ({
      userId,
      type: params.type,
      spaceId: params.spaceId,
      relatedId: params.relatedId ?? undefined,
    })),
  });
}
