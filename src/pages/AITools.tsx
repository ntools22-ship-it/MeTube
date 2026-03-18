/**
 * MeTube — AI Tools Page
 * يستخدم Puter.js للذكاء الاصطناعي المجاني
 */
import { useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, BookOpen, Music, Sparkles, Volume2, VolumeX, Copy, CheckCheck, Send, Lightbulb, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getSmartSummary, getLyrics, getMusicRecommendations, speakArabic, stopSpeaking, isSpeaking, askAI } from "@/lib/puterAI";
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
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="relative p-4 pt-8 rounded-xl bg-secondary/60 text-sm leading-relaxed whitespace-pre-wrap" dir={dir}>
      <div className="absolute top-2 left-2"><CopyBtn text={text} /></div>
      <p className={dir === "rtl" ? "font-arabic text-foreground" : "text-foreground"}>{text}</p>
    </motion.div>
  );
}

export default function AITools() {
  const { currentTrack } = usePlayer();
  const navigate = useNavigate();

  const [summary, setSummary]           = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [speaking, setSpeaking]         = useState(false);
  const [lyrics, setLyrics]             = useState("");
  const [lyricsLoading, setLyricsLoading]   = useState(false);
  const [recQuery, setRecQuery]         = useState("");
  const [recResult, setRecResult]       = useState<{ titles: string[]; explanation: string } | null>(null);
  const [recLoading, setRecLoading]     = useState(false);
  const [chatInput, setChatInput]       = useState("");
  const [chatHistory, setChatHistory]   = useState<{ role: "user"|"ai"; text: string }[]>([]);
  const [chatLoading, setChatLoading]   = useState(false);

  const handleSummary = async () => {
    if (!currentTrack) { toast.error("شغّل مقطعاً أولاً"); return; }
    setSummaryLoading(true); setSummary("");
    try { setSummary(await getSmartSummary(currentTrack.title, currentTrack.artist || "")); }
    catch (e: any) { toast.error(e.message); }
    finally { setSummaryLoading(false); }
  };

  const handleSpeak = () => {
    if (isSpeaking()) { stopSpeaking(); setSpeaking(false); return; }
    if (!summary) { toast.error("اطلب الملخص أولاً"); return; }
    speakArabic(summary); setSpeaking(true);
    const check = setInterval(() => { if (!isSpeaking()) { setSpeaking(false); clearInterval(check); } }, 500);
  };

  const handleLyrics = async () => {
    if (!currentTrack) { toast.error("شغّل أغنية أولاً"); return; }
    setLyricsLoading(true); setLyrics("");
    try { setLyrics(await getLyrics(currentTrack.title, currentTrack.artist || "")); }
    catch (e: any) { toast.error(e.message); }
    finally { setLyricsLoading(false); }
  };

  const handleRecommend = async () => {
    if (!recQuery.trim()) return;
    setRecLoading(true); setRecResult(null);
    try { setRecResult(await getMusicRecommendations(recQuery)); }
    catch (e: any) { toast.error(e.message); }
    finally { setRecLoading(false); }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim(); setChatInput("");
    setChatHistory(h => [...h, { role: "user", text: userMsg }]);
    setChatLoading(true);
    try {
      const context = chatHistory.map(m => `${m.role === "user" ? "المستخدم" : "AI"}: ${m.text}`).join("\n");
      const reply = await askAI(`${context}\nالمستخدم: ${userMsg}\n\nأنت مساعد موسيقي عربي. رد بإيجاز بالعربية.`);
      setChatHistory(h => [...h, { role: "ai", text: reply }]);
    } catch (e: any) { toast.error(e.message); }
    finally { setChatLoading(false); }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" /> أدوات الذكاء الاصطناعي
        </h1>
        <p className="text-xs text-muted-foreground mt-1">مدعوم بـ Puter.js — مجاني بالكامل، بدون API key</p>
      </div>

      {currentTrack ? (
        <Card className="bg-card border-primary/20">
          <CardContent className="flex items-center gap-3 py-3 px-4">
            <div className="w-10 h-10 rounded bg-secondary overflow-hidden flex-shrink-0">
              {currentTrack.coverUrl && <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{currentTrack.title}</p>
              <p className="text-xs text-muted-foreground">{currentTrack.artist}</p>
            </div>
            <span className="mr-auto text-xs text-primary flex-shrink-0">● مشغّل</span>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="py-4 text-center text-sm text-muted-foreground">
            شغّل مقطعاً من صفحة البحث لاستخدام ميزات الـ AI
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="summary">
        <TabsList className="bg-secondary w-full grid grid-cols-4">
          <TabsTrigger value="summary"   className="text-xs gap-1"><BookOpen className="h-3.5 w-3.5" /> ملخص</TabsTrigger>
          <TabsTrigger value="lyrics"    className="text-xs gap-1"><Music className="h-3.5 w-3.5" /> كلمات</TabsTrigger>
          <TabsTrigger value="recommend" className="text-xs gap-1"><Lightbulb className="h-3.5 w-3.5" /> توصيات</TabsTrigger>
          <TabsTrigger value="chat"      className="text-xs gap-1"><Sparkles className="h-3.5 w-3.5" /> دردشة</TabsTrigger>
        </TabsList>

        {/* ── ملخص ── */}
        <TabsContent value="summary" className="mt-4 space-y-3">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display">ملخص تعليمي ذكي</CardTitle>
              <CardDescription className="text-xs">5 نقاط تعليمية بالعربي من محتوى المقطع</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button onClick={handleSummary} disabled={!currentTrack || summaryLoading} className="gap-2 flex-1">
                  {summaryLoading ? <><Loader2 className="h-4 w-4 animate-spin" />جاري التحليل...</> : <><BookOpen className="h-4 w-4" />اطلب الملخص</>}
                </Button>
                {summary && (
                  <Button variant="outline" size="icon" className="w-10 h-10 flex-shrink-0" onClick={handleSpeak}>
                    {speaking ? <VolumeX className="h-4 w-4 text-primary" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                )}
              </div>
              <AnimatePresence>
                {summaryLoading && (
                  <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                    className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                    <div className="flex gap-1">{[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</div>
                    Puter AI يحلل المحتوى...
                  </motion.div>
                )}
                {summary && <ResultBox text={summary} />}
              </AnimatePresence>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── كلمات ── */}
        <TabsContent value="lyrics" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display">كلمات الأغنية</CardTitle>
              <CardDescription className="text-xs">يجيب كلمات المقطع الحالي</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={handleLyrics} disabled={!currentTrack || lyricsLoading} variant="outline" className="gap-2 w-full">
                {lyricsLoading ? <><Loader2 className="h-4 w-4 animate-spin" />جاري البحث...</> : <><Music className="h-4 w-4" />اجلب الكلمات</>}
              </Button>
              <AnimatePresence>{lyrics && <ResultBox text={lyrics} dir="auto" />}</AnimatePresence>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── توصيات ── */}
        <TabsContent value="recommend" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display">توصيات موسيقية</CardTitle>
              <CardDescription className="text-xs">اسأل عن أي نوع موسيقى</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder="مثال: أغاني هادئة لعمرو دياب" value={recQuery}
                  onChange={e => setRecQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleRecommend()}
                  className="bg-secondary border-border text-sm h-10" dir="auto" />
                <Button size="icon" className="h-10 w-10 flex-shrink-0" onClick={handleRecommend} disabled={!recQuery.trim() || recLoading}>
                  {recLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {["أغاني حب عربية هادئة","Lofi للمذاكرة","أفضل أغاني محمد حماقي"].map(ex => (
                  <button key={ex} onClick={() => { setRecQuery(ex); setTimeout(handleRecommend, 100); }}
                    className="text-xs px-3 py-1 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors">{ex}</button>
                ))}
              </div>
              <AnimatePresence>
                {recResult && (
                  <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-3">
                    <p className="text-xs text-muted-foreground font-arabic" dir="rtl">{recResult.explanation}</p>
                    <div className="space-y-1.5">
                      {recResult.titles.map((title, i) => (
                        <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/60 hover:bg-secondary transition-colors">
                          <span className="text-xs text-primary font-mono w-5 flex-shrink-0">{i+1}.</span>
                          <p className="text-sm text-foreground flex-1 truncate" dir="auto">{title}</p>
                          <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0"
                            onClick={() => navigate(`/search?q=${encodeURIComponent(title)}`)}>
                            <Play className="h-3.5 w-3.5 text-primary" />
                          </Button>
                        </div>
                      ))}
                    </div>
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
                <Sparkles className="h-4 w-4 text-primary" /> مساعد موسيقي
              </CardTitle>
              <CardDescription className="text-xs">تحدث مع الذكاء الاصطناعي</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {chatHistory.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">اسأل عن أي شيء موسيقي...</p>}
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary text-foreground rounded-bl-sm font-arabic"}`} dir="auto">
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
                <Input placeholder="اكتب سؤالك..." value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleChat()}
                  className="bg-secondary border-border text-sm h-10" dir="auto" disabled={chatLoading} />
                <Button size="icon" className="h-10 w-10 flex-shrink-0" onClick={handleChat} disabled={!chatInput.trim() || chatLoading}>
                  {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
