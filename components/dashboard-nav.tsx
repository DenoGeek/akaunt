"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";

const navLinks: { href: string; label: string; badge?: boolean }[] = [
  { href: "/dashboard", label: "Home" },
  { href: "/dashboard/spaces", label: "Spaces" },
  { href: "/dashboard/spaces/new", label: "+ New space" },
  { href: "/dashboard/notifications", label: "Notifications", badge: true },
];

function NavLink({
  href,
  label,
  badge,
  unreadCount,
  onClick,
}: {
  href: string;
  label: string;
  badge?: boolean;
  unreadCount: number;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`relative flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        isActive
          ? "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      } ${href === "/dashboard/spaces/new" ? "text-violet-600 dark:text-violet-400" : ""}`}
    >
      {label}
      {badge && unreadCount > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}

export function DashboardNav({ unreadCount }: { unreadCount: number }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex items-center gap-4 h-14">
          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="md:hidden p-2 -ml-2 rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo */}
          <Link
            href="/dashboard"
            className="text-base font-bold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent shrink-0"
          >
            Akaunt
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                badge={link.badge}
                unreadCount={unreadCount}
              />
            ))}
          </nav>

          {/* Theme toggle + User */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <ThemeToggle />
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-50 bg-black/50 md:hidden"
          aria-label="Close menu"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 max-w-[85vw] bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 shadow-xl transform transition-transform duration-200 ease-out md:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!drawerOpen}
      >
        <div className="flex flex-col h-full pt-14">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
            <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Menu</span>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="p-2 rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="flex flex-col gap-0.5 p-3">
            {navLinks.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                badge={link.badge}
                unreadCount={unreadCount}
                onClick={() => setDrawerOpen(false)}
              />
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
