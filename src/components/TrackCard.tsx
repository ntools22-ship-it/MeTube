import { usePlayer, type Track } from "@/contexts/PlayerContext";
import { Play, Pause } from "lucide-react";
import { motion } from "framer-motion";

interface TrackCardProps {
  track: Track;
  variant?: "card" | "row";
}

export default function TrackCard({ track, variant = "card" }: TrackCardProps) {
  const { play, pause, currentTrack, isPlaying } = usePlayer();
  const isActive = currentTrack?.id === track.id;
  const isCurrentlyPlaying = isActive && isPlaying;

  const handleClick = () => {
    if (isCurrentlyPlaying) pause();
    else play(track);
  };

  if (variant === "row") {
    return (
      <motion.div
        whileHover={{ backgroundColor: "hsl(0 0% 18%)" }}
        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer group transition-colors"
        onClick={handleClick}
      >
        <div className="relative w-10 h-10 rounded bg-secondary overflow-hidden flex-shrink-0">
          {track.coverUrl ? (
            <img src={track.coverUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity">
            {isCurrentlyPlaying ? <Pause className="h-4 w-4 text-foreground" /> : <Play className="h-4 w-4 text-foreground ml-0.5" />}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>{track.title}</p>
          <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
        </div>
        {isActive && isPlaying && (
          <div className="flex gap-0.5 items-end h-4">
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                className="w-0.5 bg-primary rounded-full"
                animate={{ height: ["4px", "16px", "8px", "14px", "4px"] }}
                transition={{ repeat: Infinity, duration: 1, delay: i * 0.15 }}
              />
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      className="group cursor-pointer"
      onClick={handleClick}
    >
      <div className="relative aspect-square rounded-lg overflow-hidden bg-secondary mb-3">
        {track.coverUrl ? (
          <img src={track.coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30" />
        )}
        <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg glow-primary">
            {isCurrentlyPlaying ? <Pause className="h-5 w-5 text-primary-foreground" /> : <Play className="h-5 w-5 text-primary-foreground ml-0.5" />}
          </div>
        </div>
        {isActive && isPlaying && (
          <div className="absolute bottom-2 right-2 flex gap-0.5 items-end h-4">
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                className="w-0.5 bg-primary rounded-full"
                animate={{ height: ["4px", "14px", "6px", "12px", "4px"] }}
                transition={{ repeat: Infinity, duration: 1, delay: i * 0.15 }}
              />
            ))}
          </div>
        )}
      </div>
      <p className={`text-sm font-medium truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>{track.title}</p>
      <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
    </motion.div>
  );
}
