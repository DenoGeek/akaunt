import { getFineBalanceForSpace } from "@/lib/ledger";
import { prisma } from "@/lib/prisma";
import { FinesLedgerClient } from "./fines-ledger-client";

export async function FinesLedgerSection({
  spaceId,
  currentUserId,
  currencySymbol,
  useLedgerForFines,
  members,
}: {
  spaceId: string;
  currentUserId: string;
  currencySymbol: string;
  useLedgerForFines: boolean;
  members: { userId: string; user: { id: string; email: string | null } }[];
}) {
  if (!useLedgerForFines) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Fines & ledger</h3>
        <p className="text-xs text-zinc-500">
          Enable &quot;Use ledger for fines&quot; in <a href={`/dashboard/spaces/${spaceId}/settings`} className="text-violet-600 dark:text-violet-400 hover:underline">Settings</a> to track and settle fines here.
        </p>
      </div>
    );
  }

  const fineBalances = await Promise.all(
    members.map(async (m) => ({ userId: m.userId, email: m.user.email, balance: await getFineBalanceForSpace(m.userId, spaceId) }))
  );

  const pendingProposals = await prisma.ledgerSettlementProposal.findMany({
    where: { spaceId, status: "PENDING" },
    include: {
      targetUser: { select: { id: true, email: true } },
      createdBy: { select: { id: true, email: true } },
      confirmations: { select: { userId: true, confirmed: true } },
    },
  });

  return (
    <FinesLedgerClient
      spaceId={spaceId}
      currentUserId={currentUserId}
      currencySymbol={currencySymbol}
      memberFineBalances={fineBalances}
      pendingProposals={pendingProposals}
      memberIds={members.map((m) => m.userId)}
    />
  );
}
