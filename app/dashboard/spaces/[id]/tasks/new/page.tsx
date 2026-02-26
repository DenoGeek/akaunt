import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getUserByClerkId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTaskTemplate } from "@/app/actions/tasks";
import { redirect } from "next/navigation";

const WEEKDAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default async function NewTaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id: spaceId } = await params;
  const { error } = await searchParams;
  const { userId } = await auth();
  if (!userId) return null;
  const user = await getUserByClerkId(userId);
  if (!user) return null;

  const member = await prisma.spaceMember.findUnique({
    where: { spaceId_userId: { spaceId, userId: user.id } },
    include: { space: { include: { rules: true } } },
  });
  if (!member) notFound();

  const minStake = member.space.rules?.minStake ?? 1;

  return (
    <div className="max-w-xl">
      <Link
        href={`/dashboard/spaces/${spaceId}`}
        className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400 mb-4 inline-block transition-colors"
      >
        ← Back to {member.space.name}
      </Link>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Add task</h1>
      <p className="text-zinc-500 mb-6">
        Risk coins if you fail. Minimum stake:{" "}
        <span className="font-medium text-zinc-700 dark:text-zinc-300">{minStake} coins</span>.
      </p>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-200">
          {decodeURIComponent(error)}
        </p>
      )}

      <form
        action={async (formData: FormData) => {
          "use server";
          const result = await createTaskTemplate(formData);
          if (result.ok) redirect(`/dashboard/spaces/${spaceId}`);
          redirect(
            `/dashboard/spaces/${spaceId}/tasks/new?error=${encodeURIComponent(result.error)}`
          );
        }}
        className="space-y-5"
      >
        <input type="hidden" name="spaceId" value={spaceId} />

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
            placeholder="e.g. Run 5k"
          />
        </div>

        <div>
          <label htmlFor="recurrenceType" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Repeats
          </label>
          <select
            id="recurrenceType"
            name="recurrenceType"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
          >
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
          </select>
        </div>

        <div>
          <label htmlFor="weekday" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Day of week <span className="text-zinc-400 dark:text-zinc-500 font-normal">(for weekly tasks)</span>
          </label>
          <select
            id="weekday"
            name="weekday"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
          >
            {WEEKDAYS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="stake" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Stake (coins)
          </label>
          <input
            id="stake"
            name="stake"
            type="number"
            min={minStake}
            defaultValue={minStake}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            className="rounded-xl bg-violet-600 hover:bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            Add task
          </button>
          <Link
            href={`/dashboard/spaces/${spaceId}`}
            className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
