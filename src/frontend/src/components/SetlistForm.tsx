import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Setlist, Song } from "../backend.d";
import { useCreateOrUpdateSetlist } from "../hooks/useQueries";

interface SetlistFormProps {
  setlist?: Setlist | null;
  songs: Song[];
  open: boolean;
  onClose: () => void;
}

export default function SetlistForm({
  setlist,
  songs,
  open,
  onClose,
}: SetlistFormProps) {
  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const createOrUpdate = useCreateOrUpdateSetlist();

  useEffect(() => {
    if (open) {
      setName(setlist?.name ?? "");
      setSelectedIds(setlist?.songIds ?? []);
    }
  }, [open, setlist]);

  const toggleSong = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setSelectedIds((prev) => {
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
  };

  const moveDown = (idx: number) => {
    setSelectedIds((prev) => {
      if (idx >= prev.length - 1) return prev;
      const arr = [...prev];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      await createOrUpdate.mutateAsync({
        id: setlist?.id ?? crypto.randomUUID(),
        name: name.trim(),
        songIds: selectedIds,
      });
      toast.success(setlist ? "Setlist updated" : "Setlist created");
      onClose();
    } catch {
      toast.error("Failed to save setlist");
    }
  };

  const songMap = new Map(songs.map((s) => [s.id, s]));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        style={{
          background: "oklch(var(--card))",
          borderColor: "oklch(var(--border))",
        }}
        data-ocid="setlist.dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {setlist ? "Edit Setlist" : "New Setlist"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label
              htmlFor="setlist-name"
              className="text-muted-foreground text-xs uppercase tracking-wide"
            >
              Name
            </Label>
            <Input
              id="setlist-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sunday Morning Service"
              className="bg-input border-border"
              data-ocid="setlist.input"
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-muted-foreground text-xs uppercase tracking-wide">
              Songs
            </Label>
            <ScrollArea className="h-48 rounded border border-border bg-input">
              <div className="p-2">
                {songs.map((s) => (
                  <label
                    key={s.id}
                    htmlFor={`song-check-${s.id}`}
                    className="flex items-center gap-3 px-2 py-2 rounded cursor-pointer hover:bg-secondary/50 transition-colors"
                  >
                    <Checkbox
                      id={`song-check-${s.id}`}
                      checked={selectedIds.includes(s.id)}
                      onCheckedChange={() => toggleSong(s.id)}
                      className="border-border"
                    />
                    <span className="text-sm text-foreground flex-1">
                      {s.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {s.key}
                    </span>
                  </label>
                ))}
                {songs.length === 0 && (
                  <p className="text-xs text-muted-foreground p-2">
                    No songs in library yet.
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          {selectedIds.length > 0 && (
            <div className="grid gap-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">
                Order ({selectedIds.length} songs)
              </Label>
              <div className="rounded border border-border overflow-hidden">
                {selectedIds.map((id, idx) => {
                  const s = songMap.get(id);
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-2 px-3 py-2 bg-input border-b border-border last:border-0"
                      data-ocid={`setlist.item.${idx + 1}`}
                    >
                      <span className="text-xs text-muted-foreground w-5 text-center">
                        {idx + 1}
                      </span>
                      <span className="text-sm text-foreground flex-1">
                        {s?.title ?? id}
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => moveUp(idx)}
                          disabled={idx === 0}
                          className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveDown(idx)}
                          disabled={idx === selectedIds.length - 1}
                          className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-border"
            data-ocid="setlist.cancel_button"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createOrUpdate.isPending}
            className="bg-chord text-background hover:bg-chord/80"
            data-ocid="setlist.submit_button"
          >
            {createOrUpdate.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {setlist ? "Save Changes" : "Create Setlist"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
