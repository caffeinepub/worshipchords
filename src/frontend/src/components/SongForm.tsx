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
import { CheckCircle2, Download, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Song } from "../backend.d";
import { useCreateOrUpdateSong } from "../hooks/useQueries";
import { KEYS } from "../utils/chords";

interface SongFormProps {
  song?: Song | null;
  open: boolean;
  onClose: () => void;
  getPrincipal: () => any;
}

// ---------------------------------------------------------------------------
// Client-side parser for raw text pasted from worship chord websites
// ---------------------------------------------------------------------------
function parseWorshipText(raw: string): {
  title: string;
  key: string;
  bpm: number;
  chordSheet: string;
} {
  const lines = raw.split(/\r?\n/);

  let title = "";
  let key = "G";
  let bpm = 72;
  const sheetLines: string[] = [];
  const metaLineIndexes = new Set<number>();

  // Patterns
  const titlePattern = /^(?:Title|Song)\s*:\s*(.+)/i;
  const keyPattern = /^(?:Key(?:\s+of)?|\(Key)\s*[:\s]\s*([A-G][b#]?m?)\)?/i;
  const bpmPattern = /^(?:BPM|Tempo)\s*[:\s]\s*(\d+)/i;
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
  });

  // If no title found from label, use first non-empty, non-chord line
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

  // If no key from label, infer from first chord found
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
      const candidate = chordGuess[1];
      if (validKeys.includes(candidate)) key = candidate;
    }
  }

  // Build chord sheet from non-meta lines
  lines.forEach((line, i) => {
    if (!metaLineIndexes.has(i)) {
      sheetLines.push(line);
    }
  });

  // Trim leading/trailing blank lines
  while (sheetLines.length && sheetLines[0].trim() === "") sheetLines.shift();
  while (sheetLines.length && sheetLines[sheetLines.length - 1].trim() === "")
    sheetLines.pop();

  return { title, key, bpm, chordSheet: sheetLines.join("\n") };
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
  const [chordSheet, setChordSheet] = useState("");
  const [importText, setImportText] = useState("");
  const [parseSuccess, setParseSuccess] = useState(false);
  const createOrUpdate = useCreateOrUpdateSong();

  useEffect(() => {
    if (open) {
      setTitle(song?.title ?? "");
      setKey(song?.key ?? "G");
      setBpm(song ? Number(song.bpm) : 72);
      setChordSheet(song?.chordSheet ?? "");
      setImportText("");
      setParseSuccess(false);
      setActiveTab("manual");
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
    setChordSheet(parsed.chordSheet);
    setParseSuccess(true);
    setActiveTab("manual");
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      const s: Song = {
        id: song?.id ?? crypto.randomUUID(),
        title: title.trim(),
        key,
        bpm: BigInt(bpm),
        chordSheet,
        createdBy: song?.createdBy ?? getPrincipal(),
      };
      await createOrUpdate.mutateAsync(s);
      toast.success(song ? "Song updated" : "Song created");
      onClose();
    } catch {
      toast.error("Failed to save song");
    }
  };

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

          {/* ── MANUAL TAB ── */}
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

              <div className="grid grid-cols-2 gap-4">
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

          {/* ── IMPORT TAB ── */}
          <TabsContent value="import">
            <div className="grid gap-4 py-2">
              <div className="grid gap-1.5">
                <Label className="text-muted-foreground text-xs uppercase tracking-wide">
                  Paste from worship website
                </Label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Copy the full song page from Ultimate Guitar, Worship
                  Together, PraiseCharts, Hymnary, or any chord sheet site and
                  paste it below. We'll extract the title, key, BPM, and chords
                  automatically.
                </p>
                <Textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  rows={16}
                  className="bg-input border-border font-mono text-sm resize-none"
                  placeholder={
                    "Title: Amazing Grace\nKey: G\nBPM: 76\n\n[Verse 1]\nG      C    G\nAmazing grace how sweet the sound..."
                  }
                  data-ocid="song.import.textarea"
                />
              </div>

              <Button
                type="button"
                onClick={handleParse}
                className="w-full bg-chord text-background hover:bg-chord/80"
                data-ocid="song.import.button"
              >
                <Download className="w-4 h-4 mr-2" />
                Parse &amp; Fill Form
              </Button>

              <p className="text-xs text-muted-foreground/60 text-center">
                After parsing, you'll be taken to the Manual tab to review and
                save.
              </p>
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
