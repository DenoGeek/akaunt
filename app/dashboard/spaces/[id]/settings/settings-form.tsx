"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { requestSpaceSettingsChange } from "@/app/actions/spaces";
import type { SpaceRules } from "@prisma/client";

export function SpaceSettingsForm({ spaceId, rules }: { spaceId: string; rules: SpaceRules }) {
  const router = useRouter();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function submit(formData: FormData) {
    setMessage(null);
    const result = await requestSpaceSettingsChange(spaceId, formData);
    if (!result.ok) {
      setMessage({ type: "error", text: result.error });
      return;
    }
    if (result.applied) {
      setMessage({ type: "success", text: "Settings updated." });
      router.refresh();
      return;
    }
    setMessage({ type: "success", text: result.message ?? "Changes submitted for approval." });
    router.refresh();
  }

  return (
    <form action={submit} className="space-y-6">
      {message && (
        <p
          className={`rounded-md px-3 py-2 text-sm ${
            message.type === "error"
              ? "bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-200"
              : "bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-800 text-green-700 dark:text-green-200"
          }`}
        >
          {message.text}
        </p>
      )}
      <div>
        <label htmlFor="minStake" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Minimum stake (coins)
        </label>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
          Minimum coins members must put at risk per task. When a task is missed, the penalty (or fine, if using ledger) equals the stake they set for that task — so this is the minimum penalty/fine per task.
        </p>
        <input
          id="minStake"
          name="minStake"
          type="number"
          min={1}
          defaultValue={rules.minStake}
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id="strictDeadline"
          name="strictDeadline"
          type="checkbox"
          defaultChecked={rules.strictDeadline}
          className="rounded border-zinc-400 dark:border-zinc-600 accent-violet-600"
        />
        <label htmlFor="strictDeadline" className="text-sm text-zinc-600 dark:text-zinc-400">
          Strict deadline
        </label>
      </div>
      <div>
        <label htmlFor="graceMinutes" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Grace period (minutes)
        </label>
        <input
          id="graceMinutes"
          name="graceMinutes"
          type="number"
          min={0}
          defaultValue={rules.graceMinutes}
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100"
        />
      </div>
      <div>
        <label htmlFor="weeklyForgivenessTokens" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Weekly forgiveness tokens per member
        </label>
        <input
          id="weeklyForgivenessTokens"
          name="weeklyForgivenessTokens"
          type="number"
          min={0}
          defaultValue={rules.weeklyForgivenessTokens}
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id="groupVoteEnabled"
          name="groupVoteEnabled"
          type="checkbox"
          defaultChecked={rules.groupVoteEnabled}
          className="rounded border-zinc-400 dark:border-zinc-600 accent-violet-600"
        />
        <label htmlFor="groupVoteEnabled" className="text-sm text-zinc-600 dark:text-zinc-400">
          Enable group vote forgiveness
        </label>
      </div>
      <div>
        <label htmlFor="voteThresholdPercent" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Vote threshold (% approve to grant)
        </label>
        <input
          id="voteThresholdPercent"
          name="voteThresholdPercent"
          type="number"
          min={0}
          max={100}
          defaultValue={rules.voteThresholdPercent}
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100"
        />
      </div>
      <div>
        <label htmlFor="timezone" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Timezone (IANA)
        </label>
        <input
          id="timezone"
          name="timezone"
          type="text"
          defaultValue={rules.timezone}
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100"
          placeholder="Africa/Nairobi"
        />
      </div>
      <div>
        <label htmlFor="currencySymbol" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Currency symbol (for ledger display)
        </label>
        <input
          id="currencySymbol"
          name="currencySymbol"
          type="text"
          maxLength={10}
          defaultValue={rules.currencySymbol}
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100"
          placeholder="$"
        />
      </div>
      <div className="flex items-start gap-2">
        <input
          id="useLedgerForFines"
          name="useLedgerForFines"
          type="checkbox"
          defaultChecked={rules.useLedgerForFines}
          className="rounded border-zinc-400 dark:border-zinc-600 accent-violet-600 mt-0.5"
        />
        <div>
          <label htmlFor="useLedgerForFines" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block">
            Use ledger for fines
          </label>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Track fines in the space ledger instead of deducting coins. The fine per missed task equals the stake the member put on that task (no separate fine amount). Settlements can be recorded and must be confirmed by all members.
          </p>
        </div>
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-xl bg-violet-600 hover:bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
        >
          Save changes
        </button>
        <Link
          href={`/dashboard/spaces/${spaceId}`}
          className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
