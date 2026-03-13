import { usePlayer } from "@/contexts/PlayerContext";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle,
  Volume2, VolumeX, Volume1, Mic, Languages, Download, Radio
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function formatTime(seconds: number) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface NowPlayingBarProps {
  onOpenAI?: () => void;
  onOpenLiveShare?: () => void;
}

export default function NowPlayingBar({ onOpenAI, onOpenLiveShare }: NowPlayingBarProps) {
  const {
    currentTrack, isPlaying, currentTime, duration, volume, isMuted,
    toggle, seek, setVolume, toggleMute, next, previous,
    repeatMode, toggleRepeat, isShuffled, toggleShuffle,
  } = usePlayer();

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <motion.div
      initial={{ y: 80 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border"
    >
      {/* Progress bar - thin line at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-muted cursor-pointer group"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          seek(pct * duration);
        }}
      >
        <div
          className="h-full bg-primary transition-all relative"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="flex items-center h-[72px] px-3 sm:px-4 gap-2 sm:gap-4">
        {/* Track info */}
        <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-[0_0_30%]">
          <AnimatePresence mode="wait">
            {currentTrack ? (
              <motion.div
                key={currentTrack.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-3 min-w-0"
              >
                <div className={`w-12 h-12 rounded-md bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0 ${isPlaying ? 'ring-2 ring-primary/50' : ''}`}>
                  {currentTrack.coverUrl ? (
                    <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <span className="text-lg">🎵</span>
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{currentTrack.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
                </div>
              </motion.div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-md bg-secondary flex items-center justify-center">
                  <span className="text-muted-foreground text-lg">🎵</span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">No track selected</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls - center */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" className="hidden sm:flex h-8 w-8"
              onClick={toggleShuffle}>
              <Shuffle className={`h-4 w-4 ${isShuffled ? 'text-primary' : 'text-muted-foreground'}`} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={previous}>
              <SkipBack className="h-4 w-4 text-foreground" />
            </Button>
            <Button
              size="icon"
              className="h-9 w-9 rounded-full bg-foreground text-background hover:bg-foreground/90 hover:scale-105 transition-transform"
              onClick={toggle}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={next}>
              <SkipForward className="h-4 w-4 text-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="hidden sm:flex h-8 w-8"
              onClick={toggleRepeat}>
              {repeatMode === "one" ? (
                <Repeat1 className="h-4 w-4 text-primary" />
              ) : (
                <Repeat className={`h-4 w-4 ${repeatMode === "all" ? 'text-primary' : 'text-muted-foreground'}`} />
              )}
            </Button>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-10 text-right">{formatTime(currentTime)}</span>
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={([v]) => seek(v)}
              className="w-[200px] md:w-[300px] lg:w-[400px]"
            />
            <span className="w-10">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right controls */}
        <div className="hidden sm:flex items-center gap-1 flex-1 justify-end">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpenAI}
            title="AI Tools">
            <Mic className="h-4 w-4 text-muted-foreground hover:text-primary" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpenAI}
            title="Translate">
            <Languages className="h-4 w-4 text-muted-foreground hover:text-accent" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpenLiveShare}
            title="Live Share">
            <Radio className="h-4 w-4 text-muted-foreground hover:text-primary" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Download">
            <Download className="h-4 w-4 text-muted-foreground" />
          </Button>
          <div className="flex items-center gap-1 ml-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleMute}>
              <VolumeIcon className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              max={100}
              step={1}
              onValueChange={([v]) => setVolume(v / 100)}
              className="w-[80px]"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
