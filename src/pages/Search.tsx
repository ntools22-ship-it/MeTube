import { useState, useRef } from "react";
import { Search as SearchIcon, Play, Clock, Eye, Loader2, Music, ListMusic, User, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayer } from "@/contexts/PlayerContext";
import {
  searchYouTube, getPlaylistFirstVideo, getChannelFirstVideo,
  formatDuration, formatViews,
  SearchResult, VideoResult, PlaylistResult, ChannelResult
} from "@/lib/youtube";
import { toast } from "sonner";

const TABS = [
  { id: "all",      label: "الكل" },
  { id: "video",    label: "فيديو 🎵" },
  { id: "playlist", label: "قوائم 📋" },
  { id: "channel",  label: "قنوات 👤" },
];

const QUICK = ["عمرو دياب","محمد حماقي","تامر حسني","أنغام","Lofi Hip Hop","Arabic Music","Pop Hits","Chill Vibes"];

export default function Search() {
  const { play } = usePlayer();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = async (q: string) => {
    if (!q.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    setActiveTab("all");
    try {
      const data = await searchYouTube(q);
      setResults(data);
    } catch (err: any) {
      toast.error(err.message || "فشل البحث");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePlayVideo = async (videoId: string, title: string, author: string, thumbnail: string, duration: number) => {
    setLoadingId(videoId);
    play({ id: videoId, title, artist: author, album: "YouTube", coverUrl: thumbnail, duration });
    toast.success(`▶️ ${title.substring(0, 40)}`);
    setLoadingId(null);
  };

  const handlePlayPlaylist = async (item: PlaylistResult) => {
    setLoadingId(item.playlistId);
    try {
      const videoId = await getPlaylistFirstVideo(item.playlistId);
      if (!videoId) throw new Error("القائمة فارغة");
      play({ id: videoId, title: item.title, artist: item.channelTitle, album: "Playlist", coverUrl: item.thumbnail });
      toast.success(`▶️ ${item.title.substring(0, 40)}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handlePlayChannel = async (item: ChannelResult) => {
    setLoadingId(item.channelId);
    try {
      const videoId = await getChannelFirstVideo(item.channelId);
      if (!videoId) throw new Error("القناة لا تحتوي فيديوهات");
      play({ id: videoId, title: item.title, artist: item.title, album: "Channel", coverUrl: item.thumbnail });
      toast.success(`▶️ ${item.title}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingId(null);
    }
  };

  const filtered = activeTab === "all" ? results : results.filter(r => r.type === activeTab);

  const videoCount    = results.filter(r => r.type === "video").length;
  const playlistCount = results.filter(r => r.type === "playlist").length;
  const channelCount  = results.filter(r => r.type === "channel").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
        <Music className="h-6 w-6 text-primary" /> البحث على YouTube
      </h1>

      {/* Search box */}
      <div className="flex gap-2 max-w-2xl">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="ابحث عن أغاني، فنانين، قوائم..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && doSearch(query)}
            className="pl-10 bg-secondary border-border h-12 text-foreground placeholder:text-muted-foreground text-base"
            dir="auto"
          />
        </div>
        <Button
          className="h-12 px-5 gap-2 flex-shrink-0"
          onClick={() => doSearch(query)}
          disabled={!query.trim() || isSearching}
        >
          {isSearching
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <SearchIcon className="h-4 w-4" />}
          بحث
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {/* ── نتائج البحث ─────────────────────────────────────── */}
        {hasSearched ? (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">

            {/* Tabs */}
            {!isSearching && results.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {TABS.map(tab => {
                  const count = tab.id === "all" ? results.length : tab.id === "video" ? videoCount : tab.id === "playlist" ? playlistCount : channelCount;
                  if (tab.id !== "all" && count === 0) return null;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab.label} {count > 0 && <span className="opacity-70 text-xs ml-1">{count}</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Loading */}
            {isSearching ? (
              <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span>جاري البحث...</span>
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">لا توجد نتائج</p>
            ) : (
              <div className="space-y-1">
                {filtered.map((item, i) => (
                  <motion.div
                    key={item.type === "video" ? item.videoId : item.type === "playlist" ? item.playlistId : item.channelId}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}
                  >
                    {/* ── فيديو ── */}
                    {item.type === "video" && (
                      <div
                        className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/80 cursor-pointer transition-colors"
                        onClick={() => handlePlayVideo(item.videoId, item.title, item.author, item.thumbnail, item.lengthSeconds)}
                      >
                        <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          <img src={item.thumbnail} alt="" className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            {loadingId === item.videoId
                              ? <Loader2 className="h-5 w-5 text-white animate-spin" />
                              : <Play className="h-5 w-5 text-white fill-white" />}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate leading-snug">{item.title}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{item.author}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground/60">
                            {item.lengthSeconds > 0 && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDuration(item.lengthSeconds)}</span>}
                            {item.viewCount > 0 && <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{formatViews(item.viewCount)}</span>}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── قائمة تشغيل ── */}
                    {item.type === "playlist" && (
                      <div
                        className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/80 cursor-pointer transition-colors"
                        onClick={() => handlePlayPlaylist(item)}
                      >
                        <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <ListMusic className="h-5 w-5 text-white" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{item.channelTitle}</p>
                          <p className="text-xs text-primary mt-0.5">قائمة تشغيل</p>
                        </div>
                        {loadingId === item.playlistId
                          ? <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100" />}
                      </div>
                    )}

                    {/* ── قناة ── */}
                    {item.type === "channel" && (
                      <div
                        className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/80 cursor-pointer transition-colors"
                        onClick={() => handlePlayChannel(item)}
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center ring-2 ring-border">
                          {item.thumbnail
                            ? <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                            : <User className="h-6 w-6 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                          <p className="text-xs text-accent mt-0.5">قناة YouTube</p>
                        </div>
                        {loadingId === item.channelId
                          ? <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100" />}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          /* ── Quick Search ─────────────────────────────────────── */
          <motion.div key="quick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">ابحث بسرعة</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {QUICK.map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                  className="relative overflow-hidden rounded-xl h-20 cursor-pointer hover:scale-[1.03] active:scale-[0.98] transition-transform"
                  style={{ background: `linear-gradient(135deg, hsl(${(i*30+160)%360} 55% 22%), hsl(${(i*30+220)%360} 45% 14%))` }}
                  onClick={() => { setQuery(item); doSearch(item); }}
                >
                  <span className="absolute bottom-2.5 left-3 font-bold text-sm text-white drop-shadow">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
