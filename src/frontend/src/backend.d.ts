import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export type SongId = string;
export type SetlistId = string;
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface http_header {
    value: string;
    name: string;
}
export type MessageId = bigint;
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
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
export interface WorshipLeaderRequest {
    status: RequestStatus;
    requester: Principal;
    requestedAt: bigint;
}
export interface UserProfile {
    name: string;
}
export enum RequestStatus {
    pending = "pending",
    denied = "denied",
    approved = "approved"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    approveWorshipLeader(user: Principal): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    assignWorshipLeader(user: Principal): Promise<void>;
    createOrUpdateSetlist(setlist: Setlist): Promise<void>;
    createOrUpdateSong(inputSong: Song): Promise<void>;
    deleteSetlist(id: SetlistId): Promise<void>;
    deleteSong(id: SongId): Promise<void>;
    denyWorshipLeader(user: Principal): Promise<void>;
    fetchSongUrl(url: string): Promise<string>;
    getActiveSession(): Promise<ActiveSession>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getMyWorshipLeaderRequestStatus(): Promise<RequestStatus | null>;
    getSetlist(id: SetlistId): Promise<Setlist>;
    getSong(id: SongId): Promise<Song>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getWorshipLeaderSession(leader: Principal): Promise<ActiveSession>;
    isCallerAdmin(): Promise<boolean>;
    isCallerWorshipLeader(): Promise<boolean>;
    listMessagesSince(timestamp: bigint): Promise<Array<Message>>;
    listPendingWorshipLeaderRequests(): Promise<Array<WorshipLeaderRequest>>;
    listRecentMessages(): Promise<Array<Message>>;
    listSetlists(): Promise<Array<Setlist>>;
    listSongs(): Promise<Array<Song>>;
    listWorshipLeaders(): Promise<Array<Principal>>;
    postMessage(authorName: string, text: string): Promise<void>;
    releaseWorshipLeader(): Promise<void>;
    removeWorshipLeader(user: Principal): Promise<void>;
    requestWorshipLeader(): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchSongs(searchTerm: string): Promise<Array<Song>>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateActiveSession(newSession: ActiveSession): Promise<void>;
    updateMyWorshipLeaderSession(session: ActiveSession): Promise<void>;
}
