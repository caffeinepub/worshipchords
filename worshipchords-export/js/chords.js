// ============================================================
// chords.js — Chord transposition, capo logic, Roman numerals
// WorshipChords — standalone export
// ============================================================

const NOTES = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];

const ENHARMONICS = {
  'Db':'C#','D#':'Eb','Gb':'F#','G#':'Ab','A#':'Bb'
};

function normalizeNote(note) {
  return ENHARMONICS[note] || note;
}

function transposeNote(note, semitones) {
  const n = normalizeNote(note);
  const idx = NOTES.indexOf(n);
  if (idx === -1) return note;
  return NOTES[(((idx + semitones) % 12) + 12) % 12];
}

const CHORD_RE = /^([A-G][#b]?)(m(?:aj)?|min|dim|aug|sus[24]?|add)?([0-9]+)?((?:/[A-G][#b]?)?)$/;
const ROMAN_CHORD_RE = /^(VII|VI|IV|III|II|VII|vii|vi|iv|iii|ii|I|V|i|v)(°|\+|maj|sus[24]?|add|m|min|dim|aug)?[0-9]*((?:\/[A-G][#b]?)?)$/;

function isChordToken(token) {
  return CHORD_RE.test(token);
}

function isRomanChordToken(token) {
  return ROMAN_CHORD_RE.test(token);
}

function transposeChord(chord, semitones) {
  if (semitones === 0) return chord;
  const m = chord.match(/^([A-G][#b]?)(.*?)((?:\/[A-G][#b]?)?)$/);
  if (!m) return chord;
  const newRoot = transposeNote(m[1], semitones);
  const suffix = m[2];
  const bass = m[3] ? '/' + transposeNote(m[3].slice(1), semitones) : '';
  return newRoot + suffix + bass;
}

function isChordLine(line) {
  if (!line.trim()) return false;
  const tokens = line.trim().split(/\s+/).filter(t => t.length > 0);
  if (tokens.length === 0) return false;
  const chordCount = tokens.filter(t => isChordToken(t)).length;
  if (chordCount / tokens.length > 0.5) return true;
  const romanCount = tokens.filter(t => isRomanChordToken(t)).length;
  return romanCount / tokens.length > 0.5;
}

function transposeLine(line, semitones) {
  if (semitones === 0) return line;
  return line.split(/(\s+)/).map((part, i) => {
    if (i % 2 === 0 && isChordToken(part)) return transposeChord(part, semitones);
    return part;
  }).join('');
}

function transposeSheet(sheet, semitones) {
  if (semitones === 0) return sheet;
  return sheet.split('\n').map(line => isChordLine(line) ? transposeLine(line, semitones) : line).join('\n');
}

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const ROMANS = ['I','II','III','IV','V','VI','VII'];
const DIATONIC_MINOR_DEGREES = [1, 2, 5];

function chordToRoman(chord, rootKey) {
  const m = chord.match(CHORD_RE);
  if (!m) return chord;
  const chordRoot = normalizeNote(m[1]);
  const quality = m[2] || '';
  const extension = m[3] || '';
  const bass = m[4] || '';
  const rootIdx = NOTES.indexOf(normalizeNote(rootKey));
  const chordIdx = NOTES.indexOf(chordRoot);
  if (rootIdx === -1 || chordIdx === -1) return chord;
  const interval = (chordIdx - rootIdx + 12) % 12;
  const degreeIdx = MAJOR_SCALE.indexOf(interval);
  if (degreeIdx === -1) return chord;
  const roman = ROMANS[degreeIdx];
  const isMinor = quality === 'm' || quality === 'min';
  const isDim = quality === 'dim';
  const shouldBeLower = isMinor || DIATONIC_MINOR_DEGREES.includes(degreeIdx);
  const qualitySuffix = isDim ? '°' : quality === 'aug' ? '+' : quality === 'maj' ? 'maj' : '';
  const romanPart = shouldBeLower ? roman.toLowerCase() : roman;
  return romanPart + qualitySuffix + extension + bass;
}

function lineToRoman(line, rootKey) {
  return line.split(/(\s+)/).map((part, i) => {
    if (i % 2 === 0 && isChordToken(part)) return chordToRoman(part, rootKey);
    return part;
  }).join('');
}

function sheetToRoman(sheet, rootKey) {
  return sheet.split('\n').map(line => isChordLine(line) ? lineToRoman(line, rootKey) : line).join('\n');
}

function getCapoShapesKey(concertKey, capoFret) {
  if (capoFret === 0) return concertKey;
  return transposeNote(concertKey, -capoFret);
}

const TS_RE = /^\/\/ ts:([^\n]+)/m;

function extractTimeSignature(sheet) {
  const m = sheet.match(TS_RE);
  return m ? m[1].trim() : '4/4';
}

function stripSheetMetadata(sheet) {
  return sheet.replace(/^\/\/ ts:[^\n]*\n?/m, '');
}

function setSheetTimeSignature(sheet, ts) {
  const stripped = stripSheetMetadata(sheet);
  return '// ts:' + ts + '\n' + stripped;
}

function getLineType(line) {
  if (!line.trim()) return 'empty';
  if (/^\/\//.test(line.trim())) return 'meta';
  if (/^\[.+\]$/.test(line.trim())) return 'section';
  if (isChordLine(line)) return 'chord';
  return 'lyric';
}

const KEYS = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];

function getDisplaySheet(sheet, songKey, transposeSteps, capoFret, chordMode, instrument) {
  const cleanSheet = stripSheetMetadata(sheet);
  const concertKey = transposeNote(songKey, transposeSteps);
  const useCapoOffset = instrument === 'guitar' && capoFret > 0;
  const displayKey = useCapoOffset ? getCapoShapesKey(concertKey, capoFret) : concertKey;
  let displaySheet = useCapoOffset
    ? transposeSheet(transposeSheet(cleanSheet, transposeSteps), -capoFret)
    : transposeSheet(cleanSheet, transposeSteps);
  if (chordMode === 'roman') {
    displaySheet = sheetToRoman(displaySheet, displayKey);
  }
  return { displaySheet, concertKey, displayKey, showCapo: useCapoOffset };
}
