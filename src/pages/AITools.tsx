/**
 * MeTube — AI Tools
 * Vision للمكفوفين + كلمات بدون key + ملخص شامل + توصيات + دردشة
 */
import { useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, BookOpen, Music, Sparkles, Volume2, VolumeX, Copy, CheckCheck, Send, Lightbulb, Play, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { describeVideoForBlind, fetchLyrics, getDetailedSummary, getMusicRecommendations, speakArabic, stopSpeaking, isSpeaking, askAI } from "@/lib/puterAI";
import { getVideoDetails } from "@/lib/youtube";
import { useNavigate } from "react-router-dom";

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
      {copied ? <CheckCheck className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
    </Button>
  );
}

function ResultBox({ text, dir = "rtl" }: { text: string; dir?: string }) {
  return (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      className="relative p-4 pt-8 rounded-xl bg-secondary/60 text-sm leading-relaxed whitespace-pre-wrap" dir={dir}>
      <div className="absolute top-2 left-2"><CopyBtn text={text} /></div>
      <p className={dir === "rtl" ? "font-arabic text-foreground" : "text-foreground"}>{text}</p>
    </motion.div>
  );
}

function LoadingDots({ label }: { label: string }) {
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="flex items-center gap-2 text-xs text-muted-foreground py-3">
      <div className="flex gap-1">{[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</div>
      {label}
    </motion.div>
  );
}

export default function AITools() {
  const { currentTrack } = usePlayer();
  const navigate = useNavigate();

  // Vision
  const [vision, setVision]           = useState<any>(null);
  const [visionLoading, setVL]        = useState(false);
  const [videoType, setVideoType]     = useState<"sports"|"educational"|"general">("general");
  const [speaking, setSpeaking]       = useState(false);

  // Summary
  const [summary, setSummary]         = useState("");
  const [summaryLoading, setSL]       = useState(false);

  // Lyrics
  const [lyrics, setLyrics]           = useState<any>(null);
  const [lyricsLoading, setLL]        = useState(false);
  const [activeLine, setActiveLine]   = useState(-1);

  // Recommendations
  const [recQuery, setRecQuery]       = useState("");
  const [recResult, setRecResult]     = useState<any>(null);
  const [recLoading, setRL]           = useState(false);

  // Chat
  const [chatInput, setChatInput]     = useState("");
  const [chatHistory, setChatHistory] = useState<{role:"user"|"ai";text:string}[]>([]);
  const [chatLoading, setCL]          = useState(false);

  const noTrack = !currentTrack;

  // ── Vision ────────────────────────────────────────────────────────────────
  const handleVision = async () => {
    if (noTrack) { toast.error("شغّل مقطعاً أولاً"); return; }
    setVL(true); setVision(null);
    try {
      // جيب الـ description الكامل من YouTube API
      const details = await getVideoDetails(currentTrack.id);
      const desc = details?.description || currentTrack.description || "";
      const result = await describeVideoForBlind(currentTrack.id, currentTrack.title, desc, videoType);
      setVision(result);
    } catch (e: any) { toast.error(e.message); }
    finally { setVL(false); }
  };

  const handleSpeakVision = () => {
    if (!vision) return;
    if (isSpeaking()) { stopSpeaking(); setSpeaking(false); return; }
    const text = `${vision.overall}. ${vision.scenes.map((s:any) => `${s.time}: ${s.description}`).join(". ")}. ${vision.audioHints}`;
    speakArabic(text, 0.8);
    setSpeaking(true);
    const c = setInterval(() => { if (!isSpeaking()) { setSpeaking(false); clearInterval(c); } }, 500);
  };

  // ── Summary ───────────────────────────────────────────────────────────────
  const handleSummary = async () => {
    if (noTrack) { toast.error("شغّل مقطعاً أولاً"); return; }
    setSL(true); setSummary("");
    try {
      const details = await getVideoDetails(currentTrack.id);
      const result = await getDetailedSummary(
        currentTrack.title,
        details?.description || "",
        videoType
      );
      setSummary(result);
    } catch (e: any) { toast.error(e.message); }
    finally { setSL(false); }
  };

  // ── Lyrics ────────────────────────────────────────────────────────────────
  const handleLyrics = async () => {
    if (noTrack) { toast.error("شغّل أغنية أولاً"); return; }
    setLL(true); setLyrics(null);
    try {
      const result = await fetchLyrics(currentTrack.title, currentTrack.artist || "");
      setLyrics(result);
    } catch (e: any) { toast.error(e.message); }
    finally { setLL(false); }
  };

  // ── Recommendations ───────────────────────────────────────────────────────
  const handleRecommend = async () => {
    if (!recQuery.trim()) return;
    setRL(true); setRecResult(null);
    try { setRecResult(await getMusicRecommendations(recQuery)); }
    catch (e: any) { toast.error(e.message); }
    finally { setRL(false); }
  };

  // ── Chat ──────────────────────────────────────────────────────────────────
  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim(); setChatInput("");
    setChatHistory(h => [...h, { role:"user", text:msg }]);
    setCL(true);
    try {
      const ctx = chatHistory.slice(-6).map(m => `${m.role==="user"?"المستخدم":"AI"}: ${m.text}`).join("\n");
      const reply = await askAI(`${ctx}\nالمستخدم: ${msg}\nأنت مساعد موسيقي. رد بإيجاز بالعربية.`);
      setChatHistory(h => [...h, { role:"ai", text:reply }]);
    } catch (e: any) { toast.error(e.message); }
    finally { setCL(false); }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" /> أدوات الذكاء الاصطناعي
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Puter.js — مجاني بالكامل بدون API key</p>
      </div>

      {/* المقطع الحالي */}
      {currentTrack ? (
        <Card className="bg-card border-primary/20">
          <CardContent className="flex items-center gap-3 py-3 px-4">
            <div className="w-10 h-10 rounded overflow-hidden bg-secondary flex-shrink-0">
              {currentTrack.coverUrl && <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover"/>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{currentTrack.title}</p>
              <p className="text-xs text-muted-foreground">{currentTrack.artist}</p>
            </div>
            {/* نوع المحتوى */}
            <div className="flex gap-1">
              {(["sports","educational","general"] as const).map(t => (
                <button key={t} onClick={() => setVideoType(t)}
                  className={`text-xs px-2 py-1 rounded-full transition-colors ${videoType===t?"bg-primary text-primary-foreground":"bg-secondary text-muted-foreground"}`}>
                  {t==="sports"?"⚽":t==="educational"?"📚":"🎵"}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="py-4 text-center text-sm text-muted-foreground">شغّل مقطعاً لاستخدام الـ AI</CardContent>
        </Card>
      )}

      <Tabs defaultValue="vision">
        <TabsList className="bg-secondary w-full grid grid-cols-5 text-[11px]">
          <TabsTrigger value="vision"    className="gap-1"><Eye className="h-3 w-3"/>وصف</TabsTrigger>
          <TabsTrigger value="summary"   className="gap-1"><BookOpen className="h-3 w-3"/>ملخص</TabsTrigger>
          <TabsTrigger value="lyrics"    className="gap-1"><Music className="h-3 w-3"/>كلمات</TabsTrigger>
          <TabsTrigger value="recommend" className="gap-1"><Lightbulb className="h-3 w-3"/>توصيات</TabsTrigger>
          <TabsTrigger value="chat"      className="gap-1"><Sparkles className="h-3 w-3"/>دردشة</TabsTrigger>
        </TabsList>

        {/* ── Vision للمكفوفين ── */}
        <TabsContent value="vision" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary"/> وصف المشاهد للمكفوفين
              </CardTitle>
              <CardDescription className="text-xs">
                يحلل 4 مشاهد من الفيديو بـ GPT-4o Vision ويصفها بالعربية
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button onClick={handleVision} disabled={noTrack||visionLoading} className="gap-2 flex-1">
                  {visionLoading ? <><Loader2 className="h-4 w-4 animate-spin"/>جاري التحليل...</> : <><Eye className="h-4 w-4"/>صف المشاهد</>}
                </Button>
                {vision && (
                  <Button variant="outline" size="icon" className="w-10 h-10" onClick={handleSpeakVision}>
                    {speaking ? <VolumeX className="h-4 w-4 text-primary"/> : <Volume2 className="h-4 w-4"/>}
                  </Button>
                )}
              </div>
              <AnimatePresence>
                {visionLoading && <LoadingDots label="GPT-4o يحلل مشاهد الفيديو..."/>}
                {vision && (
                  <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-3">
                    {/* الوصف العام */}
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-sm font-arabic" dir="rtl">
                      <p className="font-medium text-primary text-xs mb-1">📌 نظرة عامة</p>
                      <p className="text-foreground">{vision.overall}</p>
                    </div>
                    {/* المشاهد */}
                    <div className="space-y-2">
                      {vision.scenes?.map((s: any, i: number) => (
                        <div key={i} className="p-3 rounded-xl bg-secondary/60 text-sm font-arabic" dir="rtl">
                          <p className="text-xs text-primary font-medium mb-1">🎬 {s.time}</p>
                          <p className="text-foreground leading-relaxed">{s.description}</p>
                        </div>
                      ))}
                    </div>
                    {/* التلميحات الصوتية */}
                    <div className="p-3 rounded-xl bg-secondary/40 text-sm font-arabic" dir="rtl">
                      <p className="text-xs text-muted-foreground mb-1">🔊 ما تسمعه</p>
                      <p className="text-foreground">{vision.audioHints}</p>
                    </div>
                    {/* ملخص إمكانية الوصول */}
                    <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 text-sm font-arabic" dir="rtl">
                      <p className="text-xs text-accent mb-1">♿ ملخص سريع</p>
                      <p className="text-foreground font-medium">{vision.accessSummary}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ملخص شامل ── */}
        <TabsContent value="summary" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display">ملخص تعليمي شامل</CardTitle>
              <CardDescription className="text-xs">تحليل مفصّل بالعربية مع نقاط ودروس</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={handleSummary} disabled={noTrack||summaryLoading} className="gap-2 w-full">
                {summaryLoading ? <><Loader2 className="h-4 w-4 animate-spin"/>جاري التحليل...</> : <><BookOpen className="h-4 w-4"/>اطلب الملخص الشامل</>}
              </Button>
              <AnimatePresence>
                {summaryLoading && <LoadingDots label="Puter AI يحلل المحتوى..."/>}
                {summary && <ResultBox text={summary}/>}
              </AnimatePresence>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── كلمات الأغنية ── */}
        <TabsContent value="lyrics" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display">كلمات الأغنية</CardTitle>
              <CardDescription className="text-xs">
                يبحث في lrclib + lyrics.ovh (مجاني) ثم Puter AI كـ fallback
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={handleLyrics} disabled={noTrack||lyricsLoading} variant="outline" className="gap-2 w-full">
                {lyricsLoading ? <><Loader2 className="h-4 w-4 animate-spin"/>جاري البحث...</> : <><Music className="h-4 w-4"/>اجلب الكلمات</>}
              </Button>
              <AnimatePresence>
                {lyricsLoading && <LoadingDots label="جاري البحث في قواعد بيانات الكلمات..."/>}
                {lyrics && (
                  <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">المصدر: <span className="text-primary">{lyrics.source}</span></span>
                      {lyrics.synced && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">⏱ متزامن</span>}
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/60 text-sm max-h-80 overflow-y-auto" dir="auto">
                      {lyrics.synced ? (
                        // كلمات متزامنة مع الوقت
                        <div className="space-y-1">
                          {lyrics.synced.map((line: any, i: number) => (
                            <p key={i} className={`py-0.5 px-2 rounded transition-colors ${i === activeLine ? "bg-primary/20 text-primary font-medium" : "text-foreground"}`}>
                              {line.text || "♪"}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-foreground whitespace-pre-wrap leading-relaxed">{lyrics.lyrics}</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── توصيات ── */}
        <TabsContent value="recommend" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display">توصيات ذكية</CardTitle>
              <CardDescription className="text-xs">اضغط ▶ على أي نتيجة للبحث عنها مباشرة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder="مثال: أغاني هادئة لعمرو دياب" value={recQuery}
                  onChange={e=>setRecQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleRecommend()}
                  className="bg-secondary border-border text-sm h-10" dir="auto"/>
                <Button size="icon" className="h-10 w-10" onClick={handleRecommend} disabled={!recQuery.trim()||recLoading}>
                  {recLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {["أغاني حب هادئة","Lofi للمذاكرة","أفضل محمد حماقي","ميسي هدافات 2024"].map(ex=>(
                  <button key={ex} onClick={()=>{setRecQuery(ex);setTimeout(handleRecommend,100);}}
                    className="text-xs px-3 py-1 rounded-full bg-secondary text-muted-foreground hover:text-foreground">{ex}</button>
                ))}
              </div>
              <AnimatePresence>
                {recResult && (
                  <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-2">
                    <p className="text-xs text-muted-foreground font-arabic" dir="rtl">{recResult.explanation}</p>
                    {recResult.titles.map((title: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/60 hover:bg-secondary transition-colors">
                        <span className="text-xs text-primary w-5">{i+1}.</span>
                        <p className="text-sm text-foreground flex-1 truncate" dir="auto">{title}</p>
                        <Button size="icon" variant="ghost" className="h-7 w-7"
                          onClick={()=>navigate(`/search?q=${encodeURIComponent(title)}`)}>
                          <Play className="h-3.5 w-3.5 text-primary"/>
                        </Button>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── دردشة ── */}
        <TabsContent value="chat" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary"/> مساعد موسيقي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {chatHistory.length===0 && <p className="text-xs text-muted-foreground text-center py-4">اسأل عن أي شيء موسيقي أو رياضي...</p>}
                {chatHistory.map((msg,i)=>(
                  <div key={i} className={`flex ${msg.role==="user"?"justify-end":"justify-start"}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${msg.role==="user"?"bg-primary text-primary-foreground rounded-br-sm":"bg-secondary text-foreground rounded-bl-sm font-arabic"}`} dir="auto">
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-secondary px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1">
                      {[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Input placeholder="اسأل..." value={chatInput} onChange={e=>setChatInput(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&handleChat()}
                  className="bg-secondary border-border text-sm h-10" dir="auto" disabled={chatLoading}/>
                <Button size="icon" className="h-10 w-10" onClick={handleChat} disabled={!chatInput.trim()||chatLoading}>
                  {chatLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
