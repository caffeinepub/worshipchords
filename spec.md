# WorshipChords

## Current State
Admin token capture is entirely missing from main.tsx. getSecretParameter only checks sessionStorage then URL hash -- Internet Identity redirect wipes both. No localStorage persistence. Header is h-14 overflow-hidden causing clipping at medium widths. Add Song button depends on isAdmin/canControl which is always false due to broken token recognition.

## Requested Changes (Diff)

### Add
- Token capture block at the very top of main.tsx (before ReactDOM.createRoot) reading from URL query string AND hash, saving to both sessionStorage and localStorage immediately

### Modify
- urlParams.ts: getSecretParameter to check 4 sources in order: sessionStorage → localStorage → URL hash → URL query string
- getSecretFromHash: also fall back to localStorage (not just sessionStorage)
- Header in App.tsx: change h-14 overflow-hidden to min-h-14, remove overflow-hidden, make right-side items wrap gracefully at medium widths

### Remove
- Nothing removed

## Implementation Plan
1. In main.tsx, before the imports block at the top (using a script-level IIFE or top-level code), capture caffeineAdminToken from window.location.search and window.location.hash, save to both sessionStorage and localStorage
2. In urlParams.ts, update getSecretParameter to check sessionStorage first, then localStorage, then URL hash, then URL query string
3. In urlParams.ts, update getSecretFromHash to also persist to localStorage (not just sessionStorage)
4. In App.tsx header, change h-14 overflow-hidden to min-h-14, remove overflow-hidden, ensure right-side flex items can compress at medium widths (use min-w-0 on inner containers, abbreviate labels at medium widths)
