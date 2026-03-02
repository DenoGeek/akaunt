"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getUserByClerkId } from "@/lib/auth";
import { stakeReturn } from "@/lib/ledger";
import { createNotificationsForMembers } from "@/lib/notifications";
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
  timezone: z.string().min(1).optional(),
  currencySymbol: z.string().max(10).optional(),
  useLedgerForFines: z.boolean().optional(),
});

/** Snapshot of SpaceRules for proposals */
export type SpaceRulesSnapshot = {
  minStake: number;
  strictDeadline: boolean;
  graceMinutes: number;
  weeklyForgivenessTokens: number;
  groupVoteEnabled: boolean;
  voteThresholdPercent: number;
  timezone: string;
  currencySymbol: string;
  useLedgerForFines: boolean;
};

const spaceSettingsSchema = z.object({
  minStake: z.number().int().min(0),
  strictDeadline: z.boolean(),
  graceMinutes: z.number().int().min(0),
  weeklyForgivenessTokens: z.number().int().min(0),
  groupVoteEnabled: z.boolean(),
  voteThresholdPercent: z.number().int().min(0).max(100),
  timezone: z.string().min(1),
  currencySymbol: z.string().max(10),
  useLedgerForFines: z.boolean(),
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
          timezone: data.timezone ?? "Africa/Nairobi",
          currencySymbol: data.currencySymbol ?? "$",
          useLedgerForFines: data.useLedgerForFines ?? false,
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
    const hadStakeLock = await prisma.ledgerEntry.findFirst({
      where: { taskInstanceId: inst.id, type: "STAKE_LOCK" },
    });
    if (hadStakeLock) {
      await stakeReturn({
        userId: user.id,
        amount: inst.stakeAmount,
        spaceId,
        taskInstanceId: inst.id,
      });
    }
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

export type RequestSpaceSettingsChangeResult =
  | { ok: true; applied: true }
  | { ok: true; applied: false; proposalId: string; message: string }
  | { ok: false; error: string };

export async function requestSpaceSettingsChange(
  spaceId: string,
  formData: FormData
): Promise<RequestSpaceSettingsChangeResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const user = await getUserByClerkId(userId);
  if (!user) return { ok: false, error: "User not found" };

  const member = await prisma.spaceMember.findUnique({
    where: { spaceId_userId: { spaceId, userId: user.id } },
  });
  if (!member) return { ok: false, error: "Not a member of this space" };

  const rules = await prisma.spaceRules.findUnique({ where: { spaceId } });
  if (!rules) return { ok: false, error: "Space has no rules" };

  const parsed = spaceSettingsSchema.safeParse({
    minStake: Number(formData.get("minStake")) ?? rules.minStake,
    strictDeadline: formData.get("strictDeadline") === "on",
    graceMinutes: Number(formData.get("graceMinutes")) ?? rules.graceMinutes,
    weeklyForgivenessTokens: Number(formData.get("weeklyForgivenessTokens")) ?? rules.weeklyForgivenessTokens,
    groupVoteEnabled: formData.get("groupVoteEnabled") === "on",
    voteThresholdPercent: Number(formData.get("voteThresholdPercent")) ?? rules.voteThresholdPercent,
    timezone: (formData.get("timezone") as string) || rules.timezone,
    currencySymbol: (formData.get("currencySymbol") as string) || rules.currencySymbol,
    useLedgerForFines: formData.get("useLedgerForFines") === "on",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.message };

  const snapshot: SpaceRulesSnapshot = parsed.data;
  const memberCount = await prisma.spaceMember.count({ where: { spaceId } });

  if (memberCount <= 1) {
    await prisma.spaceRules.update({
      where: { spaceId },
      data: {
        minStake: snapshot.minStake,
        strictDeadline: snapshot.strictDeadline,
        graceMinutes: snapshot.graceMinutes,
        weeklyForgivenessTokens: snapshot.weeklyForgivenessTokens,
        groupVoteEnabled: snapshot.groupVoteEnabled,
        voteThresholdPercent: snapshot.voteThresholdPercent,
        timezone: snapshot.timezone,
        currencySymbol: snapshot.currencySymbol,
        useLedgerForFines: snapshot.useLedgerForFines,
      },
    });
    revalidatePath("/dashboard/spaces");
    revalidatePath(`/dashboard/spaces/${spaceId}`);
    return { ok: true, applied: true };
  }

  await prisma.spaceSettingsProposal.updateMany({
    where: { spaceId, status: "PENDING" },
    data: { status: "SUPERSEDED" },
  });

  const proposal = await prisma.spaceSettingsProposal.create({
    data: {
      spaceId,
      createdById: user.id,
      status: "PENDING",
      settingsJson: snapshot as unknown as object,
    },
  });

  await prisma.spaceSettingsVote.create({
    data: { proposalId: proposal.id, userId: user.id, vote: "APPROVE" },
  });

  const otherMemberIds = await prisma.spaceMember.findMany({
    where: { spaceId },
    select: { userId: true },
  }).then((rows) => rows.filter((r) => r.userId !== user.id).map((r) => r.userId));
  if (otherMemberIds.length > 0) {
    await createNotificationsForMembers({
      memberIds: otherMemberIds,
      type: "SETTINGS_VOTE_NEEDED",
      spaceId,
      relatedId: proposal.id,
    });
  }

  revalidatePath("/dashboard/spaces");
  revalidatePath(`/dashboard/spaces/${spaceId}`);
  return {
    ok: true,
    applied: false,
    proposalId: proposal.id,
    message: `Changes submitted for approval from ${memberCount - 1} other member(s).`,
  };
}

export type VoteOnSpaceSettingsResult = { ok: true } | { ok: false; error: string };

export async function voteOnSpaceSettings(
  proposalId: string,
  vote: "APPROVE" | "REJECT"
): Promise<VoteOnSpaceSettingsResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const user = await getUserByClerkId(userId);
  if (!user) return { ok: false, error: "User not found" };

  const proposal = await prisma.spaceSettingsProposal.findUnique({
    where: { id: proposalId },
    include: {
      space: { include: { members: { select: { userId: true } }, rules: true } },
      votes: true,
    },
  });
  if (!proposal) return { ok: false, error: "Proposal not found" };
  if (proposal.status !== "PENDING") return { ok: false, error: "Proposal is no longer pending" };

  const isMember = proposal.space.members.some((m) => m.userId === user.id);
  if (!isMember) return { ok: false, error: "Not a member of this space" };

  await prisma.spaceSettingsVote.upsert({
    where: { proposalId_userId: { proposalId, userId: user.id } },
    create: { proposalId, userId: user.id, vote: vote === "APPROVE" ? "APPROVE" : "REJECT" },
    update: { vote: vote === "APPROVE" ? "APPROVE" : "REJECT" },
  });

  const otherMemberIds = proposal.space.members.filter((m) => m.userId !== proposal.createdById).map((m) => m.userId);
  const votes = await prisma.spaceSettingsVote.findMany({ where: { proposalId } });
  const rejectByOther = votes.find((v) => v.vote === "REJECT" && otherMemberIds.includes(v.userId));
  if (rejectByOther) {
    await prisma.spaceSettingsProposal.update({
      where: { id: proposalId },
      data: { status: "CANCELLED" },
    });
    revalidatePath("/dashboard/spaces");
    revalidatePath(`/dashboard/spaces/${proposal.spaceId}`);
    return { ok: true };
  }

  const approvedByOther = otherMemberIds.filter((oid) => votes.some((v) => v.userId === oid && v.vote === "APPROVE"));
  if (approvedByOther.length < otherMemberIds.length) {
    revalidatePath("/dashboard/spaces");
    revalidatePath(`/dashboard/spaces/${proposal.spaceId}`);
    return { ok: true };
  }

  const snapshot = proposal.settingsJson as unknown as SpaceRulesSnapshot;
  await prisma.$transaction([
    prisma.spaceRules.update({
      where: { spaceId: proposal.spaceId },
      data: {
        minStake: snapshot.minStake,
        strictDeadline: snapshot.strictDeadline,
        graceMinutes: snapshot.graceMinutes,
        weeklyForgivenessTokens: snapshot.weeklyForgivenessTokens,
        groupVoteEnabled: snapshot.groupVoteEnabled,
        voteThresholdPercent: snapshot.voteThresholdPercent,
        timezone: snapshot.timezone,
        currencySymbol: snapshot.currencySymbol,
        useLedgerForFines: snapshot.useLedgerForFines,
      },
    }),
    prisma.spaceSettingsProposal.update({
      where: { id: proposalId },
      data: { status: "APPLIED", appliedAt: new Date() },
    }),
  ]);

  revalidatePath("/dashboard/spaces");
  revalidatePath(`/dashboard/spaces/${proposal.spaceId}`);
  return { ok: true };
}
