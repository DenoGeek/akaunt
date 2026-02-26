import type { User } from "@prisma/client";
import type { SpaceWeeklyStats } from "@prisma/client";

const medals = ["🥇", "🥈", "🥉"];

export function SpaceLeaderboard({
  rows,
  userMap,
  spaceId,
  year,
  weekNumber,
}: {
  rows: SpaceWeeklyStats[];
  userMap: Record<string, User>;
  spaceId: string;
  year: number;
  weekNumber: number;
}) {
  return (
    <section>
      <h2 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 mb-2">Leaderboard</h2>
      <p className="text-sm text-zinc-500 mb-4">
        Week {weekNumber}, {year} — completion %, coins lost, forgiveness used.
      </p>
      {rows.length === 0 ? (
        <p className="text-zinc-400 dark:text-zinc-500 text-sm">No stats for this week yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r, idx) => {
            const u = userMap[r.userId];
            return (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 px-4 py-3"
              >
                <span className="text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                  <span>{medals[idx] ?? `#${idx + 1}`}</span>
                  {u?.email ?? "Unknown"}
                </span>
                <span className="text-zinc-500 text-sm">
                  {r.completionPercent.toFixed(0)}% · Lost {r.coinsLost} coins · {r.forgivenessUsed} forgiveness
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
