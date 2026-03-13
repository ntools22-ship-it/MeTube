/**
 * MeTube — PlayerContext with YouTube IFrame API
 * الصوت بيشتغل عبر YouTube IFrame Player مخفي في الصفحة
 * مفيش CORS، مفيش bot detection، مفيش API key
 */
import React, {
  createContext, useContext, useState, useRef,
  useCallback, useEffect,
} from "react";

export interface Track {
  id: string;       // YouTube videoId
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  streamUrl?: string; // غير مستخدم — IFrame بيتعامل مع الصوت
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
  getAudioBlob: () => Promise<Blob | null>;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
};

// ── YouTube IFrame API loader ────────────────────────────────────────────────
let ytApiLoaded = false;
let ytApiReady = false;
const ytReadyCallbacks: (() => void)[] = [];

function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (ytApiReady) return resolve();
    ytReadyCallbacks.push(resolve);
    if (!ytApiLoaded) {
      ytApiLoaded = true;
      (window as any).onYouTubeIframeAPIReady = () => {
        ytApiReady = true;
        ytReadyCallbacks.forEach((cb) => cb());
        ytReadyCallbacks.length = 0;
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }
  });
}

// ── Provider ─────────────────────────────────────────────────────────────────
export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioRef = useRef<HTMLAudioElement>(null!); // kept for API compat
  const playerRef = useRef<any>(null);              // YT.Player instance
  const containerRef = useRef<HTMLDivElement>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval>>();

  const [state, setState] = useState<PlayerState>({
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 80,
    isMuted: false,
    queue: [],
    queueIndex: -1,
    repeatMode: "off",
    isShuffled: false,
    dataSaver: false,
    isReady: false,
  });

  // ── Init YouTube IFrame API ────────────────────────────────────────────────
  useEffect(() => {
    loadYouTubeAPI().then(() => {
      if (!containerRef.current) return;
      playerRef.current = new (window as any).YT.Player(containerRef.current, {
        height: "1",
        width: "1",
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            setState((p) => ({ ...p, isReady: true }));
            playerRef.current.setVolume(80);
          },
          onStateChange: (e: any) => {
            const YT = (window as any).YT.PlayerState;
            if (e.data === YT.PLAYING) {
              const dur = playerRef.current.getDuration() || 0;
              setState((p) => ({ ...p, isPlaying: true, duration: dur }));
              startProgressTimer();
            } else if (e.data === YT.PAUSED) {
              setState((p) => ({ ...p, isPlaying: false }));
              stopProgressTimer();
            } else if (e.data === YT.ENDED) {
              stopProgressTimer();
              setState((p) => {
                if (p.repeatMode === "one") {
                  playerRef.current?.seekTo(0);
                  playerRef.current?.playVideo();
                  return p;
                }
                return p;
              });
              // next track — handled outside setState
              handleEnded();
            }
          },
          onError: (e: any) => {
            console.warn("YouTube Player error:", e.data);
            setState((p) => ({ ...p, isPlaying: false }));
          },
        },
      });
    });
    return () => {
      stopProgressTimer();
      playerRef.current?.destroy?.();
    };
  }, []);

  const startProgressTimer = () => {
    stopProgressTimer();
    progressTimer.current = setInterval(() => {
      if (!playerRef.current) return;
      const t = playerRef.current.getCurrentTime?.() || 0;
      setState((p) => ({ ...p, currentTime: t }));
    }, 500);
  };

  const stopProgressTimer = () => clearInterval(progressTimer.current);

  const handleEnded = useCallback(() => {
    setState((prev) => {
      if (prev.queue.length === 0) return { ...prev, isPlaying: false };
      if (prev.repeatMode === "one") return prev;
      let nextIndex = prev.isShuffled
        ? Math.floor(Math.random() * prev.queue.length)
        : prev.queueIndex + 1;
      if (nextIndex >= prev.queue.length) {
        if (prev.repeatMode === "all") nextIndex = 0;
        else return { ...prev, isPlaying: false };
      }
      const nextTrack = prev.queue[nextIndex];
      setTimeout(() => playerRef.current?.loadVideoById(nextTrack.id), 0);
      return { ...prev, currentTrack: nextTrack, queueIndex: nextIndex, currentTime: 0 };
    });
  }, []);

  // ── Controls ───────────────────────────────────────────────────────────────

  const play = useCallback((track?: Track) => {
    if (track) {
      setState((prev) => {
        const existingIndex = prev.queue.findIndex((t) => t.id === track.id);
        const newQueue = existingIndex >= 0 ? prev.queue : [...prev.queue, track];
        const newIndex = existingIndex >= 0 ? existingIndex : newQueue.length - 1;
        setTimeout(() => playerRef.current?.loadVideoById(track.id), 0);
        return { ...prev, currentTrack: track, queue: newQueue, queueIndex: newIndex, isPlaying: true, currentTime: 0 };
      });
    } else {
      playerRef.current?.playVideo();
      setState((p) => ({ ...p, isPlaying: true }));
    }
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pauseVideo();
    setState((p) => ({ ...p, isPlaying: false }));
  }, []);

  const toggle = useCallback(() => {
    setState((prev) => {
      if (prev.isPlaying) {
        playerRef.current?.pauseVideo();
        return { ...prev, isPlaying: false };
      } else {
        playerRef.current?.playVideo();
        return { ...prev, isPlaying: true };
      }
    });
  }, []);

  const seek = useCallback((time: number) => {
    playerRef.current?.seekTo(time, true);
    setState((p) => ({ ...p, currentTime: time }));
  }, []);

  const setVolume = useCallback((vol: number) => {
    playerRef.current?.setVolume(vol * 100);
    setState((p) => ({ ...p, volume: vol, isMuted: vol === 0 }));
  }, []);

  const toggleMute = useCallback(() => {
    setState((prev) => {
      if (prev.isMuted) {
        playerRef.current?.unMute();
        playerRef.current?.setVolume(prev.volume * 100);
      } else {
        playerRef.current?.mute();
      }
      return { ...prev, isMuted: !prev.isMuted };
    });
  }, []);

  const next = useCallback(() => {
    setState((prev) => {
      if (prev.queue.length === 0) return prev;
      let nextIndex = prev.isShuffled
        ? Math.floor(Math.random() * prev.queue.length)
        : prev.queueIndex + 1;
      if (nextIndex >= prev.queue.length) {
        if (prev.repeatMode === "all") nextIndex = 0;
        else return { ...prev, isPlaying: false };
      }
      const nextTrack = prev.queue[nextIndex];
      setTimeout(() => playerRef.current?.loadVideoById(nextTrack.id), 0);
      return { ...prev, currentTrack: nextTrack, queueIndex: nextIndex, isPlaying: true, currentTime: 0 };
    });
  }, []);

  const previous = useCallback(() => {
    setState((prev) => {
      if (prev.currentTime > 3) {
        playerRef.current?.seekTo(0, true);
        return { ...prev, currentTime: 0 };
      }
      if (prev.queue.length === 0) return prev;
      let prevIndex = prev.queueIndex - 1;
      if (prevIndex < 0) prevIndex = prev.repeatMode === "all" ? prev.queue.length - 1 : 0;
      const prevTrack = prev.queue[prevIndex];
      setTimeout(() => playerRef.current?.loadVideoById(prevTrack.id), 0);
      return { ...prev, currentTrack: prevTrack, queueIndex: prevIndex, isPlaying: true, currentTime: 0 };
    });
  }, []);

  const addToQueue = useCallback((track: Track) => {
    setState((p) => ({ ...p, queue: [...p.queue, track] }));
  }, []);

  const setQueue = useCallback((tracks: Track[], startIndex = 0) => {
    const track = tracks[startIndex];
    setTimeout(() => playerRef.current?.loadVideoById(track?.id), 0);
    setState((p) => ({ ...p, queue: tracks, queueIndex: startIndex, currentTrack: track || null, isPlaying: true, currentTime: 0 }));
  }, []);

  const toggleRepeat = useCallback(() => {
    setState((p) => ({
      ...p,
      repeatMode: p.repeatMode === "off" ? "all" : p.repeatMode === "all" ? "one" : "off",
    }));
  }, []);

  const toggleShuffle = useCallback(() => setState((p) => ({ ...p, isShuffled: !p.isShuffled })), []);
  const setDataSaver = useCallback((v: boolean) => setState((p) => ({ ...p, dataSaver: v })), []);
  const getAudioBlob = useCallback(async () => null, []);

  // ── MediaSession ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!("mediaSession" in navigator) || !state.currentTrack) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: state.currentTrack.title,
      artist: state.currentTrack.artist,
      album: state.currentTrack.album || "MeTube",
      artwork: state.currentTrack.coverUrl
        ? [{ src: state.currentTrack.coverUrl, sizes: "512x512", type: "image/jpeg" }]
        : [],
    });
    navigator.mediaSession.playbackState = state.isPlaying ? "playing" : "paused";
    navigator.mediaSession.setActionHandler("play", () => play());
    navigator.mediaSession.setActionHandler("pause", pause);
    navigator.mediaSession.setActionHandler("previoustrack", previous);
    navigator.mediaSession.setActionHandler("nexttrack", next);
    navigator.mediaSession.setActionHandler("seekto", (d) => {
      if (d.seekTime !== undefined) seek(d.seekTime);
    });
  }, [state.currentTrack, state.isPlaying, play, pause, previous, next, seek]);

  useEffect(() => {
    if (!("mediaSession" in navigator) || !state.duration) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: state.duration,
        playbackRate: 1,
        position: Math.min(state.currentTime, state.duration),
      });
    } catch { /* ignored */ }
  }, [state.currentTime, state.duration]);

  return (
    <PlayerContext.Provider value={{
      ...state, audioRef,
      play, pause, toggle, seek, setVolume, toggleMute,
      next, previous, addToQueue, setQueue,
      toggleRepeat, toggleShuffle, setDataSaver, getAudioBlob,
    }}>
      {/* YouTube IFrame Player — مخفي تماماً */}
      <div
        ref={containerRef}
        style={{ position: "fixed", bottom: -10, left: -10, width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
      />
      {/* Audio element — للتوافق مع MediaSession فقط */}
      <audio ref={audioRef} style={{ display: "none" }} />
      {children}
    </PlayerContext.Provider>
  );
};
