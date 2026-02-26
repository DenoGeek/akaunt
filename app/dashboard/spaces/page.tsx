import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { getUserByClerkId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDistanceToNow } from "date-fns";

export default async function SpacesListPage() {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await getUserByClerkId(userId);
  if (!user) return null;

  const memberships = await prisma.spaceMember.findMany({
    where: { userId: user.id },
    include: {
      space: {
        include: {
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            Your Spaces
          </h1>
          <p className="text-zinc-500 mt-1 text-sm">
            {memberships.length === 0
              ? "No spaces yet — create one to get started."
              : `${memberships.length} space${memberships.length !== 1 ? "s" : ""} you're part of`}
          </p>
        </div>
        <Link
          href="/dashboard/spaces/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-200 dark:shadow-violet-900/40 transition-all hover:-translate-y-0.5"
        >
          + New space
        </Link>
      </div>

      {/* Empty state */}
      {memberships.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-100/50 dark:bg-zinc-900/40 py-20 text-center">
          <div className="text-5xl mb-4 select-none">🌌</div>
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-2">No spaces yet</h2>
          <p className="text-zinc-500 text-sm max-w-xs mb-6">
            Create a space and invite your team to start holding each other accountable.
          </p>
          <Link
            href="/dashboard/spaces/new"
            className="rounded-xl bg-violet-600 hover:bg-violet-500 px-6 py-2.5 text-sm font-semibold text-white transition-all"
          >
            Create your first space →
          </Link>
        </div>
      )}

      {/* Space cards grid */}
      {memberships.length > 0 && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {memberships.map((m) => {
            const isOwner = m.role === "OWNER";
            const memberCount = m.space._count.members;

            return (
              <li key={m.id}>
                <Link
                  href={`/dashboard/spaces/${m.space.id}`}
                  className="group flex flex-col h-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-5 hover:border-violet-400 dark:hover:border-violet-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors leading-snug">
                      {m.space.name}
                    </h2>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                        isOwner
                          ? "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700/60 dark:text-zinc-400"
                      }`}
                    >
                      {isOwner ? "Owner" : "Member"}
                    </span>
                  </div>

                  {m.space.description ? (
                    <p className="text-sm text-zinc-500 mb-4 flex-1 line-clamp-2">
                      {m.space.description}
                    </p>
                  ) : (
                    <p className="text-sm text-zinc-400 dark:text-zinc-600 italic mb-4 flex-1">No description</p>
                  )}

                  <div className="flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-600 mt-auto pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="flex items-center gap-1">
                      <span>👥</span>
                      {memberCount} member{memberCount !== 1 ? "s" : ""}
                    </span>
                    <span>
                      Joined{" "}
                      {formatDistanceToNow(new Date(m.joinedAt), { addSuffix: true })}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
