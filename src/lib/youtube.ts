// تأكد من أن الـ Interface يطابق ما يرسله كود الـ Search API الجديد
export interface VideoResult {
  videoId: string;
  title: string;
  author: string;
  thumbnail: string;
  lengthSeconds: number; // غيرناها من string لـ number لتطابق كود الـ API
  viewCount: number;
}

/**
 * البحث عن فيديوهات عبر الـ API الخاص بنا
 */
export async function searchYouTube(query: string): Promise<VideoResult[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "فشل البحث");
  }
  return await res.json();
}

/**
 * الحصول على رابط الصوت المباشر
 */
export async function getAudioStreamUrl(videoId: string): Promise<string> {
  // سيقوم بتوجيه الطلب لـ api/stream.js الذي عدلناه
  return `/api/stream?id=${videoId}`;
}

/**
 * دوال التنسيق (Helper Functions) المطلوبة في صفحة Search.tsx
 */
export function formatDuration(seconds: number): string {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatViews(views: number): string {
  if (views >= 1000000) return (views / 1000000).toFixed(1) + "M";
  if (views >= 1000) return (views / 1000).toFixed(1) + "K";
  return views.toString();
}
