# 🎵 MeTube — مشغّل الموسيقى الذكي

مشغّل موسيقى مدعوم بالذكاء الاصطناعي | بحث YouTube | نسخ صوتي | ترجمة عربية | مشاركة مباشرة

## ⚡ Deploy على Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

## 🔑 متغيرات البيئة المطلوبة

في Vercel Dashboard ← Settings ← Environment Variables:

| المتغير | الوصف | المصدر |
|---------|--------|--------|
| `VITE_HF_TOKEN` | Hugging Face Token | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) |
| `VITE_ANTHROPIC_API_KEY` | Anthropic API Key | [console.anthropic.com](https://console.anthropic.com) |
| `VITE_SUPABASE_URL` | Supabase Project URL | [supabase.com](https://supabase.com) |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anon Key | [supabase.com](https://supabase.com) |

> الأول اثنين مطلوبان لميزات الذكاء الاصطناعي. Supabase اختياري للمشاركة المباشرة فقط.

## 🚀 الميزات

- 🔍 **بحث YouTube** — بدون API key، بدون إعلانات، صوت فقط
- 🎙️ **نسخ صوتي** — Whisper large-v3 (Hugging Face)
- 🌍 **ترجمة عربية** — Helsinki-NLP مع دعم RTL كامل
- ✨ **ملخص ذكي** — Claude AI ثنائي اللغة
- 📡 **مشاركة مباشرة** — Supabase Realtime
- 📱 **PWA** — تثبيت كتطبيق + تشغيل في الخلفية
- 💾 **وضع توفير البيانات** — 48kbps عوضاً عن 128kbps

## 🛠️ تشغيل محلياً

```bash
npm install
cp .env.example .env  # ثم أضف مفاتيحك
npm run dev
```
