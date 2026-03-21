# WorshipChords

## Current State
The main app header contains logo, nav tabs (flex-1 center), and right-side controls (Admin badge, AdminPanel, WorshipLeaderClaimPanel, Sign In/Out). On desktop medium widths (1024-1280px), the right-side cluster causes layout overflow — content below the header is clipped or hidden.

Issues:
- SongLibrary: "Song Library" label + "+" (Add Song) button row is not visible; only the search input shows — the label row is pushed out of view.
- ChordViewer: Song title h1 is not visible at the top of the center pane — key/BPM metadata and instrument selector appear first instead.

## Requested Changes (Diff)

### Add
- Nothing new.

### Modify
- App.tsx header: Fix desktop layout to prevent overflow at 1024-1280px. Remove z-10 (serves no purpose on position:static). Make right-side controls compact. Add min-w-0 and overflow-hidden where needed.
- SongLibrary.tsx: Ensure "Song Library" label + "+" button row is always visible above the search input. Fix any flex/overflow-hidden clipping of the first row.
- ChordViewer.tsx: Ensure song title h1 is always the first visible element. Fix any flex height or overflow-hidden ancestor clipping.

### Remove
- Nothing.

## Implementation Plan
1. Remove z-10 from App.tsx header. Audit flex children for min-w-0.
2. Right-side header div: add shrink-0. Shorten/hide verbose badges at medium widths.
3. Verify SongLibrary renders header row first — check parent overflow-hidden containers.
4. Verify ChordViewer song header (shrink-0) is top of the pane — trace flex column ancestors.
5. Validate at lg (1024px), xl (1280px), 2xl (1536px).
