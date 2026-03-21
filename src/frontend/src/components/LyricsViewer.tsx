import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Guitar,
  Maximize2,
  Mic,
  Mic2,
  Minimize2,
  Minus,
  Music2,
  Pause,
  Piano,
  Play,
  Plus,
} from "lucide-react";
import {
  type ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ActiveSession } from "../backend.d";
import {
  INSTRUMENTS,
  INSTRUMENT_LABELS,
  type Instrument,
} from "../hooks/useInstrument";
import { useGetSong } from "../hooks/useQueries";
import { extractTimeSignature } from "../utils/chords";
import { stripChordsToLyrics } from "../utils/lyrics";

const LOADING_SKELETONS = [
  "72%",
  "88%",
  "64%",
  "90%",
  "78%",
  "55%",
  "82%",
  "60%",
];

const BASE_PX_PER_S = 40;
const SPEED_MIN = 0.1;
const SPEED_MAX = 1.5;
const SPEED_STEP = 0.1;

const INSTRUMENT_ICONS: Record<Instrument, React.ReactNode> = {
  guitar: <Guitar className="w-3.5 h-3.5" />,
  bass: <Music2 className="w-3.5 h-3.5" />,
  keys: <Piano className="w-3.5 h-3.5" />,
  vocals: <Mic className="w-3.5 h-3.5" />,
  other: <Music2 className="w-3.5 h-3.5" />,
};

const canNativeFullscreen = () =>
  typeof document !== "undefined" && !!document.fullscreenEnabled;

interface LyricsViewerProps {
  session: ActiveSession | null | undefined;
  mobile?: boolean;
  hasPrev?: boolean;
  hasNext?: boolean;
  onPrevSong?: () => void;
  onNextSong?: () => void;
  instrument?: Instrument;
  onInstrumentChange?: (instrument: Instrument) => void;
}

export default function LyricsViewer({
  session,
  hasPrev = false,
  hasNext = false,
  onPrevSong,
  onNextSong,
  instrument,
  onInstrumentChange,
}: LyricsViewerProps) {
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isSimulatedFullscreen, setIsSimulatedFullscreen] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(0.6);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const accumRef = useRef<number>(0);
  const scrollSpeedRef = useRef(0.6);
  scrollSpeedRef.current = scrollSpeed;

  const isFullscreen = isNativeFullscreen || isSimulatedFullscreen;

  const activeSongId = session?.activeSongId;
  const { data: song, isLoading } = useGetSong(activeSongId);
  const lyricsText = song ? stripChordsToLyrics(song.chordSheet) : "";
  const timeSignature = song ? extractTimeSignature(song.chordSheet) : "4/4";

  const scrollLoop = useCallback((timestamp: number) => {
    if (lastTimeRef.current === null) {
      lastTimeRef.current = timestamp;
      accumRef.current = 0;
    }
    const delta = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;
    const el = scrollRef.current;
    if (el) {
      const pxPerMs = (BASE_PX_PER_S * scrollSpeedRef.current) / 1000;
      accumRef.current += pxPerMs * delta;
      const intPx = Math.floor(accumRef.current);
      if (intPx > 0) {
        el.scrollTop += intPx;
        accumRef.current -= intPx;
      }
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
        setIsScrolling(false);
        return;
      }
    }
    rafRef.current = requestAnimationFrame(scrollLoop);
  }, []);

  useEffect(() => {
    if (isScrolling) {
      lastTimeRef.current = null;
      accumRef.current = 0;
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

  // Reset scroll to top when song changes
  const prevSongIdRef = useRef<string | undefined>(undefined);
  if (prevSongIdRef.current !== activeSongId) {
    prevSongIdRef.current = activeSongId;
    setIsScrolling(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }

  useEffect(() => {
    const onFsChange = () => {
      setIsNativeFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (canNativeFullscreen()) {
      const el = document.getElementById("lyrics-viewer-root");
      if (!document.fullscreenElement && el) {
        el.requestFullscreen().catch(() => {});
      } else if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } else {
      setIsSimulatedFullscreen((prev) => !prev);
    }
  };

  const adjustSpeed = (delta: number) => {
    setScrollSpeed((prev) => {
      const next = Math.round((prev + delta) * 10) / 10;
      return Math.min(SPEED_MAX, Math.max(SPEED_MIN, next));
    });
  };

  const renderLyrics = () => {
    if (!lyricsText) return null;
    const lines = lyricsText.split("\n");
    const elements: ReactElement[] = [];
    let key = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      const lineKey = `lyrics-line-${key++}`;
      if (!trimmed) {
        elements.push(<div key={lineKey} className="h-4" />);
        continue;
      }
      if (/^\[.+\]$/.test(trimmed)) {
        elements.push(
          <div
            key={lineKey}
            className="flex items-center gap-2 mt-8 mb-3 first:mt-0"
          >
            <div className="h-px flex-1 bg-border/60" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-chord/70 px-1">
              {trimmed.replace(/[\[\]]/g, "")}
            </span>
            <div className="h-px flex-1 bg-border/60" />
          </div>,
        );
        continue;
      }
      elements.push(
        <p
          key={lineKey}
          className="text-xl leading-[1.8] text-foreground font-normal tracking-wide"
        >
          {line}
        </p>,
      );
    }
    return elements;
  };

  return (
    <div
      id="lyrics-viewer-root"
      style={
        isSimulatedFullscreen
          ? { position: "fixed", inset: 0, zIndex: 9999, overflowY: "auto" }
          : undefined
      }
      className={cn("flex flex-col h-full", isFullscreen && "bg-background")}
      data-ocid="lyrics.panel"
    >
      {isFullscreen ? (
        /* ── Fullscreen minimal bar ── */
        <div className="px-3 py-2 border-b border-border shrink-0 flex items-center gap-2">
          {/* Minimize */}
          <button
            type="button"
            onClick={toggleFullscreen}
            data-ocid="controls.toggle"
            className="w-9 h-9 rounded flex items-center justify-center bg-secondary hover:bg-chord/20 text-muted-foreground hover:text-chord transition-colors border border-border shrink-0"
          >
            <Minimize2 className="w-4 h-4" />
          </button>

          {/* Song title + time signature/BPM */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <span className="text-sm font-semibold text-foreground truncate leading-tight">
              {song?.title ?? ""}
            </span>
            {song && (
              <span className="text-xs text-muted-foreground font-mono mt-0.5 leading-none">
                {timeSignature} · {Number(song.bpm)} BPM
              </span>
            )}
          </div>

          {/* Prev/Next */}
          {(hasPrev || hasNext) && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={onPrevSong}
                disabled={!hasPrev}
                data-ocid="lyrics.prev_song"
                className={cn(
                  "w-9 h-9 rounded flex items-center justify-center border transition-colors",
                  hasPrev
                    ? "border-chord/30 text-chord hover:bg-chord/10"
                    : "border-border text-muted-foreground/30 cursor-not-allowed",
                )}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onNextSong}
                disabled={!hasNext}
                data-ocid="lyrics.next_song"
                className={cn(
                  "w-9 h-9 rounded flex items-center justify-center border transition-colors",
                  hasNext
                    ? "border-chord/30 text-chord hover:bg-chord/10"
                    : "border-border text-muted-foreground/30 cursor-not-allowed",
                )}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Auto-scroll inline */}
          {song &&
            (isScrolling ? (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => adjustSpeed(-SPEED_STEP)}
                  disabled={scrollSpeed <= SPEED_MIN}
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center bg-secondary border border-border hover:bg-chord/20 text-foreground transition-colors",
                    scrollSpeed <= SPEED_MIN && "opacity-40 cursor-not-allowed",
                  )}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-mono font-semibold text-foreground min-w-[40px] text-center">
                  {scrollSpeed.toFixed(1)}x
                </span>
                <button
                  type="button"
                  onClick={() => adjustSpeed(SPEED_STEP)}
                  disabled={scrollSpeed >= SPEED_MAX}
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center bg-secondary border border-border hover:bg-chord/20 text-foreground transition-colors",
                    scrollSpeed >= SPEED_MAX && "opacity-40 cursor-not-allowed",
                  )}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsScrolling(false)}
                  data-ocid="scroll.toggle"
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-foreground text-background hover:opacity-90"
                >
                  <Pause className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsScrolling(true)}
                data-ocid="scroll.toggle"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium border bg-secondary text-muted-foreground border-border hover:text-foreground hover:border-chord/40 shrink-0"
              >
                <Play className="w-3 h-3" />
                Scroll
              </button>
            ))}
        </div>
      ) : (
        /* ── Normal header ── */
        <div className="px-6 pt-5 pb-4 border-b border-border shrink-0 bg-background">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 bg-secondary" />
              <Skeleton className="h-4 w-32 bg-secondary" />
            </div>
          ) : song ? (
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-foreground leading-tight tracking-tight">
                  {song.title}
                </h1>
                <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-chord/10 border border-chord/20 text-chord font-semibold">
                    Key of {song.key}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {timeSignature} · {Number(song.bpm)} BPM
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mic2 className="w-3 h-3" /> Vocals
                  </span>
                </div>
              </div>
              {(hasPrev || hasNext) && (
                <div className="flex items-center gap-1 shrink-0 mt-1">
                  <button
                    type="button"
                    onClick={onPrevSong}
                    disabled={!hasPrev}
                    title="Previous song"
                    data-ocid="lyrics.prev_song"
                    className={cn(
                      "w-8 h-8 rounded flex items-center justify-center transition-colors border",
                      hasPrev
                        ? "border-chord/30 text-chord hover:bg-chord/10"
                        : "border-border text-muted-foreground/30 cursor-not-allowed",
                    )}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onNextSong}
                    disabled={!hasNext}
                    title="Next song"
                    data-ocid="lyrics.next_song"
                    className={cn(
                      "w-8 h-8 rounded flex items-center justify-center transition-colors border",
                      hasNext
                        ? "border-chord/30 text-chord hover:bg-chord/10"
                        : "border-border text-muted-foreground/30 cursor-not-allowed",
                    )}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <h1 className="text-lg font-semibold text-muted-foreground">
                Lyrics
              </h1>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                Select a song to see lyrics
              </p>
            </div>
          )}

          {/* Instrument selector — hidden in fullscreen */}
          {onInstrumentChange && instrument && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {INSTRUMENTS.map((ins) => (
                <button
                  key={ins}
                  type="button"
                  onClick={() => onInstrumentChange(ins)}
                  data-ocid={`instrument.${ins}.toggle`}
                  aria-pressed={instrument === ins}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
                    instrument === ins
                      ? "bg-chord text-chord-foreground border-chord shadow-sm"
                      : "bg-secondary/50 text-muted-foreground border-border hover:border-chord/40 hover:text-foreground",
                  )}
                >
                  {INSTRUMENT_ICONS[ins]}
                  <span>{INSTRUMENT_LABELS[ins]}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scroll Controls — hidden in fullscreen (controls embedded in minimal bar) */}
      {!isFullscreen && song && (
        <div className="px-4 py-2 border-b border-border bg-background/60 flex items-center gap-3 shrink-0">
          {isScrolling ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => adjustSpeed(-SPEED_STEP)}
                disabled={scrollSpeed <= SPEED_MIN}
                data-ocid="scroll.speed.button"
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center transition-colors",
                  "bg-secondary border border-border hover:bg-chord/20 text-foreground",
                  scrollSpeed <= SPEED_MIN && "opacity-40 cursor-not-allowed",
                )}
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-base font-mono font-semibold text-foreground min-w-[52px] text-center">
                {scrollSpeed.toFixed(1)}x
              </span>
              <button
                type="button"
                onClick={() => adjustSpeed(SPEED_STEP)}
                disabled={scrollSpeed >= SPEED_MAX}
                data-ocid="scroll.speed.button"
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center transition-colors",
                  "bg-secondary border border-border hover:bg-chord/20 text-foreground",
                  scrollSpeed >= SPEED_MAX && "opacity-40 cursor-not-allowed",
                )}
              >
                <Plus className="w-4 h-4" />
              </button>
              <div className="w-3" />
              <button
                type="button"
                onClick={() => setIsScrolling(false)}
                data-ocid="scroll.toggle"
                className="w-11 h-11 rounded-full flex items-center justify-center transition-colors bg-foreground text-background hover:opacity-90"
              >
                <Pause className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsScrolling(true)}
              data-ocid="scroll.toggle"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors border bg-secondary text-muted-foreground border-border hover:text-foreground hover:border-chord/40"
            >
              <Play className="w-3 h-3" />
              Auto Scroll
            </button>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            {!isScrolling && (
              <button
                type="button"
                onClick={() => {
                  if (scrollRef.current) scrollRef.current.scrollTop = 0;
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-secondary/60"
                data-ocid="scroll.top_button"
              >
                ↑ Top
              </button>
            )}
            <button
              type="button"
              onClick={toggleFullscreen}
              title="Enter fullscreen"
              className="w-7 h-7 rounded flex items-center justify-center bg-secondary hover:bg-chord/20 text-muted-foreground hover:text-chord transition-colors border border-border"
              data-ocid="controls.toggle"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Scrollable lyrics area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {isLoading ? (
          <div className="p-10 space-y-5" data-ocid="lyrics.loading_state">
            {LOADING_SKELETONS.map((w) => (
              <Skeleton
                key={w}
                className="h-6 bg-secondary"
                style={{ width: w }}
              />
            ))}
          </div>
        ) : song && lyricsText ? (
          <div
            className="px-8 py-10 max-w-2xl mx-auto"
            data-ocid="lyrics.section"
          >
            {renderLyrics()}
            <div className="h-16" />
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-6"
            data-ocid="lyrics.empty_state"
          >
            <Mic2 className="w-14 h-14 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground font-medium">
              Waiting for worship leader to select a song
            </p>
            <p className="text-muted-foreground/60 text-sm mt-1">
              Lyrics will appear here when a song is active
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
