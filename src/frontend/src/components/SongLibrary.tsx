import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Lock, Music, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { ActiveSession, Song } from "../backend.d";
import { useDeleteSong, useListSongs } from "../hooks/useQueries";
import SongForm from "./SongForm";

const SKELETON_KEYS = ["sk1", "sk2", "sk3", "sk4", "sk5"];

interface SongLibraryProps {
  isAdmin: boolean;
  session: ActiveSession | null | undefined;
  onSessionUpdate: (updates: Partial<ActiveSession>) => void;
  mobile?: boolean;
  getPrincipal?: () => any;
  onNavigateToView?: () => void;
}

export default function SongLibrary({
  isAdmin,
  session,
  onSessionUpdate,
  mobile = false,
  getPrincipal = () => null,
  onNavigateToView,
}: SongLibraryProps) {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editSong, setEditSong] = useState<Song | null>(null);
  const { data: songs = [], isLoading } = useListSongs(search);
  const deleteSong = useDeleteSong();

  const activeSongId = session?.activeSongId;

  const handleSelectSong = (id: string) => {
    // All logged-in users can select a song to view
    onSessionUpdate({ activeSongId: id });
    onNavigateToView?.();
  };

  const handleDelete = async (song: Song) => {
    if (!window.confirm(`Delete "${song.title}"?`)) return;
    try {
      await deleteSong.mutateAsync(song.id);
      toast.success("Song deleted");
    } catch {
      toast.error("Failed to delete song");
    }
  };

  const handleAddClick = () => {
    setEditSong(null);
    setFormOpen(true);
  };

  const handleEditClick = (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();
    setEditSong(song);
    setFormOpen(true);
  };

  return (
    <div className={cn("flex flex-col h-full", mobile && "pb-2")}>
      <div className="px-3 py-3 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Song Library
          </span>
          {isAdmin && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleAddClick}
              className="h-7 w-7 p-0 text-chord hover:bg-chord/10"
              data-ocid="library.open_modal_button"
              title="Add song"
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search songs..."
            className="pl-8 h-8 text-sm bg-input border-border"
            data-ocid="library.search_input"
          />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_40px_48px] px-3 py-1.5 border-b border-border shrink-0">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Title
        </span>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Key
        </span>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          BPM
        </span>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-3 space-y-2" data-ocid="library.loading_state">
            {SKELETON_KEYS.map((k) => (
              <Skeleton key={k} className="h-9 w-full rounded bg-secondary" />
            ))}
          </div>
        ) : songs.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-12 px-4 text-center"
            data-ocid="library.empty_state"
          >
            <Music className="w-8 h-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? "No songs found" : "No songs yet"}
            </p>
            {isAdmin && !search && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddClick}
                className="mt-3 text-chord border-chord/30 hover:bg-chord/10"
                data-ocid="library.primary_button"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add First Song
              </Button>
            )}
            {!isAdmin && !search && (
              <p className="mt-3 text-xs text-muted-foreground/60 flex items-center gap-1.5">
                <Lock className="w-3 h-3" />
                Only worship leaders and admins can add songs
              </p>
            )}
          </div>
        ) : (
          <div>
            {songs.map((song, idx) => (
              <button
                type="button"
                key={song.id}
                onClick={() => handleSelectSong(song.id)}
                data-ocid={`library.item.${idx + 1}`}
                className={cn(
                  "w-full text-left grid grid-cols-[1fr_40px_48px] items-center px-3 py-2.5 border-b border-border/50 group transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-chord",
                  activeSongId === song.id
                    ? "bg-chord/15 border-l-2 border-l-chord"
                    : "hover:bg-secondary/50",
                )}
              >
                <div className="min-w-0 flex items-center gap-2 pr-2">
                  <span
                    className={cn(
                      "text-sm font-medium truncate",
                      activeSongId === song.id
                        ? "text-chord"
                        : "text-foreground",
                    )}
                  >
                    {song.title}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  {song.key}
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-mono">
                    {Number(song.bpm)}
                  </span>
                  {isAdmin && (
                    <div className="hidden group-hover:flex items-center gap-1 -mr-1">
                      <button
                        type="button"
                        onClick={(e) => handleEditClick(e, song)}
                        className="p-1 rounded text-muted-foreground hover:text-chord"
                        data-ocid={`library.edit_button.${idx + 1}`}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(song);
                        }}
                        className="p-1 rounded text-muted-foreground hover:text-destructive"
                        data-ocid={`library.delete_button.${idx + 1}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Hint for non-admin users when songs exist */}
        {!isLoading && !isAdmin && songs.length > 0 && (
          <div className="px-3 py-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground/50 flex items-center gap-1.5">
              <Lock className="w-3 h-3 shrink-0" />
              Only worship leaders and admins can add songs
            </p>
          </div>
        )}
      </ScrollArea>

      <SongForm
        key={editSong?.id ?? "new"}
        song={editSong}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        getPrincipal={getPrincipal}
      />
    </div>
  );
}
