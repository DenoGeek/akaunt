import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ensureUserSynced, getUserByClerkId } from "@/lib/auth";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/sign-in");

  const email = (sessionClaims?.email as string) ?? null;
  await ensureUserSynced(userId, email);
  const user = await getUserByClerkId(userId);
  const unreadCount = user
    ? await prisma.notification.count({ where: { userId: user.id, readAt: null } })
    : 0;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Top nav */}
      <header className="sticky top-0 z-50 border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex items-center gap-6 h-14">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="text-base font-bold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent shrink-0"
          >
            Akaunt
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1 flex-1">
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/70 transition-colors"
            >
              Home
            </Link>
            <Link
              href="/dashboard/spaces"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/70 transition-colors"
            >
              Spaces
            </Link>
            <Link
              href="/dashboard/spaces/new"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:text-violet-300 dark:hover:bg-violet-500/10 transition-colors"
            >
              + New space
            </Link>
            <Link
              href="/dashboard/notifications"
              className="relative rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/70 transition-colors"
            >
              Notifications
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          </nav>

          {/* Theme toggle + User */}
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
