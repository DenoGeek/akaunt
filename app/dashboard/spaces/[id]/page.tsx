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
import { SpaceSettingsProposalBanner } from "./space-settings-proposal-banner";
import { FinesLedgerSection } from "./fines-ledger-section";

// function getDisplayName(user: { email: string | null; clerkUserId: string }) {
//   if (user.email) {
//     const [local] = user.email.split("@");
//     return local || user.email;
//   }
//   // Avoid showing raw Clerk user IDs like user_3AnJeu...
//   return "Member";
// }

function getDisplayName(user: { email: string | null; clerkUserId: string }) {
  return user.email ?? user.clerkUserId;
}

export default async function SpacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string; period?: string; memberId?: string }>;
}) {
  const { id: spaceId } = await params;
  const { view = "cards", period = "today", memberId = "mine" } = await searchParams;
  const { userId } = await auth();
  if (!userId) return null;
  const user = await getUserByClerkId(userId);
  if (!user) return null;

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const forwardedProto = headersList.get("x-forwarded-proto");
  const isLocalHost =
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("0.0.0.0") ||
    host.startsWith("[::1]");
  const protocol = forwardedProto ?? (isLocalHost ? "http" : "https");
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

  const memberFilter = memberId;
  const isMine = memberFilter === "mine" || !memberFilter;
  const isAll = memberFilter === "all";
  const selectedMemberId = !isMine && !isAll ? memberFilter : null;

  const baseTaskWhere: { spaceId: string; userId?: string } = { spaceId };
  if (isMine) {
    baseTaskWhere.userId = user.id;
  } else if (selectedMemberId) {
    baseTaskWhere.userId = selectedMemberId;
  }

  let yesterdayInstances: Awaited<ReturnType<typeof prisma.taskInstance.findMany>> = [];
  let todayInstances: Awaited<ReturnType<typeof prisma.taskInstance.findMany>> = [];
  let tomorrowInstances: Awaited<ReturnType<typeof prisma.taskInstance.findMany>> = [];
  let weekInstances: Awaited<ReturnType<typeof prisma.taskInstance.findMany>> = [];
  let allInstances: Awaited<ReturnType<typeof prisma.taskInstance.findMany>> = [];

  if (isTableView) {
    allInstances = await prisma.taskInstance.findMany({
      where: baseTaskWhere,
      orderBy: { dueAt: "desc" },
    });
  } else if (isWeekPeriod) {
    weekInstances = await prisma.taskInstance.findMany({
      where: {
        ...baseTaskWhere,
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
        where: { ...baseTaskWhere, dueAt: { gte: yesterdayStart, lte: yesterdayEnd } },
        orderBy: { dueAt: "asc" },
      }),
      prisma.taskInstance.findMany({
        where: { ...baseTaskWhere, dueAt: { gte: todayStart, lte: todayEnd } },
        orderBy: { dueAt: "asc" },
      }),
      prisma.taskInstance.findMany({
        where: { ...baseTaskWhere, dueAt: { gte: tomorrowStart, lte: tomorrowEnd } },
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
  const statsByUser = Object.fromEntries(leaderboardRows.map((r) => [r.userId, r]));

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

  const pendingSettingsProposal = await prisma.spaceSettingsProposal.findFirst({
    where: { spaceId, status: "PENDING" },
    include: {
      createdBy: { select: { id: true, email: true } },
      votes: { select: { userId: true, vote: true } },
      space: { select: { id: true } },
    },
  });
  const currentUserVote = pendingSettingsProposal?.votes.find((v) => v.userId === user.id);
  const isOtherMember = pendingSettingsProposal && member.space.members.some((m) => m.userId === user.id) && pendingSettingsProposal.createdById !== user.id;
  const showSettingsBanner = pendingSettingsProposal && isOtherMember && !currentUserVote;

  const memberCount = member.space.members.length;
  const memberOptions = [
    { id: "mine", label: "My tasks" },
    { id: "all", label: "All members" },
    ...member.space.members.map((m) => ({
      id: m.userId,
      label: getDisplayName(m.user),
    })),
  ];

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

  const memberFilterControl = (
    <div className="flex gap-1 items-center bg-zinc-100 dark:bg-zinc-800/60 rounded-lg p-1">
      {memberOptions.map((opt) => {
        const active = memberFilter === opt.id || (opt.id === "mine" && isMine);
        const href = `/dashboard/spaces/${spaceId}?view=${view}&period=${period}&memberId=${opt.id}`;
        return (
          <Link
            key={opt.id}
            href={href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            {opt.label}
          </Link>
        );
      })}
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
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{member.space.name}</h1>
            <span className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">
              {memberCount} {memberCount === 1 ? "member" : "members"}
            </span>
            <Link
              href={`/dashboard/spaces/${spaceId}/settings`}
              className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
            >
              Settings
            </Link>
          </div>
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
          {memberFilterControl}
          {periodSwitcher}
        </div>
      </div>

      {/* Members section */}
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Members</h2>
          <p className="text-xs text-zinc-500">
            See who&apos;s in this space. Use the filter above to view their tasks.
          </p>
        </div>
        <ul className="space-y-2">
          {member.space.members.map((m) => (
            <li
              key={m.userId}
              className="flex items-center justify-between rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40 text-xs font-semibold text-violet-700 dark:text-violet-300">
                  {getDisplayName(m.user)[0]?.toUpperCase() ?? "M"}
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {getDisplayName(m.user)}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {m.role === "OWNER" ? "Owner" : "Member"}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {(() => {
                      const stats = statsByUser[m.userId];
                      if (!stats) return "No stats for this week yet";
                      return `${stats.completionPercent.toFixed(0)}% completed · Lost ${stats.coinsLost} coins · ${stats.forgivenessUsed} forgiveness`;
                    })()}
                  </p>
                </div>
              </div>
              <Link
                href={`/dashboard/spaces/${spaceId}?view=${view}&period=${period}&memberId=${m.userId}`}
                className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline"
              >
                View tasks
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {showSettingsBanner && pendingSettingsProposal && (
        <SpaceSettingsProposalBanner
          proposal={pendingSettingsProposal}
          currentUserId={user.id}
          hasVoted={!!currentUserVote}
        />
      )}

      {isTableView ? (
        <SpaceTableView
          instances={allInstances}
          rules={member.space.rules}
          currentUserId={user.id}
          members={member.space.members.map((m) => ({
            userId: m.userId,
            user: { email: m.user.email, clerkUserId: m.user.clerkUserId },
          }))}
        />
      ) : isWeekPeriod ? (
        <SpaceWeekSection
          instances={weekInstances}
          spaceId={spaceId}
          members={member.space.members.map((m) => ({
            userId: m.userId,
            user: { email: m.user.email, clerkUserId: m.user.clerkUserId },
          }))}
          currentUserId={user.id}
        />
      ) : (
        <div className="space-y-8">
          <DayCardsSection
            label="Yesterday"
            date={subDays(now, 1)}
            instances={yesterdayInstances}
            rules={member.space.rules}
            currentUserId={user.id}
            members={member.space.members.map((m) => ({
              userId: m.userId,
              user: { email: m.user.email, clerkUserId: m.user.clerkUserId },
            }))}
          />
          <DayCardsSection
            label="Today"
            date={now}
            instances={todayInstances}
            rules={member.space.rules}
            currentUserId={user.id}
            members={member.space.members.map((m) => ({
              userId: m.userId,
              user: { email: m.user.email, clerkUserId: m.user.clerkUserId },
            }))}
          />
          <DayCardsSection
            label="Tomorrow"
            date={addDays(now, 1)}
            instances={tomorrowInstances}
            rules={member.space.rules}
            currentUserId={user.id}
            members={member.space.members.map((m) => ({
              userId: m.userId,
              user: { email: m.user.email, clerkUserId: m.user.clerkUserId },
            }))}
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

      <FinesLedgerSection
        spaceId={spaceId}
        currentUserId={user.id}
        currencySymbol={member.space.rules?.currencySymbol ?? "$"}
        useLedgerForFines={member.space.rules?.useLedgerForFines ?? false}
        members={member.space.members.map((m) => ({ userId: m.userId, user: m.user }))}
      />

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
