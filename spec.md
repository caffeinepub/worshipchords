# WorshipChords

## Current State
Fullscreen mode in both ChordViewer and LyricsViewer shows a minimal bar with: minimize button, song title, prev/next navigation, and auto-scroll controls. Time signature and BPM are only shown in the normal (non-fullscreen) header.

## Requested Changes (Diff)

### Add
- In the fullscreen minimal bar of ChordViewer: display time signature and BPM as a compact badge/pill below or alongside the song title, visible on both mobile and desktop.
- In the fullscreen minimal bar of LyricsViewer: same — display time signature and BPM cleanly.
- Mobile-friendly layout: on small screens, the fullscreen bar should stack into two rows — top row has minimize + prev/next + scroll controls; bottom row (or sub-row) has song title and time sig·BPM metadata. Or use a compact two-line title block.

### Modify
- ChordViewer fullscreen bar: restructure the header to accommodate song metadata (title + time sig + BPM) in a mobile-friendly way. Suggested layout: minimize button on far left, then a vertical stack of `[song title]` and `[timeSig · BPM]` as a small muted line, then right-side controls (prev/next, scroll).
- LyricsViewer fullscreen bar: same restructuring.

### Remove
- Nothing removed.

## Implementation Plan
1. In ChordViewer fullscreen bar: replace the flat `<span>` title with a two-line block: song title on line 1, `{timeSignature} · {bpm} BPM` on line 2 in a smaller muted style.
2. In LyricsViewer fullscreen bar: same change — two-line title block with time sig and BPM.
3. Ensure the layout remains single-row on desktop (title block takes flex-1, controls are right-aligned) and wraps gracefully on mobile (min-width constraints relaxed, title block can shrink).
4. Use `min-w-0` and `truncate` on title to prevent overflow. Show BPM as `text-xs text-muted-foreground font-mono`.
5. Validate and build.
