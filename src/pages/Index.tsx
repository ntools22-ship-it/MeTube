import { usePlayer } from "@/contexts/PlayerContext";
import TrackCard from "@/components/TrackCard";
import { featuredTracks, recentlyPlayed, trendingTracks } from "@/data/mockTracks";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function Index() {
  const { setQueue } = usePlayer();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-accent/10 to-secondary p-6 sm:p-10"
      >
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wider">AI-Powered</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-2">
            Welcome to <span className="text-gradient">MeTube</span>
          </h1>
          <p className="text-muted-foreground max-w-md">
            Stream music with AI transcription, real-time translation, and live shared listening rooms.
          </p>
        </div>
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-accent/10 blur-3xl" />
      </motion.section>

      {/* Recently Played */}
      <section>
        <h2 className="font-display text-xl font-semibold text-foreground mb-4">Recently Played</h2>
        <div className="space-y-1">
          {recentlyPlayed.map(track => (
            <TrackCard key={track.id} track={track} variant="row" />
          ))}
        </div>
      </section>

      {/* Featured */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold text-foreground">Featured</h2>
          <button
            onClick={() => setQueue(featuredTracks)}
            className="text-xs text-primary hover:underline"
          >
            Play All
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {featuredTracks.map((track, i) => (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <TrackCard track={track} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Trending */}
      <section>
        <h2 className="font-display text-xl font-semibold text-foreground mb-4">Trending Now</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {trendingTracks.map((track, i) => (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <TrackCard track={track} />
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
