import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ListMusic, Pencil, Plus, Radio, Trash2 } from "lucide-react";
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
    if (!isAdmin) return;
    onSessionUpdate({ activeSetlistId: id });
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

  return (
    <div className={cn("flex flex-col", mobile ? "h-full" : "max-h-64")}>
      <div className="px-3 py-2.5 border-b border-border flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Setlists
        </span>
        {isAdmin && mobile && (
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
          </div>
        ) : (
          <div>
            {setlists.map((sl, idx) => (
              <button
                type="button"
                key={sl.id}
                onClick={() => handleActivate(sl.id)}
                data-ocid={`setlist.item.${idx + 1}`}
                className={cn(
                  "w-full text-left flex items-center gap-2 px-3 py-2.5 border-b border-border/50 group transition-colors",
                  isAdmin &&
                    "cursor-pointer focus-visible:ring-1 focus-visible:ring-chord",
                  activeSetlistId === sl.id
                    ? "bg-chord/10 border-l-2 border-l-chord"
                    : "hover:bg-secondary/50",
                )}
              >
                <Radio
                  className={cn(
                    "w-3.5 h-3.5 shrink-0",
                    activeSetlistId === sl.id
                      ? "text-chord"
                      : "text-muted-foreground/40",
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium truncate",
                      activeSetlistId === sl.id
                        ? "text-chord"
                        : "text-foreground",
                    )}
                  >
                    {sl.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sl.songIds.length} song{sl.songIds.length !== 1 ? "s" : ""}
                  </p>
                </div>
                {isAdmin && mobile && (
                  <div className="hidden group-hover:flex items-center gap-1">
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
            ))}
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
