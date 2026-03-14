/**
 * MeTube — PlayerContext
 * يستخدم YouTube IFrame API للبحث والتشغيل معاً
 * مفيش API key، مفيش CORS، مفيش حظر
 */
import React, {
  createContext, useContext, useState, useRef,
  useCallback, useEffect,
} from "react";

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  streamUrl?: string;
  duration?: number;
}

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  queue: Track[];
  queueIndex: number;
  repeatMode: "off" | "one" | "all";
  isShuffled: boolean;
  dataSaver: boolean;
  isReady: boolean;
}

interface PlayerContextType extends PlayerState {
  audioRef: React.RefObject<HTMLAudioElement>;
  play: (track?: Track) => void;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  next: () => void;
  previous: () => void;
  addToQueue: (track: Track) => void;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  setDataSaver: (v: boolean) => void;
  searchAndPlay: (query: string) => void;
  getAudioBlob: () => Promise<Blob | null>;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
};

// ── YouTube IFrame API ───────────────────────────────────────────────────────
let ytLoaded = false;
let ytReady = false;
const ytCallbacks: (() => void)[] = [];

function loadYTApi(): Promise<void> {
  return new Promise((resolve) => {
    if (ytReady) return resolve();
    ytCallbacks.push(resolve);
    if (!ytLoaded) {
      ytLoaded = true;
      (window as any).onYouTubeIframeAPIReady = () => {
        ytReady = true;
        ytCallbacks.forEach((cb) => cb());
        ytCallbacks.length = 0;
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  });
}

// ── Provider ─────────────────────────────────────────────────────────────────
export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioRef = useRef<HTMLAudioElement>(null!);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval>>();
  const pendingAction = useRef<(() => void) | null>(null);

  const [state, setState] = useState<PlayerState>({
    currentTrack: null, isPlaying: false,
    currentTime: 0, duration: 0,
    volume: 0.8, isMuted: false,
    queue: [], queueIndex: -1,
    repeatMode: "off", isShuffled: false,
    dataSaver: false, isReady: false,
  });

  const startTimer = () => {
    stopTimer();
    progressTimer.current = setInterval(() => {
      const t = playerRef.current?.getCurrentTime?.() || 0;
      const d = playerRef.current?.getDuration?.() || 0;
      setState((p) => ({ ...p, currentTime: t, duration: d }));
      // تحديث MediaSession position
      if ("mediaSession" in navigator && d > 0) {
        try { navigator.mediaSession.setPositionState({ duration: d, playbackRate: 1, position: Math.min(t, d) }); }
        catch { /* ignored */ }
      }
    }, 500);
  };
  const stopTimer = () => clearInterval(progressTimer.current);

  // ── Init IFrame Player ────────────────────────────────────────────────────
  useEffect(() => {
    loadYTApi().then(() => {
      if (!containerRef.current) return;
      playerRef.current = new (window as any).YT.Player(containerRef.current, {
        height: "1", width: "1",
        playerVars: {
          autoplay: 0, controls: 0,
          disablekb: 1, fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          rel: 0, playsinline: 1,
        },
        events: {
          onReady: () => {
            setState((p) => ({ ...p, isReady: true }));
            playerRef.current.setVolume(80);
            // شغّل أي action كان pending
            pendingAction.current?.();
            pendingAction.current = null;
          },
          onStateChange: (e: any) => {
            const S = (window as any).YT?.PlayerState;
            if (!S) return;
            if (e.data === S.PLAYING) {
              // اجيب بيانات الأغنية من IFrame نفسه
              const info = playerRef.current?.getVideoData?.() || {};
              const videoId = info.video_id || "";
              const title = info.title || "YouTube Track";
              setState((p) => ({
                ...p, isPlaying: true,
                duration: playerRef.current?.getDuration?.() || 0,
                currentTrack: videoId ? {
                  id: videoId, title,
                  artist: info.author || "YouTube",
                  coverUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
                  album: "YouTube",
                } : p.currentTrack,
              }));
              startTimer();
              updateMediaSession(title, info.author, videoId);
            } else if (e.data === S.PAUSED) {
              setState((p) => ({ ...p, isPlaying: false }));
              stopTimer();
            } else if (e.data === S.ENDED) {
              stopTimer();
              setState((p) => {
                if (p.repeatMode === "one") {
                  setTimeout(() => playerRef.current?.playVideo(), 0);
                  return p;
                }
                // next in queue
                const nextIdx = p.isShuffled
                  ? Math.floor(Math.random() * p.queue.length)
                  : p.queueIndex + 1;
                if (nextIdx < p.queue.length) {
                  setTimeout(() => playerRef.current?.loadVideoById(p.queue[nextIdx].id), 0);
                  return { ...p, currentTrack: p.queue[nextIdx], queueIndex: nextIdx, currentTime: 0 };
                } else if (p.repeatMode === "all" && p.queue.length > 0) {
                  setTimeout(() => playerRef.current?.loadVideoById(p.queue[0].id), 0);
                  return { ...p, currentTrack: p.queue[0], queueIndex: 0, currentTime: 0 };
                }
                return { ...p, isPlaying: false };
              });
            }
          },
          onError: () => {
            setState((p) => ({ ...p, isPlaying: false }));
            stopTimer();
          },
        },
      });
    });
    return () => { stopTimer(); playerRef.current?.destroy?.(); };
  }, []);

  const updateMediaSession = (title: string, artist: string, videoId: string) => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title, artist: artist || "YouTube",
      album: "MeTube",
      artwork: videoId ? [{ src: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`, sizes: "320x180", type: "image/jpeg" }] : [],
    });
    navigator.mediaSession.playbackState = "playing";
  };

  // ── Controls ───────────────────────────────────────────────────────────────

  const doPlay = (action: () => void) => {
    if (!state.isReady && !playerRef.current) {
      pendingAction.current = action;
    } else {
      action();
    }
  };

  const play = useCallback((track?: Track) => {
    if (track) {
      doPlay(() => playerRef.current?.loadVideoById(track.id));
      setState((p) => {
        const exists = p.queue.findIndex((t) => t.id === track.id);
        const newQueue = exists >= 0 ? p.queue : [...p.queue, track];
        const idx = exists >= 0 ? exists : newQueue.length - 1;
        return { ...p, currentTrack: track, queue: newQueue, queueIndex: idx, isPlaying: true, currentTime: 0 };
      });
    } else {
      doPlay(() => playerRef.current?.playVideo());
      setState((p) => ({ ...p, isPlaying: true }));
    }
  }, [state.isReady]);

  // ✅ البحث والتشغيل المباشر عبر IFrame بدون أي API
  const searchAndPlay = useCallback((query: string) => {
    doPlay(() => {
      playerRef.current?.loadPlaylist({
        listType: "search",
        list: query,
        index: 0,
      });
    });
    setState((p) => ({
      ...p, isPlaying: true,
      currentTrack: { id: "search", title: `🔍 ${query}`, artist: "YouTube Search", coverUrl: "", album: "YouTube" },
    }));
  }, [state.isReady]);

  const pause = useCallback(() => {
    playerRef.current?.pauseVideo();
    setState((p) => ({ ...p, isPlaying: false }));
  }, []);

  const toggle = useCallback(() => {
    setState((prev) => {
      if (prev.isPlaying) { playerRef.current?.pauseVideo(); return { ...prev, isPlaying: false }; }
      else { playerRef.current?.playVideo(); return { ...prev, isPlaying: true }; }
    });
  }, []);

  const seek = useCallback((time: number) => {
    playerRef.current?.seekTo(time, true);
    setState((p) => ({ ...p, currentTime: time }));
  }, []);

  const setVolume = useCallback((vol: number) => {
    playerRef.current?.setVolume(vol * 100);
    if (vol > 0) playerRef.current?.unMute();
    setState((p) => ({ ...p, volume: vol, isMuted: vol === 0 }));
  }, []);

  const toggleMute = useCallback(() => {
    setState((prev) => {
      if (prev.isMuted) { playerRef.current?.unMute(); playerRef.current?.setVolume(prev.volume * 100); }
      else { playerRef.current?.mute(); }
      return { ...prev, isMuted: !prev.isMuted };
    });
  }, []);

  const next = useCallback(() => {
    setState((prev) => {
      if (prev.queue.length === 0) {
        playerRef.current?.nextVideo?.();
        return prev;
      }
      let idx = prev.isShuffled ? Math.floor(Math.random() * prev.queue.length) : prev.queueIndex + 1;
      if (idx >= prev.queue.length) {
        if (prev.repeatMode === "all") idx = 0;
        else return { ...prev, isPlaying: false };
      }
      setTimeout(() => playerRef.current?.loadVideoById(prev.queue[idx].id), 0);
      return { ...prev, currentTrack: prev.queue[idx], queueIndex: idx, isPlaying: true, currentTime: 0 };
    });
  }, []);

  const previous = useCallback(() => {
    setState((prev) => {
      if (prev.currentTime > 3) { playerRef.current?.seekTo(0, true); return { ...prev, currentTime: 0 }; }
      if (prev.queue.length === 0) { playerRef.current?.previousVideo?.(); return prev; }
      let idx = prev.queueIndex - 1;
      if (idx < 0) idx = prev.repeatMode === "all" ? prev.queue.length - 1 : 0;
      setTimeout(() => playerRef.current?.loadVideoById(prev.queue[idx].id), 0);
      return { ...prev, currentTrack: prev.queue[idx], queueIndex: idx, isPlaying: true, currentTime: 0 };
    });
  }, []);

  const addToQueue = useCallback((track: Track) => setState((p) => ({ ...p, queue: [...p.queue, track] })), []);

  const setQueue = useCallback((tracks: Track[], startIndex = 0) => {
    const track = tracks[startIndex];
    setTimeout(() => track && playerRef.current?.loadVideoById(track.id), 0);
    setState((p) => ({ ...p, queue: tracks, queueIndex: startIndex, currentTrack: track || null, isPlaying: true, currentTime: 0 }));
  }, []);

  const toggleRepeat = useCallback(() => {
    setState((p) => ({ ...p, repeatMode: p.repeatMode === "off" ? "all" : p.repeatMode === "all" ? "one" : "off" }));
  }, []);

  const toggleShuffle = useCallback(() => setState((p) => ({ ...p, isShuffled: !p.isShuffled })), []);
  const setDataSaver = useCallback((v: boolean) => setState((p) => ({ ...p, dataSaver: v })), []);
  const getAudioBlob = useCallback(async () => null, []);

  // MediaSession buttons
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.setActionHandler("play", () => play());
    navigator.mediaSession.setActionHandler("pause", pause);
    navigator.mediaSession.setActionHandler("previoustrack", previous);
    navigator.mediaSession.setActionHandler("nexttrack", next);
    navigator.mediaSession.setActionHandler("seekto", (d) => { if (d.seekTime !== undefined) seek(d.seekTime); });
  }, [play, pause, previous, next, seek]);

  return (
    <PlayerContext.Provider value={{
      ...state, audioRef,
      play, pause, toggle, seek, setVolume, toggleMute,
      next, previous, addToQueue, setQueue,
      toggleRepeat, toggleShuffle, setDataSaver,
      searchAndPlay, getAudioBlob,
    }}>
      <div ref={containerRef} style={{ position: "fixed", bottom: -10, left: -10, width: 1, height: 1, opacity: 0, pointerEvents: "none", zIndex: -1 }} />
      <audio ref={audioRef} style={{ display: "none" }} />
      {children}
    </PlayerContext.Provider>
  );
};
