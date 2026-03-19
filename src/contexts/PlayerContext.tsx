/**
 * MeTube — PlayerContext
 * + Next/Prev صح من قائمة البحث
 * + Seek يشتغل
 * + Queue management
 */
import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  duration?: number;
  streamUrl?: string;
  description?: string;
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
  // تغيير السرعة عبر IFrame
  setPlaybackRate: (rate: number) => void;
  playbackRate: number;
}

const PlayerContext = createContext<PlayerContextType | null>(null);
export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
};

// ── YouTube IFrame Loader ─────────────────────────────────────────────────────
let ytLoaded = false, ytReady = false;
const ytCbs: (() => void)[] = [];
function loadYT(): Promise<void> {
  return new Promise(res => {
    if (ytReady) return res();
    ytCbs.push(res);
    if (!ytLoaded) {
      ytLoaded = true;
      (window as any).onYouTubeIframeAPIReady = () => {
        ytReady = true; ytCbs.forEach(cb => cb()); ytCbs.length = 0;
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  });
}

// ── Provider ──────────────────────────────────────────────────────────────────
export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioRef   = useRef<HTMLAudioElement>(null!);
  const playerRef  = useRef<any>(null);
  const divRef     = useRef<HTMLDivElement>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval>>();

  const [playbackRate, setPlaybackRateState] = useState(1);
  const [state, setState] = useState<PlayerState>({
    currentTrack: null, isPlaying: false,
    currentTime: 0, duration: 0,
    volume: 0.8, isMuted: false,
    queue: [], queueIndex: -1,
    repeatMode: "off", isShuffled: false,
    dataSaver: false, isReady: false,
  });

  const startTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!playerRef.current) return;
      const t = playerRef.current.getCurrentTime?.() || 0;
      const d = playerRef.current.getDuration?.() || 0;
      setState(p => ({ ...p, currentTime: t, duration: d || p.duration }));
      // MediaSession position
      if ("mediaSession" in navigator && d > 0) {
        try { navigator.mediaSession.setPositionState({ duration: d, playbackRate: 1, position: Math.min(t, d) }); }
        catch { /**/ }
      }
    }, 500);
  };

  // ── Init YT Player ────────────────────────────────────────────────────────
  useEffect(() => {
    loadYT().then(() => {
      if (!divRef.current) return;
      const player = new (window as any).YT.Player(divRef.current, {
        height: "1", width: "1",
        playerVars: { autoplay: 0, controls: 0, playsinline: 1, rel: 0, iv_load_policy: 3 },
        events: {
          onReady: () => {
            playerRef.current = player;
            // نحفظ ref في window للوصول من NowPlayingBar
            (window as any).__ytPlayer = player;
            setState(p => ({ ...p, isReady: true }));
            player.setVolume(80);
          },
          onStateChange: (e: any) => {
            const S = (window as any).YT?.PlayerState;
            if (!S) return;
            if (e.data === S.PLAYING) {
              // جيب بيانات الأغنية الحالية من IFrame
              const info = playerRef.current?.getVideoData?.() || {};
              setState(p => ({
                ...p, isPlaying: true,
                duration: playerRef.current?.getDuration?.() || p.duration,
                currentTrack: info.video_id && info.video_id !== p.currentTrack?.id ? {
                  id: info.video_id,
                  title: info.title || p.currentTrack?.title || "YouTube",
                  artist: info.author || p.currentTrack?.artist || "",
                  coverUrl: `https://i.ytimg.com/vi/${info.video_id}/mqdefault.jpg`,
                  album: "YouTube",
                } : p.currentTrack,
              }));
              startTimer();
              if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
            } else if (e.data === S.PAUSED) {
              setState(p => ({ ...p, isPlaying: false }));
              clearInterval(timerRef.current);
              if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
            } else if (e.data === S.ENDED) {
              clearInterval(timerRef.current);
              // شغّل التالي في القائمة
              setState(p => {
                if (p.repeatMode === "one") {
                  setTimeout(() => { playerRef.current?.seekTo(0); playerRef.current?.playVideo(); }, 0);
                  return p;
                }
                if (p.queue.length === 0) return { ...p, isPlaying: false };
                let next = p.isShuffled
                  ? Math.floor(Math.random() * p.queue.length)
                  : p.queueIndex + 1;
                if (next >= p.queue.length) {
                  if (p.repeatMode === "all") next = 0;
                  else return { ...p, isPlaying: false };
                }
                const t = p.queue[next];
                setTimeout(() => playerRef.current?.loadVideoById(t.id), 0);
                return { ...p, currentTrack: t, queueIndex: next, currentTime: 0 };
              });
            }
          },
          onError: () => setState(p => ({ ...p, isPlaying: false })),
        },
      });
    });
    return () => { clearInterval(timerRef.current); playerRef.current?.destroy?.(); };
  }, []);

  // ── MediaSession Handlers ─────────────────────────────────────────────────
  useEffect(() => {
    if (!("mediaSession" in navigator) || !state.currentTrack) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: state.currentTrack.title,
      artist: state.currentTrack.artist,
      album: "MeTube",
      artwork: state.currentTrack.coverUrl
        ? [{ src: state.currentTrack.coverUrl, sizes: "320x180", type: "image/jpeg" }] : [],
    });
    navigator.mediaSession.setActionHandler("play",          () => play());
    navigator.mediaSession.setActionHandler("pause",         () => pause());
    navigator.mediaSession.setActionHandler("nexttrack",     () => next());
    navigator.mediaSession.setActionHandler("previoustrack", () => previous());
    navigator.mediaSession.setActionHandler("seekto",        d => { if (d.seekTime != null) seek(d.seekTime); });
    navigator.mediaSession.setActionHandler("seekforward",   d => seek(Math.min((playerRef.current?.getCurrentTime?.() || 0) + (d.seekOffset || 10), state.duration)));
    navigator.mediaSession.setActionHandler("seekbackward",  d => seek(Math.max((playerRef.current?.getCurrentTime?.() || 0) - (d.seekOffset || 10), 0)));
  }, [state.currentTrack]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const play = useCallback((track?: Track) => {
    if (track) {
      playerRef.current?.loadVideoById(track.id);
      setState(p => {
        const exists = p.queue.findIndex(t => t.id === track.id);
        const q   = exists >= 0 ? p.queue : [...p.queue, track];
        const idx = exists >= 0 ? exists : q.length - 1;
        return { ...p, currentTrack: track, queue: q, queueIndex: idx, isPlaying: true, currentTime: 0, duration: track.duration || 0 };
      });
    } else {
      playerRef.current?.playVideo();
      setState(p => ({ ...p, isPlaying: true }));
    }
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pauseVideo();
    setState(p => ({ ...p, isPlaying: false }));
  }, []);

  const toggle = useCallback(() => {
    setState(p => {
      if (p.isPlaying) { playerRef.current?.pauseVideo(); return { ...p, isPlaying: false }; }
      playerRef.current?.playVideo(); return { ...p, isPlaying: true };
    });
  }, []);

  // ✅ Seek يشتغل صح
  const seek = useCallback((time: number) => {
    if (playerRef.current?.seekTo) {
      playerRef.current.seekTo(time, true);
      setState(p => ({ ...p, currentTime: time }));
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    playerRef.current?.setVolume(vol * 100);
    if (vol > 0) playerRef.current?.unMute();
    setState(p => ({ ...p, volume: vol, isMuted: vol === 0 }));
  }, []);

  const toggleMute = useCallback(() => {
    setState(p => {
      if (p.isMuted) { playerRef.current?.unMute(); playerRef.current?.setVolume(p.volume * 100); }
      else playerRef.current?.mute();
      return { ...p, isMuted: !p.isMuted };
    });
  }, []);

  // ✅ Next يمشي في الـ queue صح
  const next = useCallback(() => {
    setState(p => {
      if (!p.queue.length) return p;
      let idx = p.isShuffled
        ? Math.floor(Math.random() * p.queue.length)
        : p.queueIndex + 1;
      if (idx >= p.queue.length) {
        if (p.repeatMode === "all") idx = 0;
        else return { ...p, isPlaying: false };
      }
      const t = p.queue[idx];
      setTimeout(() => playerRef.current?.loadVideoById(t.id), 0);
      return { ...p, currentTrack: t, queueIndex: idx, isPlaying: true, currentTime: 0 };
    });
  }, []);

  // ✅ Previous يرجع للأغنية السابقة أو لأول الأغنية لو مضى أكتر من 3 ثواني
  const previous = useCallback(() => {
    setState(p => {
      if (p.currentTime > 3) {
        playerRef.current?.seekTo(0, true);
        return { ...p, currentTime: 0 };
      }
      if (!p.queue.length) return p;
      let idx = p.queueIndex - 1;
      if (idx < 0) idx = p.repeatMode === "all" ? p.queue.length - 1 : 0;
      const t = p.queue[idx];
      setTimeout(() => playerRef.current?.loadVideoById(t.id), 0);
      return { ...p, currentTrack: t, queueIndex: idx, isPlaying: true, currentTime: 0 };
    });
  }, []);

  const addToQueue = useCallback((track: Track) =>
    setState(p => ({ ...p, queue: [...p.queue, track] })), []);

  const setQueue = useCallback((tracks: Track[], startIndex = 0) => {
    const t = tracks[startIndex];
    setTimeout(() => t && playerRef.current?.loadVideoById(t.id), 0);
    setState(p => ({ ...p, queue: tracks, queueIndex: startIndex, currentTrack: t || null, isPlaying: true, currentTime: 0 }));
  }, []);

  const toggleRepeat = useCallback(() =>
    setState(p => ({ ...p, repeatMode: p.repeatMode === "off" ? "all" : p.repeatMode === "all" ? "one" : "off" })), []);

  const toggleShuffle = useCallback(() =>
    setState(p => ({ ...p, isShuffled: !p.isShuffled })), []);

  const setDataSaver = useCallback((v: boolean) =>
    setState(p => ({ ...p, dataSaver: v })), []);

  const getAudioBlob = useCallback(async () => null, []);

  // ✅ تغيير سرعة التشغيل
  const setPlaybackRate = useCallback((rate: number) => {
    if (playerRef.current?.setPlaybackRate) {
      playerRef.current.setPlaybackRate(rate);
      setPlaybackRateState(rate);
    }
  }, []);

  return (
    <PlayerContext.Provider value={{
      ...state, audioRef, playbackRate,
      play, pause, toggle, seek, setVolume, toggleMute,
      next, previous, addToQueue, setQueue,
      toggleRepeat, toggleShuffle, setDataSaver, getAudioBlob,
      setPlaybackRate,
    }}>
      <div ref={divRef} style={{ position:"fixed", left:-9999, top:-9999, width:1, height:1, pointerEvents:"none" }} />
      <audio ref={audioRef} style={{ display:"none" }} />
      {children}
    </PlayerContext.Provider>
  );
};
