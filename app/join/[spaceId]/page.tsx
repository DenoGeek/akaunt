import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUserByClerkId, ensureUserSynced } from "@/lib/auth";
import { joinSpace } from "@/app/actions/spaces";

export default async function JoinSpacePage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    include: { _count: { select: { members: true } } },
  });

  if (!space) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Space not found</h1>
          <p className="text-zinc-500 text-sm mb-6">This invite link may be invalid or the space was deleted.</p>
          <Link href="/" className="text-sm text-violet-600 dark:text-violet-400 hover:underline">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  const { userId, sessionClaims } = await auth();

  // Not signed in — show a sign-in prompt
  if (!userId) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-5">🔗</div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-2">
            You&apos;re invited to join
          </h1>
          <p className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent mb-1">
            {space.name}
          </p>
          {space.description && (
            <p className="text-zinc-500 text-sm mt-2 mb-6">{space.description}</p>
          )}
          <p className="text-zinc-500 text-sm mb-8">
            {space._count.members} member{space._count.members !== 1 ? "s" : ""} · Sign in to join
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href={`/sign-in?redirect_url=/join/${spaceId}`}
              className="rounded-xl bg-violet-600 hover:bg-violet-500 px-6 py-3 text-sm font-semibold text-white transition-colors"
            >
              Sign in to join
            </Link>
            <Link
              href={`/sign-up?redirect_url=/join/${spaceId}`}
              className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Create an account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Signed in — sync user and check membership
  const email = (sessionClaims?.email as string) ?? null;
  await ensureUserSynced(userId, email);
  const user = await getUserByClerkId(userId);
  if (!user) redirect("/sign-in");

  const existing = await prisma.spaceMember.findUnique({
    where: { spaceId_userId: { spaceId, userId: user.id } },
  });

  if (existing) {
    redirect(`/dashboard/spaces/${spaceId}`);
  }

  // Show join confirmation
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-5">🎉</div>
        <h1 className="text-2xl font-extrabold tracking-tight mb-2">
          You&apos;re invited!
        </h1>
        <p className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent mb-1">
          {space.name}
        </p>
        {space.description && (
          <p className="text-zinc-500 text-sm mt-2">{space.description}</p>
        )}
        <p className="text-zinc-500 text-sm mt-3 mb-8">
          {space._count.members} member{space._count.members !== 1 ? "s" : ""} · Ready to hold each other accountable?
        </p>

        <form
          action={async () => {
            "use server";
            const result = await joinSpace(spaceId);
            if (result.ok) redirect(`/dashboard/spaces/${spaceId}`);
            redirect(`/dashboard/spaces`);
          }}
        >
          <button
            type="submit"
            className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 dark:shadow-violet-900/40 transition-all hover:-translate-y-0.5 mb-3"
          >
            Join space →
          </button>
        </form>
        <Link
          href="/dashboard"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          Maybe later
        </Link>
      </div>
    </div>
  );
}
