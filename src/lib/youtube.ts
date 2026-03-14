/**
 * MeTube — YouTube Data API v3
 * بحث حقيقي بدون حظر
 */

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const BASE = "https://www.googleapis.com/youtube/v3";

export interface VideoResult {
  videoId: string;
  title: string;
  author: string;
  lengthSeconds: number;
  viewCount: number;
  thumbnail: string;
}

export async function searchYouTube(query: string): Promise<VideoResult[]> {
  // خطوة 1: البحث
  const searchRes = await fetch(
    `${BASE}/search?part=snippet&type=video&videoCategoryId=10&q=${encodeURIComponent(query)}&maxResults=20&key=${API_KEY}`
  );
  if (!searchRes.ok) throw new Error("فشل البحث — تحقق من الـ API Key");
  const searchData = await searchRes.json();
  if (!searchData.items?.length) return [];

  // خطوة 2: جيب المدة وعدد المشاهدات
  const ids = searchData.items.map((i: any) => i.id.videoId).join(",");
  const detailRes = await fetch(
    `${BASE}/videos?part=contentDetails,statistics&id=${ids}&key=${API_KEY}`
  );
  const detailData = await detailRes.json();
  const details: Record<string, any> = {};
  detailData.items?.forEach((i: any) => { details[i.id] = i; });

  return searchData.items.map((item: any) => {
    const id = item.id.videoId;
    const d = details[id];
    return {
      videoId: id,
      title: item.snippet.title,
      author: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
      lengthSeconds: parseDuration(d?.contentDetails?.duration || "PT0S"),
      viewCount: parseInt(d?.statistics?.viewCount || "0"),
    };
  });
}

function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1]||"0")*3600) + (parseInt(m[2]||"0")*60) + parseInt(m[3]||"0");
}

export function formatDuration(s: number): string {
  if (!s) return "0:00";
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = Math.floor(s%60);
  if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  return `${m}:${String(sec).padStart(2,"0")}`;
}

export function formatViews(v: number): string {
  if (v >= 1e9) return `${(v/1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v/1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v/1e3).toFixed(1)}K`;
  return String(v);
}
