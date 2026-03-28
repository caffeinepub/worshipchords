// ============================================================
// lyrics.js — Strip chords to produce lyrics-only text
// WorshipChords — standalone export
// ============================================================

function stripChordsToLyrics(sheet) {
  const lines = stripSheetMetadata(sheet).split('\n');
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { result.push(''); continue; }
    if (/^\[.+\]$/.test(trimmed)) { result.push(line); continue; }
    if (isChordLine(line)) continue;
    const stripped = line.split(/\s+/)
      .filter(token => token.length === 0 || !isChordToken(token))
      .join(' ').trimEnd();
    if (stripped.trim()) result.push(stripped);
  }

  const collapsed = [];
  let prevEmpty = false;
  for (const line of result) {
    const empty = line.trim() === '';
    if (empty && prevEmpty) continue;
    collapsed.push(line);
    prevEmpty = empty;
  }

  return collapsed.join('\n').trim();
}
