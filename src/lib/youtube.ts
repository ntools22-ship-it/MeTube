/**
 * MeTube — YouTube via Vercel API Proxy
 * الطلبات بتمشي: Browser → Vercel API → Invidious → YouTube
 * بكده بنتجاوز CORS تماماً
 */

export interface VideoResult {
  videoId: string;
  title: string;
  author: string;
  lengthSeconds: number;
  viewCount: number;
  thumbnail: string;
}

/**
 * بحث YouTube — عبر Vercel proxy
 */
export async function searchYouTube(query: string): Promise<VideoResult[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || "فشل البحث، حاول مرة أخرى");
  }

  const data = await res.json();

  return (data as any[])
    .filter((item) => item.videoId)
    .slice(0, 20)
    .map((item) => ({
      videoId: item.videoId,
      title: item.title || "بدون عنوان",
      author: item.author || "غير معروف",
      lengthSeconds: item.lengthSeconds || 0,
      viewCount: item.viewCount || 0,
      thumbnail: getBestThumbnail(item.videoThumbnails, item.videoId),
    }));
}

function getBestThumbnail(thumbnails: any[] | undefined, videoId: string): string {
  if (thumbnails?.length) {
    const medium = thumbnails.find((t) => t.quality === "medium" || t.quality === "mq");
    const url = (medium || thumbnails[0])?.url || "";
    if (url) return url;
  }
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

/**
 * رابط الصوت — عبر Vercel proxy
 */
export async function getAudioStreamUrl(videoId: string, dataSaver = false): Promise<string> {
  const itag = dataSaver ? 139 : 140;
  const res = await fetch(`/api/stream?id=${videoId}&itag=${itag}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || "تعذّر تحميل الصوت");
  }

  const data = await res.json();
  return data.url;
}

/** "3:45" */
export function formatDuration(seconds: number): string {
  if (!seconds) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** "1.2M" */
export function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`;
  return views.toString();
}
