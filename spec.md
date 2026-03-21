# WorshipChords

## Current State
Setlists are listed in SetlistPanel for all users. Admins click a setlist to activate it (sets the session activeSetlistId). Band members see SetlistView showing "No setlist selected" when nothing is active. No visual cue tells admins to click to go live, and band members have no indication they are waiting for the leader.

## Requested Changes (Diff)

### Add
- Green pulsing LIVE badge on the active setlist item in SetlistPanel
- "Tap to go live" affordance on non-active setlist items for admins (visible on hover)
- Improved empty state in SetlistView for band members: "Waiting for worship leader to activate a setlist..."

### Modify
- SetlistView: differentiate empty state message for admin vs band member
- SetlistPanel: make active state more prominent with LIVE badge

### Remove
- Nothing

## Implementation Plan
1. SetlistPanel.tsx: add LIVE badge with pulsing dot to active item; show "Tap to go live" hint on non-active items on hover for admins
2. SetlistView.tsx: accept isAdmin prop and show different empty state messages  
3. App.tsx: SetlistView already receives isAdmin via canControl -- verify and pass correctly
