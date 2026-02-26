import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyPenalty } from "@/lib/ledger";
import { addMinutes } from "date-fns";

export const maxDuration = 60;
const DEFAULT_GRACE_MINUTES = 0;

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  await prisma.forgivenessRequest.updateMany({
    where: { status: "PENDING", expiresAt: { lt: now } },
    data: { status: "EXPIRED" },
  });

  const rulesBySpace = await prisma.spaceRules.findMany({});
  const spaceGrace: Record<string, number> = {};
  for (const r of rulesBySpace) {
    spaceGrace[r.spaceId] = r.graceMinutes;
  }

  const instances = await prisma.taskInstance.findMany({
    where: { status: "PENDING" },
  });

  let processed = 0;
  for (const inst of instances) {
    const grace = spaceGrace[inst.spaceId] ?? DEFAULT_GRACE_MINUTES;
    const deadlineWithGrace = addMinutes(inst.dueAt, grace);
    if (deadlineWithGrace >= now) continue;

    const spaceId = inst.spaceId;
    await prisma.$transaction([
      prisma.taskInstance.update({
        where: { id: inst.id },
        data: { status: "MISSED", penaltyApplied: true },
      }),
    ]);
    await applyPenalty({
      userId: inst.userId,
      amount: inst.stakeAmount,
      spaceId,
      taskInstanceId: inst.id,
    });
    processed++;
  }

  return NextResponse.json({ ok: true, processed });
}
