import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Loader2,
  Music,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Song } from "../backend.d";
import { useCreateOrUpdateSong, useFetchSongUrl } from "../hooks/useQueries";
import {
  KEYS,
  extractTimeSignature,
  setSheetTimeSignature,
  stripSheetMetadata,
} from "../utils/chords";

const TIME_SIGNATURES = ["4/4", "3/4", "6/8", "12/8", "2/4", "5/4", "7/8"];

interface ChordSite {
  name: string;
  color: string;
  buildUrl: (encoded: string) => string;
}

const CHORD_SITES: ChordSite[] = [
  {
    name: "Ultimate Guitar",
    color:
      "bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20",
    buildUrl: (q) =>
      `https://www.ultimate-guitar.com/search.php?search_type=title&value=${q}`,
  },
  {
    name: "Worship Chords",
    color:
      "bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20",
    buildUrl: (q) => `https://www.worshipchords.com/search?q=${q}`,
  },
  {
    name: "Worship Together",
    color:
      "bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20",
    buildUrl: (q) => `https://www.worshiptogether.com/search?q=${q}`,
  },
  {
    name: "PraiseCharts",
    color:
      "bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20",
    buildUrl: (q) => `https://www.praisecharts.com/songs/search/?q=${q}`,
  },
  {
    name: "Hymnary",
    color:
      "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20",
    buildUrl: (q) => `https://hymnary.org/search?qu=${q}`,
  },
];

/** Sites known to block server-side fetches with bot-protection */
const PROTECTED_SITE_HINTS: { pattern: RegExp; name: string }[] = [
  { pattern: /ultimate-guitar\.com/i, name: "Ultimate Guitar" },
  { pattern: /worshiptogether\.com/i, name: "Worship Together" },
  { pattern: /praisecharts\.com/i, name: "PraiseCharts" },
];

/** Detect Cloudflare / bot-protection challenge in fetched HTML */
function isBlockedResponse(text: string): boolean {
  return (
    text.includes("cf_chl_opt") ||
    text.includes("_cf_chl") ||
    text.includes("cf-browser-verification") ||
    text.includes("Enable JavaScript and cookies") ||
    text.includes("Checking your browser") ||
    text.includes("DDoS protection by Cloudflare") ||
    text.includes("challenges.cloudflare.com") ||
    // Generic JS-wall: body is almost entirely script with no song-like lines
    (text.length > 200 &&
      (text.match(/\n/g) || []).length < 10 &&
      text.includes("window."))
  );
}

interface SongFormProps {
  song?: Song | null;
  open: boolean;
  onClose: () => void;
  getPrincipal: () => any;
}

function parseWorshipText(raw: string): {
  title: string;
  key: string;
  bpm: number;
  timeSignature: string;
  chordSheet: string;
} {
  const lines = raw.split(/\r?\n/);
  let title = "";
  let key = "G";
  let bpm = 72;
  let timeSignature = "4/4";
  const sheetLines: string[] = [];
  const metaLineIndexes = new Set<number>();

  const titlePattern = /^(?:Title|Song)\s*:\s*(.+)/i;
  const keyPattern = /^(?:Key(?:\s+of)?|\(Key)\s*[:\s]\s*([A-G][b#]?m?)\)?/i;
  const bpmPattern = /^(?:BPM|Tempo)\s*[:\s]\s*(\d+)/i;
  const timeSigPattern =
    /^(?:Time(?:\s+Signature)?|Meter|Time\s*Sig)\s*[:\s]\s*(\d+\/\d+)/i;
  const chordOnlyLinePattern =
    /^([A-G][b#]?(?:maj|min|m|sus|aug|dim|add|\d|\/|\s)*)+\s*$/;

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    const titleMatch = trimmed.match(titlePattern);
    if (titleMatch) {
      title = titleMatch[1].trim();
      metaLineIndexes.add(i);
      return;
    }
    const keyMatch = trimmed.match(keyPattern);
    if (keyMatch) {
      key = keyMatch[1].trim();
      metaLineIndexes.add(i);
      return;
    }
    const bpmMatch = trimmed.match(bpmPattern);
    if (bpmMatch) {
      bpm = Number.parseInt(bpmMatch[1], 10);
      metaLineIndexes.add(i);
      return;
    }
    const timeSigMatch = trimmed.match(timeSigPattern);
    if (timeSigMatch) {
      timeSignature = timeSigMatch[1].trim();
      metaLineIndexes.add(i);
      return;
    }
  });

  if (!title) {
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (
        trimmed &&
        !metaLineIndexes.has(i) &&
        !chordOnlyLinePattern.test(trimmed)
      ) {
        title = trimmed;
        metaLineIndexes.add(i);
        break;
      }
    }
  }

  if (key === "G") {
    const chordGuess = raw.match(
      /\b([A-G][b#]?(?:m|maj|min)?(?:\d)?(?:\/[A-G][b#]?)?)\b/,
    );
    if (chordGuess) {
      const validKeys = [
        "C",
        "C#",
        "Db",
        "D",
        "D#",
        "Eb",
        "E",
        "F",
        "F#",
        "Gb",
        "G",
        "G#",
        "Ab",
        "A",
        "A#",
        "Bb",
        "B",
        "Cm",
        "Dm",
        "Em",
        "Fm",
        "Gm",
        "Am",
        "Bm",
      ];
      if (validKeys.includes(chordGuess[1])) key = chordGuess[1];
    }
  }

  lines.forEach((line, i) => {
    if (!metaLineIndexes.has(i)) sheetLines.push(line);
  });
  while (sheetLines.length && sheetLines[0].trim() === "") sheetLines.shift();
  while (sheetLines.length && sheetLines[sheetLines.length - 1].trim() === "")
    sheetLines.pop();

  return { title, key, bpm, timeSignature, chordSheet: sheetLines.join("\n") };
}

export default function SongForm({
  song,
  open,
  onClose,
  getPrincipal,
}: SongFormProps) {
  const [activeTab, setActiveTab] = useState<"manual" | "import">("manual");
  const [title, setTitle] = useState("");
  const [key, setKey] = useState("G");
  const [bpm, setBpm] = useState(72);
  const [timeSignature, setTimeSignature] = useState("4/4");
  const [chordSheet, setChordSheet] = useState("");
  const [importText, setImportText] = useState("");
  const [parseSuccess, setParseSuccess] = useState(false);

  // Import tab state
  const [searchQuery, setSearchQuery] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [showPasteManually, setShowPasteManually] = useState(false);
  const [blockedWarning, setBlockedWarning] = useState<string | null>(null);

  const createOrUpdate = useCreateOrUpdateSong();
  const fetchSongUrl = useFetchSongUrl();

  useEffect(() => {
    if (open) {
      setTitle(song?.title ?? "");
      setKey(song?.key ?? "G");
      setBpm(song ? Number(song.bpm) : 72);
      setTimeSignature(song ? extractTimeSignature(song.chordSheet) : "4/4");
      setChordSheet(song ? stripSheetMetadata(song.chordSheet) : "");
      setImportText("");
      setParseSuccess(false);
      setActiveTab("manual");
      setSearchQuery("");
      setImportUrl("");
      setShowPasteManually(false);
      setBlockedWarning(null);
    }
  }, [open, song]);

  const handleParse = () => {
    if (!importText.trim()) {
      toast.error("Paste some text first");
      return;
    }
    const parsed = parseWorshipText(importText);
    setTitle(parsed.title);
    setKey(parsed.key);
    setBpm(parsed.bpm);
    setTimeSignature(parsed.timeSignature);
    setChordSheet(parsed.chordSheet);
    setParseSuccess(true);
    setBlockedWarning(null);
    setActiveTab("manual");
  };

  const handleFetchUrl = async () => {
    if (!importUrl.trim()) {
      toast.error("Paste a song page URL first");
      return;
    }

    setBlockedWarning(null);

    // Warn upfront for known protected sites
    const knownProtected = PROTECTED_SITE_HINTS.find((s) =>
      s.pattern.test(importUrl),
    );

    try {
      const html = await fetchSongUrl.mutateAsync(importUrl.trim());

      // Detect Cloudflare / bot-protection challenge page
      if (isBlockedResponse(html)) {
        const siteName = knownProtected?.name ?? "This site";
        setBlockedWarning(
          `${siteName} blocks automated imports. Open the song page in your browser, select all the text (Ctrl+A / Cmd+A), copy it, then paste it in the box below.`,
        );
        setShowPasteManually(true);
        return;
      }

      // Extract plain text from HTML
      const plainText = new DOMParser().parseFromString(html, "text/html").body
        .innerText;

      // Secondary check: extracted text still looks like a bot challenge
      if (!plainText.trim() || isBlockedResponse(plainText)) {
        const siteName = knownProtected?.name ?? "This site";
        setBlockedWarning(
          `${siteName} blocked the request. Open the song page in your browser, select all the text, copy it, then paste it in the box below.`,
        );
        setShowPasteManually(true);
        return;
      }

      const parsed = parseWorshipText(plainText);
      setTitle(parsed.title);
      setKey(parsed.key);
      setBpm(parsed.bpm);
      setTimeSignature(parsed.timeSignature);
      setChordSheet(parsed.chordSheet);
      setParseSuccess(true);
      setActiveTab("manual");
      toast.success("Song imported! Review the details below.");
    } catch {
      toast.error("Failed to fetch the page. Try pasting the text manually.");
      setShowPasteManually(true);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      const finalChordSheet = setSheetTimeSignature(chordSheet, timeSignature);
      const s: Song = {
        id: song?.id ?? crypto.randomUUID(),
        title: title.trim(),
        key,
        bpm: BigInt(bpm),
        chordSheet: finalChordSheet,
        createdBy: song?.createdBy ?? getPrincipal(),
      };
      await createOrUpdate.mutateAsync(s);
      toast.success(song ? "Song updated" : "Song created");
      onClose();
    } catch {
      toast.error("Failed to save song");
    }
  };

  const encodedSearch = encodeURIComponent(
    searchQuery.trim() || "worship song",
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{
          background: "oklch(var(--card))",
          borderColor: "oklch(var(--border))",
        }}
        data-ocid="song.dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {song ? "Edit Song" : "Add Song"}
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v as "manual" | "import");
            setParseSuccess(false);
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="manual" data-ocid="song.manual.tab">
              Manual
            </TabsTrigger>
            <TabsTrigger value="import" data-ocid="song.import.tab">
              Import from Website
            </TabsTrigger>
          </TabsList>

          {/* ── Manual Tab ── */}
          <TabsContent value="manual">
            {parseSuccess && (
              <div
                className="flex items-center gap-2 mb-4 px-3 py-2 rounded-md bg-chord/10 border border-chord/30 text-chord text-sm"
                data-ocid="song.success_state"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Parsed! Review the details below.
              </div>
            )}
            <div className="grid gap-4 py-2">
              <div className="grid gap-1.5">
                <Label
                  htmlFor="song-title"
                  className="text-muted-foreground text-xs uppercase tracking-wide"
                >
                  Title
                </Label>
                <Input
                  id="song-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Song title"
                  className="bg-input border-border"
                  data-ocid="song.input"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-1.5">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">
                    Key
                  </Label>
                  <Select value={key} onValueChange={setKey}>
                    <SelectTrigger
                      className="bg-input border-border"
                      data-ocid="song.select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      style={{
                        background: "oklch(var(--popover))",
                        borderColor: "oklch(var(--border))",
                      }}
                    >
                      {KEYS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {k}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label
                    htmlFor="song-bpm"
                    className="text-muted-foreground text-xs uppercase tracking-wide"
                  >
                    BPM
                  </Label>
                  <Input
                    id="song-bpm"
                    type="number"
                    value={bpm}
                    onChange={(e) => setBpm(Number(e.target.value))}
                    min={40}
                    max={240}
                    className="bg-input border-border"
                    data-ocid="song.bpm.input"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">
                    Time Sig
                  </Label>
                  <Select
                    value={timeSignature}
                    onValueChange={setTimeSignature}
                  >
                    <SelectTrigger
                      className="bg-input border-border"
                      data-ocid="song.timesig.select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      style={{
                        background: "oklch(var(--popover))",
                        borderColor: "oklch(var(--border))",
                      }}
                    >
                      {TIME_SIGNATURES.map((ts) => (
                        <SelectItem key={ts} value={ts}>
                          {ts}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label
                  htmlFor="chord-sheet"
                  className="text-muted-foreground text-xs uppercase tracking-wide"
                >
                  Chord Sheet
                </Label>
                <p className="text-xs text-muted-foreground">
                  Enter chord lines above lyric lines. Chords are auto-detected.
                </p>
                <Textarea
                  id="chord-sheet"
                  value={chordSheet}
                  onChange={(e) => setChordSheet(e.target.value)}
                  rows={14}
                  className="bg-input border-border font-mono text-sm resize-none"
                  placeholder={
                    "[Verse 1]\nG      C    G\nAmazing grace how sweet the sound\nG           G7\nThat saved a wretch like me"
                  }
                  data-ocid="song.textarea"
                />
              </div>
            </div>
          </TabsContent>

          {/* ── Import Tab ── */}
          <TabsContent value="import">
            <div className="grid gap-5 py-2">
              {/* Step 1: Search */}
              <div className="grid gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-chord/20 text-chord text-xs font-bold shrink-0">
                    1
                  </span>
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">
                    Search for the song
                  </Label>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. Amazing Grace, How Great Thou Art..."
                    className="bg-input border-border pl-9"
                    data-ocid="song.search_input"
                  />
                </div>

                {/* Quick-link buttons */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {CHORD_SITES.map((site) => (
                    <a
                      key={site.name}
                      href={site.buildUrl(encodedSearch)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-md border text-xs font-medium transition-colors cursor-pointer ${site.color}`}
                      data-ocid="song.import.link"
                    >
                      <span className="flex items-center gap-1.5">
                        <Music className="w-3.5 h-3.5 shrink-0" />
                        {site.name}
                      </span>
                      <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                    </a>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground/70">
                  Click a site above to search. When you find the song, copy the
                  page URL.
                </p>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground/50">then</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Step 2: Paste URL and fetch */}
              <div className="grid gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-chord/20 text-chord text-xs font-bold shrink-0">
                    2
                  </span>
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">
                    Paste the song page URL
                  </Label>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={importUrl}
                    onChange={(e) => {
                      setImportUrl(e.target.value);
                      setBlockedWarning(null);
                    }}
                    placeholder="https://www.ultimate-guitar.com/tab/..."
                    className="bg-input border-border flex-1 text-sm"
                    data-ocid="song.import.input"
                  />
                  <Button
                    type="button"
                    onClick={handleFetchUrl}
                    disabled={fetchSongUrl.isPending || !importUrl.trim()}
                    className="bg-chord text-background hover:bg-chord/80 shrink-0"
                    data-ocid="song.import.button"
                  >
                    {fetchSongUrl.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Fetching…
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Auto Import
                      </>
                    )}
                  </Button>
                </div>
                {fetchSongUrl.isPending && (
                  <p
                    className="text-xs text-muted-foreground animate-pulse"
                    data-ocid="song.import.loading_state"
                  >
                    Fetching page content — this may take a few seconds…
                  </p>
                )}
              </div>

              {/* Blocked / fallback warning banner */}
              {blockedWarning && (
                <div
                  className="flex gap-3 px-4 py-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 text-sm leading-relaxed"
                  data-ocid="song.import.blocked_warning"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <p className="font-medium text-amber-300 mb-1">
                      Auto-import blocked
                    </p>
                    <p className="text-amber-300/80 text-xs">
                      {blockedWarning}
                    </p>
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Collapsible: paste manually */}
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasteManually((v) => !v)}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
                  data-ocid="song.import.toggle"
                >
                  {showPasteManually ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                  Or paste text manually (fallback)
                </button>

                {showPasteManually && (
                  <div className="grid gap-3 mt-1">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Open the song page in your browser, select all the text
                      (Ctrl+A / Cmd+A), copy it, and paste it below.
                    </p>
                    <Textarea
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      rows={12}
                      className="bg-input border-border font-mono text-sm resize-none"
                      placeholder={
                        "Title: Amazing Grace\nKey: G\nBPM: 76\nTime Signature: 3/4\n\n[Verse 1]\nG      C    G\nAmazing grace..."
                      }
                      data-ocid="song.import.textarea"
                    />
                    <Button
                      type="button"
                      onClick={handleParse}
                      className="w-full bg-chord text-background hover:bg-chord/80"
                      data-ocid="song.import.parse_button"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Parse &amp; Fill Form
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-border"
            data-ocid="song.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createOrUpdate.isPending}
            className="bg-chord text-background hover:bg-chord/80"
            data-ocid="song.submit_button"
          >
            {createOrUpdate.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {song ? "Save Changes" : "Add Song"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
