/**
 * MeTube — YouTube Integration via Invidious API
 * بدون مفتاح API، بدون إعلانات، صوت فقط
 */

export interface VideoResult {
  videoId: string;
  title: string;
  author: string;
  lengthSeconds: number;
  viewCount: number;
  thumbnail: string;
}

// Invidious instances — tried in order, fallback automatically
const INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://yt.artemislena.eu",
  "https://invidious.privacydev.net",
  "https://vid.puffyan.us",
];

let workingInstance: string | null = null;

async function fetchAPI<T>(path: string): Promise<T> {
  // Try the last known-working instance first
  const ordered = workingInstance
    ? [workingInstance, ...INSTANCES.filter((i) => i !== workingInstance)]
    : INSTANCES;

  for (const instance of ordered) {
    try {
      const res = await fetch(`${instance}${path}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      workingInstance = instance; // cache successful instance
      return data as T;
    } catch {
      // try next instance
    }
  }
  throw new Error("جميع خوادم Invidious غير متاحة حالياً. حاول مرة أخرى.");
}

/**
 * Search YouTube via Invidious
 */
export async function searchYouTube(query: string): Promise<VideoResult[]> {
  const encoded = encodeURIComponent(query);
  const data = await fetchAPI<any[]>(
    `/api/v1/search?q=${encoded}&type=video&fields=videoId,title,author,lengthSeconds,viewCount,videoThumbnails`
  );

  return data
    .filter((item) => item.type === "video" || item.videoId)
    .slice(0, 20)
    .map((item) => ({
      videoId: item.videoId,
      title: item.title,
      author: item.author,
      lengthSeconds: item.lengthSeconds || 0,
      viewCount: item.viewCount || 0,
      thumbnail: getBestThumbnail(item.videoThumbnails, item.videoId),
    }));
}

function getBestThumbnail(
  thumbnails: any[] | undefined,
  videoId: string
): string {
  if (thumbnails && thumbnails.length > 0) {
    // Prefer medium quality thumbnail
    const medium = thumbnails.find((t) => t.quality === "medium" || t.quality === "mq");
    const any = thumbnails[0];
    const url = (medium || any)?.url || "";
    // Fix relative Invidious thumbnail URLs
    if (url.startsWith("/")) {
      return `${workingInstance || INSTANCES[0]}${url}`;
    }
    return url;
  }
  // Fallback to YouTube's thumbnail CDN
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

/**
 * Get the audio-only stream URL for a video
 * itag 139 = M4A 48kbps (data saver)
 * itag 140 = M4A 128kbps (normal quality)
 */
export async function getAudioStreamUrl(
  videoId: string,
  dataSaver = false
): Promise<string> {
  const instance = workingInstance || INSTANCES[0];
  const itag = dataSaver ? 139 : 140;

  // First try: direct /latest_version endpoint (redirects to CDN)
  // This works as an <audio> src without CORS issues
  const streamUrl = `${instance}/latest_version?id=${videoId}&itag=${itag}&local=true`;

  // Verify it exists by doing a HEAD request
  try {
    const check = await fetch(streamUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });
    if (check.ok || check.redirected) return streamUrl;
  } catch {
    // fallback to API-based URL resolution
  }

  // Fallback: get adaptive formats from video API
  try {
    const video = await fetchAPI<any>(`/api/v1/videos/${videoId}?fields=adaptiveFormats,videoId`);
    const formats: any[] = video.adaptiveFormats || [];

    const preferred = formats.find((f) => f.itag === itag);
    const fallback =
      formats.find((f) => f.itag === 140) ||
      formats.find((f) => f.type?.startsWith("audio/mp4")) ||
      formats.find((f) => f.type?.startsWith("audio/"));

    const chosen = preferred || fallback;
    if (chosen?.url) return chosen.url;
  } catch {
    // ignored
  }

  // Last resort: return the stream URL anyway (audio element handles redirects natively)
  return streamUrl;
}

/**
 * Format seconds → "3:45"
 */
export function formatDuration(seconds: number): string {
  if (!seconds) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Format view count → "1.2M"
 */
export function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`;
  return views.toString();
}
