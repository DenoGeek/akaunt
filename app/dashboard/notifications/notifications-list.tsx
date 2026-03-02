"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { markNotificationRead, markAllNotificationsRead } from "@/app/actions/notifications";

type NotificationWithSpace = {
  id: string;
  type: string;
  spaceId: string | null;
  relatedId: string | null;
  readAt: Date | null;
  createdAt: Date;
  space: { id: string; name: string } | null;
};

function label(type: string): string {
  switch (type) {
    case "FORGIVENESS_VOTE_NEEDED":
      return "Vote on forgiveness request";
    case "SETTLEMENT_CONFIRM_NEEDED":
      return "Confirm settlement";
    case "SETTINGS_VOTE_NEEDED":
      return "Review proposed settings";
    case "TASK_COMPLETED_BY_MEMBER":
      return "Task completed";
    case "TASK_FINED_OR_POINTS_LOST":
      return "Task fined / points lost";
    default:
      return type;
  }
}

function href(n: NotificationWithSpace): string {
  const spaceId = n.spaceId ?? n.space?.id;
  if (!spaceId) return "/dashboard/spaces";
  return `/dashboard/spaces/${spaceId}`;
}

export function NotificationsList({
  actionRequired,
  activity,
}: {
  actionRequired: NotificationWithSpace[];
  activity: NotificationWithSpace[];
}) {
  const router = useRouter();
  const hasUnread = [...actionRequired, ...activity].some((n) => !n.readAt);

  async function markRead(id: string) {
    await markNotificationRead(id);
    router.refresh();
  }

  async function markAllRead() {
    await markAllNotificationsRead();
    router.refresh();
  }

  function NotificationRow({ n }: { n: NotificationWithSpace }) {
    const spaceName = n.space?.name ?? "Space";
    return (
      <li className="flex items-start justify-between gap-3 py-3 border-b border-zinc-200 dark:border-zinc-800 last:border-0">
        <Link
          href={href(n)}
          onClick={() => !n.readAt && markRead(n.id)}
          className={`flex-1 min-w-0 ${!n.readAt ? "font-medium" : "text-zinc-600 dark:text-zinc-400"}`}
        >
          <span className="text-zinc-900 dark:text-zinc-100">{label(n.type)}</span>
          <span className="text-zinc-500 dark:text-zinc-400"> — {spaceName}</span>
        </Link>
        {!n.readAt && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              markRead(n.id);
            }}
            className="text-xs text-violet-600 dark:text-violet-400 hover:underline shrink-0"
          >
            Mark read
          </button>
        )}
      </li>
    );
  }

  return (
    <div className="space-y-6">
      {hasUnread && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={markAllRead}
            className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
          >
            Mark all as read
          </button>
        </div>
      )}

      {actionRequired.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">Action required</h2>
          <ul className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 divide-y divide-zinc-200 dark:divide-zinc-800 px-4">
            {actionRequired.map((n) => (
              <NotificationRow key={n.id} n={n} />
            ))}
          </ul>
        </section>
      )}

      {activity.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Activity</h2>
          <ul className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 divide-y divide-zinc-200 dark:divide-zinc-800 px-4">
            {activity.map((n) => (
              <NotificationRow key={n.id} n={n} />
            ))}
          </ul>
        </section>
      )}

      {actionRequired.length === 0 && activity.length === 0 && (
        <p className="text-zinc-500 text-sm">No notifications yet.</p>
      )}
    </div>
  );
}
