/**
 * MeTube — Supabase Client for Live Share (Real-time Broadcast)
 * لا يحتاج لجداول في قاعدة البيانات — يستخدم Broadcast channels فقط
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

// ── Lazy-load Supabase only if configured ────────────────────────────────────

type SupabaseClient = any;
let _client: SupabaseClient | null = null;

export async function getSupabase(): Promise<SupabaseClient> {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase غير مُهيَّأ. أضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في .env"
    );
  }
  if (!_client) {
    // Dynamic import to avoid bundling Supabase if not configured
    const { createClient } = await import("@supabase/supabase-js");
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return _client;
}

// ── Room Events ───────────────────────────────────────────────────────────────

export interface RoomSyncPayload {
  trackId: string;
  trackTitle: string;
  trackArtist: string;
  trackCoverUrl?: string;
  streamUrl: string;
  seekTime: number;
  isPlaying: boolean;
  timestamp: number;
}

export interface RoomChannel {
  /** Host: broadcast current state to all guests */
  broadcast: (payload: RoomSyncPayload) => Promise<void>;
  /** Guest: subscribe to host's updates */
  onSync: (cb: (payload: RoomSyncPayload) => void) => void;
  /** Unsubscribe and leave channel */
  leave: () => Promise<void>;
  /** Number of online members */
  memberCount: number;
}

/**
 * Join or create a Supabase Realtime channel for a room
 */
export async function joinRoom(roomCode: string): Promise<RoomChannel> {
  const supabase = await getSupabase();

  let memberCount = 1;
  const channelName = `metube-room-${roomCode.toUpperCase()}`;

  const channel = supabase.channel(channelName, {
    config: {
      broadcast: { self: false },
      presence: { key: crypto.randomUUID() },
    },
  });

  channel.on("presence", { event: "sync" }, () => {
    const state = channel.presenceState();
    memberCount = Object.keys(state).length;
  });

  await new Promise<void>((resolve, reject) => {
    channel.subscribe((status: string) => {
      if (status === "SUBSCRIBED") resolve();
      if (status === "CHANNEL_ERROR") reject(new Error("فشل الاتصال بالغرفة"));
    });
  });

  await channel.track({ joined_at: Date.now() });

  return {
    get memberCount() {
      return memberCount;
    },

    async broadcast(payload: RoomSyncPayload) {
      await channel.send({
        type: "broadcast",
        event: "sync",
        payload,
      });
    },

    onSync(cb: (payload: RoomSyncPayload) => void) {
      channel.on(
        "broadcast",
        { event: "sync" },
        ({ payload }: { payload: RoomSyncPayload }) => {
          cb(payload);
        }
      );
    },

    async leave() {
      await supabase.removeChannel(channel);
    },
  };
}
