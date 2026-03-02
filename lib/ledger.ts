import { prisma } from "@/lib/prisma";
import type { LedgerEntryType } from "@prisma/client";

const WALLET_ENTRY_TYPES = ["PURCHASE", "STAKE_LOCK", "STAKE_RETURN", "PENALTY", "FORGIVENESS_REVERSAL"] as const;

/** Main wallet balance (spendable coins); excludes FINE and FINE_SETTLEMENT which are tracked per-space. */
export async function getBalance(userId: string): Promise<number> {
  const result = await prisma.ledgerEntry.aggregate({
    where: { userId, type: { in: [...WALLET_ENTRY_TYPES] } },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

/** Sum of FINE and FINE_SETTLEMENT for a user in a space (positive = outstanding fine debt). */
export async function getFineBalanceForSpace(userId: string, spaceId: string): Promise<number> {
  const result = await prisma.ledgerEntry.aggregate({
    where: { userId, spaceId, type: { in: ["FINE", "FINE_SETTLEMENT"] } },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

export async function updateWalletCache(userId: string, balance: number): Promise<void> {
  await prisma.wallet.update({
    where: { userId },
    data: { balance },
  });
}

export async function createLedgerEntry(params: {
  userId: string;
  amount: number;
  type: LedgerEntryType;
  spaceId?: string | null;
  taskInstanceId?: string | null;
}): Promise<void> {
  const { userId, amount, type, spaceId, taskInstanceId } = params;
  await prisma.ledgerEntry.create({
    data: { userId, amount, type, spaceId, taskInstanceId },
  });
  // Only update wallet cache for non-fine types (wallet = spendable balance)
  if (type !== "FINE" && type !== "FINE_SETTLEMENT") {
    const newBalance = await getBalance(userId);
    await updateWalletCache(userId, newBalance);
  }
}

export async function stakeLock(params: {
  userId: string;
  amount: number;
  spaceId: string;
  taskInstanceId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const balance = await getBalance(params.userId);
  if (balance < params.amount) {
    return { ok: false, error: "Insufficient balance" };
  }
  await createLedgerEntry({
    userId: params.userId,
    amount: -params.amount,
    type: "STAKE_LOCK",
    spaceId: params.spaceId,
    taskInstanceId: params.taskInstanceId,
  });
  return { ok: true };
}

export async function stakeReturn(params: {
  userId: string;
  amount: number;
  spaceId: string;
  taskInstanceId: string;
}): Promise<void> {
  await createLedgerEntry({
    userId: params.userId,
    amount: params.amount,
    type: "STAKE_RETURN",
    spaceId: params.spaceId,
    taskInstanceId: params.taskInstanceId,
  });
}

/** Records penalty for audit; balance already reduced by STAKE_LOCK. */
export async function applyPenalty(params: {
  userId: string;
  amount: number;
  spaceId: string;
  taskInstanceId: string;
}): Promise<void> {
  await createLedgerEntry({
    userId: params.userId,
    amount: 0,
    type: "PENALTY",
    spaceId: params.spaceId,
    taskInstanceId: params.taskInstanceId,
  });
}

/** Records a fine in ledger mode (no stake burn); use when useLedgerForFines is true. */
export async function applyFine(params: {
  userId: string;
  amount: number;
  spaceId: string;
  taskInstanceId: string;
}): Promise<void> {
  await createLedgerEntry({
    userId: params.userId,
    amount: params.amount,
    type: "FINE",
    spaceId: params.spaceId,
    taskInstanceId: params.taskInstanceId,
  });
}

export async function forgivenessReversal(params: {
  userId: string;
  amount: number;
  spaceId: string;
  taskInstanceId: string;
}): Promise<void> {
  await createLedgerEntry({
    userId: params.userId,
    amount: params.amount,
    type: "FORGIVENESS_REVERSAL",
    spaceId: params.spaceId,
    taskInstanceId: params.taskInstanceId,
  });
}
