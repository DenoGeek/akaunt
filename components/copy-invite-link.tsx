"use client";

import { useState } from "react";

export function CopyInviteLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const [fallbackHint, setFallbackHint] = useState(false);

  async function copy() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        throw new Error("Clipboard API not available");
      }
    } catch {
      // Fallback: tell the user to copy manually
      setFallbackHint(true);
      setTimeout(() => setFallbackHint(false), 3000);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.target.select()}
        className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 font-mono truncate focus:outline-none"
      />
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={copy}
          className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            copied
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
              : "bg-violet-600 hover:bg-violet-500 text-white"
          }`}
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
        {fallbackHint && (
          <span className="text-[11px] text-zinc-500">
            Couldn&apos;t access clipboard. Select the link and press Ctrl+C (or long-press on mobile).
          </span>
        )}
      </div>
    </div>
  );
}
