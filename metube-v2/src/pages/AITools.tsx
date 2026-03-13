import { useState, useRef } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Languages, FileText, Loader2, Copy, CheckCheck, AlertCircle, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { captureAudioBlob, transcribeAudio, translateToArabic, summarizeText } from "@/lib/aiService";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7 absolute top-2 left-2" onClick={copy}>
      {copied ? <CheckCheck className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
    </Button>
  );
}

export default function AITools() {
  const { currentTrack, audioRef } = usePlayer();
  const [transcription, setTranscription] = useState("");
  const [translation, setTranslation] = useState("");
  const [summary, setSummary] = useState<{ english: string; arabic: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  // ── Transcription ──────────────────────────────────────────────────────────

  const handleTranscribe = async () => {
    if (!currentTrack || !audioRef.current) return;
    if (!import.meta.env.VITE_HF_TOKEN) {
      setError("أضف VITE_HF_TOKEN في ملف .env لتفعيل النسخ الصوتي.");
      return;
    }
    setIsProcessing("transcribe");
    setError(null);
    setRecordingSeconds(0);
    try {
      toast.info("🎙️ جاري تسجيل 45 ثانية من الصوت...");
      const blob = await captureAudioBlob(audioRef.current, 45_000, (s) => setRecordingSeconds(s));
      toast.info("🤖 جاري التحويل بواسطة Whisper AI...");
      const result = await transcribeAudio(blob);
      setTranscription(result.text);
      toast.success("تم النسخ الصوتي بنجاح!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(null);
      setRecordingSeconds(0);
    }
  };

  // ── Translation ────────────────────────────────────────────────────────────

  const handleTranslate = async () => {
    if (!transcription) return;
    if (!import.meta.env.VITE_HF_TOKEN) {
      setError("أضف VITE_HF_TOKEN في ملف .env للترجمة.");
      return;
    }
    setIsProcessing("translate");
    setError(null);
    try {
      toast.info("🌍 جاري الترجمة إلى العربية...");
      const result = await translateToArabic(transcription);
      setTranslation(result.text);
      toast.success("تمت الترجمة بنجاح!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(null);
    }
  };

  // ── Summary ────────────────────────────────────────────────────────────────

  const handleSummarize = async () => {
    if (!transcription || !currentTrack) return;
    if (!import.meta.env.VITE_ANTHROPIC_API_KEY) {
      setError("أضف VITE_ANTHROPIC_API_KEY في ملف .env للملخص.");
      return;
    }
    setIsProcessing("summarize");
    setError(null);
    try {
      toast.info("✨ جاري إنشاء الملخص...");
      const result = await summarizeText(transcription, currentTrack.title);
      setSummary(result);
      toast.success("تم إنشاء الملخص!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">أدوات الذكاء الاصطناعي</h1>
        <p className="text-sm text-muted-foreground mt-1">نسخ، ترجمة وتلخيص الصوت بالذكاء الاصطناعي</p>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
            <button onClick={clearError} className="text-destructive/60 hover:text-destructive ml-auto">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ENV hint */}
      {(!import.meta.env.VITE_HF_TOKEN || !import.meta.env.VITE_ANTHROPIC_API_KEY) && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-medium">إعداد مطلوب</p>
            {!import.meta.env.VITE_HF_TOKEN && <p>VITE_HF_TOKEN — للنسخ والترجمة (Hugging Face)</p>}
            {!import.meta.env.VITE_ANTHROPIC_API_KEY && <p>VITE_ANTHROPIC_API_KEY — للملخص (Claude)</p>}
            <p className="text-yellow-400/60">أضف هذه المتغيرات في ملف .env</p>
          </div>
        </div>
      )}

      {/* Current track */}
      {currentTrack ? (
        <Card className="bg-card border-border">
          <CardContent className="flex items-center gap-3 py-3 px-4">
            <div className="w-10 h-10 rounded bg-secondary overflow-hidden flex-shrink-0">
              {currentTrack.coverUrl && <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{currentTrack.title}</p>
              <p className="text-xs text-muted-foreground">{currentTrack.artist}</p>
            </div>
            <span className="ml-auto text-xs text-primary">● مشغّل</span>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="py-6 text-center text-muted-foreground text-sm">
            شغّل أغنية أولاً لاستخدام أدوات الذكاء الاصطناعي
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="transcribe">
        <TabsList className="bg-secondary w-full sm:w-auto">
          <TabsTrigger value="transcribe" className="gap-1.5 flex-1 sm:flex-none">
            <Mic className="h-4 w-4" /> نسخ صوتي
          </TabsTrigger>
          <TabsTrigger value="translate" className="gap-1.5 flex-1 sm:flex-none">
            <Languages className="h-4 w-4" /> ترجمة
          </TabsTrigger>
          <TabsTrigger value="summarize" className="gap-1.5 flex-1 sm:flex-none">
            <FileText className="h-4 w-4" /> ملخص
          </TabsTrigger>
        </TabsList>

        {/* ── Transcribe ──────────────────────────────────────────────────── */}
        <TabsContent value="transcribe" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-display">نسخ صوتي (Whisper AI)</CardTitle>
              <CardDescription>يسجّل 45 ثانية من الصوت الحالي ويحوّله لنص</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleTranscribe}
                disabled={!currentTrack || !!isProcessing}
                className="gap-2"
              >
                {isProcessing === "transcribe" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {recordingSeconds > 0 ? `تسجيل... ${recordingSeconds}s` : "معالجة..."}
                  </>
                ) : (
                  <><Mic className="h-4 w-4" /> ابدأ النسخ الصوتي</>
                )}
              </Button>

              {isProcessing === "transcribe" && recordingSeconds > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  تسجيل... {45 - recordingSeconds} ثانية متبقية
                </div>
              )}

              <AnimatePresence>
                {transcription && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="relative p-4 pt-9 rounded-lg bg-secondary text-sm text-foreground leading-relaxed"
                    dir="auto"
                  >
                    <CopyButton text={transcription} />
                    {transcription}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Translate ───────────────────────────────────────────────────── */}
        <TabsContent value="translate" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-display">ترجمة إلى العربية</CardTitle>
              <CardDescription>Helsinki-NLP — ترجمة من الإنجليزية إلى العربية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleTranslate}
                disabled={!transcription || !!isProcessing}
                variant="outline"
                className="gap-2"
              >
                {isProcessing === "translate" ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> جاري الترجمة...</>
                ) : (
                  <><Languages className="h-4 w-4" /> ترجم إلى العربية</>
                )}
              </Button>
              {!transcription && (
                <p className="text-xs text-muted-foreground">انسخ الصوت أولاً ثم اضغط ترجم</p>
              )}

              <AnimatePresence>
                {translation && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="relative p-4 pt-9 rounded-lg bg-secondary text-sm font-arabic text-right leading-loose"
                    dir="rtl"
                  >
                    <CopyButton text={translation} />
                    {translation}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Summary ─────────────────────────────────────────────────────── */}
        <TabsContent value="summarize" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-display">ملخص ذكي (Claude AI)</CardTitle>
              <CardDescription>ملخص ثنائي اللغة للمحتوى الصوتي</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleSummarize}
                disabled={!transcription || !!isProcessing}
                variant="outline"
                className="gap-2"
              >
                {isProcessing === "summarize" ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> جاري التلخيص...</>
                ) : (
                  <><FileText className="h-4 w-4" /> إنشاء ملخص</>
                )}
              </Button>
              {!transcription && (
                <p className="text-xs text-muted-foreground">انسخ الصوت أولاً ثم اضغط ملخص</p>
              )}

              <AnimatePresence>
                {summary && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    {summary.english && (
                      <div className="p-4 rounded-lg bg-secondary text-sm text-foreground leading-relaxed" dir="ltr">
                        <p className="text-xs text-muted-foreground mb-1 font-medium">English Summary</p>
                        {summary.english}
                      </div>
                    )}
                    {summary.arabic && (
                      <div className="p-4 rounded-lg bg-secondary text-sm font-arabic text-right leading-loose" dir="rtl">
                        <p className="text-xs text-muted-foreground mb-1 font-medium" dir="rtl">ملخص عربي</p>
                        {summary.arabic}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
