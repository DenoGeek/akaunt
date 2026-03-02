import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ensureUserSynced, getUserByClerkId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardNav } from "@/components/dashboard-nav";

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
      <DashboardNav unreadCount={unreadCount} />

      {/* Page content */}
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
