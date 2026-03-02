"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getUserByClerkId } from "@/lib/auth";
import { createLedgerEntry, getFineBalanceForSpace } from "@/lib/ledger";
import { createNotificationsForMembers } from "@/lib/notifications";

export type ProposeLedgerSettlementResult =
  | { ok: true; proposalId: string }
  | { ok: false; error: string };

export async function proposeLedgerSettlement(
  spaceId: string,
  targetUserId: string,
  amount: number,
  reason: string | null
): Promise<ProposeLedgerSettlementResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const user = await getUserByClerkId(userId);
  if (!user) return { ok: false, error: "User not found" };

  const member = await prisma.spaceMember.findUnique({
    where: { spaceId_userId: { spaceId, userId: user.id } },
  });
  if (!member) return { ok: false, error: "Not a member of this space" };

  if (amount >= 0) return { ok: false, error: "Settlement amount must be negative (reducing fines)" };
  if (!Number.isInteger(amount)) return { ok: false, error: "Amount must be an integer" };

  const targetMember = await prisma.spaceMember.findUnique({
    where: { spaceId_userId: { spaceId, userId: targetUserId } },
  });
  if (!targetMember) return { ok: false, error: "Target user is not a member of this space" };

  const fineBalance = await getFineBalanceForSpace(targetUserId, spaceId);
  if (fineBalance + amount < 0) {
    return { ok: false, error: "Settlement would over-offset current fine balance" };
  }

  const proposal = await prisma.ledgerSettlementProposal.create({
    data: {
      spaceId,
      createdById: user.id,
      targetUserId,
      amount,
      reason: reason ?? undefined,
      status: "PENDING",
    },
  });

  await prisma.ledgerSettlementConfirmation.create({
    data: { proposalId: proposal.id, userId: user.id, confirmed: true },
  });

  const memberIds = await prisma.spaceMember.findMany({
    where: { spaceId },
    select: { userId: true },
  }).then((rows) => rows.map((r) => r.userId));
  await createNotificationsForMembers({
    memberIds,
    type: "SETTLEMENT_CONFIRM_NEEDED",
    spaceId,
    relatedId: proposal.id,
  });

  revalidatePath(`/dashboard/spaces/${spaceId}`);
  return { ok: true, proposalId: proposal.id };
}

export type ConfirmLedgerSettlementResult = { ok: true } | { ok: false; error: string };

export async function confirmLedgerSettlement(proposalId: string): Promise<ConfirmLedgerSettlementResult> {
  return setLedgerSettlementConfirmation(proposalId, true);
}

export async function rejectLedgerSettlement(proposalId: string): Promise<ConfirmLedgerSettlementResult> {
  return setLedgerSettlementConfirmation(proposalId, false);
}

async function setLedgerSettlementConfirmation(
  proposalId: string,
  confirmed: boolean
): Promise<ConfirmLedgerSettlementResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const user = await getUserByClerkId(userId);
  if (!user) return { ok: false, error: "User not found" };

  const proposal = await prisma.ledgerSettlementProposal.findUnique({
    where: { id: proposalId },
    include: { space: { include: { members: { select: { userId: true } } } } },
  });
  if (!proposal) return { ok: false, error: "Proposal not found" };
  if (proposal.status !== "PENDING") return { ok: false, error: "Proposal is no longer pending" };

  const isMember = proposal.space.members.some((m) => m.userId === user.id);
  if (!isMember) return { ok: false, error: "Not a member of this space" };

  await prisma.ledgerSettlementConfirmation.upsert({
    where: { proposalId_userId: { proposalId, userId: user.id } },
    create: { proposalId, userId: user.id, confirmed },
    update: { confirmed },
  });

  const confirmations = await prisma.ledgerSettlementConfirmation.findMany({
    where: { proposalId },
  });
  const memberIds = proposal.space.members.map((m) => m.userId);
  const allConfirmed = memberIds.every((mid) => {
    const c = confirmations.find((x) => x.userId === mid);
    return c?.confirmed === true;
  });
  const anyRejected = confirmations.some((c) => c.confirmed === false);

  if (anyRejected) {
    await prisma.ledgerSettlementProposal.update({
      where: { id: proposalId },
      data: { status: "REJECTED" },
    });
    revalidatePath(`/dashboard/spaces/${proposal.spaceId}`);
    return { ok: true };
  }

  if (allConfirmed) {
    await createLedgerEntry({
      userId: proposal.targetUserId,
      amount: proposal.amount,
      type: "FINE_SETTLEMENT",
      spaceId: proposal.spaceId,
      taskInstanceId: null,
    });
    await prisma.ledgerSettlementProposal.update({
      where: { id: proposalId },
      data: { status: "APPLIED", appliedAt: new Date() },
    });
  }

  revalidatePath(`/dashboard/spaces/${proposal.spaceId}`);
  return { ok: true };
}
