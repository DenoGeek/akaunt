"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { voteOnSpaceSettings } from "@/app/actions/spaces";

type ProposalWithMeta = {
  id: string;
  spaceId: string;
  createdBy: { email: string | null };
  votes: { userId: string; vote: string }[];
  space: { id: string };
};

export function SpaceSettingsProposalBanner({
  proposal,
  hasVoted,
}: {
  proposal: ProposalWithMeta;
  currentUserId: string;
  hasVoted: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (hasVoted) return null;

  async function vote(v: "APPROVE" | "REJECT") {
    setLoading(true);
    await voteOnSpaceSettings(proposal.id, v);
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
      <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
        Review proposed settings
      </h3>
      <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
        {proposal.createdBy.email ?? "A member"} proposed changes to this space. Your vote is required.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => vote("APPROVE")}
          disabled={loading}
          className="rounded-lg bg-amber-600 hover:bg-amber-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => vote("REJECT")}
          disabled={loading}
          className="rounded-lg border border-amber-600 dark:border-amber-500 px-3 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 disabled:opacity-50"
        >
          Reject
        </button>
        <a
          href={`/dashboard/spaces/${proposal.spaceId}/settings`}
          className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          View details
        </a>
      </div>
    </div>
  );
}
