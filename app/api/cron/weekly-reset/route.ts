import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWeek, getWeekYear, startOfWeek, endOfWeek, subWeeks } from "date-fns";

export const maxDuration = 120;

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 0 });
  const lastWeekEnd = endOfWeek(lastWeekStart, { weekStartsOn: 0 });
  const weekNumberLastWeek = getWeek(lastWeekStart, { weekStartsOn: 0 });
  const yearLastWeek = getWeekYear(lastWeekStart, { weekStartsOn: 0 });

  const spaces = await prisma.space.findMany({
    include: { members: { include: { user: true } } },
  });

  let created = 0;
  for (const space of spaces) {
    for (const member of space.members) {
      const userId = member.userId;

      const instances = await prisma.taskInstance.findMany({
        where: {
          userId,
          spaceId: space.id,
          dueAt: {
            gte: lastWeekStart,
            lte: lastWeekEnd,
          },
        },
      });

      const total = instances.length;
      if (total === 0) continue;

      const completed = instances.filter((i) => i.status === "COMPLETED").length;
      const missed = instances.filter((i) => i.status === "MISSED").length;
      const forgiven = instances.filter((i) => i.status === "FORGIVEN").length;
      const completionPercent = total > 0 ? (completed / total) * 100 : 0;

      const coinsLost = instances
        .filter((i) => i.status === "MISSED" && i.penaltyApplied)
        .reduce((s, i) => s + i.stakeAmount, 0);

      const usage = await prisma.forgivenessUsage.findUnique({
        where: {
          userId_spaceId_year_weekNumber: {
            userId,
            spaceId: space.id,
            year: yearLastWeek,
            weekNumber: weekNumberLastWeek,
          },
        },
      });
      const forgivenessUsed = usage?.tokensUsed ?? 0;

      await prisma.spaceWeeklyStats.upsert({
        where: {
          spaceId_userId_year_weekNumber: {
            spaceId: space.id,
            userId,
            year: yearLastWeek,
            weekNumber: weekNumberLastWeek,
          },
        },
        create: {
          spaceId: space.id,
          userId,
          year: yearLastWeek,
          weekNumber: weekNumberLastWeek,
          completionPercent,
          coinsLost,
          forgivenessUsed,
        },
        update: {
          completionPercent,
          coinsLost,
          forgivenessUsed,
        },
      });
      created++;
    }
  }

  return NextResponse.json({ ok: true, created });
}
