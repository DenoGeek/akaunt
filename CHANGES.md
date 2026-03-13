# Summary of changes (from original project)

## Home tab — unchanged

The following were **not modified** and match the original project:

- **`app/page.tsx`** — Landing/home page (hero, feature cards, Sign in / Get started / Dashboard). No edits.
- **`app/dashboard/page.tsx`** — Dashboard home (redirects to latest space or shows “Create your first space”). No edits.
- **`app/dashboard/layout.tsx`** — Dashboard layout and nav. No edits.

---

## Files modified (with comments)

### 1. `app/dashboard/spaces/[id]/page.tsx`

**Invite URL (local/dev):**
- Use `x-forwarded-proto` when present; otherwise treat `localhost`, `127.0.0.1`, `0.0.0.0`, `[::1]` as `http` so the copied invite link opens locally (no forced `https`).

**Member display name:**
- Added `getDisplayName(user)` that returns email local part (e.g. `alex` from `alex@example.com`), or `"Member"` when there is no email — so raw Clerk IDs like `user_3AnJeu...` are never shown in the UI.

**Member filter & task queries:**
- `searchParams` now includes `memberId` (default `"mine"`).
- `baseTaskWhere` filters tasks by `spaceId` and, when not “all”, by `userId` (current user or selected member).
- All task fetches (cards, week, table) use `baseTaskWhere` so you can view “My tasks”, “All members”, or a specific member’s tasks.

**Members section:**
- New “Members” card listing each member with avatar initial, display name (via `getDisplayName`), role (Owner/Member), and current-week stats from `SpaceWeeklyStats`; each row links to that member’s task filter.

**Member filter UI:**
- Chip control for “My tasks”, “All members”, and one chip per member (label from `getDisplayName`); builds URLs with `memberId` so the page shows the right task set.

**Header:**
- Member count pill next to the space name (e.g. “3 members”).

**Child components:**
- `SpaceTableView`, `SpaceWeekSection`, and each `DayCardsSection` now receive a `members` array (and, where needed, `currentUserId`) so they can show task owner labels; see below.

---

### 2. `components/copy-invite-link.tsx`

**Copy button behavior:**
- Only call `navigator.clipboard.writeText` when `navigator.clipboard` exists and `window.isSecureContext` is true; otherwise throw so the fallback runs.
- On failure: set `fallbackHint` and show a short message: “Couldn’t access clipboard. Select the link and press Ctrl+C (or long-press on mobile).”
- Input: added `onFocus={(e) => e.target.select()}` so focusing the field selects the URL for manual copy.
- Wrapped the button and hint in a small flex column so the hint appears under the button when clipboard access fails.

---

### 3. `app/dashboard/spaces/[id]/day-cards-section.tsx`

**New props:**
- `members: { userId: string; user: Pick<User, "email" | "clerkUserId"> }[]` — used to resolve task owner display name.

**Stake wording (accuracy for other members’ tasks):**
- For the current user’s task: “Risk X coins if you fail.”
- For another member’s task: “Risks X coins if they fail.”

**Owner label under each task:**
- “You” when `inst.userId === currentUserId`.
- Otherwise lookup in `members`; if the user has an email, show the part before `@`, else show `"Member"` (never the raw `clerkUserId`).

---

### 4. `app/dashboard/spaces/[id]/week-section.tsx`

**New props:**
- `members` and `currentUserId` — used to show who owns each task in the week view.

**Owner label under each task title:**
- “You” for current user; for others, same rule as day cards: email local part or `"Member"`, never raw Clerk ID.

---

### 5. `app/dashboard/spaces/[id]/space-table-view.tsx`

**New props:**
- `members` — same shape as in day-cards and week-section.

**New column:**
- “Owner” column: “You” for current user; for others, email local part or `"Member"` (never raw Clerk ID).

---

## Unchanged areas

- **Home:** `app/page.tsx`, `app/dashboard/page.tsx`, `app/dashboard/layout.tsx` — no changes.
- **Auth, Prisma, ledger, cron, join flow, settings, tasks/forgiveness/ledger actions** — no structural changes; only the space page and the listed UI components were updated to support member filtering and display names.
- **Join page** `app/join/[spaceId]/page.tsx` — not modified; invite link now uses the corrected URL from the space page.
