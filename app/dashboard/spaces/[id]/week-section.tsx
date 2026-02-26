import { format } from "date-fns";
import type { TaskInstance } from "@prisma/client";

function groupByDay(instances: TaskInstance[]) {
  const map = new Map<string, TaskInstance[]>();
  for (const i of instances) {
    const key = format(i.dueAt, "yyyy-MM-dd");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(i);
  }
  const keys = Array.from(map.keys()).sort();
  return keys.map((k) => ({ date: k, instances: map.get(k)! }));
}

export function SpaceWeekSection({
  instances,
  spaceId,
}: {
  instances: TaskInstance[];
  spaceId: string;
}) {
  const completed = instances.filter((i) => i.status === "COMPLETED").length;
  const total = instances.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const byDay = groupByDay(instances);

  return (
    <section>
      <h2 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 mb-2">This Week</h2>
      <div className="mb-4 h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
        <div
          className="h-full bg-violet-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-sm text-zinc-500 mb-4">
        {completed}/{total} completed ({percent}%)
      </p>
      <div className="space-y-4">
        {byDay.map(({ date, instances: dayInstances }) => (
          <div key={date}>
            <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
              {format(new Date(date), "EEEE, MMM d")}
            </h3>
            <ul className="space-y-1">
              {dayInstances.map((inst) => (
                <li
                  key={inst.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-transparent px-3 py-2 text-sm"
                >
                  <span className="text-zinc-700 dark:text-zinc-300">{inst.title}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      inst.status === "COMPLETED"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                        : inst.status === "MISSED"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                          : inst.status === "FORGIVEN"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                            : "text-zinc-500"
                    }`}
                  >
                    {inst.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {instances.length === 0 && (
        <p className="text-zinc-400 dark:text-zinc-500 text-sm">No tasks this week.</p>
      )}
    </section>
  );
}
