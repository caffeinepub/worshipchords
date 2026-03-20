import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Principal } from "@icp-sdk/core/principal";
import {
  CheckCircle,
  Loader2,
  Settings,
  Shield,
  UserCheck,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useApproveWorshipLeader,
  useAssignWorshipLeader,
  useDenyWorshipLeader,
  useListWorshipLeaders,
  usePendingLeaderRequests,
  useRemoveWorshipLeader,
} from "../hooks/useQueries";

function shortPrincipal(p: Principal | string): string {
  const s = typeof p === "string" ? p : p.toString();
  if (s.length <= 16) return s;
  return `${s.slice(0, 8)}\u2026${s.slice(-6)}`;
}

export default function AdminPanel() {
  const [assignInput, setAssignInput] = useState("");
  const [open, setOpen] = useState(false);

  const { data: leaders = [], isLoading: loadingLeaders } =
    useListWorshipLeaders();
  const { data: pendingRequests = [], isLoading: loadingPending } =
    usePendingLeaderRequests();

  const approve = useApproveWorshipLeader();
  const deny = useDenyWorshipLeader();
  const assign = useAssignWorshipLeader();
  const remove = useRemoveWorshipLeader();

  const handleApprove = (user: Principal) => {
    approve.mutate(user, {
      onSuccess: () => toast.success("Worship leader approved"),
      onError: () => toast.error("Failed to approve"),
    });
  };

  const handleDeny = (user: Principal) => {
    deny.mutate(user, {
      onSuccess: () => toast.success("Request denied"),
      onError: () => toast.error("Failed to deny"),
    });
  };

  const handleRemove = (user: Principal) => {
    remove.mutate(user, {
      onSuccess: () => toast.success("Worship leader removed"),
      onError: () => toast.error("Failed to remove"),
    });
  };

  const handleAssign = () => {
    const trimmed = assignInput.trim();
    if (!trimmed) return;
    assign.mutate(trimmed as unknown as Principal, {
      onSuccess: () => {
        toast.success("Worship leader assigned");
        setAssignInput("");
      },
      onError: () => toast.error("Failed to assign. Check the principal."),
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          data-ocid="admin.open_modal_button"
          className="h-8 px-2.5 text-xs gap-1.5 border-chord/30 bg-chord/10 text-chord hover:bg-chord/20"
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Admin</span>
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-[360px] sm:w-[420px] p-0 flex flex-col"
        data-ocid="admin.sheet"
      >
        <SheetHeader className="px-5 py-4 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Shield className="w-4 h-4 text-chord" />
            Admin Panel
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-5 py-4 space-y-6">
            {/* Pending Requests */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <UserCheck className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-foreground">
                  Pending Requests
                </h3>
                {pendingRequests.length > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 border-amber-500/40 text-amber-400"
                  >
                    {pendingRequests.length}
                  </Badge>
                )}
              </div>

              {loadingPending ? (
                <div
                  className="text-xs text-muted-foreground"
                  data-ocid="admin.loading_state"
                >
                  Loading...
                </div>
              ) : pendingRequests.length === 0 ? (
                <div
                  className="text-xs text-muted-foreground py-3 px-3 rounded-md bg-secondary/40 border border-border"
                  data-ocid="admin.empty_state"
                >
                  No pending requests
                </div>
              ) : (
                <div className="space-y-2" data-ocid="admin.list">
                  {pendingRequests.map((req, idx) => (
                    <div
                      key={req.requester.toString()}
                      data-ocid={`admin.item.${idx + 1}`}
                      className="flex items-center justify-between gap-2 p-3 rounded-md bg-secondary/40 border border-border"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-mono text-foreground truncate">
                          {shortPrincipal(req.requester)}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Requested worship leader role
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          data-ocid="admin.confirm_button"
                          onClick={() => handleApprove(req.requester)}
                          disabled={approve.isPending}
                          className="h-7 px-2 text-[10px] border-success/40 text-success hover:bg-success/10"
                        >
                          {approve.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          <span className="ml-1">Approve</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          data-ocid="admin.cancel_button"
                          onClick={() => handleDeny(req.requester)}
                          disabled={deny.isPending}
                          className="h-7 px-2 text-[10px] border-destructive/40 text-destructive hover:bg-destructive/10"
                        >
                          <X className="w-3 h-3" />
                          <span className="ml-1">Deny</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <Separator />

            {/* Current Worship Leaders */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <UserCheck className="w-4 h-4 text-leader" />
                <h3 className="text-sm font-semibold text-foreground">
                  Worship Leaders
                </h3>
              </div>

              {loadingLeaders ? (
                <div className="text-xs text-muted-foreground">Loading...</div>
              ) : leaders.length === 0 ? (
                <div className="text-xs text-muted-foreground py-3 px-3 rounded-md bg-secondary/40 border border-border">
                  No active worship leaders
                </div>
              ) : (
                <div className="space-y-2">
                  {leaders.map((leader, idx) => (
                    <div
                      key={leader.toString()}
                      data-ocid={`admin.row.${idx + 1}`}
                      className="flex items-center justify-between gap-2 p-3 rounded-md bg-secondary/40 border border-border"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-mono text-foreground truncate">
                          {shortPrincipal(leader)}
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 h-4 border-leader/40 text-leader mt-1"
                        >
                          Leader
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        data-ocid="admin.delete_button"
                        onClick={() => handleRemove(leader)}
                        disabled={remove.isPending}
                        className="h-7 px-2 text-[10px] border-destructive/40 text-destructive hover:bg-destructive/10 shrink-0"
                      >
                        <UserMinus className="w-3 h-3" />
                        <span className="ml-1">Remove</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <Separator />

            {/* Assign Directly */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <UserPlus className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">
                  Assign Worship Leader
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Paste a user&apos;s Principal ID to assign them directly.
              </p>
              <div className="flex gap-2">
                <Input
                  value={assignInput}
                  onChange={(e) => setAssignInput(e.target.value)}
                  placeholder="Principal ID..."
                  className="h-8 text-xs font-mono bg-secondary/50"
                  data-ocid="admin.input"
                  onKeyDown={(e) => e.key === "Enter" && handleAssign()}
                />
                <Button
                  size="sm"
                  onClick={handleAssign}
                  disabled={assign.isPending || !assignInput.trim()}
                  data-ocid="admin.submit_button"
                  className="h-8 text-xs shrink-0"
                >
                  {assign.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    "Assign"
                  )}
                </Button>
              </div>
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
