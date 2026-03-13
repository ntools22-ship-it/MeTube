import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { usePlayer } from "@/contexts/PlayerContext";
import { Wifi, WifiOff, Music2, Cpu, Palette, Info } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { dataSaver, setDataSaver, volume, setVolume } = usePlayer();
  const [crossfade, setCrossfade] = useState(false);
  const [autoTranscribe, setAutoTranscribe] = useState(false);
  const [arabicTranslation, setArabicTranslation] = useState(true);
  const [highContrast, setHighContrast] = useState(false);

  const handleDataSaver = (checked: boolean) => {
    setDataSaver(checked);
    toast.info(checked
      ? "💾 وضع توفير البيانات مفعّل — 48kbps"
      : "🔊 جودة صوت عادية — 128kbps"
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">الإعدادات</h1>

      {/* Playback */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Music2 className="h-5 w-5 text-primary" /> التشغيل
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Data Saver */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-foreground flex items-center gap-2">
                {dataSaver ? <WifiOff className="h-4 w-4 text-yellow-500" /> : <Wifi className="h-4 w-4" />}
                توفير البيانات
              </Label>
              <p className="text-xs text-muted-foreground">
                {dataSaver ? "48kbps — جودة منخفضة، بيانات أقل" : "128kbps — جودة عالية (افتراضي)"}
              </p>
            </div>
            <Switch checked={dataSaver} onCheckedChange={handleDataSaver} />
          </div>

          {/* Background Playback info */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-foreground">التشغيل في الخلفية</Label>
              <p className="text-xs text-muted-foreground">يعمل تلقائياً عبر MediaSession API</p>
            </div>
            <Switch defaultChecked disabled />
          </div>

          {/* Crossfade */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-foreground">Crossfade</Label>
              <p className="text-xs text-muted-foreground">انتقال سلس بين الأغاني</p>
            </div>
            <Switch checked={crossfade} onCheckedChange={setCrossfade} />
          </div>

          {/* Volume */}
          <div className="space-y-2">
            <Label className="text-foreground">مستوى الصوت الافتراضي</Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[volume * 100]}
                max={100}
                step={1}
                onValueChange={([v]) => setVolume(v / 100)}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-10 text-right">{Math.round(volume * 100)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Features */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Cpu className="h-5 w-5 text-accent" /> ميزات الذكاء الاصطناعي
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-foreground">نسخ صوتي تلقائي</Label>
              <p className="text-xs text-muted-foreground">يبدأ النسخ عند تشغيل أغنية جديدة</p>
            </div>
            <Switch checked={autoTranscribe} onCheckedChange={setAutoTranscribe} />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-foreground">ترجمة عربية</Label>
              <p className="text-xs text-muted-foreground">عرض الترجمة العربية بجانب النص</p>
            </div>
            <Switch checked={arabicTranslation} onCheckedChange={setArabicTranslation} />
          </div>
        </CardContent>
      </Card>

      {/* ENV Variables guide */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Info className="h-5 w-5 text-muted-foreground" /> متغيرات البيئة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs font-mono">
            {[
              { key: "VITE_HF_TOKEN", desc: "Hugging Face — نسخ وترجمة", required: true },
              { key: "VITE_ANTHROPIC_API_KEY", desc: "Claude AI — الملخص", required: true },
              { key: "VITE_SUPABASE_URL", desc: "Supabase — مشاركة مباشرة", required: false },
              { key: "VITE_SUPABASE_ANON_KEY", desc: "Supabase — مشاركة مباشرة", required: false },
            ].map(({ key, desc, required }) => (
              <div key={key} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${import.meta.env[key] ? "bg-primary" : required ? "bg-destructive" : "bg-muted-foreground"}`} />
                <span className="text-foreground">{key}</span>
                <span className="text-muted-foreground">— {desc}</span>
                <span className={`ml-auto ${import.meta.env[key] ? "text-primary" : "text-muted-foreground"}`}>
                  {import.meta.env[key] ? "✓" : required ? "مطلوب" : "اختياري"}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">أضف هذه المتغيرات في ملف <code className="bg-secondary px-1 rounded">.env</code> في جذر المشروع</p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">MeTube v2.0 — مشغّل موسيقى بالذكاء الاصطناعي</p>
    </div>
  );
}
