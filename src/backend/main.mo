import Array "mo:core/Array";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Order "mo:core/Order";
import Time "mo:core/Time";
import Iter "mo:core/Iter";

import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

actor {
  type SongId = Text;
  type SetlistId = Text;
  type MessageId = Nat;

  public type Song = {
    id : SongId;
    title : Text;
    key : Text;
    bpm : Nat;
    chordSheet : Text;
    createdBy : Principal;
  };

  public type Setlist = {
    id : SetlistId;
    name : Text;
    songIds : [SongId];
  };

  public type Message = {
    id : MessageId;
    authorName : Text;
    text : Text;
    timestamp : Int;
  };

  public type ActiveSession = {
    activeSetlistId : ?SetlistId;
    activeSongId : ?SongId;
    transposeSteps : Int;
    capoFret : Nat;
    chordMode : Text;
    lastUpdated : Int;
  };

  public type UserRole = AccessControl.UserRole;

  public type UserProfile = {
    name : Text;
  };

  public type RequestStatus = { #pending; #approved; #denied };

  public type WorshipLeaderRequest = {
    requester : Principal;
    status : RequestStatus;
    requestedAt : Int;
  };

  var nextMessageId : MessageId = 1;
  let messagesList = List.empty<Message>();
  let songs = Map.empty<SongId, Song>();
  let setlists = Map.empty<SetlistId, Setlist>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  // Worship leader state: use Map<Principal, ()> as a set
  let worshipLeaders = Map.empty<Principal, ()>();
  let worshipLeaderRequests = Map.empty<Principal, WorshipLeaderRequest>();
  let worshipLeaderSessions = Map.empty<Principal, ActiveSession>();

  let defaultSession : ActiveSession = {
    activeSetlistId = null;
    activeSongId = null;
    transposeSteps = 0;
    capoFret = 0;
    chordMode = "letters";
    lastUpdated = 0;
  };

  module Song {
    public func compare(s1 : Song, s2 : Song) : Order.Order {
      Text.compare(s1.id, s2.id);
    };
  };

  module Setlist {
    public func compare(s1 : Setlist, s2 : Setlist) : Order.Order {
      Text.compare(s1.id, s2.id);
    };
  };

  module Message {
    public func compareByTimestamp(m1 : Message, m2 : Message) : Order.Order {
      Int.compare(m2.timestamp, m1.timestamp);
    };
  };

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  var activeSession : ActiveSession = defaultSession;

  // User Profile
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    userProfiles.add(caller, profile);
  };

  // Songs CRUD
  public shared ({ caller }) func createOrUpdateSong(inputSong : Song) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (songs.get(inputSong.id)) {
      case (null) {
        songs.add(inputSong.id, { inputSong with createdBy = caller });
      };
      case (?existingSong) {
        if (existingSong.createdBy != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized");
        };
        songs.add(inputSong.id, { inputSong with createdBy = existingSong.createdBy });
      };
    };
  };

  public query ({ caller }) func getSong(id : SongId) : async Song {
    switch (songs.get(id)) {
      case (null) { Runtime.trap("Song not found") };
      case (?song) { song };
    };
  };

  public shared ({ caller }) func deleteSong(id : SongId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (songs.get(id)) {
      case (null) { Runtime.trap("Song not found") };
      case (?song) {
        if (song.createdBy != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized");
        };
        songs.remove(id);
      };
    };
  };

  public query ({ caller }) func listSongs() : async [Song] {
    songs.values().toArray().sort();
  };

  public query ({ caller }) func searchSongs(searchTerm : Text) : async [Song] {
    let lower = searchTerm.toLower();
    songs.values().toArray().filter(
      func(s) { s.title.toLower().contains(#text lower) }
    ).sort();
  };

  // Setlists
  public shared ({ caller }) func createOrUpdateSetlist(setlist : Setlist) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    setlists.add(setlist.id, setlist);
  };

  public query ({ caller }) func getSetlist(id : SetlistId) : async Setlist {
    switch (setlists.get(id)) {
      case (null) { Runtime.trap("Setlist not found") };
      case (?s) { s };
    };
  };

  public shared ({ caller }) func deleteSetlist(id : SetlistId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    setlists.remove(id);
  };

  public query ({ caller }) func listSetlists() : async [Setlist] {
    setlists.values().toArray().sort();
  };

  // Admin global session
  public query ({ caller }) func getActiveSession() : async ActiveSession {
    activeSession;
  };

  public shared ({ caller }) func updateActiveSession(newSession : ActiveSession) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    activeSession := { newSession with lastUpdated = Time.now() };
  };

  // Worship Leader Management
  public shared ({ caller }) func requestWorshipLeader() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Must be signed in");
    };
    if (worshipLeaders.containsKey(caller)) {
      Runtime.trap("Already a worship leader");
    };
    worshipLeaderRequests.add(caller, {
      requester = caller;
      status = #pending;
      requestedAt = Time.now();
    });
  };

  public shared ({ caller }) func approveWorshipLeader(user : Principal) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized");
    };
    switch (worshipLeaderRequests.get(user)) {
      case (null) { Runtime.trap("No request found") };
      case (?req) {
        worshipLeaderRequests.add(user, { req with status = #approved });
        worshipLeaders.add(user, ());
        if (not worshipLeaderSessions.containsKey(user)) {
          worshipLeaderSessions.add(user, defaultSession);
        };
      };
    };
  };

  public shared ({ caller }) func denyWorshipLeader(user : Principal) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized");
    };
    switch (worshipLeaderRequests.get(user)) {
      case (null) { Runtime.trap("No request found") };
      case (?req) {
        worshipLeaderRequests.add(user, { req with status = #denied });
      };
    };
  };

  public shared ({ caller }) func assignWorshipLeader(user : Principal) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized");
    };
    worshipLeaders.add(user, ());
    if (not worshipLeaderSessions.containsKey(user)) {
      worshipLeaderSessions.add(user, defaultSession);
    };
  };

  public shared ({ caller }) func removeWorshipLeader(user : Principal) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized");
    };
    worshipLeaders.remove(user);
  };

  public shared ({ caller }) func releaseWorshipLeader() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    worshipLeaders.remove(caller);
  };

  public query ({ caller }) func listWorshipLeaders() : async [Principal] {
    worshipLeaders.keys().toArray();
  };

  public query ({ caller }) func isCallerWorshipLeader() : async Bool {
    worshipLeaders.containsKey(caller);
  };

  public query ({ caller }) func getMyWorshipLeaderRequestStatus() : async ?RequestStatus {
    switch (worshipLeaderRequests.get(caller)) {
      case (null) { null };
      case (?req) { ?req.status };
    };
  };

  public query ({ caller }) func listPendingWorshipLeaderRequests() : async [WorshipLeaderRequest] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized");
    };
    worshipLeaderRequests.values().toArray().filter(
      func(req) {
        switch (req.status) {
          case (#pending) { true };
          case (_) { false };
        };
      }
    );
  };

  public shared ({ caller }) func updateMyWorshipLeaderSession(session : ActiveSession) : async () {
    if (not worshipLeaders.containsKey(caller) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Must be a worship leader or admin");
    };
    worshipLeaderSessions.add(caller, { session with lastUpdated = Time.now() });
  };

  public query ({ caller }) func getWorshipLeaderSession(leader : Principal) : async ActiveSession {
    switch (worshipLeaderSessions.get(leader)) {
      case (null) { defaultSession };
      case (?s) { s };
    };
  };

  // Messages
  public shared ({ caller }) func postMessage(authorName : Text, text : Text) : async () {
    messagesList.add({
      id = nextMessageId;
      authorName;
      text;
      timestamp = Time.now();
    });
    nextMessageId += 1;
  };

  public query ({ caller }) func listRecentMessages() : async [Message] {
    let msgs = messagesList.toArray().sort(Message.compareByTimestamp);
    msgs.sliceToArray(0, Nat.min(50, msgs.size()));
  };

  public query ({ caller }) func listMessagesSince(timestamp : Int) : async [Message] {
    messagesList.toArray().filter(
      func(m) { m.timestamp > timestamp }
    );
  };
};
