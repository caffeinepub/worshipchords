import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ActiveSession,
  RequestStatus,
  Setlist,
  Song,
  UserProfile,
  WorshipLeaderRequest,
} from "../backend.d";
import { useActor } from "./useActor";

export function useListSongs(search?: string) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["songs", search ?? ""],
    queryFn: async () => {
      if (!actor) return [] as Song[];
      if (search?.trim()) return actor.searchSongs(search.trim());
      return actor.listSongs();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useListSetlists() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["setlists"],
    queryFn: async () => {
      if (!actor) return [] as Setlist[];
      return actor.listSetlists();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useActiveSession() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["activeSession"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getActiveSession();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 2000,
  });
}

export function useIsAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUserProfile() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useListMessages() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["messages"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listRecentMessages();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 2000,
  });
}

export function useGetSong(id: string | undefined) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["song", id],
    queryFn: async () => {
      if (!actor || !id) return null;
      return actor.getSong(id);
    },
    enabled: !!actor && !isFetching && !!id,
  });
}

export function useCreateOrUpdateSong() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (song: Song) => {
      if (!actor) throw new Error("No actor");
      return actor.createOrUpdateSong(song);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["songs"] });
    },
  });
}

export function useDeleteSong() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteSong(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["songs"] });
    },
  });
}

export function useCreateOrUpdateSetlist() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (setlist: Setlist) => {
      if (!actor) throw new Error("No actor");
      return actor.createOrUpdateSetlist(setlist);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["setlists"] });
    },
  });
}

export function useDeleteSetlist() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteSetlist(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["setlists"] });
    },
  });
}

export function useUpdateActiveSession() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (session: ActiveSession) => {
      if (!actor) throw new Error("No actor");
      return actor.updateActiveSession(session);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeSession"] });
    },
  });
}

export function usePostMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      authorName,
      text,
    }: { authorName: string; text: string }) => {
      if (!actor) throw new Error("No actor");
      return actor.postMessage(authorName, text);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}

export function useSaveUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("No actor");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });
}

// ─── Worship Leader Queries ───────────────────────────────────────────────────
// These methods are in backend.d.ts but not yet in backend.ts (auto-generated).
// We cast actor as any to call them at runtime.

export function useIsWorshipLeader() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["isWorshipLeader"],
    queryFn: async () => {
      if (!actor) return false;
      try {
        return (await (actor as any).isCallerWorshipLeader()) as boolean;
      } catch {
        return false;
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useListWorshipLeaders() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["worshipLeaders"],
    queryFn: async () => {
      if (!actor) return [] as Principal[];
      try {
        return (await (actor as any).listWorshipLeaders()) as Principal[];
      } catch {
        return [] as Principal[];
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useMyLeaderRequestStatus() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["myLeaderRequestStatus"],
    queryFn: async (): Promise<RequestStatus | null> => {
      if (!actor) return null;
      try {
        return (await (
          actor as any
        ).getMyWorshipLeaderRequestStatus()) as RequestStatus | null;
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function usePendingLeaderRequests() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["pendingLeaderRequests"],
    queryFn: async () => {
      if (!actor) return [] as WorshipLeaderRequest[];
      try {
        return (await (
          actor as any
        ).listPendingWorshipLeaderRequests()) as WorshipLeaderRequest[];
      } catch {
        return [] as WorshipLeaderRequest[];
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useWorshipLeaderSession(leader: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["leaderSession", leader],
    queryFn: async (): Promise<ActiveSession | null> => {
      if (!actor || !leader) return null;
      try {
        return (await (actor as any).getWorshipLeaderSession(
          leader,
        )) as ActiveSession;
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!leader,
    refetchInterval: 3000,
  });
}

// ─── Worship Leader Mutations ─────────────────────────────────────────────────

export function useRequestWorshipLeader() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("No actor");
      return (actor as any).requestWorshipLeader();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myLeaderRequestStatus"] });
    },
  });
}

export function useApproveWorshipLeader() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error("No actor");
      return (actor as any).approveWorshipLeader(user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingLeaderRequests"] });
      queryClient.invalidateQueries({ queryKey: ["worshipLeaders"] });
    },
  });
}

export function useDenyWorshipLeader() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error("No actor");
      return (actor as any).denyWorshipLeader(user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingLeaderRequests"] });
    },
  });
}

export function useAssignWorshipLeader() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error("No actor");
      return (actor as any).assignWorshipLeader(user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worshipLeaders"] });
    },
  });
}

export function useRemoveWorshipLeader() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error("No actor");
      return (actor as any).removeWorshipLeader(user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worshipLeaders"] });
    },
  });
}

export function useReleaseWorshipLeader() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("No actor");
      return (actor as any).releaseWorshipLeader();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isWorshipLeader"] });
      queryClient.invalidateQueries({ queryKey: ["worshipLeaders"] });
    },
  });
}

export function useUpdateMyWorshipLeaderSession() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (session: ActiveSession) => {
      if (!actor) throw new Error("No actor");
      return (actor as any).updateMyWorshipLeaderSession(session);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaderSession"] });
    },
  });
}
