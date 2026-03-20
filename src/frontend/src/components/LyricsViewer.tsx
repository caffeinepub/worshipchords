import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Mic2 } from "lucide-react";
import type { ActiveSession } from "../backend.d";
import { useGetSong } from "../hooks/useQueries";
import { stripChordsToLyrics } from "../utils/lyrics";

interface LyricsViewerProps {
  session: ActiveSession | null | undefined;
  mobile?: boolean;
}

export default function LyricsViewer({ session }: LyricsViewerProps) {
  const activeSongId = session?.activeSongId;
  const { data: song, isLoading } = useGetSong(activeSongId);

  const lyricsText = song ? stripChordsToLyrics(song.chordSheet) : "";

  const renderLyrics = () => {
    if (!lyricsText) return null;
    return lyricsText.split("\n").map((line, i) => {
      const trimmed = line.trim();
      const key = `lyrics-line-${i}`;

      if (!trimmed) {
        return <div key={key} className="h-5" />;
      }

      if (/^\[.+\]$/.test(trimmed)) {
        return (
          <div
            key={key}
            className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mt-6 mb-2 first:mt-0"
          >
            {trimmed.replace(/[\[\]]/g, "")}
          </div>
        );
      }

      return (
        <div
          key={key}
          className="text-xl leading-relaxed text-foreground font-medium"
        >
          {line}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-full" data-ocid="lyrics.panel">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-border shrink-0">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 bg-secondary" />
            <Skeleton className="h-4 w-32 bg-secondary" />
          </div>
        ) : song ? (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-5 h-5 text-leader" />
              <h1 className="text-2xl font-bold text-foreground leading-tight">
                {song.title}
              </h1>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-leader/10 border border-leader/20 text-leader font-semibold">
                Key of {song.key}
              </span>
              <span className="text-xs text-muted-foreground">
                {Number(song.bpm)} BPM
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Mic2 className="w-3 h-3" /> Vocals only
              </span>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-lg font-semibold text-muted-foreground">
              Lyrics View
            </h1>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              Chords only shown to musicians
            </p>
          </div>
        )}
      </div>

      {/* Lyrics Content */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-8 space-y-4" data-ocid="lyrics.loading_state">
            {["70%", "85%", "60%", "90%", "75%", "50%"].map((w) => (
              <Skeleton
                key={w}
                className="h-6 bg-secondary"
                style={{ width: w }}
              />
            ))}
          </div>
        ) : song && lyricsText ? (
          <div
            className="px-8 py-8 max-w-2xl mx-auto"
            data-ocid="lyrics.section"
          >
            {renderLyrics()}
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-6"
            data-ocid="lyrics.empty_state"
          >
            <BookOpen className="w-14 h-14 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground font-medium">
              Waiting for worship leader to select a song
            </p>
            <p className="text-muted-foreground/60 text-sm mt-1">
              Lyrics will appear here when a song is active
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
