import type { Instrument } from "../hooks/useInstrument";

export { isGuitarInstrument } from "../hooks/useInstrument";

export const NOTES = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

const ENHARMONICS: Record<string, string> = {
  Db: "C#",
  "D#": "Eb",
  Gb: "F#",
  "G#": "Ab",
  "A#": "Bb",
};

export function normalizeNote(note: string): string {
  return ENHARMONICS[note] || note;
}

export function transposeNote(note: string, semitones: number): string {
  const n = normalizeNote(note);
  const idx = NOTES.indexOf(n);
  if (idx === -1) return note;
  return NOTES[(((idx + semitones) % 12) + 12) % 12];
}

const CHORD_RE =
  /^([A-G][#b]?)(m(?:aj)?|min|dim|aug|sus[24]?|add)?([0-9]+)?((?:\/[A-G][#b]?)?)$/;

export function isChordToken(token: string): boolean {
  return CHORD_RE.test(token);
}

export function transposeChord(chord: string, semitones: number): string {
  if (semitones === 0) return chord;
  const m = chord.match(/^([A-G][#b]?)(.*?)((?:\/[A-G][#b]?)?)$/);
  if (!m) return chord;
  const newRoot = transposeNote(m[1], semitones);
  const suffix = m[2];
  const bass = m[3] ? `/${transposeNote(m[3].slice(1), semitones)}` : "";
  return `${newRoot}${suffix}${bass}`;
}

export function isChordLine(line: string): boolean {
  if (!line.trim()) return false;
  const tokens = line
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0);
  if (tokens.length === 0) return false;
  const chordCount = tokens.filter((t) => isChordToken(t)).length;
  return chordCount / tokens.length > 0.5;
}

export function transposeLine(line: string, semitones: number): string {
  if (semitones === 0) return line;
  const parts = line.split(/(\s+)/);
  return parts
    .map((part, i) => {
      if (i % 2 === 0 && isChordToken(part)) {
        return transposeChord(part, semitones);
      }
      return part;
    })
    .join("");
}

export function transposeSheet(sheet: string, semitones: number): string {
  if (semitones === 0) return sheet;
  return sheet
    .split("\n")
    .map((line) => (isChordLine(line) ? transposeLine(line, semitones) : line))
    .join("\n");
}

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const ROMANS = ["I", "II", "III", "IV", "V", "VI", "VII"];
const DIATONIC_MINOR_DEGREES = [1, 2, 5];

export function chordToRoman(chord: string, rootKey: string): string {
  const m = chord.match(CHORD_RE);
  if (!m) return chord;
  const chordRoot = normalizeNote(m[1]);
  const quality = m[2] || "";
  const extension = m[3] || "";
  const bass = m[4] || "";
  const rootIdx = NOTES.indexOf(normalizeNote(rootKey));
  const chordIdx = NOTES.indexOf(chordRoot);
  if (rootIdx === -1 || chordIdx === -1) return chord;
  const interval = (chordIdx - rootIdx + 12) % 12;
  const degreeIdx = MAJOR_SCALE.indexOf(interval);
  if (degreeIdx === -1) return chord;
  const roman = ROMANS[degreeIdx];
  const isMinor = quality === "m" || quality === "min";
  const isDim = quality === "dim";
  const shouldBeLower = isMinor || DIATONIC_MINOR_DEGREES.includes(degreeIdx);
  const qualitySuffix = isDim
    ? "\u00b0"
    : quality === "aug"
      ? "+"
      : quality === "maj"
        ? "maj"
        : "";
  const romanPart = shouldBeLower ? roman.toLowerCase() : roman;
  return `${romanPart}${qualitySuffix}${extension}${bass}`;
}

export function lineToRoman(line: string, rootKey: string): string {
  const parts = line.split(/(\s+)/);
  return parts
    .map((part, i) => {
      if (i % 2 === 0 && isChordToken(part)) {
        return chordToRoman(part, rootKey);
      }
      return part;
    })
    .join("");
}

export function sheetToRoman(sheet: string, rootKey: string): string {
  return sheet
    .split("\n")
    .map((line) => (isChordLine(line) ? lineToRoman(line, rootKey) : line))
    .join("\n");
}

export function getCapoShapesKey(concertKey: string, capoFret: number): string {
  if (capoFret === 0) return concertKey;
  return transposeNote(concertKey, -capoFret);
}

export function getLineType(
  line: string,
): "chord" | "lyric" | "section" | "empty" {
  if (!line.trim()) return "empty";
  if (/^\[.+\]$/.test(line.trim())) return "section";
  if (isChordLine(line)) return "chord";
  return "lyric";
}

export const KEYS = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

/**
 * Returns the sheet with only transpose applied (concert pitch).
 * For Bass, Keys, Vocals, Other — no capo offset.
 */
export function getConcertSheet(sheet: string, transposeSteps: number): string {
  return transposeSheet(sheet, transposeSteps);
}

/**
 * Returns the sheet transposed for guitar with capo offset applied.
 * Chords shown are the shapes to fret (transpose then subtract capo).
 */
export function getGuitarSheet(
  sheet: string,
  transposeSteps: number,
  capoFret: number,
): string {
  const transposed = transposeSheet(sheet, transposeSteps);
  return transposeSheet(transposed, -capoFret);
}

/**
 * Returns instrument-appropriate sheet and display metadata.
 */
export function getDisplaySheet(
  sheet: string,
  songKey: string,
  transposeSteps: number,
  capoFret: number,
  chordMode: string,
  instrument: Instrument,
): {
  displaySheet: string;
  concertKey: string;
  displayKey: string;
  showCapo: boolean;
} {
  const concertKey = transposeNote(songKey, transposeSteps);
  const useCapoOffset = instrument === "guitar" && capoFret > 0;
  const displayKey = useCapoOffset
    ? getCapoShapesKey(concertKey, capoFret)
    : concertKey;

  let displaySheet = useCapoOffset
    ? getGuitarSheet(sheet, transposeSteps, capoFret)
    : getConcertSheet(sheet, transposeSteps);

  if (chordMode === "roman") {
    displaySheet = sheetToRoman(displaySheet, displayKey);
  }

  return {
    displaySheet,
    concertKey,
    displayKey,
    showCapo: useCapoOffset,
  };
}
