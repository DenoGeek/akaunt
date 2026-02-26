import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
          Akaunt
        </span>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <SignedOut>
            <Link
              href="/sign-in"
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              Get started
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              href="/dashboard"
              className="rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              Dashboard
            </Link>
          </SignedIn>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-100 dark:bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-700 dark:text-violet-300 mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
          </span>
          Stake. Complete. Win.
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight max-w-3xl leading-[1.1]">
          Accountability that{" "}
          <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600 dark:from-violet-400 dark:via-fuchsia-400 dark:to-indigo-400 bg-clip-text text-transparent">
            actually works
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-xl leading-relaxed">
          Put your coins on the line. Meet your deadlines. Build real habits with
          your team — because nobody wants to lose their stake.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <SignedOut>
            <Link
              href="/sign-up"
              className="rounded-xl bg-violet-600 hover:bg-violet-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-200 dark:shadow-violet-900/40 transition-all hover:shadow-violet-300 dark:hover:shadow-violet-700/40 hover:-translate-y-0.5"
            >
              Start for free →
            </Link>
            <Link
              href="/sign-in"
              className="rounded-xl border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 px-8 py-3.5 text-base font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all hover:-translate-y-0.5"
            >
              Sign in
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              href="/dashboard"
              className="rounded-xl bg-violet-600 hover:bg-violet-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-200 dark:shadow-violet-900/40 transition-all hover:-translate-y-0.5"
            >
              Go to Dashboard →
            </Link>
          </SignedIn>
        </div>

        {/* Feature cards */}
        <div className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full text-left">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-6 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Set tasks</h3>
            <p className="text-sm text-zinc-500">
              Create daily or weekly tasks and commit to them with your team.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-6 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
            <div className="text-3xl mb-3">💰</div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Stake coins</h3>
            <p className="text-sm text-zinc-500">
              Put real stakes behind your goals. Miss a deadline, lose coins.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-6 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
            <div className="text-3xl mb-3">🏆</div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Compete</h3>
            <p className="text-sm text-zinc-500">
              Weekly leaderboards keep everyone sharp. Rise to the top.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/60 dark:border-zinc-800/60 px-6 py-6 text-center text-xs text-zinc-400 dark:text-zinc-600">
        © {new Date().getFullYear()} Akaunt. Build discipline, one deadline at a time.
      </footer>
    </div>
  );
}
