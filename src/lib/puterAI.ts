/**
 * MeTube — Puter.js AI (كامل)
 * Vision للمكفوفين + كلمات بدون key + ملخص + توصيات
 */

declare global {
  interface Window {
    puter: {
      ai: {
        chat: (
          messages: any,
          options?: { model?: string }
        ) => Promise<{ message: { content: string } } | string>;
      };
    };
  }
}

// ── Core ──────────────────────────────────────────────────────────────────────
export async function askAI(prompt: string, model = "gpt-4o-mini"): Promise<string> {
  if (!window.puter?.ai) throw new Error("Puter.js غير محمّل — أعد تحميل الصفحة");
  const res = await window.puter.ai.chat(prompt, { model });
  if (typeof res === "string") return res;
  return (res as any)?.message?.content || "";
}

// ── Vision: وصف مشاهد الفيديو للمكفوفين ─────────────────────────────────────
export interface SceneDescription {
  overall: string;   // وصف عام للفيديو
  scenes: { time: string; description: string }[];  // 4 مشاهد
  audioHints: string; // ما نتوقعه صوتياً
  accessSummary: string; // ملخص إمكانية الوصول
}

export async function describeVideoForBlind(
  videoId: string,
  title: string,
  description: string,
  type: "sports" | "educational" | "general" = "general"
): Promise<SceneDescription> {
  // YouTube بيوفر 4 thumbnails لكل فيديو تلقائياً
  const thumbs = [
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/1.jpg`,  // الثلث الأول
    `https://i.ytimg.com/vi/${videoId}/2.jpg`,  // المنتصف
    `https://i.ytimg.com/vi/${videoId}/3.jpg`,  // الثلث الأخير
  ];

  const typeContext = {
    sports: "هذا مقطع رياضي — صف الرياضيين، الحركات، المكان، العدد على الشاشة، والإثارة",
    educational: "هذا مقطع تعليمي — صف الشرائح، الكتابة على السبورة، الرسوم البيانية، والمفاهيم المرئية",
    general: "صف المشهد بدقة كما لو تصفه لشخص لا يرى",
  }[type];

  // نبعت الصور لـ GPT-4o Vision مع الـ context
  const messages = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `أنت مساعد وصف مرئي للمكفوفين وضعاف البصر.
عنوان الفيديو: "${title}"
وصف الفيديو: "${description.slice(0, 400)}"
${typeContext}

الصور الأربعة التالية هي snapshots من الفيديو في أوقات مختلفة.
اكتب وصفاً دقيقاً وحيوياً بالعربية يساعد المكفوف على تخيّل ما يحدث.

أجب بـ JSON فقط:
{
  "overall": "وصف عام للفيديو في جملتين",
  "scenes": [
    {"time": "البداية", "description": "وصف تفصيلي"},
    {"time": "الربع الأول", "description": "وصف تفصيلي"},
    {"time": "المنتصف", "description": "وصف تفصيلي"},
    {"time": "الثلث الأخير", "description": "وصف تفصيلي"}
  ],
  "audioHints": "ما يُتوقع سماعه في هذا الفيديو",
  "accessSummary": "ملخص بجملة واحدة للمكفوف"
}`,
        },
        // أرسل الـ thumbnails كصور
        ...thumbs.map(url => ({
          type: "image_url",
          image_url: { url, detail: "low" },
        })),
      ],
    },
  ];

  try {
    const raw = await window.puter.ai.chat(messages, { model: "gpt-4o" });
    const text = typeof raw === "string" ? raw : (raw as any)?.message?.content || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return parsed as SceneDescription;
  } catch {
    // Fallback: وصف نصي بدون Vision
    const fallback = await askAI(
      `أنت مساعد للمكفوفين. بناءً على هذه المعلومات فقط:
عنوان: "${title}"
وصف: "${description.slice(0, 300)}"
نوع المحتوى: ${type === "sports" ? "رياضي" : "تعليمي"}

اكتب وصفاً مفصّلاً يساعد المكفوف على تخيّل المحتوى. أجب بـ JSON:
{"overall":"...","scenes":[{"time":"البداية","description":"..."},{"time":"المنتصف","description":"..."}],"audioHints":"...","accessSummary":"..."}`
    );
    const clean2 = fallback.replace(/```json|```/g, "").trim();
    return JSON.parse(clean2);
  }
}

// ── كلمات الأغاني بدون Key ────────────────────────────────────────────────────
export interface LyricsResult {
  lyrics: string;
  source: string;
  synced?: { time: number; text: string }[]; // كلمات متزامنة مع الوقت
}

export async function fetchLyrics(
  title: string,
  artist: string
): Promise<LyricsResult> {
  // تنظيف الاسم من [Official Video] وما شابه
  const cleanTitle = title
    .replace(/\[.*?\]|\(.*?\)|official|video|audio|lyrics|hd|4k/gi, "")
    .trim();
  const cleanArtist = artist.replace(/VEVO|Official|Music/gi, "").trim();

  // ① lrclib — بيدي كلمات متزامنة مع الوقت (أفضل)
  try {
    const r = await fetch(
      `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (r.ok) {
      const data = await r.json();
      if (data?.[0]) {
        const item = data[0];
        // لو فيه كلمات متزامنة
        if (item.syncedLyrics) {
          const synced = parseLRC(item.syncedLyrics);
          return { lyrics: item.plainLyrics || item.syncedLyrics.replace(/\[.*?\]/g, ""), source: "lrclib", synced };
        }
        if (item.plainLyrics) return { lyrics: item.plainLyrics, source: "lrclib" };
      }
    }
  } catch { /* try next */ }

  // ② lyrics.ovh
  try {
    const r = await fetch(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (r.ok) {
      const data = await r.json();
      if (data?.lyrics) return { lyrics: data.lyrics, source: "lyrics.ovh" };
    }
  } catch { /* try next */ }

  // ③ Puter AI كـ fallback أخير
  const aiLyrics = await askAI(
    `اكتب كلمات أغنية "${cleanTitle}" للفنان "${cleanArtist}".
إذا كانت عربية اكتب بالعربية، وإذا كانت إنجليزية اكتب بالإنجليزية.
اكتب الكلمات فقط بدون مقدمة أو تعليق.
إذا لم تعرف الكلمات بالتحديد، اكتب "الكلمات غير متاحة" فقط.`
  );
  return { lyrics: aiLyrics, source: "puter-ai" };
}

// تحليل صيغة LRC المتزامنة [mm:ss.xx]
function parseLRC(lrc: string): { time: number; text: string }[] {
  const lines = lrc.split("\n");
  const result: { time: number; text: string }[] = [];
  for (const line of lines) {
    const m = line.match(/\[(\d{2}):(\d{2})\.(\d{2})\](.*)/);
    if (m) {
      const time = parseInt(m[1]) * 60 + parseInt(m[2]) + parseInt(m[3]) / 100;
      result.push({ time, text: m[4].trim() });
    }
  }
  return result;
}

// ── ملخص تعليمي شامل ─────────────────────────────────────────────────────────
export async function getDetailedSummary(
  title: string,
  description: string,
  type: "sports" | "educational" | "general" = "general"
): Promise<string> {
  const typePrompt = {
    sports: "مباراة رياضية أو حدث رياضي — ركّز على النتائج والأداء واللحظات الحاسمة",
    educational: "محتوى تعليمي — ركّز على المفاهيم والدروس والخطوات",
    general: "محتوى عام",
  }[type];

  return askAI(`
أنت محلل محتوى متخصص. حلّل هذا الفيديو (${typePrompt}):

العنوان: "${title}"
الوصف: "${description.slice(0, 800)}"

اكتب تقريراً شاملاً بالعربية يتضمن:

## 📌 نظرة عامة
[جملتان عن المحتوى]

## 🎯 النقاط الرئيسية
• [نقطة مفصّلة 1]
• [نقطة مفصّلة 2]
• [نقطة مفصّلة 3]
• [نقطة مفصّلة 4]
• [نقطة مفصّلة 5]

## 💡 الدروس المستفادة
[3 دروس عملية]

## 🔍 للاستزادة
[اقتراح موضوعين للبحث عنهما]
`.trim());
}

// ── توصيات موسيقية ────────────────────────────────────────────────────────────
export async function getMusicRecommendations(
  query: string
): Promise<{ titles: string[]; explanation: string }> {
  const raw = await askAI(`
المستخدم يريد: "${query}"
اقترح 5 أغاني أو فيديوهات مناسبة.
أجب بـ JSON فقط:
{"explanation":"جملة واحدة عن اختياراتك","titles":["اسم الأغنية - الفنان",...]}
`.trim());
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return { titles: parsed.titles || [], explanation: parsed.explanation || "" };
  } catch {
    return { titles: [], explanation: raw.slice(0, 100) };
  }
}

// ── Text to Speech ────────────────────────────────────────────────────────────
export function speakArabic(text: string, rate = 0.85): void {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ar-SA"; u.rate = rate;
  const voices = window.speechSynthesis.getVoices();
  const ar = voices.find(v => v.lang.startsWith("ar"));
  if (ar) u.voice = ar;
  window.speechSynthesis.speak(u);
}
export const stopSpeaking = () => window.speechSynthesis?.cancel();
export const isSpeaking   = () => window.speechSynthesis?.speaking ?? false;
