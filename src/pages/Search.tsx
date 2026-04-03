import { useState } from "react";
import { Search as SearchIcon, Play, Loader2, Music, ListMusic, User, ChevronRight, ArrowLeft, Eye, Clock, Plus, CheckCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayer } from "@/contexts/PlayerContext";
import { searchYouTube, getPlaylistVideos, getChannelContent, formatDuration, formatViews, SearchResult, VideoResult, PlaylistResult, ChannelResult } from "@/lib/youtube";
import { toast } from "sonner";

const QUICK = ["عمرو دياب","محمد حماقي","تامر حسني","أنغام","Lofi Hip Hop","Arabic Music 2024","Pop Hits","Chill Vibes"];
const TABS  = [{id:"all",label:"الكل"},{id:"video",label:"🎵 فيديو"},{id:"playlist",label:"📋 قوائم"},{id:"channel",label:"👤 قنوات"}];
type DrillPage = { kind:"playlist"; item:PlaylistResult } | { kind:"channel"; item:ChannelResult };

export default function Search() {
  const { play, addToQueue, queue } = usePlayer();
  const [query,       setQuery]       = useState("");
  const [results,     setResults]     = useState<SearchResult[]>([]);
  const [searching,   setSearching]   = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab,   setActiveTab]   = useState("all");
  const [drillPage,   setDrillPage]   = useState<DrillPage|null>(null);
  const [drillItems,  setDrillItems]  = useState<SearchResult[]>([]);
  const [drillLoading,setDrillLoading]= useState(false);
  const [loadingId,   setLoadingId]   = useState<string|null>(null);
  const [addedIds,    setAddedIds]    = useState<Set<string>>(new Set());

  const doSearch = async (q: string) => {
    if (!q.trim()) return;
    setSearching(true); setHasSearched(true); setDrillPage(null); setActiveTab("all");
    try   { setResults(await searchYouTube(q)); }
    catch (e: any) { toast.error(e.message); setResults([]); }
    finally { setSearching(false); }
  };

  const openPlaylist = async (item: PlaylistResult) => {
    setDrillPage({ kind:"playlist", item }); setDrillItems([]); setDrillLoading(true);
    try   { setDrillItems(await getPlaylistVideos(item.playlistId)); }
    catch { toast.error("تعذّر تحميل القائمة"); }
    finally { setDrillLoading(false); }
  };

  const openChannel = async (item: ChannelResult) => {
    setDrillPage({ kind:"channel", item }); setDrillItems([]); setDrillLoading(true);
    try   { setDrillItems(await getChannelContent(item.channelId)); }
    catch { toast.error("تعذّر تحميل القناة"); }
    finally { setDrillLoading(false); }
  };

  const playVideo = (item: VideoResult) => {
    setLoadingId(item.videoId);
    play({ id:item.videoId, title:item.title, artist:item.author, album:"YouTube", coverUrl:item.thumbnail, duration:item.lengthSeconds });
    toast.success(`▶️ ${item.title.substring(0,35)}`);
    setLoadingId(null);
  };

  const handleAddToQueue = (item: VideoResult, e: React.MouseEvent) => {
    e.stopPropagation();
    addToQueue({ id:item.videoId, title:item.title, artist:item.author, album:"YouTube", coverUrl:item.thumbnail, duration:item.lengthSeconds });
    setAddedIds(prev => new Set([...prev, item.videoId]));
    toast.success(`➕ أُضيف: ${item.title.substring(0,30)}`);
    setTimeout(() => setAddedIds(prev => { const n=new Set(prev); n.delete(item.videoId); return n; }), 2000);
  };

  const inQueue = (id: string) => queue.some(t => t.id === id);
  const displayList = drillPage ? drillItems : (activeTab==="all" ? results : results.filter(r=>r.type===activeTab));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4">
      <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
        <Music className="h-6 w-6 text-primary"/> البحث على YouTube
      </h1>

      <div className="flex gap-2 max-w-2xl">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"/>
          <Input placeholder="ابحث عن أغاني، فنانين، قوائم..." value={query}
            onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doSearch(query)}
            className="pl-10 bg-secondary border-border h-12 text-foreground placeholder:text-muted-foreground text-base" dir="auto"/>
        </div>
        <Button className="h-12 px-5 gap-2 flex-shrink-0" onClick={()=>doSearch(query)} disabled={!query.trim()||searching}>
          {searching ? <Loader2 className="h-4 w-4 animate-spin"/> : <SearchIcon className="h-4 w-4"/>} بحث
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {hasSearched ? (
          <motion.div key="results" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-3">

            {/* Drill back */}
            {drillPage && (
              <div className="flex items-center gap-3 py-1">
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={()=>setDrillPage(null)}>
                  <ArrowLeft className="h-4 w-4"/> رجوع
                </Button>
                <img src={drillPage.item.thumbnail} alt="" className={`w-8 h-8 object-cover flex-shrink-0 ${drillPage.kind==="channel"?"rounded-full":"rounded"}`}/>
                <p className="text-sm font-medium text-foreground truncate">{drillPage.item.title}</p>
              </div>
            )}

            {/* Tabs */}
            {!drillPage && !searching && results.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {TABS.map(tab => {
                  const count = tab.id==="all" ? results.length : results.filter(r=>r.type===tab.id).length;
                  if (tab.id!=="all" && count===0) return null;
                  return (
                    <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
                      className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab===tab.id?"bg-primary text-primary-foreground":"bg-secondary text-muted-foreground hover:text-foreground"}`}>
                      {tab.label} <span className="opacity-60 text-xs ml-1">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {(searching||drillLoading) ? (
              <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary"/><span>جاري التحميل...</span>
              </div>
            ) : displayList.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">لا توجد نتائج</p>
            ) : (
              <div className="space-y-0.5">
                {displayList.map((item, i) => {
                  const key = item.type==="video" ? item.videoId : item.type==="playlist" ? item.playlistId : item.channelId;
                  return (
                    <motion.div key={key} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:i*0.02}}>

                      {/* ── فيديو ── */}
                      {item.type==="video" && (
                        <div className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-secondary/80 cursor-pointer transition-colors"
                          onClick={() => playVideo(item)}>
                          <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            <img src={item.thumbnail} alt="" className="w-full h-full object-cover"
                              onError={e=>{(e.target as HTMLImageElement).src="/placeholder.svg"}}/>
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              {loadingId===item.videoId ? <Loader2 className="h-6 w-6 text-white animate-spin"/> : <Play className="h-6 w-6 text-white fill-white"/>}
                            </div>
                            {item.lengthSeconds>0 && (
                              <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                                {formatDuration(item.lengthSeconds)}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1 py-0.5">
                            <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">{item.title}</p>
                            <p className="text-xs text-muted-foreground mt-1 truncate">{item.author}</p>
                            {item.viewCount>0 && <p className="text-xs text-muted-foreground/60 mt-0.5 flex items-center gap-1"><Eye className="h-3 w-3"/>{formatViews(item.viewCount)}</p>}
                          </div>
                          {/* زر إضافة للقائمة */}
                          <Button
                            variant={inQueue(item.videoId)||addedIds.has(item.videoId) ? "default" : "ghost"}
                            size="icon" className="h-8 w-8 flex-shrink-0 mt-1"
                            onClick={e => handleAddToQueue(item, e)}
                            title="أضف لقائمة التشغيل"
                          >
                            {addedIds.has(item.videoId) ? <CheckCheck className="h-4 w-4"/> : <Plus className="h-4 w-4"/>}
                          </Button>
                        </div>
                      )}

                      {/* ── قائمة ── */}
                      {item.type==="playlist" && (
                        <div className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/80 cursor-pointer" onClick={()=>openPlaylist(item)}>
                          <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            <img src={item.thumbnail} alt="" className="w-full h-full object-cover"/>
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><ListMusic className="h-6 w-6 text-white"/></div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground line-clamp-2">{item.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{item.channelTitle}</p>
                            <p className="text-xs text-primary mt-1">📋 اضغط لعرض الفيديوهات</p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0"/>
                        </div>
                      )}

                      {/* ── قناة ── */}
                      {item.type==="channel" && (
                        <div className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/80 cursor-pointer" onClick={()=>openChannel(item)}>
                          <div className="w-14 h-14 rounded-full overflow-hidden bg-muted flex-shrink-0 ring-2 ring-border flex items-center justify-center">
                            {item.thumbnail ? <img src={item.thumbnail} alt="" className="w-full h-full object-cover"/> : <User className="h-6 w-6 text-muted-foreground"/>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">{item.title}</p>
                            <p className="text-xs text-accent mt-0.5">👤 اضغط لعرض المحتوى</p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0"/>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="quick" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">ابحث بسرعة</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {QUICK.map((item,i) => (
                <motion.div key={item} initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} transition={{delay:i*0.04}}
                  className="relative overflow-hidden rounded-xl h-20 cursor-pointer hover:scale-[1.03] active:scale-[0.98] transition-transform"
                  style={{background:`linear-gradient(135deg,hsl(${(i*30+160)%360} 55% 22%),hsl(${(i*30+220)%360} 45% 14%))`}}
                  onClick={()=>{setQuery(item);doSearch(item);}}>
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
