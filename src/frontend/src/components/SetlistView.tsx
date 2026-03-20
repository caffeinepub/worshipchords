import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ListMusic, Music2 } from "lucide-react";
import type { ActiveSession } from "../backend.d";
import { useListSetlists, useListSongs } from "../hooks/useQueries";

interface SetlistViewProps {
  session: ActiveSession | null | undefined;
  isAdmin: boolean;
  onSessionUpdate: (updates: Partial<ActiveSession>) => void;
  onNavigateToView: () => void;
  mobile?: boolean;
}

export default function SetlistView({
  session,
  onSessionUpdate,
  onNavigateToView,
  mobile,
}: SetlistViewProps) {
  const { data: setlists = [] } = useListSetlists();
  const { data: songs = [] } = useListSongs();

  const activeSetlist = session?.activeSetlistId
    ? setlists.find((s) => s.id === session.activeSetlistId)
    : null;

  const setlistSongs = activeSetlist
    ? activeSetlist.songIds
        .map((id) => songs.find((s) => s.id === id))
        .filter(Boolean)
    : [];

  const handleSongClick = (songId: string) => {
    onSessionUpdate({ activeSongId: songId });
    onNavigateToView();
  };

  return (
    <div
      className={cn("flex flex-col h-full bg-background", mobile ? "" : "")}
      data-ocid="setlist_view.panel"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
        <ListMusic className="w-4 h-4 text-chord" />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground truncate">
            {activeSetlist ? activeSetlist.name : "Setlist"}
          </h2>
          {activeSetlist && (
            <p className="text-[10px] text-muted-foreground">
              {setlistSongs.length} song{setlistSongs.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {!activeSetlist ? (
          <div
            className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center"
            data-ocid="setlist_view.empty_state"
          >
            <div className="w-12 h-12 rounded-full bg-chord/10 flex items-center justify-center">
              <ListMusic className="w-6 h-6 text-chord/50" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              No setlist selected
            </p>
            <p className="text-xs text-muted-foreground/60">
              Choose a setlist from the sidebar to get started
            </p>
          </div>
        ) : setlistSongs.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center"
            data-ocid="setlist_view.empty_state"
          >
            <div className="w-12 h-12 rounded-full bg-chord/10 flex items-center justify-center">
              <Music2 className="w-6 h-6 text-chord/50" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              Setlist is empty
            </p>
            <p className="text-xs text-muted-foreground/60">
              Add songs from the Song Library
            </p>
          </div>
        ) : (
          <div className="py-2">
            {setlistSongs.map((song, index) => {
              if (!song) return null;
              const isActive = session?.activeSongId === song.id;
              return (
                <button
                  type="button"
                  key={song.id}
                  onClick={() => handleSongClick(song.id)}
                  data-ocid={`setlist_view.item.${index + 1}`}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                    "hover:bg-secondary/50 active:bg-secondary/70",
                    isActive
                      ? "bg-chord/10 border-l-2 border-chord"
                      : "border-l-2 border-transparent",
                  )}
                >
                  {/* Song number */}
                  <span
                    className={cn(
                      "w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0",
                      isActive
                        ? "bg-chord text-white"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {index + 1}
                  </span>

                  {/* Song info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium truncate",
                        isActive ? "text-chord" : "text-foreground",
                      )}
                    >
                      {song.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {Number(song.bpm)} BPM
                    </p>
                  </div>

                  {/* Key badge */}
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0 h-5 shrink-0 font-mono font-bold",
                      isActive
                        ? "border-chord/40 text-chord bg-chord/5"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {song.key}
                  </Badge>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
