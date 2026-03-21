import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Guitar,
  Mic,
  Mic2,
  Music2,
  Piano,
} from "lucide-react";
import type { ReactElement } from "react";
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

const INSTRUMENT_ICONS: Record<Instrument, React.ReactNode> = {
  guitar: <Guitar className="w-3.5 h-3.5" />,
  bass: <Music2 className="w-3.5 h-3.5" />,
  keys: <Piano className="w-3.5 h-3.5" />,
  vocals: <Mic className="w-3.5 h-3.5" />,
  other: <Music2 className="w-3.5 h-3.5" />,
};

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
  const activeSongId = session?.activeSongId;
  const { data: song, isLoading } = useGetSong(activeSongId);
  const lyricsText = song ? stripChordsToLyrics(song.chordSheet) : "";
  const timeSignature = song ? extractTimeSignature(song.chordSheet) : "4/4";

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
    <div className="flex flex-col h-full" data-ocid="lyrics.panel">
      {/* Header */}
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

        {/* Instrument selector */}
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

      {/* Scrollable lyrics area — native scroll so users can scroll freely */}
      <div
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
