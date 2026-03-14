/**
 * Search Page — يستخدم YouTube IFrame مباشرة للبحث والتشغيل
 * مفيش API، مفيش proxy، مفيش CORS
 */
import { useState } from "react";
import { Search as SearchIcon, Play, Music, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { usePlayer } from "@/contexts/PlayerContext";
import { toast } from "sonner";

const QUICK_SEARCHES = [
  "عمرو دياب", "محمد حماقي", "تامر حسني", "أنغام",
  "Lofi Hip Hop", "Arabic Music 2024", "Pop Hits", "Chill Vibes",
  "Mohamed Mounir", "Nancy Ajram", "Rap Arabic", "Electronic",
];

export default function Search() {
  const { searchAndPlay, currentTrack, isPlaying } = usePlayer();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = (q: string) => {
    if (!q.trim()) return;
    setIsLoading(true);
    setQuery(q);
    searchAndPlay(q);
    toast.success(`🔍 جاري تشغيل نتائج: ${q}`);
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground mb-1 flex items-center gap-2">
          <Music className="h-6 w-6 text-primary" /> البحث على YouTube
        </h1>
        <p className="text-xs text-muted-foreground">يبحث ويشغّل مباشرة من YouTube</p>
      </div>

      {/* Search box */}
      <div className="flex gap-2 max-w-2xl">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="ابحث عن أغاني، فنانين..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch(query)}
            className="pl-10 bg-secondary border-border h-12 text-foreground placeholder:text-muted-foreground text-base"
            dir="auto"
          />
        </div>
        <Button
          className="h-12 px-6 gap-2"
          onClick={() => handleSearch(query)}
          disabled={!query.trim() || isLoading}
        >
          {isLoading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Play className="h-4 w-4 fill-current" />}
          تشغيل
        </Button>
      </div>

      {/* Now playing */}
      {currentTrack && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20 max-w-2xl"
        >
          <div className={`w-2 h-2 rounded-full ${isPlaying ? "bg-primary animate-pulse" : "bg-muted-foreground"}`} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{currentTrack.title}</p>
            <p className="text-xs text-muted-foreground">{currentTrack.artist}</p>
          </div>
          <span className="text-xs text-primary mr-auto flex-shrink-0">
            {isPlaying ? "▶ يشتغل" : "⏸ متوقف"}
          </span>
        </motion.div>
      )}

      {/* Quick searches */}
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">ابحث بسرعة</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {QUICK_SEARCHES.map((item, i) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className="relative overflow-hidden rounded-xl h-20 cursor-pointer hover:scale-[1.03] transition-transform active:scale-[0.98]"
              style={{
                background: `linear-gradient(135deg, hsl(${(i * 29 + 160) % 360} 55% 22%), hsl(${(i * 29 + 220) % 360} 45% 14%))`,
              }}
              onClick={() => handleSearch(item)}
            >
              <span className="absolute bottom-2.5 left-3 font-display font-bold text-foreground text-sm">{item}</span>
              <Play className="absolute top-2.5 right-2.5 h-4 w-4 text-white/40" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* كيف يشتغل */}
      <div className="p-4 rounded-xl bg-secondary/50 text-xs text-muted-foreground max-w-2xl space-y-1">
        <p className="font-medium text-foreground mb-1">كيف يشتغل؟</p>
        <p>• ابحث عن أي أغنية أو فنان → التطبيق بيشغّل نتائج البحث مباشرة من YouTube</p>
        <p>• التشغيل بيكمل في الخلفية وعلى شاشة القفل</p>
        <p>• أزرار التالي والسابق بيتنقلوا بين نتائج البحث</p>
      </div>
    </div>
  );
}
