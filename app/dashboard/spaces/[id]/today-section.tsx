import { completeTaskAction } from "@/app/actions/tasks";
import { usePersonalForgivenessAction, requestGroupForgivenessAction } from "@/app/actions/forgiveness";
import type { TaskInstance, SpaceRules } from "@prisma/client";

export function SpaceTodaySection({
  instances,
  spaceId,
  rules,
  currentUserId,
}: {
  instances: TaskInstance[];
  spaceId: string;
  rules: SpaceRules | null;
  currentUserId: string;
}) {
  const completed = instances.filter((i) => i.status === "COMPLETED").length;
  const total = instances.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <section>
      <h2 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 mb-2">Today</h2>
      <div className="mb-4 h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
        <div
          className="h-full bg-violet-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-sm text-zinc-500 mb-4">
        {completed}/{total} completed ({percent}%)
      </p>
      <ul className="space-y-2">
        {instances.map((inst) => (
          <li
            key={inst.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 px-4 py-3"
          >
            <div>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{inst.title}</span>
              <span className="ml-2 text-sm text-zinc-500">
                Risk {inst.stakeAmount} coins if you fail.
              </span>
            </div>
            <div className="flex gap-2">
              {inst.status === "PENDING" && inst.userId === currentUserId && (
                <form action={completeTaskAction.bind(null, inst.id)}>
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
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
                        className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        Use Forgiveness
                      </button>
                    </form>
                  )}
                  {rules?.groupVoteEnabled && (
                    <form action={requestGroupForgivenessAction.bind(null, inst.id)}>
                      <button
                        type="submit"
                        className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        Request Group Forgiveness
                      </button>
                    </form>
                  )}
                </>
              )}
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
            </div>
          </li>
        ))}
      </ul>
      {instances.length === 0 && (
        <p className="text-zinc-400 dark:text-zinc-500 text-sm">No tasks due today.</p>
      )}
    </section>
  );
}
