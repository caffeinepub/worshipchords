import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type SongId = string;
export type MessageId = bigint;
export interface Song {
    id: SongId;
    bpm: bigint;
    key: string;
    title: string;
    createdBy: Principal;
    chordSheet: string;
}
export interface Setlist {
    id: SetlistId;
    name: string;
    songIds: Array<SongId>;
}
export interface Message {
    id: MessageId;
    text: string;
    authorName: string;
    timestamp: bigint;
}
export interface ActiveSession {
    transposeSteps: bigint;
    chordMode: string;
    activeSetlistId?: SetlistId;
    lastUpdated: bigint;
    activeSongId?: SongId;
    capoFret: bigint;
}
export type SetlistId = string;
export interface UserProfile {
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export type RequestStatus = { "#pending": null } | { "#approved": null } | { "#denied": null };
export interface WorshipLeaderRequest {
    requester: Principal;
    status: RequestStatus;
    requestedAt: bigint;
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createOrUpdateSetlist(setlist: Setlist): Promise<void>;
    createOrUpdateSong(inputSong: Song): Promise<void>;
    deleteSetlist(id: SetlistId): Promise<void>;
    deleteSong(id: SongId): Promise<void>;
    getActiveSession(): Promise<ActiveSession>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getSetlist(id: SetlistId): Promise<Setlist>;
    getSong(id: SongId): Promise<Song>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    listMessagesSince(timestamp: bigint): Promise<Array<Message>>;
    listRecentMessages(): Promise<Array<Message>>;
    listSetlists(): Promise<Array<Setlist>>;
    listSongs(): Promise<Array<Song>>;
    postMessage(authorName: string, text: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchSongs(searchTerm: string): Promise<Array<Song>>;
    updateActiveSession(newSession: ActiveSession): Promise<void>;
    // Worship Leader Management
    requestWorshipLeader(): Promise<void>;
    approveWorshipLeader(user: Principal): Promise<void>;
    denyWorshipLeader(user: Principal): Promise<void>;
    assignWorshipLeader(user: Principal): Promise<void>;
    removeWorshipLeader(user: Principal): Promise<void>;
    releaseWorshipLeader(): Promise<void>;
    listWorshipLeaders(): Promise<Array<Principal>>;
    isCallerWorshipLeader(): Promise<boolean>;
    getMyWorshipLeaderRequestStatus(): Promise<RequestStatus | null>;
    listPendingWorshipLeaderRequests(): Promise<Array<WorshipLeaderRequest>>;
    updateMyWorshipLeaderSession(session: ActiveSession): Promise<void>;
    getWorshipLeaderSession(leader: Principal): Promise<ActiveSession>;
}
