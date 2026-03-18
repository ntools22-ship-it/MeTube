/**
 * MeTube — Puter.js AI Utility
 * AI مجاني بالكامل بدون API key
 * src/lib/puterAI.ts
 */

// TypeScript type للـ Puter global
declare global {
  interface Window {
    puter: {
      ai: {
        chat: (
          prompt: string,
          options?: { model?: string; stream?: boolean }
        ) => Promise<{ message: { content: string } } | string>;
      };
    };
  }
}

// ── الدالة الأساسية ───────────────────────────────────────────────────────────

/**
 * askAI — اسأل Puter AI أي سؤال
 * @param prompt النص المرسل للـ AI
 * @param model  النموذج (افتراضي: gpt-4o-mini — سريع ومجاني)
 */
export async function askAI(prompt: string, model = "gpt-4o-mini"): Promise<string> {
  if (!window.puter?.ai) {
    throw new Error("Puter.js غير محمّل — تأكد من إضافة السكريبت في index.html");
  }

  try {
    const response = await window.puter.ai.chat(prompt, { model });
    // Puter بيرجع string أو object حسب الإصدار
    if (typeof response === "string") return response;
    return response?.message?.content || "";
  } catch (err: any) {
    throw new Error(`Puter AI Error: ${err.message || "خطأ غير معروف"}`);
  }
}

// ── Prompts جاهزة ─────────────────────────────────────────────────────────────

/**
 * A: ملخص ذكي + ترجمة عربية
 * بيحدد لغة المحتوى ويرجع 5 نقاط بالعربي
 */
export async function getSmartSummary(
  videoTitle: string,
  videoDescription: string
): Promise<string> {
  const prompt = `
أنت مساعد تعليمي ذكي. المهمة:
1. اقرأ عنوان ووصف الفيديو التالي
2. إذا كان المحتوى بالإنجليزية، ترجمه للعربية أولاً
3. اكتب ملخصاً تعليمياً موجزاً بالعربية في 5 نقاط واضحة

عنوان الفيديو: "${videoTitle}"
وصف الفيديو: "${videoDescription.slice(0, 500)}"

اكتب الإجابة بهذا التنسيق فقط:
🎯 **الموضوع الرئيسي:** [جملة واحدة]

**النقاط الأساسية:**
• [نقطة 1]
• [نقطة 2]
• [نقطة 3]
• [نقطة 4]
• [نقطة 5]
`.trim();

  return askAI(prompt);
}

/**
 * C: كلمات الأغنية
 */
export async function getLyrics(
  songTitle: string,
  artist: string
): Promise<string> {
  const prompt = `
اكتب كلمات أغنية "${songTitle}" للفنان "${artist}".
إذا كانت الأغنية عربية، اكتب الكلمات بالعربية.
إذا كانت إنجليزية، اكتب بالإنجليزية ثم رجمها للعربية.
إذا لم تعرف الكلمات بالتحديد، اكتب "كلمات غير متاحة" ولا تخترع كلمات.
`.trim();

  return askAI(prompt);
}

/**
 * D: توصيات موسيقية ذكية
 * بيرجع قائمة أغاني يمكن البحث عنها في YouTube
 */
export async function getMusicRecommendations(
  userRequest: string
): Promise<{ titles: string[]; explanation: string }> {
  const prompt = `
أنت مساعد موسيقي. المستخدم يطلب: "${userRequest}"

رد بـ JSON فقط بهذا الشكل بدون أي نص إضافي:
{
  "explanation": "جملة واحدة تشرح اختياراتك",
  "titles": ["اسم الأغنية - الفنان", "اسم الأغنية 2 - الفنان", ...]
}

أعطِ 5 توصيات مناسبة فقط.
`.trim();

  const raw = await askAI(prompt);

  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return {
      titles: parsed.titles || [],
      explanation: parsed.explanation || "",
    };
  } catch {
    // fallback لو الـ JSON مش صحيح
    const lines = raw.split("\n").filter(l => l.trim().startsWith("-") || l.trim().match(/^\d+\./));
    return {
      titles: lines.map(l => l.replace(/^[-\d.]\s*/, "").trim()).slice(0, 5),
      explanation: raw.slice(0, 100),
    };
  }
}

// ── Text to Speech ────────────────────────────────────────────────────────────

/**
 * B: نطق النص بالعربية عبر Web Speech API
 */
export function speakArabic(
  text: string,
  options?: { rate?: number; pitch?: number }
): void {
  if (!("speechSynthesis" in window)) {
    alert("المتصفح لا يدعم نطق النص");
    return;
  }

  // إيقاف أي نطق سابق
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ar-SA";
  utterance.rate = options?.rate ?? 0.85;   // أبطأ قليلاً للفهم
  utterance.pitch = options?.pitch ?? 1;

  // ابحث عن صوت عربي
  const voices = window.speechSynthesis.getVoices();
  const arabicVoice = voices.find(v => v.lang.startsWith("ar")) || null;
  if (arabicVoice) utterance.voice = arabicVoice;

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  window.speechSynthesis?.cancel();
}

export function isSpeaking(): boolean {
  return window.speechSynthesis?.speaking ?? false;
}
