/**
 * MeTube — YouTube Search (Client-Side via CORS Proxy)
 * البحث من المتصفح مباشرة — نجح في Colab Cell 3
 * الصوت عبر IFrame API — مفيش URL مطلوب
 */

export interface VideoResult {
  videoId: string;
  title: string;
  author: string;
  lengthSeconds: number;
  viewCount: number;
  thumbnail: string;
}

const PROXIES = [
  (u: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
  (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
];

async function fetchHTML(targetUrl: string): Promise<string> {
  for (const makeProxy of PROXIES) {
    try {
      const res = await fetch(makeProxy(targetUrl), { signal: AbortSignal.timeout(12000) });
      if (!res.ok) continue;
      const data = await res.json();
      const html = data?.contents;
      if (typeof html === "string" && html.length > 500) return html;
    } catch { continue; }
  }
  throw new Error("فشل جلب نتائج البحث — تحقق من اتصال الإنترنت");
}

export async function searchYouTube(query: string): Promise<VideoResult[]> {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=en&gl=US`;
  const html = await fetchHTML(url);

  const match =
    html.match(/var ytInitialData\s*=\s*({.+?});\s*<\/script>/s) ||
    html.match(/ytInitialData\s*=\s*({.+?});\s*(?:var |<\/script>)/s);

  if (!match?.[1]) throw new Error("تعذّر تحليل نتائج YouTube");

  const data = JSON.parse(match[1]);
  const contents: any[] =
    data?.contents?.twoColumnSearchResultsRenderer
      ?.primaryContents?.sectionListRenderer
      ?.contents?.[0]?.itemSectionRenderer?.contents || [];

  const results: VideoResult[] = [];
  for (const item of contents) {
    const v = item?.videoRenderer;
    if (!v?.videoId) continue;
    results.push({
      videoId: v.videoId,
      title: v.title?.runs?.[0]?.text || v.title?.simpleText || "بدون عنوان",
      author: v.ownerText?.runs?.[0]?.text || v.shortBylineText?.runs?.[0]?.text || "",
      lengthSeconds: parseDuration(v.lengthText?.simpleText || ""),
      viewCount: parseViews(v.viewCountText?.simpleText || v.shortViewCountText?.simpleText || ""),
      thumbnail: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
    });
    if (results.length >= 20) break;
  }

  if (results.length === 0) throw new Error("لا توجد نتائج، حاول مرة أخرى");
  return results;
}

// IFrame API — مفيش streamUrl مطلوب، الـ videoId يكفي
export async function getAudioStreamUrl(videoId: string): Promise<string> {
  return `youtube:${videoId}`; // placeholder — IFrame يتعامل معاه مباشرة
}

function parseDuration(str: string): number {
  if (!str) return 0;
  const p = str.split(":").map(Number);
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  if (p.length === 2) return p[0] * 60 + p[1];
  return 0;
}

function parseViews(str: string): number {
  if (!str) return 0;
  if (/B/i.test(str)) return parseFloat(str) * 1e9;
  if (/M/i.test(str)) return parseFloat(str) * 1e6;
  if (/K/i.test(str)) return parseFloat(str) * 1e3;
  return parseInt(str.replace(/\D/g, "")) || 0;
}

export function formatDuration(s: number): string {
  if (!s) return "0:00";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  return `${m}:${String(sec).padStart(2,"0")}`;
}

export function formatViews(v: number): string {
  if (v >= 1e6) return `${(v/1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v/1e3).toFixed(1)}K`;
  return String(v);
}
