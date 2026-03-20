import { isChordLine, isChordToken } from "./chords";

/**
 * Strip chord annotations from a chord sheet to produce lyrics-only text.
 *
 * Strategy:
 * - Lines that are purely chords (isChordLine) are removed entirely.
 * - Section labels like [Verse 1] are kept.
 * - Empty lines are kept for spacing.
 * - Lines with lyrics have inline chord tokens stripped.
 */
export function stripChordsToLyrics(sheet: string): string {
  const lines = sheet.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Empty lines — keep for spacing
    if (!trimmed) {
      result.push("");
      continue;
    }

    // Section labels like [Verse 1] — keep
    if (/^\[.+\]$/.test(trimmed)) {
      result.push(line);
      continue;
    }

    // Chord-only lines — drop
    if (isChordLine(line)) {
      continue;
    }

    // Lyric lines — strip inline chord tokens (tokens surrounded by spaces)
    const strippedLine = line
      .split(/\s+/)
      .filter((token) => token.length === 0 || !isChordToken(token))
      .join(" ")
      .trimEnd();

    if (strippedLine.trim()) {
      result.push(strippedLine);
    }
  }

  // Collapse multiple consecutive blank lines into one
  const collapsed: string[] = [];
  let prevEmpty = false;
  for (const line of result) {
    const empty = line.trim() === "";
    if (empty && prevEmpty) continue;
    collapsed.push(line);
    prevEmpty = empty;
  }

  return collapsed.join("\n").trim();
}
