import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  ListMusic,
  Pencil,
  Plus,
  Radio,
  StopCircle,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { ActiveSession, Setlist } from "../backend.d";
import {
  useDeleteSetlist,
  useListSetlists,
  useListSongs,
} from "../hooks/useQueries";
import SetlistForm from "./SetlistForm";

interface SetlistPanelProps {
  isAdmin: boolean;
  session: ActiveSession | null | undefined;
  onSessionUpdate: (updates: Partial<ActiveSession>) => void;
  onNavigateToSets?: () => void;
  mobile?: boolean;
}

export default function SetlistPanel({
  isAdmin,
  session,
  onSessionUpdate,
  onNavigateToSets,
  mobile = false,
}: SetlistPanelProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editSetlist, setEditSetlist] = useState<Setlist | null>(null);
  const { data: setlists = [], isLoading } = useListSetlists();
  const { data: songs = [] } = useListSongs();
  const deleteSetlist = useDeleteSetlist();

  const activeSetlistId = session?.activeSetlistId;

  const handleActivate = (id: string) => {
    if (isAdmin) {
      const newId = activeSetlistId === id ? "" : id;
      onSessionUpdate({ activeSetlistId: newId });
    }
    // Everyone navigates to the sets view on click
    onNavigateToSets?.();
  };

  const handleDelete = async (sl: Setlist) => {
    if (!window.confirm(`Delete "${sl.name}"?`)) return;
    try {
      await deleteSetlist.mutateAsync(sl.id);
      toast.success("Setlist deleted");
    } catch {
      toast.error("Failed to delete setlist");
    }
  };

  const handleEditClick = (e: React.MouseEvent, sl: Setlist) => {
    e.stopPropagation();
    setEditSetlist(sl);
    setFormOpen(true);
  };

  const handleTakeOffline = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSessionUpdate({ activeSetlistId: "" });
  };

  return (
    <div className={cn("flex flex-col", mobile ? "h-full" : "max-h-64")}>
      <div className="px-3 py-2.5 border-b border-border flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Setlists
        </span>
        {isAdmin && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditSetlist(null);
              setFormOpen(true);
            }}
            className="h-7 w-7 p-0 text-chord hover:bg-chord/10"
            data-ocid="setlist.open_modal_button"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? null : setlists.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-8 px-4 text-center"
            data-ocid="setlist.empty_state"
          >
            <ListMusic className="w-7 h-7 text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">No setlists yet</p>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setEditSetlist(null);
                  setFormOpen(true);
                }}
                className="mt-2 text-xs text-chord hover:underline"
              >
                Create one
              </button>
            )}
          </div>
        ) : (
          <div>
            {setlists.map((sl, idx) => {
              const isActive = activeSetlistId === sl.id;
              return (
                <button
                  type="button"
                  key={sl.id}
                  onClick={() => handleActivate(sl.id)}
                  data-ocid={`setlist.item.${idx + 1}`}
                  className={cn(
                    "w-full text-left flex items-center gap-2 px-3 py-2.5 border-b border-border/50 group transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-chord",
                    isActive
                      ? "bg-chord/10 border-l-2 border-l-chord"
                      : "hover:bg-secondary/50",
                  )}
                >
                  {/* Live indicator dot or radio icon */}
                  {isActive ? (
                    <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-60" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                  ) : (
                    <Radio className="w-3.5 h-3.5 shrink-0 text-muted-foreground/40" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p
                        className={cn(
                          "text-sm font-medium truncate",
                          isActive ? "text-chord" : "text-foreground",
                        )}
                      >
                        {sl.name}
                      </p>
                      {isActive && (
                        <span className="inline-flex items-center rounded px-1 py-0 text-[9px] font-bold uppercase tracking-widest bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30 leading-4 shrink-0">
                          LIVE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {sl.songIds.length} song
                      {sl.songIds.length !== 1 ? "s" : ""}
                    </p>
                    {/* "Tap to go live" hint for admins on inactive items */}
                    {isAdmin && !isActive && (
                      <p className="text-[10px] text-muted-foreground/40 group-hover:text-muted-foreground transition-colors mt-0.5">
                        Tap to go live
                      </p>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="hidden group-hover:flex items-center gap-1">
                      {isActive && (
                        <button
                          type="button"
                          onClick={handleTakeOffline}
                          className="p-1 rounded text-green-500 hover:text-destructive"
                          title="Take offline"
                          data-ocid={`setlist.toggle.${idx + 1}`}
                        >
                          <StopCircle className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleEditClick(e, sl)}
                        className="p-1 rounded text-muted-foreground hover:text-chord"
                        data-ocid={`setlist.edit_button.${idx + 1}`}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(sl);
                        }}
                        className="p-1 rounded text-muted-foreground hover:text-destructive"
                        data-ocid={`setlist.delete_button.${idx + 1}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <SetlistForm
        key={editSetlist?.id ?? "new"}
        setlist={editSetlist}
        songs={songs}
        open={formOpen}
        onClose={() => setFormOpen(false)}
      />
    </div>
  );
}
