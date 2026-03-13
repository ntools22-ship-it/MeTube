import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
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
  setDataSaver: (enabled: boolean) => void;
  getAudioBlob: () => Promise<Blob | null>;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
};

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioRef = useRef<HTMLAudioElement>(null!);
  const [state, setState] = useState<PlayerState>({
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    isMuted: false,
    queue: [],
    queueIndex: -1,
    repeatMode: "off",
    isShuffled: false,
    dataSaver: false,
  });

  const play = useCallback((track?: Track) => {
    if (track) {
      setState((prev) => {
        const existingIndex = prev.queue.findIndex((t) => t.id === track.id);
        if (existingIndex >= 0) {
          return { ...prev, currentTrack: track, queueIndex: existingIndex, isPlaying: true };
        }
        const newQueue = [...prev.queue, track];
        return { ...prev, currentTrack: track, queue: newQueue, queueIndex: newQueue.length - 1, isPlaying: true };
      });
    } else {
      setState((prev) => ({ ...prev, isPlaying: true }));
    }
  }, []);

  const pause = useCallback(() => setState((prev) => ({ ...prev, isPlaying: false })), []);
  const toggle = useCallback(() => setState((prev) => ({ ...prev, isPlaying: !prev.isPlaying })), []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState((prev) => ({ ...prev, currentTime: time }));
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    setState((prev) => ({ ...prev, volume: vol, isMuted: vol === 0 }));
  }, []);

  const toggleMute = useCallback(() => setState((prev) => ({ ...prev, isMuted: !prev.isMuted })), []);

  const next = useCallback(() => {
    setState((prev) => {
      if (prev.queue.length === 0) return prev;
      let nextIndex = prev.isShuffled
        ? Math.floor(Math.random() * prev.queue.length)
        : prev.queueIndex + 1;
      if (!prev.isShuffled && nextIndex >= prev.queue.length) {
        if (prev.repeatMode === "all") nextIndex = 0;
        else return { ...prev, isPlaying: false };
      }
      return { ...prev, currentTrack: prev.queue[nextIndex], queueIndex: nextIndex, isPlaying: true };
    });
  }, []);

  const previous = useCallback(() => {
    setState((prev) => {
      if (audioRef.current && audioRef.current.currentTime > 3) {
        audioRef.current.currentTime = 0;
        return { ...prev, currentTime: 0 };
      }
      if (prev.queue.length === 0) return prev;
      let prevIndex = prev.queueIndex - 1;
      if (prevIndex < 0) prevIndex = prev.repeatMode === "all" ? prev.queue.length - 1 : 0;
      return { ...prev, currentTrack: prev.queue[prevIndex], queueIndex: prevIndex, isPlaying: true };
    });
  }, []);

  const addToQueue = useCallback((track: Track) => {
    setState((prev) => ({ ...prev, queue: [...prev.queue, track] }));
  }, []);

  const setQueue = useCallback((tracks: Track[], startIndex = 0) => {
    setState((prev) => ({
      ...prev, queue: tracks, queueIndex: startIndex,
      currentTrack: tracks[startIndex] || null, isPlaying: true,
    }));
  }, []);

  const toggleRepeat = useCallback(() => {
    setState((prev) => ({
      ...prev,
      repeatMode: prev.repeatMode === "off" ? "all" : prev.repeatMode === "all" ? "one" : "off",
    }));
  }, []);

  const toggleShuffle = useCallback(() => setState((prev) => ({ ...prev, isShuffled: !prev.isShuffled })), []);
  const setDataSaver = useCallback((enabled: boolean) => setState((prev) => ({ ...prev, dataSaver: enabled })), []);
  const getAudioBlob = useCallback(async (): Promise<Blob | null> => null, []);

  // Sync audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (state.currentTrack?.streamUrl) {
      if (audio.src !== state.currentTrack.streamUrl) {
        audio.src = state.currentTrack.streamUrl;
        audio.load();
      }
      if (state.isPlaying) audio.play().catch(() => {});
      else audio.pause();
    } else {
      audio.pause();
    }
  }, [state.currentTrack, state.isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = state.isMuted ? 0 : state.volume;
  }, [state.volume, state.isMuted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setState((prev) => ({ ...prev, currentTime: audio.currentTime }));
    const onDuration = () => setState((prev) => ({ ...prev, duration: audio.duration || 0 }));
    const onEnded = () => {
      if (state.repeatMode === "one") { audio.currentTime = 0; audio.play(); }
      else next();
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onDuration);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onDuration);
      audio.removeEventListener("ended", onEnded);
    };
  }, [next, state.repeatMode]);

  // MediaSession API — lock screen controls + seek bar
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
    navigator.mediaSession.setActionHandler("stop", pause);
    navigator.mediaSession.setActionHandler("previoustrack", previous);
    navigator.mediaSession.setActionHandler("nexttrack", next);
    navigator.mediaSession.setActionHandler("seekto", (d) => { if (d.seekTime !== undefined) seek(d.seekTime); });
    navigator.mediaSession.setActionHandler("seekforward", (d) => seek(Math.min((audioRef.current?.currentTime || 0) + (d.seekOffset || 10), state.duration)));
    navigator.mediaSession.setActionHandler("seekbackward", (d) => seek(Math.max((audioRef.current?.currentTime || 0) - (d.seekOffset || 10), 0)));
  }, [state.currentTrack, state.isPlaying, play, pause, previous, next, seek, state.duration]);

  // MediaSession position state (seek bar on lock screen)
  useEffect(() => {
    if (!("mediaSession" in navigator) || !state.duration) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: state.duration,
        playbackRate: audioRef.current?.playbackRate || 1,
        position: Math.min(state.currentTime, state.duration),
      });
    } catch { /* not all browsers support this */ }
  }, [state.currentTime, state.duration]);

  return (
    <PlayerContext.Provider value={{
      ...state, audioRef,
      play, pause, toggle, seek, setVolume, toggleMute,
      next, previous, addToQueue, setQueue,
      toggleRepeat, toggleShuffle, setDataSaver, getAudioBlob,
    }}>
      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" />
      {children}
    </PlayerContext.Provider>
  );
};
