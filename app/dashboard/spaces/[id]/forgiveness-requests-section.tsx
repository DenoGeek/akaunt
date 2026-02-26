import { voteForgivenessAction } from "@/app/actions/forgiveness";
import { format } from "date-fns";
import type { ForgivenessRequest, TaskInstance, User } from "@prisma/client";

type RequestWithRelations = ForgivenessRequest & {
  taskInstance: TaskInstance;
  requestedBy: User;
  votes: { userId: string; vote: string }[];
};

export function ForgivenessRequestsSection({
  requests,
  currentUserId,
}: {
  requests: RequestWithRelations[];
  currentUserId: string;
}) {
  if (requests.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 mb-2">Pending group forgiveness</h2>
      <p className="text-sm text-zinc-500 mb-4">Vote to approve or reject.</p>
      <ul className="space-y-3">
        {requests.map((req) => {
          const hasVoted = req.votes.some((v) => v.userId === currentUserId);
          const isRequester = req.requestedById === currentUserId;
          return (
            <li
              key={req.id}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-zinc-900 dark:text-zinc-200">{req.taskInstance.title}</span>
                  <span className="text-zinc-500 text-sm ml-2">
                    — {req.requestedBy.email ?? "Someone"} · expires {format(req.expiresAt, "PPp")}
                  </span>
                </div>
                {!isRequester && !hasVoted && (
                  <div className="flex gap-2">
                    <form action={voteForgivenessAction.bind(null, req.id, "APPROVE")}>
                      <button
                        type="submit"
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500 transition-colors"
                      >
                        Approve
                      </button>
                    </form>
                    <form action={voteForgivenessAction.bind(null, req.id, "REJECT")}>
                      <button
                        type="submit"
                        className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                )}
                {hasVoted && (
                  <span className="text-zinc-400 dark:text-zinc-500 text-sm">You voted</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
