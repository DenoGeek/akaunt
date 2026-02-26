import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { getUserByClerkId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBalance } from "@/lib/ledger";
import { getWeek, getWeekYear, startOfDay, endOfDay, startOfWeek, endOfWeek, addDays, subDays } from "date-fns";
import { SpaceWeekSection } from "./week-section";
import { SpaceLeaderboard } from "./leaderboard";
import { ForgivenessRequestsSection } from "./forgiveness-requests-section";
import { DayCardsSection } from "./day-cards-section";
import { SpaceTableView } from "./space-table-view";
import { CopyInviteLink } from "@/components/copy-invite-link";

export default async function SpacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string; period?: string }>;
}) {
  const { id: spaceId } = await params;
  const { view = "cards", period = "today" } = await searchParams;
  const { userId } = await auth();
  if (!userId) return null;
  const user = await getUserByClerkId(userId);
  if (!user) return null;

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const inviteUrl = `${protocol}://${host}/join/${spaceId}`;

  const member = await prisma.spaceMember.findUnique({
    where: { spaceId_userId: { spaceId, userId: user.id } },
    include: {
      space: {
        include: {
          rules: true,
          members: { include: { user: true } },
        },
      },
    },
  });
  if (!member) notFound();

  const balance = await getBalance(user.id);
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

  const isTableView = view === "table";
  const isWeekPeriod = period === "week";

  let yesterdayInstances: Awaited<ReturnType<typeof prisma.taskInstance.findMany>> = [];
  let todayInstances: Awaited<ReturnType<typeof prisma.taskInstance.findMany>> = [];
  let tomorrowInstances: Awaited<ReturnType<typeof prisma.taskInstance.findMany>> = [];
  let weekInstances: Awaited<ReturnType<typeof prisma.taskInstance.findMany>> = [];
  let allInstances: Awaited<ReturnType<typeof prisma.taskInstance.findMany>> = [];

  if (isTableView) {
    allInstances = await prisma.taskInstance.findMany({
      where: { userId: user.id, spaceId },
      orderBy: { dueAt: "desc" },
    });
  } else if (isWeekPeriod) {
    weekInstances = await prisma.taskInstance.findMany({
      where: {
        userId: user.id,
        spaceId,
        dueAt: { gte: weekStart, lte: weekEnd },
      },
      orderBy: { dueAt: "asc" },
    });
  } else {
    const yesterdayStart = startOfDay(subDays(now, 1));
    const yesterdayEnd = endOfDay(subDays(now, 1));
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const tomorrowStart = startOfDay(addDays(now, 1));
    const tomorrowEnd = endOfDay(addDays(now, 1));

    const [y, t, tm] = await Promise.all([
      prisma.taskInstance.findMany({
        where: { userId: user.id, spaceId, dueAt: { gte: yesterdayStart, lte: yesterdayEnd } },
        orderBy: { dueAt: "asc" },
      }),
      prisma.taskInstance.findMany({
        where: { userId: user.id, spaceId, dueAt: { gte: todayStart, lte: todayEnd } },
        orderBy: { dueAt: "asc" },
      }),
      prisma.taskInstance.findMany({
        where: { userId: user.id, spaceId, dueAt: { gte: tomorrowStart, lte: tomorrowEnd } },
        orderBy: { dueAt: "asc" },
      }),
    ]);
    yesterdayInstances = y;
    todayInstances = t;
    tomorrowInstances = tm;
  }

  const weekNumber = getWeek(now, { weekStartsOn: 0 });
  const year = getWeekYear(now, { weekStartsOn: 0 });
  const leaderboardRows = await prisma.spaceWeeklyStats.findMany({
    where: { spaceId, year, weekNumber },
    orderBy: { completionPercent: "desc" },
  });
  const memberIds = leaderboardRows.map((r) => r.userId);
  const users = await prisma.user.findMany({ where: { id: { in: memberIds } } });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const pendingForgivenessRequests = await prisma.forgivenessRequest.findMany({
    where: {
      status: "PENDING",
      expiresAt: { gt: now },
      taskInstance: { spaceId },
    },
    include: {
      taskInstance: true,
      requestedBy: true,
      votes: { select: { userId: true, vote: true } },
    },
  });

  const viewSwitcher = (
    <div className="flex gap-1 items-center bg-zinc-100 dark:bg-zinc-800/60 rounded-lg p-1">
      <Link
        href={`/dashboard/spaces/${spaceId}?view=cards&period=${period}`}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          !isTableView
            ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
            : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        }`}
      >
        Cards
      </Link>
      <Link
        href={`/dashboard/spaces/${spaceId}?view=table`}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          isTableView
            ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
            : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        }`}
      >
        Table
      </Link>
    </div>
  );

  const periodSwitcher = !isTableView && (
    <div className="flex gap-1 items-center bg-zinc-100 dark:bg-zinc-800/60 rounded-lg p-1">
      <Link
        href={`/dashboard/spaces/${spaceId}?view=cards&period=today`}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          !isWeekPeriod
            ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
            : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        }`}
      >
        Today
      </Link>
      <Link
        href={`/dashboard/spaces/${spaceId}?view=cards&period=week`}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          isWeekPeriod
            ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
            : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        }`}
      >
        This week
      </Link>
    </div>
  );

  return (
    <div className="max-w-4xl space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/spaces" className="text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400 mb-1 block">
            ← Spaces
          </Link>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{member.space.name}</h1>
          {member.space.description && (
            <p className="text-zinc-500 text-sm mt-1">{member.space.description}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-zinc-500 text-sm">
            Balance:{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{balance} coins</span>
          </p>
          {viewSwitcher}
          {periodSwitcher}
        </div>
      </div>

      {isTableView ? (
        <SpaceTableView
          instances={allInstances}
          rules={member.space.rules}
          currentUserId={user.id}
        />
      ) : isWeekPeriod ? (
        <SpaceWeekSection instances={weekInstances} spaceId={spaceId} />
      ) : (
        <div className="space-y-8">
          <DayCardsSection
            label="Yesterday"
            date={subDays(now, 1)}
            instances={yesterdayInstances}
            rules={member.space.rules}
            currentUserId={user.id}
          />
          <DayCardsSection
            label="Today"
            date={now}
            instances={todayInstances}
            rules={member.space.rules}
            currentUserId={user.id}
          />
          <DayCardsSection
            label="Tomorrow"
            date={addDays(now, 1)}
            instances={tomorrowInstances}
            rules={member.space.rules}
            currentUserId={user.id}
          />
        </div>
      )}

      <ForgivenessRequestsSection
        requests={pendingForgivenessRequests}
        currentUserId={user.id}
      />

      <SpaceLeaderboard
        rows={leaderboardRows}
        userMap={userMap}
        spaceId={spaceId}
        year={year}
        weekNumber={weekNumber}
      />

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/dashboard/spaces/${spaceId}/tasks/add-today`}
          className="inline-flex rounded-xl bg-violet-600 hover:bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
        >
          Add today&apos;s tasks
        </Link>
        <Link
          href={`/dashboard/spaces/${spaceId}/tasks/add-week`}
          className="inline-flex rounded-xl border border-zinc-300 dark:border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          Add this week&apos;s tasks
        </Link>
      </div>

      {/* Invite link */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
          Invite someone
        </h3>
        <p className="text-xs text-zinc-500 mb-3">
          Share this link — anyone with it can join this space.
        </p>
        <CopyInviteLink url={inviteUrl} />
      </div>
    </div>
  );
}
