import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyPenalty, applyFine } from "@/lib/ledger";
import { createNotification } from "@/lib/notifications";
import { addMinutes } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export const maxDuration = 60;
const DEFAULT_GRACE_MINUTES = 0;
const DEFAULT_TIMEZONE = "Africa/Nairobi";

function isPastDeadlineInSpaceTz(dueAt: Date, graceMinutes: number, timezone: string): boolean {
  const now = new Date();
  const nowInTz = toZonedTime(now, timezone);
  const dueAtInTz = toZonedTime(dueAt, timezone);
  const deadlineWithGrace = addMinutes(dueAtInTz, graceMinutes);
  return nowInTz >= deadlineWithGrace;
}

function useLedgerForFines(rules: { useLedgerForFines: boolean } | null, template: { ledgerModeOverride: string | null } | null): boolean {
  if (!rules) return false;
  if (template?.ledgerModeOverride === "LEDGER") return true;
  if (template?.ledgerModeOverride === "STAKE") return false;
  return rules.useLedgerForFines;
}

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

  const instances = await prisma.taskInstance.findMany({
    where: { status: "PENDING" },
    include: {
      space: { include: { rules: true } },
      taskTemplate: true,
    },
  });

  let processed = 0;
  for (const inst of instances) {
    const rules = inst.space.rules;
    const grace = rules?.graceMinutes ?? DEFAULT_GRACE_MINUTES;
    const timezone = rules?.timezone ?? DEFAULT_TIMEZONE;
    if (!isPastDeadlineInSpaceTz(inst.dueAt, grace, timezone)) continue;

    const spaceId = inst.spaceId;
    const useLedger = useLedgerForFines(rules, inst.taskTemplate);

    await prisma.taskInstance.update({
      where: { id: inst.id },
      data: { status: "MISSED", penaltyApplied: true },
    });

    if (useLedger) {
      await applyFine({
        userId: inst.userId,
        amount: inst.stakeAmount,
        spaceId,
        taskInstanceId: inst.id,
      });
    } else {
      await applyPenalty({
        userId: inst.userId,
        amount: inst.stakeAmount,
        spaceId,
        taskInstanceId: inst.id,
      });
    }
    await createNotification({
      userId: inst.userId,
      type: "TASK_FINED_OR_POINTS_LOST",
      spaceId,
      relatedId: inst.id,
    });
    processed++;
  }

  return NextResponse.json({ ok: true, processed });
}
