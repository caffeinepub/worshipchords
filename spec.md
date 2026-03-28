# WorshipChords

## Current State
The app has a fixed `<header>` with `h-14 shrink-0 overflow-hidden` inside a `flex flex-col h-[100dvh]` root. The sidebar and main content area sit below the header in the flex column. Fullscreen mode uses `position: fixed; inset: 0; zIndex: 9999` (simulated) for iOS/Android. The scroll container inside fullscreen is a `div` with `overflow-y: auto`.

## Requested Changes (Diff)

### Add
- `ResizeObserver` on the header element to set `--header-height` CSS variable dynamically on `<html>` element
- `height: 100dvh` and `width: 100dvw` on the simulated fullscreen overlay style (in addition to `inset: 0`) to guarantee correct sizing on Android Chrome
- `will-change: transform` and `contain: layout style` on the fullscreen scroll container to isolate paint
- `-webkit-overflow-scrolling: touch` on the fullscreen scroll container for smooth iOS/Android touch scrolling
- Debounce or remove any window `resize` listener that runs while fullscreen is active

### Modify
- In `App.tsx`: the `<header>` should have an `id="app-header"` or `ref` so the ResizeObserver can target it. The content below the header (sidebar + main) should use `flex-1 min-h-0 overflow-hidden` to fill remaining space correctly regardless of header height.
- In `ChordViewer.tsx`: the simulated fullscreen root `style` should include `height: '100dvh'` (with `100vh` fallback), `width: '100vw'`, `overflowY: 'hidden'`. The inner scroll div (`scrollRef`) must have `overflowY: 'auto'`, `-webkit-overflow-scrolling: touch`, `will-change: 'transform'`.
- In `LyricsViewer.tsx`: same fullscreen style fixes as ChordViewer.
- Header content: ensure the header flex row doesn't cause height growth -- use `overflow-hidden` and `min-w-0` on flex children so badges/nav items shrink rather than wrap and push height.

### Remove
- Any window `resize` event listener inside fullscreen components that triggers state updates or re-renders

## Implementation Plan
1. In `App.tsx`: add `useEffect` with `ResizeObserver` on the header element; write `--header-height` to `document.documentElement.style`. Add `id="app-header"` to `<header>`. Ensure the main flex layout below header uses `flex-1 min-h-0`.
2. In `ChordViewer.tsx`: update simulated fullscreen inline style to `{ position: 'fixed', inset: 0, zIndex: 9999, height: '100dvh', width: '100vw', overflowY: 'hidden' }`. On the inner `scrollRef` div add style/className for `-webkit-overflow-scrolling: touch` and `will-change: transform`. Remove any resize listener inside the fullscreen component.
3. In `LyricsViewer.tsx`: same changes as ChordViewer.
4. Validate and build.
