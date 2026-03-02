"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { proposeLedgerSettlement, confirmLedgerSettlement, rejectLedgerSettlement } from "@/app/actions/ledger";

type MemberBalance = { userId: string; email: string | null; balance: number };
type PendingProposal = {
  id: string;
  targetUserId: string;
  amount: number;
  reason: string | null;
  targetUser: { email: string | null };
  createdBy: { email: string | null };
  confirmations: { userId: string; confirmed: boolean }[];
};

export function FinesLedgerClient({
  spaceId,
  currentUserId,
  currencySymbol,
  memberFineBalances,
  pendingProposals,
  memberIds,
}: {
  spaceId: string;
  currentUserId: string;
  currencySymbol: string;
  memberFineBalances: MemberBalance[];
  pendingProposals: PendingProposal[];
  memberIds: string[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePropose(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const form = e.currentTarget;
    const targetUserId = (form.querySelector('[name="targetUserId"]') as HTMLSelectElement)?.value;
    const amount = Number((form.querySelector('[name="amount"]') as HTMLInputElement)?.value);
    const reason = (form.querySelector('[name="reason"]') as HTMLInputElement)?.value?.trim() || null;
    if (!targetUserId || !Number.isInteger(amount) || amount >= 0) {
      setMessage({ type: "error", text: "Select a member and enter a negative amount." });
      return;
    }
    setLoading(true);
    const result = await proposeLedgerSettlement(spaceId, targetUserId, amount, reason);
    setLoading(false);
    if (result.ok) {
      setMessage({ type: "success", text: "Settlement proposed. All members must confirm." });
      router.refresh();
    } else {
      setMessage({ type: "error", text: result.error });
    }
  }

  async function confirm(proposalId: string) {
    setLoading(true);
    await confirmLedgerSettlement(proposalId);
    setLoading(false);
    router.refresh();
  }

  async function reject(proposalId: string) {
    setLoading(true);
    await rejectLedgerSettlement(proposalId);
    setLoading(false);
    router.refresh();
  }

  const withFines = memberFineBalances.filter((m) => m.balance !== 0);
  const myConfirmation = (p: PendingProposal) => p.confirmations.find((c) => c.userId === currentUserId);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Fines & ledger</h3>

      {message && (
        <p
          className={`text-sm rounded-md px-3 py-2 ${
            message.type === "error"
              ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200"
              : "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-200"
          }`}
        >
          {message.text}
        </p>
      )}

      <div>
        <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Fine balances</h4>
        {withFines.length === 0 ? (
          <p className="text-xs text-zinc-500">No outstanding fines.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {withFines.map((m) => (
              <li key={m.userId} className="flex justify-between">
                <span className="text-zinc-700 dark:text-zinc-300">{m.email ?? m.userId.slice(0, 8)}</span>
                <span className={m.balance > 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}>
                  {m.balance > 0 ? "+" : ""}{currencySymbol}{m.balance}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={handlePropose} className="space-y-2">
        <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Propose settlement (payment recorded)</h4>
        <div className="flex flex-wrap gap-2 items-end">
          <select
            name="targetUserId"
            className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
          >
            <option value="">Select member</option>
            {memberFineBalances.filter((m) => m.balance > 0).map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.email ?? m.userId.slice(0, 8)} ({currencySymbol}{m.balance})
              </option>
            ))}
          </select>
          <input
            name="amount"
            type="number"
            placeholder="Amount (negative)"
            className="w-28 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
          />
          <input
            name="reason"
            type="text"
            placeholder="Reason (optional)"
            className="flex-1 min-w-0 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Propose
          </button>
        </div>
      </form>

      {pendingProposals.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Pending settlements</h4>
          <ul className="space-y-2">
            {pendingProposals.map((p) => {
              const myVote = myConfirmation(p);
              const allConfirmed = memberIds.every((mid) => p.confirmations.find((c) => c.userId === mid)?.confirmed === true);
              return (
                <li
                  key={p.id}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-3 text-sm"
                >
                  <div className="flex justify-between flex-wrap gap-2">
                    <span>
                      {currencySymbol}{p.amount} for {p.targetUser.email ?? p.targetUserId.slice(0, 8)}
                      {p.reason ? ` — ${p.reason}` : ""}
                    </span>
                    {myVote === undefined ? (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => confirm(p.id)}
                          disabled={loading}
                          className="rounded bg-green-600 hover:bg-green-500 px-2 py-1 text-xs text-white disabled:opacity-50"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => reject(p.id)}
                          disabled={loading}
                          className="rounded border border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 text-xs disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-zinc-500 text-xs">
                        You {myVote.confirmed ? "confirmed" : "rejected"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    {allConfirmed ? "Waiting for all to confirm…" : `${p.confirmations.filter((c) => c.confirmed).length}/${memberIds.length} confirmed`}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
