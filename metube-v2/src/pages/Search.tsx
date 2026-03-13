import { useState, useRef } from "react";
import { Search as SearchIcon, Play, Clock, Eye, Loader2, Music, Wifi, WifiOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayer } from "@/contexts/PlayerContext";
import { searchYouTube, getAudioStreamUrl, formatDuration, formatViews, VideoResult } from "@/lib/youtube";
import { toast } from "sonner";

const GENRES = ["Pop", "Hip-Hop", "Electronic", "Rock", "Jazz", "Classical", "R&B", "عربي", "Indie", "Lofi", "Rap", "Trap"];

export default function Search() {
  const { play, dataSaver } = usePlayer();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VideoResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingVideoId, setLoadingVideoId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const doSearch = async (q: string) => {
    if (!q.trim()) { setResults([]); setHasSearched(false); return; }
    setIsSearching(true);
    setHasSearched(true);
    try {
      const data = await searchYouTube(q);
      setResults(data);
    } catch (err: any) {
      toast.error(err.message || "فشل البحث. تحقق من اتصالك.");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(val), 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      clearTimeout(searchTimer.current);
      doSearch(query);
    }
  };

  const handlePlay = async (video: VideoResult) => {
    setLoadingVideoId(video.videoId);
    try {
      const streamUrl = await getAudioStreamUrl(video.videoId, dataSaver);
      play({
        id: video.videoId,
        title: video.title,
        artist: video.author,
        album: "YouTube",
        coverUrl: video.thumbnail,
        streamUrl,
        duration: video.lengthSeconds,
      });
      toast.success(`${dataSaver ? "💾 " : ""}جاري التشغيل: ${video.title}`);
    } catch (err: any) {
      toast.error(err.message || "فشل تحميل الصوت.");
    } finally {
      setLoadingVideoId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Music className="h-6 w-6 text-primary" />
          البحث على YouTube
        </h1>
        <div className="relative max-w-2xl">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="ابحث عن أغاني، فنانين، ألبومات..."
            value={query}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            className="pl-10 pr-4 bg-secondary border-border h-12 text-foreground placeholder:text-muted-foreground text-base"
            dir="auto"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary animate-spin" />
          )}
        </div>

        {/* Data saver badge */}
        {dataSaver && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <WifiOff className="h-3.5 w-3.5 text-yellow-500" />
            <span>وضع توفير البيانات فعّال — جودة صوت منخفضة (48kbps)</span>
          </div>
        )}
      </div>

      {/* Search results */}
      <AnimatePresence mode="wait">
        {hasSearched ? (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {isSearching ? (
              <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span>جاري البحث...</span>
              </div>
            ) : results.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">لا توجد نتائج لـ "{query}"</p>
            ) : (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground mb-3">{results.length} نتيجة</p>
                {results.map((video, i) => (
                  <motion.div
                    key={video.videoId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="group flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/80 cursor-pointer transition-colors"
                    onClick={() => handlePlay(video)}
                  >
                    {/* Thumbnail */}
                    <div className="relative w-16 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        {loadingVideoId === video.videoId ? (
                          <Loader2 className="h-5 w-5 text-white animate-spin" />
                        ) : (
                          <Play className="h-5 w-5 text-white fill-white" />
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate leading-snug">{video.title}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{video.author}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground/70">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatDuration(video.lengthSeconds)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {formatViews(video.viewCount)}
                        </span>
                      </div>
                    </div>

                    {/* Play button (desktop) */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="hidden sm:flex h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={loadingVideoId === video.videoId}
                    >
                      {loadingVideoId === video.videoId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 text-primary fill-primary" />
                      )}
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          /* Genre grid */
          <motion.div key="genres" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">استكشف التصنيفات</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {GENRES.map((genre, i) => (
                <motion.div
                  key={genre}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="relative overflow-hidden rounded-xl h-24 cursor-pointer hover:scale-[1.03] transition-transform"
                  style={{
                    background: `linear-gradient(135deg, hsl(${(i * 30 + 180) % 360} 60% 25%), hsl(${(i * 30 + 240) % 360} 50% 15%))`,
                  }}
                  onClick={() => { setQuery(genre); doSearch(genre); }}
                >
                  <span className="absolute bottom-3 left-3 font-display font-bold text-foreground text-sm">{genre}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
