/**
 * MeTube — AI Services
 * Transcription: Hugging Face Whisper
 * Translation: Helsinki-NLP (EN→AR)
 * Summary: Claude (Anthropic)
 */

const HF_TOKEN = import.meta.env.VITE_HF_TOKEN || "";
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";
const HF_BASE = "https://api-inference.huggingface.co/models";

// ─── Audio Capture ────────────────────────────────────────────────────────────

/**
 * Record audio from an <audio> element for `durationMs` milliseconds.
 * Returns a Blob (audio/webm;codecs=opus).
 */
export async function captureAudioBlob(
  audioElement: HTMLAudioElement,
  durationMs = 45_000,
  onProgress?: (secondsRecorded: number) => void
): Promise<Blob> {
  if (!("captureStream" in audioElement)) {
    throw new Error(
      "captureStream غير مدعوم في هذا المتصفح. جرب Chrome أو Edge."
    );
  }

  return new Promise((resolve, reject) => {
    try {
      const stream = (audioElement as any).captureStream() as MediaStream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];
      let elapsed = 0;

      const interval = setInterval(() => {
        elapsed += 1;
        onProgress?.(elapsed);
      }, 1000);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        clearInterval(interval);
        resolve(new Blob(chunks, { type: mimeType }));
      };

      recorder.onerror = (e) => {
        clearInterval(interval);
        reject(new Error("خطأ في التسجيل: " + (e as any).error?.message));
      };

      recorder.start(1000);
      setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
      }, durationMs);
    } catch (err) {
      reject(err);
    }
  });
}

// ─── Transcription ────────────────────────────────────────────────────────────

export interface TranscribeResult {
  text: string;
}

/**
 * Transcribe audio blob using Whisper large-v3 via Hugging Face
 */
export async function transcribeAudio(
  audioBlob: Blob
): Promise<TranscribeResult> {
  if (!HF_TOKEN) {
    throw new Error(
      "مفتاح Hugging Face غير موجود. أضف VITE_HF_TOKEN في ملف .env"
    );
  }

  const response = await fetch(
    `${HF_BASE}/openai/whisper-large-v3`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": audioBlob.type || "audio/webm",
      },
      body: audioBlob,
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    // Handle model loading (cold start)
    if (response.status === 503 && (err as any).estimated_time) {
      throw new Error(
        `النموذج يُحمّل الآن، المتوقع ${Math.ceil((err as any).estimated_time)}ث. أعد المحاولة.`
      );
    }
    throw new Error(
      `فشل التحويل الصوتي: ${(err as any).error || response.statusText}`
    );
  }

  const data = await response.json();
  return { text: data.text || "" };
}

// ─── Translation ──────────────────────────────────────────────────────────────

export interface TranslateResult {
  text: string;
}

/**
 * Translate English → Arabic via Helsinki-NLP/opus-mt-en-ar
 */
export async function translateToArabic(
  text: string
): Promise<TranslateResult> {
  if (!HF_TOKEN) {
    throw new Error(
      "مفتاح Hugging Face غير موجود. أضف VITE_HF_TOKEN في ملف .env"
    );
  }

  // Split long text into chunks ≤500 chars (model limit)
  const chunks = splitIntoChunks(text, 500);
  const translated: string[] = [];

  for (const chunk of chunks) {
    const response = await fetch(
      `${HF_BASE}/Helsinki-NLP/opus-mt-en-ar`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: chunk }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      if (response.status === 503) {
        throw new Error("نموذج الترجمة يُحمّل. أعد المحاولة بعد لحظة.");
      }
      throw new Error(`فشل الترجمة: ${(err as any).error || response.statusText}`);
    }

    const data = await response.json();
    const part = Array.isArray(data)
      ? data[0]?.translation_text
      : data?.translation_text;
    if (part) translated.push(part);
  }

  return { text: translated.join(" ") };
}

function splitIntoChunks(text: string, maxLen: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    if ((current + s).length > maxLen && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += " " + s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export interface SummaryResult {
  english: string;
  arabic: string;
}

/**
 * Generate bilingual summary using Claude
 */
export async function summarizeText(
  transcription: string,
  trackTitle: string
): Promise<SummaryResult> {
  if (!ANTHROPIC_KEY) {
    throw new Error(
      "مفتاح Anthropic غير موجود. أضف VITE_ANTHROPIC_API_KEY في ملف .env"
    );
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system:
        "You are a music analysis assistant. Respond ONLY with JSON in this exact format: {\"english\": \"...\", \"arabic\": \"...\"}. No markdown, no extra text.",
      messages: [
        {
          role: "user",
          content: `Summarize the lyrics/content of "${trackTitle}" based on this transcription. Provide a 2-3 sentence summary in English, and a translation of that summary in Arabic.

Transcription:
${transcription.slice(0, 1500)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`فشل الملخص: ${(err as any).error?.message || response.statusText}`);
  }

  const data = await response.json();
  const raw = data.content?.[0]?.text || "{}";

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return {
      english: parsed.english || "",
      arabic: parsed.arabic || "",
    };
  } catch {
    return { english: raw, arabic: "" };
  }
}
