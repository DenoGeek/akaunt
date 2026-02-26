import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

const INITIAL_COINS = 100; // seed new users with credits for MVP

export async function getUserByClerkId(clerkUserId: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { clerkUserId },
  });
}

export async function ensureUserSynced(clerkUserId: string, email: string | null): Promise<User> {
  const existing = await prisma.user.findUnique({
    where: { clerkUserId },
    include: { wallet: true },
  });
  if (existing) return existing;

  const [user] = await prisma.$transaction([
    prisma.user.create({
      data: {
        clerkUserId,
        email: email ?? undefined,
      },
    }),
  ]);

  await prisma.$transaction([
    prisma.wallet.create({
      data: {
        userId: user.id,
        balance: INITIAL_COINS,
      },
    }),
    prisma.ledgerEntry.create({
      data: {
        userId: user.id,
        amount: INITIAL_COINS,
        type: "PURCHASE",
      },
    }),
  ]);

  return prisma.user.findUniqueOrThrow({
    where: { id: user.id },
  });
}
