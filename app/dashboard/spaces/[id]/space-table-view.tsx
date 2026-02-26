import { completeTaskAction } from "@/app/actions/tasks";
import { usePersonalForgivenessAction, requestGroupForgivenessAction } from "@/app/actions/forgiveness";
import type { TaskInstance, SpaceRules } from "@prisma/client";
import { format } from "date-fns";

export function SpaceTableView({
  instances,
  rules,
  currentUserId,
}: {
  instances: TaskInstance[];
  rules: SpaceRules | null;
  currentUserId: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm text-left">
        <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800">
          <tr>
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Due</th>
            <th className="px-4 py-3 font-medium">Stake</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {instances.map((inst) => (
            <tr key={inst.id} className="bg-white dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
              <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">{inst.title}</td>
              <td className="px-4 py-3 text-zinc-500">{format(inst.dueAt, "PPp")}</td>
              <td className="px-4 py-3 text-zinc-500">{inst.stakeAmount} coins</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    inst.status === "COMPLETED"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                      : inst.status === "MISSED"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                        : inst.status === "FORGIVEN"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {inst.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  {inst.status === "PENDING" && inst.userId === currentUserId && (
                    <form action={completeTaskAction.bind(null, inst.id)}>
                      <button
                        type="submit"
                        className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500 transition-colors"
                      >
                        Complete
                      </button>
                    </form>
                  )}
                  {inst.status === "MISSED" && inst.userId === currentUserId && (
                    <>
                      {rules && rules.weeklyForgivenessTokens > 0 && (
                        <form action={usePersonalForgivenessAction.bind(null, inst.id)}>
                          <button
                            type="submit"
                            className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-2.5 py-1 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          >
                            Forgiveness
                          </button>
                        </form>
                      )}
                      {rules?.groupVoteEnabled && (
                        <form action={requestGroupForgivenessAction.bind(null, inst.id)}>
                          <button
                            type="submit"
                            className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-2.5 py-1 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          >
                            Group vote
                          </button>
                        </form>
                      )}
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {instances.length === 0 && (
        <p className="text-zinc-400 dark:text-zinc-500 text-sm p-4">No tasks in this space.</p>
      )}
    </div>
  );
}
