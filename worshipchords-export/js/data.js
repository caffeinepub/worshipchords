// ============================================================
// data.js — All data structures + localStorage persistence
// WorshipChords — standalone export
// ============================================================

// ─── Storage keys ──────────────────────────────────────────
const STORAGE = {
  songs:          'wc_songs',
  setlists:       'wc_setlists',
  session:        'wc_session',
  messages:       'wc_messages',
  users:          'wc_users',
  roles:          'wc_roles',              // principal -> role
  leaderRequests: 'wc_leader_requests',
  leaders:        'wc_leaders',
  leaderSessions: 'wc_leader_sessions',
  userProfile:    'wc_user_profile',
  instrument:     'worshipchords_instrument',
  adminToken:     'wc_admin_token',
  followingLeader:'worshipchords_following_leader',
};

// ─── Default objects ────────────────────────────────────────
const DEFAULT_SESSION = {
  activeSetlistId: null,
  activeSongId: null,
  transposeSteps: 0,
  capoFret: 0,
  chordMode: 'letters',
  lastUpdated: 0,
};

// ─── Generic read/write helpers ────────────────────────────
function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return JSON.parse(v);
  } catch { return fallback; }
}

function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ─── Songs ─────────────────────────────────────────────────
/**
 * Song: { id, title, key, bpm, timeSignature, chordSheet }
 * chordSheet stores embedded time signature as first line: '// ts:4/4'
 */
const SongDB = {
  list() {
    return lsGet(STORAGE.songs, []);
  },
  search(term) {
    const t = term.toLowerCase();
    return this.list().filter(s => s.title.toLowerCase().includes(t));
  },
  get(id) {
    return this.list().find(s => s.id === id) || null;
  },
  save(song) {
    const songs = this.list();
    const idx = songs.findIndex(s => s.id === song.id);
    if (idx >= 0) songs[idx] = song;
    else songs.push(song);
    songs.sort((a, b) => a.title.localeCompare(b.title));
    lsSet(STORAGE.songs, songs);
  },
  delete(id) {
    lsSet(STORAGE.songs, this.list().filter(s => s.id !== id));
  },
};

// ─── Setlists ───────────────────────────────────────────────
/**
 * Setlist: { id, name, songIds[] }
 */
const SetlistDB = {
  list() { return lsGet(STORAGE.setlists, []); },
  get(id) { return this.list().find(s => s.id === id) || null; },
  save(setlist) {
    const arr = this.list();
    const idx = arr.findIndex(s => s.id === setlist.id);
    if (idx >= 0) arr[idx] = setlist;
    else arr.push(setlist);
    lsSet(STORAGE.setlists, arr);
  },
  delete(id) {
    lsSet(STORAGE.setlists, this.list().filter(s => s.id !== id));
  },
};

// ─── Active Session ─────────────────────────────────────────
const SessionDB = {
  get() { return lsGet(STORAGE.session, { ...DEFAULT_SESSION }); },
  update(patch) {
    const s = this.get();
    const updated = { ...s, ...patch, lastUpdated: Date.now() };
    lsSet(STORAGE.session, updated);
    return updated;
  },
};

// ─── Band Chat ──────────────────────────────────────────────
/**
 * Message: { id, authorName, text, timestamp }
 */
const ChatDB = {
  list() { return lsGet(STORAGE.messages, []); },
  post(authorName, text) {
    const msgs = this.list();
    msgs.push({
      id: Date.now(),
      authorName,
      text,
      timestamp: Date.now(),
    });
    // Keep last 200 messages
    if (msgs.length > 200) msgs.splice(0, msgs.length - 200);
    lsSet(STORAGE.messages, msgs);
  },
};

// ─── Auth / Roles ────────────────────────────────────────────
/**
 * In the standalone version we use a simple token-based admin system.
 * The admin token is stored in localStorage once the user opens the admin link.
 * Roles: 'admin' | 'leader' | 'user'
 *
 * User ID = a UUID generated and stored in localStorage for the browser session.
 */
const AuthDB = {
  ADMIN_TOKEN: '053109882372ac2a45f40f4d929fdc98d0c1d57c2e771f6a13a7459095647bbe',

  getUserId() {
    let id = lsGet('wc_user_id', null);
    if (!id) {
      id = crypto.randomUUID();
      lsSet('wc_user_id', id);
    }
    return id;
  },

  getStoredToken() {
    return lsGet(STORAGE.adminToken, null);
  },

  storeToken(token) {
    lsSet(STORAGE.adminToken, token);
  },

  isAdmin() {
    return this.getStoredToken() === this.ADMIN_TOKEN;
  },

  isLeader() {
    if (this.isAdmin()) return false;
    const leaders = lsGet(STORAGE.leaders, []);
    return leaders.includes(this.getUserId());
  },

  getRole() {
    if (this.isAdmin()) return 'admin';
    if (this.isLeader()) return 'leader';
    return 'user';
  },

  // Leader management
  getLeaders() { return lsGet(STORAGE.leaders, []); },
  addLeader(userId) {
    const arr = this.getLeaders();
    if (!arr.includes(userId)) arr.push(userId);
    lsSet(STORAGE.leaders, arr);
  },
  removeLeader(userId) {
    lsSet(STORAGE.leaders, this.getLeaders().filter(l => l !== userId));
  },

  // Worship leader requests
  getRequests() { return lsGet(STORAGE.leaderRequests, []); },
  submitRequest(userId, displayName) {
    const reqs = this.getRequests();
    const existing = reqs.find(r => r.userId === userId);
    if (existing) {
      existing.status = 'pending';
      existing.requestedAt = Date.now();
    } else {
      reqs.push({ userId, displayName: displayName || userId.slice(0,8), status: 'pending', requestedAt: Date.now() });
    }
    lsSet(STORAGE.leaderRequests, reqs);
  },
  approveRequest(userId) {
    const reqs = this.getRequests();
    const req = reqs.find(r => r.userId === userId);
    if (req) req.status = 'approved';
    lsSet(STORAGE.leaderRequests, reqs);
    this.addLeader(userId);
  },
  denyRequest(userId) {
    const reqs = this.getRequests();
    const req = reqs.find(r => r.userId === userId);
    if (req) req.status = 'denied';
    lsSet(STORAGE.leaderRequests, reqs);
  },
  getMyRequestStatus(userId) {
    const req = this.getRequests().find(r => r.userId === userId);
    return req ? req.status : null;
  },
  getPendingRequests() {
    return this.getRequests().filter(r => r.status === 'pending');
  },
};

// ─── Leader Sessions ────────────────────────────────────────
const LeaderSessionDB = {
  get(leaderId) {
    const map = lsGet(STORAGE.leaderSessions, {});
    return map[leaderId] || { ...DEFAULT_SESSION };
  },
  update(leaderId, patch) {
    const map = lsGet(STORAGE.leaderSessions, {});
    map[leaderId] = { ...(map[leaderId] || DEFAULT_SESSION), ...patch, lastUpdated: Date.now() };
    lsSet(STORAGE.leaderSessions, map);
  },
};

// ─── User Profile ────────────────────────────────────────────
const ProfileDB = {
  get() { return lsGet(STORAGE.userProfile, { name: '' }); },
  save(name) { lsSet(STORAGE.userProfile, { name }); },
};

// ─── Seed songs (loaded if library is empty) ─────────────────
const SEED_SONGS = [
  {
    id: 'seed-1',
    title: 'Amazing Grace',
    key: 'G',
    bpm: 72,
    chordSheet: `// ts:3/4
[Verse 1]
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
    id: 'seed-2',
    title: 'How Great Is Our God',
    key: 'G',
    bpm: 68,
    chordSheet: `// ts:4/4
[Verse 1]
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
    id: 'seed-3',
    title: '10,000 Reasons (Bless the Lord)',
    key: 'G',
    bpm: 73,
    chordSheet: `// ts:4/4
[Chorus]
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
    id: 'seed-4',
    title: 'Oceans (Where Feet May Fail)',
    key: 'D',
    bpm: 67,
    chordSheet: `// ts:4/4
[Verse 1]
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
    id: 'seed-5',
    title: 'What A Beautiful Name',
    key: 'D',
    bpm: 70,
    chordSheet: `// ts:4/4
[Verse 1]
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

function seedIfEmpty() {
  if (SongDB.list().length === 0) {
    SEED_SONGS.forEach(s => SongDB.save(s));
  }
}
