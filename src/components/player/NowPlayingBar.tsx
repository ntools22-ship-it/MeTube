import { useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle, Volume2, VolumeX, Volume1, ChevronDown, ChevronUp, Timer, Gauge, Clock, ListMusic, Trash2, GripVertical, X } from "lucide-react";
import { formatDuration } from "@/lib/youtube";
import { toast } from "sonner";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
type Tab = "player" | "queue";

export default function NowPlayingBar() {
  const {
    currentTrack, isPlaying, currentTime, duration, volume, isMuted,
    toggle, seek, setVolume, toggleMute, next, previous,
    repeatMode, toggleRepeat, isShuffled, toggleShuffle,
    queue, queueIndex, addToQueue, removeFromQueue, moveInQueue, clearQueue, play,
    playbackRate, setPlaybackRate,
    sleepRemainingSeconds, startSleepTimer, cancelSleepTimer,
  } = usePlayer();

  const [expanded,    setExpanded]    = useState(false);
  const [activeTab,   setActiveTab]   = useState<Tab>("player");
  const [sleepInput,  setSleepInput]  = useState("");
  const [seekInput,   setSeekInput]   = useState("");
  const [dragIndex,   setDragIndex]   = useState<number | null>(null);

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const progress   = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSleep = () => {
    const mins = parseInt(sleepInput);
    if (!mins || mins <= 0) { toast.error("أدخل عدد دقائق"); return; }
    startSleepTimer(mins);
    toast.success(`⏰ سيتوقف بعد ${mins} دقيقة — حتى لو تغيّر المقطع`);
    setSleepInput("");
  };

  const handleSeekTo = () => {
    const parts = seekInput.trim().split(":").map(Number);
    let s = 0;
    if (parts.length === 2) s = parts[0]*60 + parts[1];
    else if (parts.length === 3) s = parts[0]*3600 + parts[1]*60 + parts[2];
    else s = parseInt(seekInput) || 0;
    if (s >= 0 && s <= duration) { seek(s); toast.success(`⏩ ${formatDuration(s)}`); }
    else toast.error("وقت غير صحيح");
    setSeekInput("");
  };

  // Drag & Drop للقائمة
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== idx) moveInQueue(dragIndex, idx);
    setDragIndex(idx);
  };

  return (
    <>
      {/* ── شريط مصغّر ──────────────────────────────────────────────────── */}
      <motion.div initial={{ y: 80 }} animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border">

        {/* شريط التقدم */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-muted cursor-pointer group"
          onClick={e => { const r = e.currentTarget.getBoundingClientRect(); seek((e.clientX-r.left)/r.width*duration); }}>
          <div className="h-full bg-primary transition-all relative" style={{ width:`${progress}%` }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100"/>
          </div>
        </div>

        {/* مؤشر مؤقت النوم */}
        {sleepRemainingSeconds !== null && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-yellow-500/30">
            <div className="h-full bg-yellow-500 transition-all" style={{ width:`${(sleepRemainingSeconds / (sleepRemainingSeconds + 1)) * 100}%` }}/>
          </div>
        )}

        <div className="flex items-center h-[72px] px-3 gap-2">
          {/* معلومات الأغنية */}
          <div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer" onClick={() => setExpanded(e => !e)}>
            <div className={`w-12 h-12 rounded-md bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0 ${isPlaying?"ring-2 ring-primary/50":""}`}>
              {currentTrack?.coverUrl ? <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover"/> : <span className="text-lg">🎵</span>}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{currentTrack?.title || "لا يوجد مقطع"}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground truncate">{currentTrack?.artist || ""}</p>
                {duration > 0 && <span className="text-xs text-muted-foreground/60 flex-shrink-0">{formatDuration(Math.floor(currentTime))}/{formatDuration(Math.floor(duration))}</span>}
              </div>
            </div>
          </div>

          {/* أزرار التشغيل */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={previous}><SkipBack className="h-4 w-4"/></Button>
            <Button size="icon" className="h-9 w-9 rounded-full bg-foreground text-background hover:scale-105 transition-transform" onClick={toggle}>
              {isPlaying ? <Pause className="h-4 w-4"/> : <Play className="h-4 w-4 ml-0.5"/>}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={next}><SkipForward className="h-4 w-4"/></Button>
          </div>

          {/* أيقونة القائمة + المؤقت */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {sleepRemainingSeconds !== null && (
              <span className="text-xs text-yellow-500 font-mono hidden sm:block">
                {formatDuration(sleepRemainingSeconds)}
              </span>
            )}
            {queue.length > 0 && (
              <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">{queue.length}</span>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpanded(e => !e)}>
              {expanded ? <ChevronDown className="h-4 w-4"/> : <ChevronUp className="h-4 w-4"/>}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── لوحة موسّعة ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity:0, y:"100%" }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:"100%" }}
            transition={{ type:"spring", damping:30, stiffness:300 }}
            className="fixed inset-0 z-40 bg-background/97 backdrop-blur-xl flex flex-col"
            style={{ paddingBottom:"80px" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4">
              <Button variant="ghost" size="icon" onClick={() => setExpanded(false)}><ChevronDown className="h-5 w-5"/></Button>
              {/* Tabs */}
              <div className="flex bg-secondary rounded-full p-1 gap-1">
                <button onClick={() => setActiveTab("player")}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab==="player"?"bg-background text-foreground shadow":"text-muted-foreground"}`}>
                  المقطع
                </button>
                <button onClick={() => setActiveTab("queue")}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${activeTab==="queue"?"bg-background text-foreground shadow":"text-muted-foreground"}`}>
                  <ListMusic className="h-3.5 w-3.5"/> القائمة
                  {queue.length > 0 && <span className="bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">{queue.length}</span>}
                </button>
              </div>
              <div className="w-9"/>
            </div>

            <div className="flex-1 overflow-y-auto px-5 space-y-5">

              {/* ══ تبويب المقطع ══════════════════════════════════════════ */}
              {activeTab === "player" && (
                <>
                  {/* Thumbnail */}
                  <div className="flex flex-col items-center gap-3">
                    <div className={`w-44 h-44 rounded-2xl overflow-hidden bg-secondary shadow-2xl ${isPlaying?"ring-4 ring-primary/40":""}`}>
                      {currentTrack?.coverUrl ? <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-5xl">🎵</div>}
                    </div>
                    <div className="text-center w-full">
                      <p className="font-display font-bold text-foreground text-base leading-snug">{currentTrack?.title || "لا يوجد مقطع"}</p>
                      <p className="text-muted-foreground text-sm mt-0.5">{currentTrack?.artist || ""}</p>
                    </div>
                  </div>

                  {/* Seek bar */}
                  <div className="space-y-1.5">
                    <Slider value={[currentTime]} max={duration||100} step={1} onValueChange={([v]) => seek(v)} className="w-full"/>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatDuration(Math.floor(currentTime))}</span>
                      <span className="text-primary font-medium">{formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}</span>
                      <span>{formatDuration(Math.floor(duration))}</span>
                    </div>
                  </div>

                  {/* أزرار كاملة */}
                  <div className="flex items-center justify-center gap-3">
                    <Button variant="ghost" size="icon" className="h-10 w-10" onClick={toggleShuffle}><Shuffle className={`h-5 w-5 ${isShuffled?"text-primary":"text-muted-foreground"}`}/></Button>
                    <Button variant="ghost" size="icon" className="h-11 w-11" onClick={previous}><SkipBack className="h-6 w-6"/></Button>
                    <Button size="icon" className="h-14 w-14 rounded-full bg-foreground text-background hover:scale-105 shadow-lg" onClick={toggle}>
                      {isPlaying ? <Pause className="h-7 w-7"/> : <Play className="h-7 w-7 ml-0.5"/>}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-11 w-11" onClick={next}><SkipForward className="h-6 w-6"/></Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10" onClick={toggleRepeat}>
                      {repeatMode==="one" ? <Repeat1 className="h-5 w-5 text-primary"/> : <Repeat className={`h-5 w-5 ${repeatMode==="all"?"text-primary":"text-muted-foreground"}`}/>}
                    </Button>
                  </div>

                  {/* Volume */}
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleMute}><VolumeIcon className="h-4 w-4"/></Button>
                    <Slider value={[isMuted?0:volume*100]} max={100} step={1} onValueChange={([v]) => setVolume(v/100)} className="flex-1"/>
                    <span className="text-xs text-muted-foreground w-8 text-right">{Math.round(isMuted?0:volume*100)}%</span>
                  </div>

                  {/* سرعة التشغيل */}
                  <div className="bg-secondary/50 rounded-2xl p-4 space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2"><Gauge className="h-4 w-4 text-primary"/> السرعة</p>
                    <div className="flex gap-2 flex-wrap">
                      {SPEEDS.map(s => (
                        <button key={s} onClick={() => { setPlaybackRate(s); toast.success(`${s}×`); }}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${playbackRate===s?"bg-primary text-primary-foreground":"bg-secondary text-muted-foreground hover:text-foreground"}`}>
                          {s}×
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* انتقال لوقت محدد */}
                  <div className="bg-secondary/50 rounded-2xl p-4 space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4 text-accent"/> انتقل لوقت محدد</p>
                    <div className="flex gap-2">
                      <Input placeholder="3:45 أو 225" value={seekInput} onChange={e => setSeekInput(e.target.value)}
                        onKeyDown={e => e.key==="Enter" && handleSeekTo()}
                        className="bg-secondary border-border h-10 text-sm flex-1" dir="ltr"/>
                      <Button onClick={handleSeekTo} size="sm" className="h-10 px-4">انتقل</Button>
                    </div>
                  </div>

                  {/* مؤقت الإيقاف */}
                  <div className="bg-secondary/50 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium flex items-center gap-2"><Timer className="h-4 w-4 text-yellow-500"/> مؤقت الإيقاف</p>
                      {sleepRemainingSeconds !== null && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-yellow-500 font-mono">يتوقف بعد {formatDuration(sleepRemainingSeconds)}</span>
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={cancelSleepTimer}>إلغاء</Button>
                        </div>
                      )}
                    </div>

                    {sleepRemainingSeconds === null ? (
                      <>
                        <div className="flex gap-2">
                          <Input placeholder="عدد الدقائق..." value={sleepInput} type="number" min="1" max="360"
                            onChange={e => setSleepInput(e.target.value)}
                            onKeyDown={e => e.key==="Enter" && handleSleep()}
                            className="bg-secondary border-border h-10 text-sm flex-1"/>
                          <Button onClick={handleSleep} size="sm" className="h-10 px-4">تم</Button>
                        </div>
                        <div className="flex gap-2">
                          {[15,30,45,60].map(m => (
                            <button key={m} onClick={() => { startSleepTimer(m); toast.success(`⏰ سيتوقف بعد ${m} دقيقة`); }}
                              className="flex-1 py-1.5 rounded-xl text-xs bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors">
                              {m}د
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">⚡ المؤقت يستمر حتى لو انتقلت لمقطع آخر</p>
                      </>
                    ) : (
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500 transition-all rounded-full"
                          style={{ width:`${Math.min(100, (sleepRemainingSeconds / 3600) * 100)}%` }}/>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ══ تبويب القائمة ══════════════════════════════════════════ */}
              {activeTab === "queue" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{queue.length} مقطع في القائمة</p>
                    {queue.length > 0 && (
                      <Button variant="ghost" size="sm" className="text-xs text-destructive gap-1" onClick={clearQueue}>
                        <Trash2 className="h-3.5 w-3.5"/> مسح الكل
                      </Button>
                    )}
                  </div>

                  {queue.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <ListMusic className="h-10 w-10 mx-auto mb-3 opacity-30"/>
                      <p className="text-sm">القائمة فارغة</p>
                      <p className="text-xs mt-1">اضغط "+" على أي فيديو في البحث لإضافته</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {queue.map((track, i) => (
                        <div
                          key={`${track.id}-${i}`}
                          draggable
                          onDragStart={() => setDragIndex(i)}
                          onDragOver={e => handleDragOver(e, i)}
                          onDragEnd={() => setDragIndex(null)}
                          className={`flex items-center gap-2 p-2.5 rounded-xl transition-colors cursor-pointer
                            ${i === queueIndex ? "bg-primary/10 border border-primary/20" : "hover:bg-secondary/80"}
                            ${dragIndex === i ? "opacity-50" : ""}`}
                          onClick={() => play(track)}
                        >
                          {/* رقم/أيقونة */}
                          <div className="w-6 flex items-center justify-center flex-shrink-0">
                            {i === queueIndex && isPlaying
                              ? <div className="flex gap-0.5">{[0,1,2].map(j=><div key={j} className="w-0.5 bg-primary rounded-full animate-bounce" style={{height:"10px",animationDelay:`${j*0.15}s`}}/>)}</div>
                              : <span className="text-xs text-muted-foreground">{i+1}</span>}
                          </div>

                          {/* Thumbnail */}
                          <div className="w-10 h-8 rounded overflow-hidden bg-muted flex-shrink-0">
                            {track.coverUrl && <img src={track.coverUrl} alt="" className="w-full h-full object-cover"/>}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm truncate leading-snug ${i===queueIndex?"text-primary font-medium":"text-foreground"}`}>{track.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                          </div>

                          {/* Drag + Delete */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <GripVertical className="h-4 w-4 text-muted-foreground/40 cursor-grab"/>
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                              onClick={e => { e.stopPropagation(); removeFromQueue(i); }}>
                              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive"/>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
