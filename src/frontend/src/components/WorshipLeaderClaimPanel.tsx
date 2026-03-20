import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Crown, Loader2, LogIn } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useMyLeaderRequestStatus,
  useReleaseWorshipLeader,
  useRequestWorshipLeader,
} from "../hooks/useQueries";
import {
  isRequestApproved,
  isRequestDenied,
  isRequestPending,
} from "../utils/requestStatus";

interface Props {
  isWorshipLeader: boolean;
  isLoggedIn: boolean;
}

export default function WorshipLeaderClaimPanel({
  isWorshipLeader,
  isLoggedIn,
}: Props) {
  const [open, setOpen] = useState(false);
  const { data: requestStatus } = useMyLeaderRequestStatus();

  const request = useRequestWorshipLeader();
  const release = useReleaseWorshipLeader();

  if (!isLoggedIn) return null;

  const handleRequest = () => {
    request.mutate(undefined, {
      onSuccess: () => {
        toast.success("Request submitted — waiting for admin approval");
        setOpen(false);
      },
      onError: () => toast.error("Failed to submit request"),
    });
  };

  const handleRelease = () => {
    release.mutate(undefined, {
      onSuccess: () => {
        toast.success("You have stepped down as worship leader");
        setOpen(false);
      },
      onError: () => toast.error("Failed to release role"),
    });
  };

  // Already a worship leader — show badge + step down option
  if (isWorshipLeader) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            data-ocid="leader.open_modal_button"
            className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded bg-leader/10 border border-leader/20 hover:bg-leader/20 transition-colors cursor-pointer"
          >
            <Crown className="w-3 h-3 text-leader" />
            <span className="text-[10px] font-semibold text-leader uppercase tracking-wide">
              Leader
            </span>
          </button>
        </DialogTrigger>
        <DialogContent data-ocid="leader.dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-leader" />
              Worship Leader
            </DialogTitle>
            <DialogDescription>
              You are currently an active worship leader. Band members can
              follow your session.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-md bg-leader/10 border border-leader/20">
              <p className="text-sm text-foreground font-medium">
                Your Session is Live
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Musicians can choose to follow your chord sheet and capo
                settings in the Viewer tab.
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={handleRelease}
              disabled={release.isPending}
              data-ocid="leader.delete_button"
            >
              {release.isPending && (
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
              )}
              Step Down as Worship Leader
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Pending request
  if (isRequestPending(requestStatus)) {
    return (
      <Badge
        variant="outline"
        data-ocid="leader.pending_state"
        className="hidden sm:flex items-center gap-1 text-[10px] border-amber-500/40 text-amber-400 px-2 py-0.5"
      >
        <Crown className="w-3 h-3" />
        Awaiting Approval
      </Badge>
    );
  }

  // Denied request
  if (isRequestDenied(requestStatus)) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Badge
            variant="outline"
            data-ocid="leader.open_modal_button"
            className="hidden sm:flex items-center gap-1 text-[10px] border-destructive/40 text-destructive px-2 py-0.5 cursor-pointer hover:bg-destructive/10"
          >
            <Crown className="w-3 h-3" />
            Request Denied
          </Badge>
        </DialogTrigger>
        <DialogContent data-ocid="leader.dialog">
          <DialogHeader>
            <DialogTitle>Request Denied</DialogTitle>
            <DialogDescription>
              Your worship leader request was denied. You can re-request below.
            </DialogDescription>
          </DialogHeader>
          <Button
            onClick={handleRequest}
            disabled={request.isPending}
            data-ocid="leader.primary_button"
            className="w-full"
          >
            {request.isPending && (
              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
            )}
            Re-Request Worship Leader
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  // Approved but not currently a leader (shouldn't happen often)
  if (isRequestApproved(requestStatus)) {
    return null;
  }

  // No request yet — show claim button
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          data-ocid="leader.open_modal_button"
          className="hidden sm:flex h-8 px-2.5 text-xs gap-1.5 border-leader/30 bg-leader/10 text-leader hover:bg-leader/20"
        >
          <Crown className="w-3.5 h-3.5" />
          <span>Claim Leader</span>
        </Button>
      </DialogTrigger>
      <DialogContent data-ocid="leader.dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-leader" />
            Claim Worship Leader
          </DialogTitle>
          <DialogDescription>
            Request to become today&apos;s worship leader. An admin must approve
            your request before it takes effect.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <span className="text-leader font-bold mt-0.5">•</span>
              Control chord session for your band members
            </p>
            <p className="flex items-start gap-2">
              <span className="text-leader font-bold mt-0.5">•</span>
              Set capo position and transpose for the service
            </p>
            <p className="flex items-start gap-2">
              <span className="text-leader font-bold mt-0.5">•</span>
              Musicians can choose to follow your session
            </p>
            <p className="flex items-start gap-2">
              <span className="text-muted-foreground font-bold mt-0.5">•</span>
              Admin can override or remove the leader role at any time
            </p>
          </div>
          <Button
            onClick={handleRequest}
            disabled={request.isPending}
            data-ocid="leader.primary_button"
            className="w-full bg-leader hover:bg-leader/80 text-background"
          >
            {request.isPending ? (
              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
            ) : (
              <LogIn className="w-3.5 h-3.5 mr-2" />
            )}
            Request Worship Leader Role
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
