"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getUserByClerkId } from "@/lib/auth";
import { forgivenessReversal } from "@/lib/ledger";
import { getWeek, getWeekYear } from "date-fns";

export type ForgivenessResult = { ok: true } | { ok: false; error: string };

export async function usePersonalForgivenessAction(taskInstanceId: string): Promise<void> {
  await usePersonalForgiveness(taskInstanceId);
}

export async function requestGroupForgivenessAction(taskInstanceId: string): Promise<void> {
  await requestGroupForgiveness(taskInstanceId);
}

export async function usePersonalForgiveness(taskInstanceId: string): Promise<ForgivenessResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const user = await getUserByClerkId(userId);
  if (!user) return { ok: false, error: "User not found" };

  const instance = await prisma.taskInstance.findUnique({
    where: { id: taskInstanceId },
  });
  if (!instance) return { ok: false, error: "Task not found" };
  if (instance.userId !== user.id) return { ok: false, error: "Not your task" };
  if (instance.status !== "MISSED") return { ok: false, error: "Task is not missed" };

  const rules = await prisma.spaceRules.findUnique({
    where: { spaceId: instance.spaceId },
  });
  if (!rules) return { ok: false, error: "Space has no rules" };

  const now = new Date();
  const weekNumber = getWeek(now, { weekStartsOn: 0 });
  const year = getWeekYear(now, { weekStartsOn: 0 });
  const usage = await prisma.forgivenessUsage.upsert({
    where: {
      userId_spaceId_year_weekNumber: {
        userId: user.id,
        spaceId: instance.spaceId,
        year,
        weekNumber,
      },
    },
    create: {
      userId: user.id,
      spaceId: instance.spaceId,
      year,
      weekNumber,
      tokensUsed: 0,
    },
    update: {},
  });

  if (usage.tokensUsed >= rules.weeklyForgivenessTokens) {
    return { ok: false, error: "No forgiveness tokens left this week" };
  }

  const existingReversal = await prisma.ledgerEntry.findFirst({
    where: {
      taskInstanceId,
      type: "FORGIVENESS_REVERSAL",
    },
  });
  if (existingReversal) return { ok: false, error: "Already forgiven" };

  await prisma.$transaction([
    prisma.taskInstance.update({
      where: { id: taskInstanceId },
      data: { status: "FORGIVEN" },
    }),
    prisma.forgivenessUsage.update({
      where: { id: usage.id },
      data: { tokensUsed: { increment: 1 } },
    }),
  ]);
  await forgivenessReversal({
    userId: user.id,
    amount: instance.stakeAmount,
    spaceId: instance.spaceId,
    taskInstanceId,
  });

  revalidatePath(`/dashboard/spaces/${instance.spaceId}`);
  return { ok: true };
}

export async function voteForgivenessAction(
  requestId: string,
  vote: "APPROVE" | "REJECT"
): Promise<void> {
  await voteForgiveness(requestId, vote);
}

export async function requestGroupForgiveness(taskInstanceId: string): Promise<ForgivenessResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const user = await getUserByClerkId(userId);
  if (!user) return { ok: false, error: "User not found" };

  const instance = await prisma.taskInstance.findUnique({
    where: { id: taskInstanceId },
  });
  if (!instance) return { ok: false, error: "Task not found" };
  if (instance.userId !== user.id) return { ok: false, error: "Not your task" };
  if (instance.status !== "MISSED") return { ok: false, error: "Task is not missed" };

  const space = await prisma.space.findUnique({
    where: { id: instance.spaceId },
    include: { rules: true },
  });
  if (!space?.rules?.groupVoteEnabled) return { ok: false, error: "Group vote not enabled" };

  const existing = await prisma.forgivenessRequest.findUnique({
    where: { taskInstanceId },
  });
  if (existing) return { ok: false, error: "Request already exists" };

  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
  await prisma.forgivenessRequest.create({
    data: {
      taskInstanceId,
      requestedById: user.id,
      status: "PENDING",
      expiresAt,
    },
  });

  revalidatePath(`/dashboard/spaces/${instance.spaceId}`);
  return { ok: true };
}

export async function voteForgiveness(
  requestId: string,
  vote: "APPROVE" | "REJECT"
): Promise<ForgivenessResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const user = await getUserByClerkId(userId);
  if (!user) return { ok: false, error: "User not found" };

  const request = await prisma.forgivenessRequest.findUnique({
    where: { id: requestId },
    include: {
      taskInstance: {
        include: { space: { include: { rules: true, members: true } } },
      },
    },
  });
  if (!request) return { ok: false, error: "Request not found" };
  if (request.status !== "PENDING") return { ok: false, error: "Request no longer pending" };
  if (request.expiresAt < new Date()) return { ok: false, error: "Request expired" };
  if (request.requestedById === user.id) return { ok: false, error: "Cannot vote on your own request" };

  const member = request.taskInstance.space.members.find((m) => m.userId === user.id);
  if (!member) return { ok: false, error: "Not a member of this space" };

  await prisma.forgivenessVote.upsert({
    where: {
      requestId_userId: { requestId, userId: user.id },
    },
    create: { requestId, userId: user.id, vote: vote === "APPROVE" ? "APPROVE" : "REJECT" },
    update: { vote: vote === "APPROVE" ? "APPROVE" : "REJECT" },
  });

  const votes = await prisma.forgivenessVote.findMany({
    where: { requestId },
  });
  const eligibleCount = request.taskInstance.space.members.filter(
    (m) => m.userId !== request.requestedById
  ).length;
  const approveCount = votes.filter((v) => v.vote === "APPROVE").length;
  const threshold = (request.taskInstance.space.rules?.voteThresholdPercent ?? 50) / 100;

  if (eligibleCount > 0 && approveCount / eligibleCount >= threshold) {
    await prisma.forgivenessRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED" },
    });
    await prisma.taskInstance.update({
      where: { id: request.taskInstanceId },
      data: { status: "FORGIVEN" },
    });
    await forgivenessReversal({
      userId: request.taskInstance.userId,
      amount: request.taskInstance.stakeAmount,
      spaceId: request.taskInstance.spaceId,
      taskInstanceId: request.taskInstanceId,
    });
  }

  revalidatePath(`/dashboard/spaces/${request.taskInstance.spaceId}`);
  return { ok: true };
}
