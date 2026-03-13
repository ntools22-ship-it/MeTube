/**
 * MeTube — YouTube Search (Client-Side)
 * البحث يتم من المتصفح مباشرة عبر CORS proxy
 * Vercel IP محظور من YouTube، لكن IP المتصفح مسموح
 */

export interface VideoResult {
  videoId: string;
  title: string;
  author: string;
  lengthSeconds: number;
  viewCount: number;
  thumbnail: string;
}

// CORS proxies — تُجرَّب بالترتيب
const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

async function fetchViaProxy(targetUrl: string): Promise<string> {
  for (const makeProxy of CORS_PROXIES) {
    try {
      const proxyUrl = makeProxy(targetUrl);
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;

      const data = await res.json();
      // allorigins و corsproxy يرجعوا { contents: "..." }
      const html = data?.contents || data;
      if (typeof html === "string" && html.length > 1000) return html;
    } catch {
      continue;
    }
  }
  throw new Error("جميع الـ proxies فشلت، تحقق من اتصال الإنترنت");
}

/**
 * البحث على YouTube
 */
export async function searchYouTube(query: string): Promise<VideoResult[]> {
  const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=en&gl=US`;
  
  const html = await fetchViaProxy(ytUrl);

  // استخراج ytInitialData
  const match =
    html.match(/var ytInitialData\s*=\s*({.+?});\s*<\/script>/s) ||
    html.match(/ytInitialData\s*=\s*({.+?});\s*(?:\/\/|var |<\/script>)/s);

  if (!match?.[1]) {
    throw new Error("تعذّر تحليل نتائج YouTube");
  }

  let data: any;
  try {
    data = JSON.parse(match[1]);
  } catch {
    throw new Error("بيانات YouTube غير صالحة");
  }

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

  if (results.length === 0) {
    throw new Error("لا توجد نتائج — قد يكون البحث محجوباً مؤقتاً، حاول مرة أخرى");
  }

  return results;
}

/**
 * رابط الصوت — عبر Invidious (من المتصفح، أسهل من البحث)
 */
const INVIDIOUS = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://yt.artemislena.eu",
  "https://iv.datura.network",
];

export async function getAudioStreamUrl(videoId: string, dataSaver = false): Promise<string> {
  const itag = dataSaver ? 139 : 140;

  // أولاً: جرّب Vercel proxy (api/stream.js)
  try {
    const res = await fetch(`/api/stream?id=${videoId}&itag=${itag}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.url) return data.url;
    }
  } catch { /* fallback */ }

  // ثانياً: جرّب Invidious مباشرة من المتصفح
  for (const instance of INVIDIOUS) {
    try {
      const res = await fetch(
        `${instance}/api/v1/videos/${videoId}?fields=adaptiveFormats`,
        { signal: AbortSignal.timeout(7000) }
      );
      if (!res.ok) continue;

      const data = await res.json();
      const formats: any[] = data.adaptiveFormats || [];
      const chosen =
        formats.find((f) => f.itag === itag) ||
        formats.find((f) => f.itag === 140) ||
        formats.find((f) => f.type?.startsWith("audio/mp4"));

      if (chosen?.url) return chosen.url;

      // /latest_version fallback
      return `${instance}/latest_version?id=${videoId}&itag=${itag}&local=true`;
    } catch { continue; }
  }

  throw new Error("تعذّر تحميل الصوت، حاول مرة أخرى");
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseDuration(str: string): number {
  if (!str) return 0;
  const parts = str.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function parseViews(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/[^0-9KMB.]/gi, "");
  if (/B/i.test(str)) return parseFloat(cleaned) * 1_000_000_000;
  if (/M/i.test(str)) return parseFloat(cleaned) * 1_000_000;
  if (/K/i.test(str)) return parseFloat(cleaned) * 1_000;
  return parseInt(cleaned) || 0;
}

export function formatDuration(seconds: number): string {
  if (!seconds) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`;
  return views.toString();
}
