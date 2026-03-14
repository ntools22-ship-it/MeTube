import { useState, useRef, useEffect } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle,
  Volume2, VolumeX, Volume1, ChevronDown, ChevronUp,
  Timer, Gauge, Clock
} from "lucide-react";
import { formatDuration } from "@/lib/youtube";
import { toast } from "sonner";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export default function NowPlayingBar() {
  const {
    currentTrack, isPlaying, currentTime, duration, volume, isMuted,
    toggle, seek, setVolume, toggleMute, next, previous,
    repeatMode, toggleRepeat, isShuffled, toggleShuffle,
  } = usePlayer();

  const playerRef = useRef<any>(null); // YT.Player ref via window
  const [expanded, setExpanded] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [sleepMinutes, setSleepMinutes] = useState("");
  const [sleepTimer, setSleepTimer] = useState<ReturnType<typeof setTimeout>|null>(null);
  const [sleepRemaining, setSleepRemaining] = useState<number|null>(null);
  const sleepInterval = useRef<ReturnType<typeof setInterval>>();
  const [seekInput, setSeekInput] = useState("");

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  // تغيير سرعة التشغيل عبر YT player
  const changeSpeed = (s: number) => {
    setSpeed(s);
    // الـ YT player موجود في window عبر الـ iframe
    const iframes = document.querySelectorAll("iframe[src*='youtube']");
    // نستخدم postMessage للـ IFrame
    try {
      const ytPlayer = (window as any).__ytPlayer;
      if (ytPlayer?.setPlaybackRate) { ytPlayer.setPlaybackRate(s); toast.success(`السرعة: ${s}×`); }
    } catch { toast.info(`السرعة ${s}× — ستُطبَّق عند الضغط على الـ player`); }
  };

  // مؤقت النوم
  const startSleepTimer = () => {
    const mins = parseInt(sleepMinutes);
    if (!mins || mins <= 0) { toast.error("أدخل عدد دقائق صحيح"); return; }
    if (sleepTimer) clearTimeout(sleepTimer);
    clearInterval(sleepInterval.current);
    const ms = mins * 60 * 1000;
    setSleepRemaining(mins * 60);
    const t = setTimeout(() => {
      // pause via toggle
      document.dispatchEvent(new CustomEvent("metube:sleep"));
      setSleepRemaining(null);
      toast.info("⏰ انتهى المؤقت — تم إيقاف التشغيل");
    }, ms);
    setSleepTimer(t);
    sleepInterval.current = setInterval(() => {
      setSleepRemaining(r => r !== null && r > 0 ? r - 1 : null);
    }, 1000);
    toast.success(`⏰ سيتوقف التشغيل بعد ${mins} دقيقة`);
  };

  const cancelSleep = () => {
    if (sleepTimer) clearTimeout(sleepTimer);
    clearInterval(sleepInterval.current);
    setSleepTimer(null); setSleepRemaining(null);
    toast.info("تم إلغاء المؤقت");
  };

  // الاستماع لحدث النوم
  useEffect(() => {
    const handler = () => { if (isPlaying) toggle(); };
    document.addEventListener("metube:sleep", handler);
    return () => document.removeEventListener("metube:sleep", handler);
  }, [isPlaying, toggle]);

  // الانتقال لدقيقة محددة
  const handleSeekToTime = () => {
    const parts = seekInput.trim().split(":").map(Number);
    let seconds = 0;
    if (parts.length === 2) seconds = parts[0]*60 + parts[1];
    else if (parts.length === 3) seconds = parts[0]*3600 + parts[1]*60 + parts[2];
    else seconds = parseInt(seekInput) || 0;
    if (seconds >= 0 && seconds <= duration) { seek(seconds); toast.success(`⏩ انتقلت لـ ${formatDuration(seconds)}`); }
    else toast.error("وقت غير صحيح");
    setSeekInput("");
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* ── الشريط المصغّر ─────────────────────────────────────────── */}
      <motion.div initial={{y:80}} animate={{y:0}}
        className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border">

        {/* شريط التقدم القابل للنقر */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-muted cursor-pointer group"
          onClick={e => { const r = e.currentTarget.getBoundingClientRect(); seek((e.clientX-r.left)/r.width*duration); }}>
          <div className="h-full bg-primary transition-all relative" style={{width:`${progress}%`}}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity"/>
          </div>
        </div>

        <div className="flex items-center h-[72px] px-3 gap-2">
          {/* معلومات الأغنية */}
          <div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer" onClick={() => setExpanded(e => !e)}>
            <div className={`w-12 h-12 rounded-md bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0 ${isPlaying?"ring-2 ring-primary/50":""}`}>
              {currentTrack?.coverUrl
                ? <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover"/>
                : <span className="text-lg">🎵</span>}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{currentTrack?.title || "لا يوجد مقطع"}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground truncate">{currentTrack?.artist || ""}</p>
                {duration > 0 && (
                  <span className="text-xs text-muted-foreground/60 flex-shrink-0">
                    {formatDuration(Math.floor(currentTime))}/{formatDuration(Math.floor(duration))}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* أزرار التحكم */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={previous}>
              <SkipBack className="h-4 w-4"/>
            </Button>
            <Button size="icon" className="h-9 w-9 rounded-full bg-foreground text-background hover:scale-105 transition-transform" onClick={toggle}>
              {isPlaying ? <Pause className="h-4 w-4"/> : <Play className="h-4 w-4 ml-0.5"/>}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={next}>
              <SkipForward className="h-4 w-4"/>
            </Button>
          </div>

          {/* زر التوسيع */}
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setExpanded(e => !e)}>
            {expanded ? <ChevronDown className="h-4 w-4"/> : <ChevronUp className="h-4 w-4"/>}
          </Button>
        </div>
      </motion.div>

      {/* ── اللوحة الموسّعة ─────────────────────────────────────────── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{opacity:0, y:"100%"}} animate={{opacity:1, y:0}} exit={{opacity:0, y:"100%"}}
            transition={{type:"spring", damping:30, stiffness:300}}
            className="fixed inset-0 z-40 bg-background/95 backdrop-blur-xl flex flex-col overflow-y-auto"
            style={{paddingBottom:"88px"}}
          >
            {/* زر الإغلاق */}
            <div className="flex items-center justify-between p-4 pt-safe">
              <Button variant="ghost" size="icon" onClick={() => setExpanded(false)}>
                <ChevronDown className="h-5 w-5"/>
              </Button>
              <p className="text-sm font-medium text-muted-foreground">المقطع الحالي</p>
              <div className="w-9"/>
            </div>

            <div className="flex-1 px-6 space-y-6">
              {/* Thumbnail + info */}
              <div className="flex flex-col items-center gap-4">
                <div className={`w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden bg-secondary shadow-2xl ${isPlaying?"ring-4 ring-primary/40":""}`}>
                  {currentTrack?.coverUrl
                    ? <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover"/>
                    : <div className="w-full h-full flex items-center justify-center text-6xl">🎵</div>}
                </div>
                <div className="text-center w-full">
                  {/* العنوان كامل */}
                  <p className="font-display font-bold text-foreground text-lg leading-snug">{currentTrack?.title || "لا يوجد مقطع"}</p>
                  <p className="text-muted-foreground text-sm mt-1">{currentTrack?.artist || ""}</p>
                </div>
              </div>

              {/* Seek bar + وقت */}
              <div className="space-y-2">
                <Slider value={[currentTime]} max={duration||100} step={1}
                  onValueChange={([v]) => seek(v)} className="w-full"/>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatDuration(Math.floor(currentTime))}</span>
                  <span className="text-primary font-medium">
                    {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}
                  </span>
                  <span>{formatDuration(Math.floor(duration))}</span>
                </div>
              </div>

              {/* أزرار التحكم الكاملة */}
              <div className="flex items-center justify-center gap-3">
                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={toggleShuffle}>
                  <Shuffle className={`h-5 w-5 ${isShuffled?"text-primary":"text-muted-foreground"}`}/>
                </Button>
                <Button variant="ghost" size="icon" className="h-11 w-11" onClick={previous}>
                  <SkipBack className="h-6 w-6"/>
                </Button>
                <Button size="icon" className="h-14 w-14 rounded-full bg-foreground text-background hover:scale-105 transition-transform shadow-lg" onClick={toggle}>
                  {isPlaying ? <Pause className="h-7 w-7"/> : <Play className="h-7 w-7 ml-0.5"/>}
                </Button>
                <Button variant="ghost" size="icon" className="h-11 w-11" onClick={next}>
                  <SkipForward className="h-6 w-6"/>
                </Button>
                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={toggleRepeat}>
                  {repeatMode==="one" ? <Repeat1 className="h-5 w-5 text-primary"/> : <Repeat className={`h-5 w-5 ${repeatMode==="all"?"text-primary":"text-muted-foreground"}`}/>}
                </Button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={toggleMute}>
                  <VolumeIcon className="h-4 w-4"/>
                </Button>
                <Slider value={[isMuted?0:volume*100]} max={100} step={1}
                  onValueChange={([v]) => setVolume(v/100)} className="flex-1"/>
                <span className="text-xs text-muted-foreground w-8 text-right">{Math.round(isMuted?0:volume*100)}%</span>
              </div>

              {/* ── سرعة التشغيل ── */}
              <div className="bg-secondary/50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Gauge className="h-4 w-4 text-primary"/> سرعة التشغيل
                </div>
                <div className="flex gap-2 flex-wrap">
                  {SPEEDS.map(s => (
                    <button key={s} onClick={() => changeSpeed(s)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${speed===s?"bg-primary text-primary-foreground":"bg-secondary text-muted-foreground hover:text-foreground"}`}>
                      {s}×
                    </button>
                  ))}
                </div>
              </div>

              {/* ── الانتقال لدقيقة محددة ── */}
              <div className="bg-secondary/50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Clock className="h-4 w-4 text-accent"/> الانتقال لوقت محدد
                </div>
                <div className="flex gap-2">
                  <Input placeholder="مثال: 3:45 أو 125" value={seekInput}
                    onChange={e => setSeekInput(e.target.value)}
                    onKeyDown={e => e.key==="Enter" && handleSeekToTime()}
                    className="bg-secondary border-border h-10 text-sm flex-1" dir="ltr"/>
                  <Button onClick={handleSeekToTime} size="sm" className="h-10 px-4">انتقل</Button>
                </div>
                {duration > 0 && (
                  <p className="text-xs text-muted-foreground">المدة الكلية: {formatDuration(Math.floor(duration))}</p>
                )}
              </div>

              {/* ── مؤقت النوم ── */}
              <div className="bg-secondary/50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Timer className="h-4 w-4 text-yellow-500"/> مؤقت الإيقاف
                  {sleepRemaining !== null && (
                    <span className="mr-auto text-xs text-yellow-500 font-mono">
                      يتوقف بعد {formatDuration(sleepRemaining)}
                    </span>
                  )}
                </div>
                {sleepRemaining === null ? (
                  <div className="flex gap-2">
                    <Input placeholder="عدد الدقائق (مثال: 30)" value={sleepMinutes} type="number" min="1" max="360"
                      onChange={e => setSleepMinutes(e.target.value)}
                      onKeyDown={e => e.key==="Enter" && startSleepTimer()}
                      className="bg-secondary border-border h-10 text-sm flex-1"/>
                    <Button onClick={startSleepTimer} size="sm" className="h-10 px-4">تم</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-yellow-500/20 rounded-full h-2">
                      <div className="bg-yellow-500 h-2 rounded-full transition-all"
                        style={{width:`${(sleepRemaining/(parseInt(sleepMinutes||"1")*60))*100}%`}}/>
                    </div>
                    <Button variant="ghost" size="sm" onClick={cancelSleep} className="text-xs text-muted-foreground h-8">إلغاء</Button>
                  </div>
                )}
                {/* أزرار سريعة */}
                {sleepRemaining === null && (
                  <div className="flex gap-2">
                    {[15,30,45,60].map(m => (
                      <button key={m} onClick={() => { setSleepMinutes(String(m)); setTimeout(startSleepTimer, 0); }}
                        className="px-3 py-1 rounded-full text-xs bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                        {m}د
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
