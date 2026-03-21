import { isChordLine, isChordToken, stripSheetMetadata } from "./chords";

/**
 * Strip chord annotations from a chord sheet to produce lyrics-only text.
 */
export function stripChordsToLyrics(sheet: string): string {
  // Remove metadata lines first
  const lines = stripSheetMetadata(sheet).split("\n");
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      result.push("");
      continue;
    }

    if (/^\[.+\]$/.test(trimmed)) {
      result.push(line);
      continue;
    }

    if (isChordLine(line)) {
      continue;
    }

    const strippedLine = line
      .split(/\s+/)
      .filter((token) => token.length === 0 || !isChordToken(token))
      .join(" ")
      .trimEnd();

    if (strippedLine.trim()) {
      result.push(strippedLine);
    }
  }

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
