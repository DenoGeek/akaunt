"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getUserByClerkId } from "@/lib/auth";
import { stakeReturn } from "@/lib/ledger";
import { z } from "zod";

const createSpaceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  isPrivate: z.boolean().default(false),
  minStake: z.number().int().min(0),
  strictDeadline: z.boolean(),
  graceMinutes: z.number().int().min(0),
  weeklyForgivenessTokens: z.number().int().min(0),
  groupVoteEnabled: z.boolean(),
  voteThresholdPercent: z.number().int().min(0).max(100),
});

export type CreateSpaceResult =
  | { ok: true; spaceId: string }
  | { ok: false; error: string };

export async function createSpace(formData: FormData): Promise<CreateSpaceResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const user = await getUserByClerkId(userId);
  if (!user) return { ok: false, error: "User not found" };

  const parsed = createSpaceSchema.safeParse({
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? undefined,
    isPrivate: formData.get("isPrivate") === "on",
    minStake: Number(formData.get("minStake")) || 1,
    strictDeadline: formData.get("strictDeadline") === "on",
    graceMinutes: Number(formData.get("graceMinutes")) || 0,
    weeklyForgivenessTokens: Number(formData.get("weeklyForgivenessTokens")) ?? 1,
    groupVoteEnabled: formData.get("groupVoteEnabled") === "on",
    voteThresholdPercent: Number(formData.get("voteThresholdPercent")) ?? 50,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.message };

  const data = parsed.data;
  const space = await prisma.space.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      isPrivate: data.isPrivate,
      createdById: user.id,
      rules: {
        create: {
          minStake: data.minStake,
          strictDeadline: data.strictDeadline,
          graceMinutes: data.graceMinutes,
          weeklyForgivenessTokens: data.weeklyForgivenessTokens,
          groupVoteEnabled: data.groupVoteEnabled,
          voteThresholdPercent: data.voteThresholdPercent,
        },
      },
      members: {
        create: {
          userId: user.id,
          role: "OWNER",
        },
      },
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/spaces");
  return { ok: true, spaceId: space.id };
}

export async function joinSpace(spaceId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const user = await getUserByClerkId(userId);
  if (!user) return { ok: false, error: "User not found" };

  const space = await prisma.space.findUnique({ where: { id: spaceId } });
  if (!space) return { ok: false, error: "Space not found" };

  const existing = await prisma.spaceMember.findUnique({
    where: { spaceId_userId: { spaceId, userId: user.id } },
  });
  if (existing) return { ok: false, error: "Already a member" };

  await prisma.spaceMember.create({
    data: { spaceId, userId: user.id, role: "MEMBER" },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/spaces");
  revalidatePath(`/dashboard/spaces/${spaceId}`);
  return { ok: true };
}

export async function leaveSpace(spaceId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const user = await getUserByClerkId(userId);
  if (!user) return { ok: false, error: "User not found" };

  const member = await prisma.spaceMember.findUnique({
    where: { spaceId_userId: { spaceId, userId: user.id } },
    include: { space: true },
  });
  if (!member) return { ok: false, error: "Not a member" };
  if (member.role === "OWNER") {
    const ownerCount = await prisma.spaceMember.count({
      where: { spaceId, role: "OWNER" },
    });
    if (ownerCount <= 1) return { ok: false, error: "Transfer ownership before leaving" };
  }

  const now = new Date();
  const futurePending = await prisma.taskInstance.findMany({
    where: {
      userId: user.id,
      spaceId,
      status: "PENDING",
      dueAt: { gt: now },
    },
  });
  for (const inst of futurePending) {
    await stakeReturn({
      userId: user.id,
      amount: inst.stakeAmount,
      spaceId,
      taskInstanceId: inst.id,
    });
    await prisma.taskInstance.delete({ where: { id: inst.id } });
  }
  await prisma.spaceMember.delete({
    where: { spaceId_userId: { spaceId, userId: user.id } },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/spaces");
  revalidatePath(`/dashboard/spaces/${spaceId}`);
  return { ok: true };
}
