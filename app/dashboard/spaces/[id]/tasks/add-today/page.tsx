import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getUserByClerkId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTodayTasksBatch } from "@/app/actions/tasks";
import { redirect } from "next/navigation";

const DEFAULT_ROWS = 5;

export default async function AddTodayTasksPage({
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
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
        Add today&apos;s tasks
      </h1>
      <p className="text-zinc-500 mb-6">
        Add multiple tasks for today. All due end of day. Minimum stake:{" "}
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
          const rows: { title: string; stake: number }[] = [];
          for (let i = 0; i < DEFAULT_ROWS + 5; i++) {
            const title = formData.get(`title_${i}`)?.toString()?.trim();
            const stake = Number(formData.get(`stake_${i}`));
            if (title) rows.push({ title, stake: stake >= minStake ? stake : minStake });
          }
          const result = await createTodayTasksBatch(spaceId, rows);
          if (result.ok) redirect(`/dashboard/spaces/${spaceId}`);
          redirect(`/dashboard/spaces/${spaceId}/tasks/add-today?error=${encodeURIComponent(result.error)}`);
        }}
        className="space-y-3"
      >
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] gap-0 bg-zinc-50 dark:bg-zinc-900/60 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wide">
            <span>Task</span>
            <span className="text-right pr-2">Stake</span>
            <span></span>
          </div>
          {Array.from({ length: DEFAULT_ROWS }, (_, i) => (
            <div
              key={i}
              className="flex gap-3 items-center px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/60 last:border-b-0 bg-white dark:bg-zinc-900/30"
            >
              <input
                type="text"
                name={`title_${i}`}
                placeholder={`Task ${i + 1}`}
                className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
              />
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  name={`stake_${i}`}
                  min={minStake}
                  defaultValue={minStake}
                  className="w-20 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
                />
                <span className="text-xs text-zinc-400 dark:text-zinc-500 w-8">coins</span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-zinc-400 dark:text-zinc-500 text-xs">
          Leave empty rows blank — only filled rows will be added.
        </p>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded-xl bg-violet-600 hover:bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            Add today&apos;s tasks
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
