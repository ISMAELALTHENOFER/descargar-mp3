# Exploration: mejora-experiencia-usuario

## Current State

The app is a YouTube-to-MP3 downloader with playlist batch support. The frontend is a single-page React app (`App.tsx`) using `useReducer` for all state management, with 8 child components. The backend is Express with Clean Architecture layers, SSE for real-time progress, and a job queue (p-queue, concurrency=3).

The user reports: perceived "freezes" during operations, mixed English/Spanish UI text, and generally poor UX.

## Component Inventory with State Coverage

| Component | Loading | Empty | Error | Success | Notes |
|-----------|:-------:|:-----:|:-----:|:-------:|-------|
| **App.tsx** (root reducer) | ✅ spinner + text | ✅ idle state | ✅ error banner (not dismissible) | ✅ done msg + links | Single Spanish string among 50+ English strings |
| **Header.tsx** | N/A | N/A | N/A | N/A | Pure static, no states |
| **UrlInput.tsx** | ✅ spinner + "Analyzing..." | ✅ disabled when empty | ❌ no inline err | ✅ auto-clears | No paste-from-clipboard, no URL format validation feedback |
| **VideoPreview.tsx** | ❌ no skeleton | N/A (guarded) | ❌ broken img on fail | ✅ | No image onError fallback |
| **DownloadButton.tsx** | ❌ not disabled during download | N/A | ❌ no error state | ✅ | Select has no `<label>`, no format info tooltip |
| **ProgressBar.tsx** | ✅ progress % + label | ✅ hidden when idle | ❌ | ✅ | No indeterminate state for unknown durations |
| **RelatedList.tsx** | ❌ no loading skeleton | ✅ returns null | ❌ no error boundary | ✅ | Content just appears |
| **QueuePanel.tsx** | ✅ per-job spinners + labels | ✅ returns null | ✅ error shown per job | ✅ done icon + re-download | Fixed w-96, no mobile adaptation, no aria labels |
| **PlaylistView.tsx** | ❌ no loading skeleton | ✅ returns null | ❌ no per-item errors | ✅ toggle + download btn | Select/Deselect labels in English |

**State coverage score**: 18/33 possible state slots = **54%** — significant gaps in loading and error states across most components.

## Language Audit

### User-facing strings catalog

All UI text is in **English** (~55 strings) except **1 Spanish string**:

| String | Component | Language |
|--------|-----------|:--------:|
| "MP3 Download" | Header | EN |
| "Paste YouTube URL here..." | UrlInput | EN |
| "Analyzing..." | UrlInput | EN |
| "Analyze" | UrlInput | EN |
| "Quality:" | DownloadButton | EN |
| "128 kbps" / "192 kbps" / "320 kbps" | DownloadButton | EN |
| "Download MP3" | DownloadButton / App | EN |
| "Waiting in queue..." | ProgressBar | EN |
| "Downloading audio..." | ProgressBar | EN |
| "Converting to MP3..." | ProgressBar | EN |
| "Related Videos" | RelatedList | EN |
| "Waiting" / "Analyzing..." / "Downloading..." / "Converting..." / "Saved" / "Failed" | QueuePanel | EN |
| "Downloads" | QueuePanel | EN |
| "active" / "done" / "failed" | QueuePanel | EN |
| "Unknown" | QueuePanel | EN |
| "Download again" (title attr) | QueuePanel | EN |
| "Select All" / "Deselect All" | PlaylistView | EN |
| "{n} videos · {n} selected" | PlaylistView | EN |
| "Download {n} Selected" | PlaylistView | EN |
| "Download complete!" | App | EN |
| "Batch complete! {n} downloaded" | App | EN |
| "Batch: {n} of {n}" | App | EN |
| "{n} errors" | App | EN |
| "Fetching playlist info..." | App | EN |
| "Analyzing video..." | App | EN |
| "Starting download..." | App | EN |
| "Starting batch download..." | App | EN |
| **"Error al guardar ${filename}: ..."** | **App** | **ES** ⚠️ |

### Backend strings returned to client

| String | Source | Language |
|--------|--------|:--------:|
| "Invalid YouTube URL" | validate-url.ts | EN |
| "Must be a valid YouTube URL" | validate-url.ts | EN |
| "urls array is required" | download.controller.ts | EN |
| "Job not found" | download.controller.ts | EN |
| "Batch not found" | download.controller.ts | EN |
| "Job not ready" | download.controller.ts | EN |
| "Too many requests. Please try again later." | rate-limit.ts | EN |
| "Too many download requests. Please slow down." | rate-limit.ts | EN |
| "Internal server error" | error-handler.ts | EN |
| "Request failed" / "Failed to analyze URL" | api.ts (fallbacks) | EN |

**Verdict**: 1 Spanish string in a sea of English. The single "Error al guardar" string is jarring and reveals the lack of a deliberate i18n strategy.

## UX Pain Points — Ranked by Severity

### CRITICAL

**1. SSE connection dies silently — causes perceived "freezing"**
- `api.ts` line 83: `es.onerror = () => es.close();` — ANY error closes the EventSource immediately
- No reconnection logic. No heartbeat. No user notification.
- Once the SSE stream drops (network glitch, server restart, timeout), the frontend shows a progress bar stuck at whatever % it was at — forever.
- The user sees "Downloading audio... 47%" with no way to know the connection broke.
- **This is the most likely cause of the "freezing" bug.**

**2. Mixed language — unprofessional**
- 55+ English strings, 1 random Spanish string (`Error al guardar ${filename}...`)
- No i18n strategy whatsoever — strings are hardcoded inline

**3. Error banner is NOT dismissible**
- `App.tsx` line 432-435: error rendered as a static `<div>`, no close button
- Errors persist until the next action clears them via reducer
- Multiple sequential errors can't be reviewed; only the latest is shown

### HIGH

**4. No loading skeletons — content "jumps" into view**
- `VideoPreview`, `RelatedList`, `PlaylistView` all appear instantly with `animate-fade-in`
- No skeleton/shimmers during network requests
- Poor perceived performance: user sees emptiness then sudden content

**5. Raw error messages shown to users**
- `catch` blocks in App.tsx pass `(err as Error).message` directly to the UI
- Users see messages like: `yt-dlp: Command failed: ERROR: [youtube] ...`
- No friendly/translated error messages

**6. No image fallback on load failure**
- `VideoPreview.tsx` and `RelatedList.tsx` `<img>` tags have no `onError` handler
- Broken thumbnails degrade trust in the app

**7. QueuePanel not responsive**
- Fixed `w-96` (384px) + `fixed bottom-4 right-4` — on mobile (320-375px wide) this panel overlaps all content
- No collapse/minimize toggle

**8. No retry mechanism**
- Analysis fails → user must re-paste URL manually
- Download fails → no retry button, must start over from scratch

### MEDIUM

**9. Progress bar has no indeterminate state**
- Shows 0% while "Starting download..." then jumps to 10%
- `JobQueue` has `pending` property but it's never sent to the frontend
- User has no idea how many jobs are ahead in queue

**10. No toast notification system**
- All feedback (loading, errors, success) is inline, pushing layout around
- Batch completions show multiple download links that stack vertically

**11. No keyboard shortcuts or tab navigation support**
- Entire workflow requires mouse
- No `aria-label` on interactive elements (except one `title` attr)
- No focus ring customization — relies on browser defaults
- `<select>` in DownloadButton has no associated `<label>`

**12. Batch completion UX is poor**
- Each successful item shows an individual `<a>` download link
- User must click each one to download (10 videos = 10 clicks)
- No "Download All" or zip option

**13. File System Access API directory picker UX gap**
- `downloadBlob` triggers a browser download popup (no directory selection)
- `saveFileToDirectory` tries to write via `downloadBlob` but File System Access API requires user directory choice per session
- No "Choose folder" button in the UI — fallback is silent

### LOW

**14. Dark-only theme — no light mode**
- Hardcoded dark (`bg-surface = #0a0a0f`)
- No system-preference detection

**15. Browser tab title never updates**
- Default Vite title `<title>MP3 Download</title>` — doesn't reflect progress
- Could show `[47%] MP3 Download` or `Done - MP3 Download`

**16. No paste-from-clipboard button in URL input**
- Only manual paste via Ctrl+V / right-click
- Mobile users have no paste button

**17. No download history or persistent state**
- Refreshing the page loses all queue state
- Completed jobs vanish from memory

## Visual Quality Assessment

### Strengths
- Consistent dark color scheme with accent green (#1db954)
- Glass/backdrop-blur aesthetic is cohesive
- `animate-fade-in` provides smooth mount transitions
- Custom scrollbar styling

### Weaknesses
- **Typography**: Single font stack, no heading scale — everything is `text-sm`/`text-xs`
- **Glass overuse**: Every `.card` has `backdrop-blur-xl` — creates visual noise and performance hit with many cards (e.g., large playlists)
- **No exit animations**: Components just disappear; no unmount transitions
- **No hover transitions on images**: Thumbnails feel static
- **QueuePanel scroll**: `max-h-[500px]` with `overflow-auto` inside a fixed panel — scrollable region inside fixed region is hard to use on touch devices

### Accessibility gaps (WCAG 2.2 basics)
| Issue | Impact |
|-------|--------|
| No `aria-label` on interactive SVG buttons | Screen reader users hear nothing |
| `<select>` has no `<label>` | Form control labeling failure |
| Color contrast: `text-white/40` on `#0a0a0f` = ~2.5:1 (fails AA) | Low-vision users can't read secondary text |
| No `role` attributes on custom glass components | No semantic landmark navigation |
| No keyboard focus indicator customization | Tab order invisible in many browsers |
| Close button in UrlInput has no accessible name | "X" icon is meaningless to screen readers |
| Playlist checkboxes have no visible `:focus-visible` style | Keyboard users can't see which checkbox is focused |

## Perceived Performance Gaps

1. **SSE disconnect = eternal spinner** (CRITICAL — see above)
2. **No optimistic UI**: Metadata analysis blocks the entire flow — form is disabled, spinner shown, no partial results
3. **Queue position invisible**: `JobQueue.pending` (jobs waiting) is never sent to frontend — 10 items queued, job #9 shows "Starting download..." with no progress for minutes
4. **Batch metadata loading**: `getPlaylist` calls `Promise.allSettled` on ALL playlist items — if a playlist has 100 items, yt-dlp runs 100 times serially (limited by concurrency). Frontend shows spinner the entire time.
5. **File save blocks the event loop**: `fetch()` + blob conversion happens synchronously for batch completions

## Error Handling Gaps

| Gap | Current behavior | Impact |
|-----|-----------------|--------|
| SSE onerror falls through | `es.onerror = () => es.close()` — no reconnect | CRITICAL |
| Error banner not dismissible | Errors shown until next action clears them | HIGH |
| Raw yt-dlp errors in UI | `yt-dlp: Command failed: ERROR: Sign in to confirm you're not a bot` | HIGH |
| Image load failure | Broken image icon, no fallback | MEDIUM |
| Rate limit errors | Raw JSON error shown, no UX treatment | MEDIUM |
| Batch partial failures | Individual items marked error, but no summary Toast | MEDIUM |
| Network offline | No detection, fetch() just fails silently | MEDIUM |
| No error boundary | Any uncaught React error crashes the full UI | LOW |

## Affected Areas

- **`packages/web/src/App.tsx`** — Root reducer, SSE handling, error display, all state transitions. Core of the UX refactor.
- **`packages/web/src/components/UrlInput.tsx`** — Language, paste button, inline validation
- **`packages/web/src/components/VideoPreview.tsx`** — Image fallback, skeleton loading
- **`packages/web/src/components/DownloadButton.tsx`** — Language, label, disabled states, format info
- **`packages/web/src/components/ProgressBar.tsx`** — Indeterminate state, language
- **`packages/web/src/components/RelatedList.tsx`** — Loading skeleton, language
- **`packages/web/src/components/QueuePanel.tsx`** — Responsiveness, accessibility, language
- **`packages/web/src/components/PlaylistView.tsx`** — Loading skeleton, language
- **`packages/web/src/components/Header.tsx`** — Language
- **`packages/web/src/services/api.ts`** — SSE reconnect logic, error message translation
- **`packages/web/src/index.css`** — New animations, skeleton styles, focus states, toast styles
- **`packages/server/src/api/middleware/error-handler.ts`** — User-facing error messages
- **`packages/server/src/api/middleware/validate-url.ts`** — Error message language
- **`packages/server/src/api/middleware/rate-limit.ts`** — Error message language
- **`packages/server/src/infra/sse/sse-manager.ts`** — Heartbeat mechanism

## Approaches

1. **Incremental fix (recommended)** — Fix critical items first, then iterate
   - Phase 1: SSE reconnect + heartbeat, error dismiss, language unification
   - Phase 2: Skeleton loading, image fallbacks, progress bar improvements
   - Phase 3: Accessibility pass, toast system, responsive QueuePanel
   - Phase 4: Polish (tab title, clipboard paste, keyboard nav)
   - **Pros**: Delivers value fast, low risk, each phase is independently shippable
   - **Cons**: Multiple PRs needed, may require coordination
   - **Effort**: Medium per-phase, cumulative High

2. **Big-bang rewrite** — Replace all components with new polished versions in one PR
   - **Pros**: Clean break, consistent from day 1
   - **Cons**: High risk, large PR (>400 lines), hard to review, possible regressions
   - **Effort**: High

3. **i18n-first approach** — Add react-i18next before touching any string
   - **Pros**: Proper foundation, scales for future languages
   - **Cons**: Adds dependency, overhead for a single-language app, delays visible fixes
   - **Effort**: Medium setup, then Low per-string

## Recommendation

**Approach 1 (Incremental fix)** with Phase 1 addressing all CRITICAL and HIGH items:

1. Fix the SSE disconnect bug (reconnect logic + heartbeat) — this directly addresses the "freezing" complaint
2. Unify all strings to Spanish (the user's preference is clear from the single Spanish error message that exists)
3. Make errors dismissible
4. Add a simple `Toast` component for non-blocking feedback
5. Add image `onError` fallbacks
6. Add basic skeleton loading states

Use a **simple i18n approach**: a single `es.ts` constants file with all strings, no library needed for a single-language app. This avoids adding react-i18next overhead while still providing a centralized translation layer.

## Risks

- **SSE reconnect could cause duplicate events**: Need idempotent event handling or event ID deduplication
- **Language unification scope creep**: Server-side error messages also need translation but are returned as raw strings — should translate in frontend or add server i18n middleware
- **Skeleton states need to match real content shape**: Must ensure skeleton dimensions match the actual rendered content to avoid layout shift
- **Toast component may conflict with existing inline error**: Need to decide which errors are "inline" vs "toast"
- **Accessibility changes risk breaking existing behavior**: Label additions and focus states need testing across browsers

## Ready for Proposal

**Yes** — this exploration provides sufficient detail for the `sdd-propose` phase. The CRITICAL items (SSE freeze, language mix, error dismiss) are well-scoped and have clear root causes identified in the code. The proposal should focus on Phase 1 (critical + high fixes) with a concrete scope boundary.
