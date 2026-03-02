import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { getUserByClerkId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NotificationsList } from "./notifications-list";

const ACTION_TYPES = ["FORGIVENESS_VOTE_NEEDED", "SETTLEMENT_CONFIRM_NEEDED", "SETTINGS_VOTE_NEEDED"] as const;

export default async function NotificationsPage() {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await getUserByClerkId(userId);
  if (!user) return null;

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { space: { select: { id: true, name: true } } },
    take: 100,
  });

  const actionRequired = notifications.filter((n) => ACTION_TYPES.includes(n.type as (typeof ACTION_TYPES)[number]));
  const activity = notifications.filter((n) => !ACTION_TYPES.includes(n.type as (typeof ACTION_TYPES)[number]));

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Notifications</h1>
      <p className="text-zinc-500 text-sm mb-6">
        Action required and recent activity across your spaces.
      </p>
      <NotificationsList
        actionRequired={actionRequired}
        activity={activity}
      />
    </div>
  );
}
