import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Guitar,
  Maximize2,
  Mic,
  Minimize2,
  Minus,
  Music2,
  Pause,
  Piano,
  Play,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ActiveSession } from "../backend.d";
import {
  INSTRUMENTS,
  INSTRUMENT_LABELS,
  type Instrument,
} from "../hooks/useInstrument";
import { useGetSong } from "../hooks/useQueries";
import { NOTES, getDisplaySheet, getLineType } from "../utils/chords";

const SKELETON_WIDTHS = [
  "65%",
  "82%",
  "48%",
  "75%",
  "60%",
  "90%",
  "55%",
  "70%",
];

const INSTRUMENT_ICONS: Record<Instrument, React.ReactNode> = {
  guitar: <Guitar className="w-3.5 h-3.5" />,
  bass: <Music2 className="w-3.5 h-3.5" />,
  keys: <Piano className="w-3.5 h-3.5" />,
  vocals: <Mic className="w-3.5 h-3.5" />,
  other: <Music2 className="w-3.5 h-3.5" />,
};

// Scroll speeds: pixels per second
const SCROLL_SPEEDS = [
  { label: "Slow", value: 20 },
  { label: "Medium", value: 45 },
  { label: "Fast", value: 80 },
  { label: "Very Fast", value: 130 },
];

interface ChordViewerProps {
  session: ActiveSession | null | undefined;
  isAdmin: boolean;
  onSessionUpdate: (updates: Partial<ActiveSession>) => void;
  instrument: Instrument;
  onInstrumentChange: (i: Instrument) => void;
  mobile?: boolean;
}

/**
 * Render a chord line by wrapping each chord token in a highlighted span.
 * Spaces are preserved as-is so alignment above lyrics is maintained.
 */
function renderChordLine(line: string): React.ReactNode {
  // Split into chord tokens and whitespace runs, use part+position as key
  const parts = line.split(/(\s+)/);
  return parts.map((part, idx) => {
    if (!part) return null;
    const k = `${idx}-${part.length}`;
    if (/^\s+$/.test(part)) {
      return (
        // biome-ignore lint/suspicious/noArrayIndexKey: positional tokens
        <span key={k} style={{ whiteSpace: "pre" }}>
          {part}
        </span>
      );
    }
    return (
      // biome-ignore lint/suspicious/noArrayIndexKey: positional tokens
      <span key={k} className="chord-token">
        {part}
      </span>
    );
  });
}

export default function ChordViewer({
  session,
  isAdmin,
  onSessionUpdate,
  instrument,
  onInstrumentChange,
}: ChordViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollSpeedIdx, setScrollSpeedIdx] = useState(1); // default: Medium
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const activeSongId = session?.activeSongId;
  const transposeSteps = session ? Number(session.transposeSteps) : 0;
  const capoFret = session ? Number(session.capoFret) : 0;
  const chordMode = session?.chordMode ?? "letters";

  const { data: song, isLoading } = useGetSong(activeSongId);

  // Auto-scroll loop
  const scrollLoop = useCallback(
    (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      const el = scrollRef.current;
      if (el) {
        const pxPerMs = SCROLL_SPEEDS[scrollSpeedIdx].value / 1000;
        el.scrollTop += pxPerMs * delta;

        // Stop at the bottom
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
          setIsScrolling(false);
          return;
        }
      }

      rafRef.current = requestAnimationFrame(scrollLoop);
    },
    [scrollSpeedIdx],
  );

  useEffect(() => {
    if (isScrolling) {
      lastTimeRef.current = null;
      rafRef.current = requestAnimationFrame(scrollLoop);
    } else {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isScrolling, scrollLoop]);

  // Stop scrolling when song changes (using ref to avoid dep warning)
  const prevSongIdRef = useRef<string | undefined>(undefined);
  if (prevSongIdRef.current !== activeSongId) {
    prevSongIdRef.current = activeSongId;
    setIsScrolling(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }

  const toggleFullscreen = () => {
    const el = document.getElementById("chord-viewer-root");
    if (!document.fullscreenElement && el) {
      el.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleTranspose = (delta: number) => {
    if (!session || !isAdmin) return;
    const newSteps = (((transposeSteps + delta) % 12) + 12) % 12;
    onSessionUpdate({ transposeSteps: BigInt(newSteps) });
  };

  const handleCapo = (val: string) => {
    if (!session || !isAdmin) return;
    onSessionUpdate({ capoFret: BigInt(Number(val)) });
  };

  const handleChordMode = (mode: string) => {
    if (!session || !isAdmin) return;
    onSessionUpdate({ chordMode: mode });
  };

  const handleReset = () => {
    if (!session || !isAdmin) return;
    onSessionUpdate({ transposeSteps: BigInt(0), capoFret: BigInt(0) });
  };

  // Compute instrument-aware display
  const { displaySheet, concertKey, displayKey, showCapo } = song
    ? getDisplaySheet(
        song.chordSheet,
        song.key,
        transposeSteps,
        capoFret,
        chordMode,
        instrument,
      )
    : { displaySheet: "", concertKey: "G", displayKey: "G", showCapo: false };

  // "You see" label for this instrument
  const youSeeLabel =
    instrument === "guitar" && capoFret > 0
      ? `${displayKey} shapes (Capo ${capoFret})`
      : `Key of ${concertKey}`;

  const renderSheet = () => {
    if (!displaySheet) return null;
    return displaySheet.split("\n").map((line, i) => {
      const type = getLineType(line);
      const key = `${type}-${i}`;
      if (type === "empty")
        return <div key={key} className="chord-sheet-gap" />;
      if (type === "section")
        return (
          <div key={key} className="section-label">
            <span className="section-label-bracket">[</span>
            {line.replace(/^\[|\]$/g, "")}
            <span className="section-label-bracket">]</span>
          </div>
        );
      if (type === "chord")
        return (
          <div key={key} className="chord-line">
            {renderChordLine(line)}
          </div>
        );
      return (
        <div key={key} className="lyric-line">
          {line}
        </div>
      );
    });
  };

  return (
    <div
      id="chord-viewer-root"
      className={cn("flex flex-col h-full", isFullscreen && "bg-background")}
    >
      {/* Song Header */}
      <div className="px-5 pt-4 pb-3 border-b border-border shrink-0">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 bg-secondary" />
            <Skeleton className="h-4 w-64 bg-secondary" />
          </div>
        ) : song ? (
          <div className="space-y-2.5">
            {/* Title row */}
            <div>
              <h1 className="text-2xl font-bold text-foreground leading-tight">
                {song.title}
              </h1>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                {/* Concert key */}
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-chord/10 border border-chord/20 text-chord font-semibold">
                  Key of {concertKey}
                </span>
                {/* Capo badge */}
                {capoFret > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-secondary border border-border text-muted-foreground">
                    Capo {capoFret}
                  </span>
                )}
                {/* BPM */}
                <span className="text-xs text-muted-foreground">
                  {Number(song.bpm)} BPM
                </span>
                {chordMode === "roman" && (
                  <span className="text-xs px-2 py-0.5 rounded bg-secondary border border-border text-muted-foreground">
                    Roman
                  </span>
                )}
              </div>
            </div>

            {/* You-see badge + Instrument selector row */}
            <div className="flex items-center gap-3 flex-wrap">
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium",
                  showCapo
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    : "bg-success/10 border-success/30 text-success",
                )}
              >
                {INSTRUMENT_ICONS[instrument]}
                <span>You see: {youSeeLabel}</span>
              </div>

              <div className="flex items-center gap-1 flex-wrap">
                {INSTRUMENTS.map((ins) => (
                  <button
                    type="button"
                    key={ins}
                    onClick={() => onInstrumentChange(ins)}
                    data-ocid={`instrument.${ins}.toggle`}
                    aria-pressed={instrument === ins}
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all min-h-[28px] border",
                      instrument === ins
                        ? "bg-chord text-background border-chord shadow-sm"
                        : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground hover:border-chord/40",
                    )}
                  >
                    {INSTRUMENT_ICONS[ins]}
                    <span>{INSTRUMENT_LABELS[ins]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center py-8 text-center"
            data-ocid="viewer.empty_state"
          >
            <Music2 className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">No song selected</p>
            {isAdmin && (
              <p className="text-muted-foreground/60 text-xs mt-1">
                Select a song from the Library
              </p>
            )}
            <div className="flex items-center gap-1 flex-wrap justify-center mt-4">
              {INSTRUMENTS.map((ins) => (
                <button
                  type="button"
                  key={ins}
                  onClick={() => onInstrumentChange(ins)}
                  data-ocid={`instrument.${ins}.toggle`}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all min-h-[28px] border",
                    instrument === ins
                      ? "bg-chord text-background border-chord"
                      : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground",
                  )}
                >
                  {INSTRUMENT_ICONS[ins]}
                  <span>{INSTRUMENT_LABELS[ins]}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Admin Controls */}
      {isAdmin && session && (
        <div className="px-4 py-2.5 border-b border-border bg-card/50 flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Transpose</span>
            <button
              type="button"
              onClick={() => handleTranspose(-1)}
              className="w-7 h-7 rounded flex items-center justify-center bg-secondary hover:bg-chord/20 text-foreground transition-colors"
              data-ocid="controls.secondary_button"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span
              className={cn(
                "text-xs font-mono w-6 text-center font-semibold",
                transposeSteps !== 0 ? "text-chord" : "text-muted-foreground",
              )}
            >
              {transposeSteps > 0 ? `+${transposeSteps}` : transposeSteps}
            </span>
            <button
              type="button"
              onClick={() => handleTranspose(1)}
              className="w-7 h-7 rounded flex items-center justify-center bg-secondary hover:bg-chord/20 text-foreground transition-colors"
              data-ocid="controls.primary_button"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="w-px h-5 bg-border" />

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Capo</span>
            <Select value={String(capoFret)} onValueChange={handleCapo}>
              <SelectTrigger
                className="h-7 w-16 text-xs bg-secondary border-border"
                data-ocid="controls.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                style={{
                  background: "oklch(var(--popover))",
                  borderColor: "oklch(var(--border))",
                }}
              >
                {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n === 0 ? "None" : `Fret ${n}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-px h-5 bg-border" />

          <div className="flex items-center gap-1">
            {["letters", "roman"].map((mode) => (
              <button
                type="button"
                key={mode}
                onClick={() => handleChordMode(mode)}
                className={cn(
                  "px-2.5 py-1 text-xs rounded font-medium transition-colors",
                  chordMode === mode
                    ? "bg-chord text-background"
                    : "bg-secondary text-muted-foreground hover:text-foreground",
                )}
                data-ocid={`controls.${mode}.toggle`}
              >
                {mode === "letters" ? "A B C" : "I II III"}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-border" />

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Key</span>
            <Select
              value={concertKey}
              onValueChange={(k) => {
                const baseKey = song?.key ?? "G";
                const baseIdx = NOTES.indexOf(baseKey);
                const targetIdx = NOTES.indexOf(k);
                if (baseIdx !== -1 && targetIdx !== -1) {
                  const steps = (targetIdx - baseIdx + 12) % 12;
                  onSessionUpdate({ transposeSteps: BigInt(steps) });
                }
              }}
            >
              <SelectTrigger className="h-7 w-16 text-xs bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                style={{
                  background: "oklch(var(--popover))",
                  borderColor: "oklch(var(--border))",
                }}
              >
                {NOTES.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            {(transposeSteps !== 0 || capoFret !== 0) && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleReset}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                data-ocid="controls.secondary_button"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            )}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="w-7 h-7 rounded flex items-center justify-center bg-secondary hover:bg-chord/20 text-muted-foreground hover:text-chord transition-colors"
              data-ocid="controls.toggle"
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Scroll Controls Bar — visible when a song is loaded */}
      {song && (
        <div className="px-4 py-2 border-b border-border bg-background/60 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsScrolling((v) => !v)}
            data-ocid="scroll.toggle"
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors border",
              isScrolling
                ? "bg-chord text-background border-chord"
                : "bg-secondary text-muted-foreground border-border hover:text-foreground hover:border-chord/40",
            )}
          >
            {isScrolling ? (
              <Pause className="w-3 h-3" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            {isScrolling ? "Pause Scroll" : "Auto Scroll"}
          </button>

          <div className="flex items-center gap-1">
            {SCROLL_SPEEDS.map((s, idx) => (
              <button
                type="button"
                key={s.label}
                onClick={() => setScrollSpeedIdx(idx)}
                data-ocid={`scroll.speed.${idx}`}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-medium transition-colors border",
                  scrollSpeedIdx === idx
                    ? "bg-chord/20 border-chord/40 text-chord"
                    : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Scroll back to top button */}
          {!isScrolling && (
            <button
              type="button"
              onClick={() => {
                if (scrollRef.current) scrollRef.current.scrollTop = 0;
              }}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-secondary/60"
              data-ocid="scroll.top_button"
            >
              ↑ Top
            </button>
          )}
        </div>
      )}

      {/* Chord Sheet — native scrollable div so we can control scrollTop */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-auto">
        {isLoading ? (
          <div className="p-6 space-y-3" data-ocid="viewer.loading_state">
            {SKELETON_WIDTHS.map((w) => (
              <Skeleton
                key={w}
                className="h-4 bg-secondary"
                style={{ width: w }}
              />
            ))}
          </div>
        ) : song ? (
          <div className="px-6 py-5">
            <div className="min-w-0">{renderSheet()}</div>
            {/* Spacer so the last lines are reachable at the bottom */}
            <div className="h-24" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
