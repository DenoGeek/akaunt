import { createSpace } from "@/app/actions/spaces";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function NewSpacePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Create Space</h1>
      <p className="text-zinc-500 mb-6">Set up an accountability space and rules.</p>
      {error && (
        <p className="mb-4 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-200">
          {decodeURIComponent(error)}
        </p>
      )}
      <form action={async (formData: FormData) => {
        "use server";
        const result = await createSpace(formData);
        if (result.ok) redirect(`/dashboard/spaces/${result.spaceId}`);
        redirect(`/dashboard/spaces/new?error=${encodeURIComponent(result.error)}`);
      }} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            placeholder="e.g. Workouts"
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Description (optional)
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            placeholder="What this space is for"
          />
        </div>
        <div className="flex items-center gap-2">
          <input id="isPrivate" name="isPrivate" type="checkbox" className="rounded border-zinc-400 dark:border-zinc-600 accent-violet-600" />
          <label htmlFor="isPrivate" className="text-sm text-zinc-600 dark:text-zinc-400">Private space</label>
        </div>
        <hr className="border-zinc-200 dark:border-zinc-800" />
        <h2 className="text-lg font-medium text-zinc-800 dark:text-zinc-200">Rules</h2>
        <div>
          <label htmlFor="minStake" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Minimum stake (coins)
          </label>
          <input
            id="minStake"
            name="minStake"
            type="number"
            min={1}
            defaultValue={1}
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100"
          />
        </div>
        <div className="flex items-center gap-2">
          <input id="strictDeadline" name="strictDeadline" type="checkbox" defaultChecked className="rounded border-zinc-400 dark:border-zinc-600 accent-violet-600" />
          <label htmlFor="strictDeadline" className="text-sm text-zinc-600 dark:text-zinc-400">Strict deadline</label>
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
            defaultValue={0}
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
            defaultValue={1}
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100"
          />
        </div>
        <div className="flex items-center gap-2">
          <input id="groupVoteEnabled" name="groupVoteEnabled" type="checkbox" className="rounded border-zinc-400 dark:border-zinc-600 accent-violet-600" />
          <label htmlFor="groupVoteEnabled" className="text-sm text-zinc-600 dark:text-zinc-400">Enable group vote forgiveness</label>
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
            defaultValue={50}
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-xl bg-violet-600 hover:bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            Create Space
          </button>
          <Link
            href="/dashboard/spaces"
            className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
