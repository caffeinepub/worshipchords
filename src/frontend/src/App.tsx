import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Crown,
  Eye,
  ListMusic,
  Loader2,
  LogIn,
  LogOut,
  MessageSquare,
  Music2,
  Radio,
  Shield,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ActiveSession } from "./backend.d";
import AdminPanel from "./components/AdminPanel";
import BandChat from "./components/BandChat";
import ChordViewer from "./components/ChordViewer";
import LyricsViewer from "./components/LyricsViewer";
import SetlistPanel from "./components/SetlistPanel";
import SetlistView from "./components/SetlistView";
import SongLibrary from "./components/SongLibrary";
import WorshipLeaderClaimPanel from "./components/WorshipLeaderClaimPanel";
import { useActor } from "./hooks/useActor";
import { useInstrument } from "./hooks/useInstrument";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import {
  useActiveSession,
  useIsAdmin,
  useIsWorshipLeader,
  useListSetlists,
  useListSongs,
  useListWorshipLeaders,
  useSaveUserProfile,
  useUpdateActiveSession,
  useUpdateMyWorshipLeaderSession,
  useUserProfile,
  useWorshipLeaderSession,
} from "./hooks/useQueries";
import { useRedirectLogin } from "./hooks/useRedirectLogin";
import { setSheetTimeSignature } from "./utils/chords";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000,
    },
  },
});

type Tab = "library" | "setlist" | "view" | "chat";

const FOLLOWING_LEADER_KEY = "worshipchords_following_leader";

function readFollowingLeader(): string | null {
  try {
    return localStorage.getItem(FOLLOWING_LEADER_KEY);
  } catch {
    return null;
  }
}

function writeFollowingLeader(val: string | null) {
  try {
    if (val) {
      localStorage.setItem(FOLLOWING_LEADER_KEY, val);
    } else {
      localStorage.removeItem(FOLLOWING_LEADER_KEY);
    }
  } catch {
    // ignore
  }
}

const SEED_SONGS = [
  {
    title: "Amazing Grace",
    key: "G",
    bpm: 72,
    timeSignature: "3/4",
    chordSheet: `[Verse 1]
G        C    G
Amazing grace how sweet the sound
G           G7
That saved a wretch like me
     C     G
I once was lost but now am found
    Em  D    G
Was blind but now I see

[Verse 2]
G        C      G
'Twas grace that taught my heart to fear
G          G7
And grace my fears relieved
     C       G
How precious did that grace appear
Em   D      G
The hour I first believed`,
  },
  {
    title: "How Great Is Our God",
    key: "G",
    bpm: 68,
    timeSignature: "4/4",
    chordSheet: `[Verse 1]
G              Em
The splendor of the King clothed in majesty
     C                  G
Let all the earth rejoice all the earth rejoice
G               Em
He wraps Himself in light and darkness tries to hide
C                   D
And trembles at His voice and trembles at His voice

[Chorus]
    G    D    Em   C
How great is our God sing with me
    G    D    Em   C
How great is our God and all will see
    G           D
How great how great is our God`,
  },
  {
    title: "10,000 Reasons (Bless the Lord)",
    key: "G",
    bpm: 73,
    timeSignature: "4/4",
    chordSheet: `[Chorus]
G      D      Em    C
Bless the Lord O my soul O my soul
G         D          C
Worship His holy name
G     D    Em     C
Sing like never before O my soul
G    D     C
I'll worship Your holy name

[Verse 1]
G              D          Em       C
The sun comes up it's a new day dawning
G            D           Em    C
It's time to sing Your song again
G             D         Em      C
Whatever may pass and whatever lies before me
G        D       C
Let me be singing when the evening comes`,
  },
  {
    title: "Oceans (Where Feet May Fail)",
    key: "D",
    bpm: 67,
    timeSignature: "4/4",
    chordSheet: `[Verse 1]
D                 A
You call me out upon the waters
Bm          G
The great unknown where feet may fail
D               A
And there I find You in the mystery
Bm          G
In oceans deep my faith will stand

[Chorus]
D        A
And I will call upon Your name
Bm           G
And keep my eyes above the waves
D        A
When oceans rise my soul will rest in Your embrace
Bm     G
For I am Yours and You are mine`,
  },
  {
    title: "What A Beautiful Name",
    key: "D",
    bpm: 70,
    timeSignature: "4/4",
    chordSheet: `[Verse 1]
D      G      D
You were the Word at the beginning
D     G      D
One with God the Lord Most High
D      G         D
Your hidden glory in creation
D      G     A
Now revealed in You our Christ

[Chorus]
Bm      G
What a beautiful name it is
Bm      G
What a beautiful name it is
     D    A       Bm   G
The name of Jesus Christ my King
Bm      G
What a beautiful name it is
     D    A    D
Nothing compares to this`,
  },
];

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>("view");
  const [showRedirectDialog, setShowRedirectDialog] = useState(false);
  const [followingLeader, setFollowingLeaderState] = useState<string | null>(
    readFollowingLeader,
  );

  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const { loginWithRedirect, isLoading: isRedirectLoading } =
    useRedirectLogin();
  const { actor } = useActor();
  const { data: isAdmin = false } = useIsAdmin();
  const { data: isWorshipLeader = false } = useIsWorshipLeader();
  const { data: session } = useActiveSession();
  const { data: songs = [] } = useListSongs();
  const { data: setlists = [] } = useListSetlists();
  const { data: userProfile } = useUserProfile();
  const { data: worshipLeaders = [] } = useListWorshipLeaders();
  const { data: followedLeaderSession } =
    useWorshipLeaderSession(followingLeader);

  const updateSession = useUpdateActiveSession();
  const updateLeaderSession = useUpdateMyWorshipLeaderSession();
  const saveProfile = useSaveUserProfile();
  const { instrument, setInstrument } = useInstrument();

  const isLoggedIn = !!identity && !identity.getPrincipal().isAnonymous();
  const isLoggingIn =
    loginStatus === "logging-in" || loginStatus === "initializing";

  const viewerSession =
    !isAdmin && !isWorshipLeader && followingLeader && followedLeaderSession
      ? followedLeaderSession
      : session;

  const setFollowingLeader = (val: string | null) => {
    setFollowingLeaderState(val);
    writeFollowingLeader(val);
  };

  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (isAdmin && songs.length === 0 && actor && !seeded) {
      setSeeded(true);
      const principal = identity?.getPrincipal();
      Promise.all(
        SEED_SONGS.map((s) =>
          actor.createOrUpdateSong({
            id: crypto.randomUUID(),
            title: s.title,
            key: s.key,
            bpm: BigInt(s.bpm),
            chordSheet: setSheetTimeSignature(s.chordSheet, s.timeSignature),
            createdBy: principal as any,
          }),
        ),
      ).then(() => queryClient.invalidateQueries({ queryKey: ["songs"] }));
    }
  }, [isAdmin, songs.length, actor, seeded, identity]);

  useEffect(() => {
    if (
      isAdmin &&
      actor &&
      session &&
      !session.activeSongId &&
      songs.length > 0
    ) {
      const firstSong = songs[0];
      updateSession.mutate({
        ...session,
        activeSongId: firstSong.id,
      });
    }
  }, [isAdmin, actor, session, songs, updateSession.mutate]);

  const handleSessionUpdate = useCallback(
    (updates: Partial<ActiveSession>) => {
      if (!session) return;
      const now = BigInt(Date.now()) * BigInt(1_000_000);
      if (isAdmin) {
        updateSession.mutate({
          ...session,
          lastUpdated: now,
          ...updates,
        });
      } else if (isWorshipLeader) {
        updateLeaderSession.mutate({
          ...session,
          lastUpdated: now,
          ...updates,
        });
      }
    },
    [session, isAdmin, isWorshipLeader, updateSession, updateLeaderSession],
  );

  const getPrincipal = () => identity?.getPrincipal() as any;

  const canControl = isAdmin || isWorshipLeader;

  const navigateToView = useCallback(() => setActiveTab("view"), []);

  // Setlist navigation for the viewer
  const activeSetlist = viewerSession?.activeSetlistId
    ? setlists.find((s) => s.id === viewerSession.activeSetlistId)
    : null;
  const setlistSongs = activeSetlist
    ? activeSetlist.songIds
        .map((id) => songs.find((s) => s.id === id))
        .filter(Boolean)
    : [];
  const currentSongIdx = viewerSession?.activeSongId
    ? setlistSongs.findIndex((s) => s?.id === viewerSession.activeSongId)
    : -1;
  const hasPrevSong = currentSongIdx > 0;
  const hasNextSong =
    currentSongIdx >= 0 && currentSongIdx < setlistSongs.length - 1;

  const handlePrevSong = useCallback(() => {
    if (!hasPrevSong) return;
    const prev = setlistSongs[currentSongIdx - 1];
    if (prev) handleSessionUpdate({ activeSongId: prev.id });
  }, [hasPrevSong, setlistSongs, currentSongIdx, handleSessionUpdate]);

  const handleNextSong = useCallback(() => {
    if (!hasNextSong) return;
    const next = setlistSongs[currentSongIdx + 1];
    if (next) handleSessionUpdate({ activeSongId: next.id });
  }, [hasNextSong, setlistSongs, currentSongIdx, handleSessionUpdate]);

  const tabs = [
    { id: "library" as Tab, icon: Music2, label: "Library" },
    { id: "setlist" as Tab, icon: ListMusic, label: "Sets" },
    { id: "view" as Tab, icon: Eye, label: "Viewer" },
    { id: "chat" as Tab, icon: MessageSquare, label: "Chat" },
  ];

  // Only non-admin, non-leader vocalists see lyrics-only view
  const isVocalist = instrument === "vocals";

  return (
    <div className="h-[100dvh] flex flex-col bg-background text-foreground overflow-hidden">
      <header className="appbar border-b border-border flex items-center gap-2 px-4 h-14 shrink-0 z-10">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded bg-chord/20 flex items-center justify-center">
            <Music2 className="w-4 h-4 text-chord" />
          </div>
          <span className="font-semibold text-sm text-foreground hidden sm:block tracking-tight">
            WorshipChords
          </span>
        </div>

        <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
          {tabs.map(({ id, label }) => (
            <button
              type="button"
              key={id}
              onClick={() => setActiveTab(id)}
              data-ocid={`nav.${id}.tab`}
              className={cn(
                "px-4 py-1.5 text-xs rounded font-medium transition-colors",
                activeTab === id
                  ? "text-chord bg-chord/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
              )}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 ml-auto">
          {isAdmin && (
            <div className="flex items-center gap-1.5">
              <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded bg-chord/10 border border-chord/20">
                <Shield className="w-3 h-3 text-chord" />
                <span className="text-[10px] font-semibold text-chord uppercase tracking-wide">
                  Admin
                </span>
              </div>
              <AdminPanel />
            </div>
          )}

          {isLoggedIn && !isAdmin && (
            <WorshipLeaderClaimPanel
              isWorshipLeader={isWorshipLeader}
              isLoggedIn={isLoggedIn}
            />
          )}

          {isAdmin && isWorshipLeader && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded bg-leader/10 border border-leader/20">
              <Crown className="w-3 h-3 text-leader" />
              <span className="text-[10px] font-semibold text-leader uppercase tracking-wide">
                Leader
              </span>
            </div>
          )}

          {isLoggedIn ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={clear}
              data-ocid="auth.close_button"
              className="text-muted-foreground hover:text-foreground text-xs gap-1 h-8"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          ) : (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                onClick={() => login()}
                disabled={isLoggingIn}
                data-ocid="auth.primary_button"
                className="text-xs gap-1 h-8 bg-chord/10 border border-chord/30 text-chord hover:bg-chord/20"
                variant="outline"
              >
                {isLoggingIn ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogIn className="w-3.5 h-3.5" />
                )}
                <span>Sign In</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowRedirectDialog(true)}
                data-ocid="auth.secondary_button"
                className="text-xs h-8 text-muted-foreground hover:text-foreground px-2"
                title="Sign in without popup (opens new tab)"
              >
                <Radio className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Follow leader banner */}
      {isLoggedIn &&
        !isAdmin &&
        !isWorshipLeader &&
        worshipLeaders.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 bg-leader/5 border-b border-leader/20 shrink-0">
            <Radio className="w-3.5 h-3.5 text-leader shrink-0" />
            <span className="text-xs text-muted-foreground">Follow:</span>
            <Select
              value={followingLeader ?? "admin"}
              onValueChange={(v) =>
                setFollowingLeader(v === "admin" ? null : v)
              }
            >
              <SelectTrigger
                className="h-7 text-xs bg-secondary/60 border-border w-auto min-w-[160px]"
                data-ocid="follow.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin Session</SelectItem>
                {worshipLeaders.map((leader, idx) => (
                  <SelectItem key={leader.toString()} value={leader.toString()}>
                    Leader {idx + 1} · {leader.toString().slice(0, 8)}…
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-[10px] text-muted-foreground/60">
              {followingLeader ? "Following worship leader" : "Following admin"}
            </span>
          </div>
        )}

      <div className="flex-1 overflow-hidden">
        <div className="hidden lg:grid lg:grid-cols-[280px_1fr_288px] h-full">
          <div className="border-r border-border overflow-hidden flex flex-col sidebar-panel">
            <div className="flex-1 overflow-hidden min-h-0">
              <SongLibrary
                isAdmin={isAdmin}
                session={session}
                onSessionUpdate={handleSessionUpdate}
                getPrincipal={getPrincipal}
              />
            </div>
            <div className="border-t border-border shrink-0">
              <SetlistPanel
                isAdmin={isAdmin}
                session={session}
                onSessionUpdate={handleSessionUpdate}
                onNavigateToSets={() => setActiveTab("setlist")}
              />
            </div>
          </div>

          <div className="overflow-hidden flex flex-col">
            {activeTab === "setlist" ? (
              <SetlistView
                session={viewerSession}
                isAdmin={canControl}
                onSessionUpdate={handleSessionUpdate}
                onNavigateToView={navigateToView}
              />
            ) : isVocalist ? (
              <LyricsViewer
                session={viewerSession}
                hasPrev={hasPrevSong}
                hasNext={hasNextSong}
                onPrevSong={handlePrevSong}
                onNextSong={handleNextSong}
              />
            ) : (
              <ChordViewer
                session={viewerSession}
                isAdmin={canControl}
                onSessionUpdate={handleSessionUpdate}
                instrument={instrument}
                onInstrumentChange={setInstrument}
                hasPrev={hasPrevSong}
                hasNext={hasNextSong}
                onPrevSong={handlePrevSong}
                onNextSong={handleNextSong}
              />
            )}
          </div>

          <div className="border-l border-border overflow-hidden sidebar-panel">
            <BandChat
              userProfile={userProfile}
              onSaveProfile={(name) => saveProfile.mutate({ name })}
            />
          </div>
        </div>

        <div className="lg:hidden h-full">
          {activeTab === "library" && (
            <SongLibrary
              isAdmin={isAdmin}
              session={session}
              onSessionUpdate={handleSessionUpdate}
              mobile
              getPrincipal={getPrincipal}
            />
          )}
          {activeTab === "setlist" && (
            <SetlistView
              session={viewerSession}
              isAdmin={canControl}
              onSessionUpdate={handleSessionUpdate}
              onNavigateToView={navigateToView}
              mobile
            />
          )}
          {activeTab === "view" &&
            (isVocalist ? (
              <LyricsViewer
                session={viewerSession}
                mobile
                hasPrev={hasPrevSong}
                hasNext={hasNextSong}
                onPrevSong={handlePrevSong}
                onNextSong={handleNextSong}
              />
            ) : (
              <ChordViewer
                session={viewerSession}
                isAdmin={canControl}
                onSessionUpdate={handleSessionUpdate}
                instrument={instrument}
                onInstrumentChange={setInstrument}
                mobile
                hasPrev={hasPrevSong}
                hasNext={hasNextSong}
                onPrevSong={handlePrevSong}
                onNextSong={handleNextSong}
              />
            ))}
          {activeTab === "chat" && (
            <BandChat
              userProfile={userProfile}
              onSaveProfile={(name) => saveProfile.mutate({ name })}
            />
          )}
        </div>
      </div>

      {/* Mobile Nav */}
      <nav
        className="lg:hidden border-t border-border appbar shrink-0 safe-area-bottom"
        data-ocid="mobile_nav.panel"
      >
        <div className="grid grid-cols-4 h-16">
          {tabs.map(({ id, icon: Icon, label }) => (
            <button
              type="button"
              key={id}
              onClick={() => setActiveTab(id)}
              data-ocid={`mobile_nav.${id}.tab`}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px]",
                activeTab === id ? "text-chord" : "text-muted-foreground",
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Redirect login dialog */}
      <Dialog open={showRedirectDialog} onOpenChange={setShowRedirectDialog}>
        <DialogContent data-ocid="auth.dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-chord" />
              Sign In (Popup-Free)
            </DialogTitle>
            <DialogDescription>
              This opens a full-window sign-in that works even when your browser
              blocks popups.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-md bg-secondary/40 border border-border text-xs text-muted-foreground space-y-1">
              <p>• Opens Internet Identity in a new browser window</p>
              <p>• After signing in, return here — the page will refresh</p>
              <p>• Works on all devices including iOS Safari</p>
            </div>
            <Button
              className="w-full"
              onClick={async () => {
                setShowRedirectDialog(false);
                await loginWithRedirect();
              }}
              disabled={isRedirectLoading}
              data-ocid="auth.submit_button"
            >
              {isRedirectLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4 mr-2" />
              )}
              Open Sign In Window
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Having trouble?{" "}
              <button
                type="button"
                className="underline hover:text-foreground"
                onClick={() => {
                  setShowRedirectDialog(false);
                  login();
                }}
                data-ocid="auth.secondary_button"
              >
                Try standard sign in
              </button>
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
