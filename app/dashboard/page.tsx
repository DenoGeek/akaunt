import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getUserByClerkId } from "@/lib/auth";
import Link from "next/link";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await getUserByClerkId(userId);
  if (!user) redirect("/sign-in");

  const membership = await prisma.spaceMember.findFirst({
    where: { userId: user.id },
    orderBy: { joinedAt: "desc" },
    include: { space: true },
  });

  if (membership) redirect(`/dashboard/spaces/${membership.space.id}`);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="text-6xl mb-6 select-none">🚀</div>

      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
        Welcome to{" "}
        <span className="bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
          Akaunt
        </span>
      </h1>

      <p className="text-zinc-600 dark:text-zinc-400 text-base sm:text-lg max-w-md mb-10">
        You don&apos;t have a space yet. Create one and invite your team — then
        start staking coins on your tasks.
      </p>

      <Link
        href="/dashboard/spaces/new"
        className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-200 dark:shadow-violet-900/40 transition-all hover:shadow-violet-300 dark:hover:shadow-violet-700/40 hover:-translate-y-0.5"
      >
        Create your first space →
      </Link>

      <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl w-full text-left">
        <div className="flex flex-col gap-2">
          <span className="text-2xl">1️⃣</span>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Create a space</h3>
          <p className="text-xs text-zinc-500">A shared workspace for your team&apos;s accountability.</p>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-2xl">2️⃣</span>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Add tasks &amp; stake coins</h3>
          <p className="text-xs text-zinc-500">Commit to your goals and put something on the line.</p>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-2xl">3️⃣</span>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Hit deadlines, win</h3>
          <p className="text-xs text-zinc-500">Complete tasks to keep your coins. Miss them, pay up.</p>
        </div>
      </div>
    </div>
  );
}
