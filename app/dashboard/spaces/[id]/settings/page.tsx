import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getUserByClerkId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requestSpaceSettingsChange } from "@/app/actions/spaces";
import { SpaceSettingsForm } from "./settings-form";

export default async function SpaceSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: spaceId } = await params;
  const { userId } = await auth();
  if (!userId) return null;
  const user = await getUserByClerkId(userId);
  if (!user) return null;

  const member = await prisma.spaceMember.findUnique({
    where: { spaceId_userId: { spaceId, userId: user.id } },
    include: { space: { include: { rules: true } } },
  });
  if (!member) notFound();
  if (!member.space.rules) notFound();

  const rules = member.space.rules;

  return (
    <div className="max-w-xl">
      <Link href={`/dashboard/spaces/${spaceId}`} className="text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400 mb-1 block">
        ← {member.space.name}
      </Link>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Space settings</h1>
      <p className="text-zinc-500 text-sm mb-6">
        Changes may require approval from all other members.
      </p>
      <SpaceSettingsForm spaceId={spaceId} rules={rules} />
    </div>
  );
}
