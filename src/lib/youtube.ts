/**
 * MeTube — YouTube Data API v3
 * + pagination كاملة للـ playlists
 */

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const BASE = "https://www.googleapis.com/youtube/v3";

export interface VideoResult {
  type: "video";
  videoId: string;
  title: string;
  author: string;
  lengthSeconds: number;
  viewCount: number;
  thumbnail: string;
  description?: string;
}
export interface PlaylistResult {
  type: "playlist";
  playlistId: string;
  title: string;
  channelTitle: string;
  itemCount: number;
  thumbnail: string;
}
export interface ChannelResult {
  type: "channel";
  channelId: string;
  title: string;
  thumbnail: string;
  subscriberCount: string;
}
export type SearchResult = VideoResult | PlaylistResult | ChannelResult;

// ── بحث عام ───────────────────────────────────────────────────────────────────
export async function searchYouTube(query: string): Promise<SearchResult[]> {
  const res = await fetch(
    `${BASE}/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=25&key=${API_KEY}`
  );
  if (!res.ok) throw new Error("فشل البحث — تحقق من الـ API Key");
  const data = await res.json();
  if (!data.items?.length) return [];

  const videoIds = data.items
    .filter((i: any) => i.id.kind === "youtube#video")
    .map((i: any) => i.id.videoId).join(",");

  let details: Record<string, any> = {};
  if (videoIds) {
    const d = await fetch(`${BASE}/videos?part=contentDetails,statistics,snippet&id=${videoIds}&key=${API_KEY}`);
    const dd = await d.json();
    dd.items?.forEach((i: any) => { details[i.id] = i; });
  }

  return data.items.map((item: any): SearchResult => {
    const s = item.snippet;
    const thumb = s.thumbnails?.medium?.url || "";
    if (item.id.kind === "youtube#video") {
      const d = details[item.id.videoId];
      return {
        type: "video", videoId: item.id.videoId, title: s.title,
        author: s.channelTitle, thumbnail: thumb,
        lengthSeconds: parseDuration(d?.contentDetails?.duration || "PT0S"),
        viewCount: parseInt(d?.statistics?.viewCount || "0"),
        description: d?.snippet?.description || s.description || "",
      };
    }
    if (item.id.kind === "youtube#playlist") {
      return { type: "playlist", playlistId: item.id.playlistId, title: s.title, channelTitle: s.channelTitle, thumbnail: thumb, itemCount: 0 };
    }
    return { type: "channel", channelId: item.id.channelId, title: s.title, thumbnail: thumb, subscriberCount: "" };
  });
}

// ── playlist كاملة مع pagination ──────────────────────────────────────────────
export async function getPlaylistVideos(playlistId: string): Promise<VideoResult[]> {
  const all: any[] = [];
  let pageToken = "";

  // جيب كل الصفحات (50 في كل مرة)
  do {
    const url = `${BASE}/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${API_KEY}${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const res = await fetch(url);
    const data = await res.json();
    all.push(...(data.items || []));
    pageToken = data.nextPageToken || "";
  } while (pageToken);

  const ids = all.map(i => i.snippet?.resourceId?.videoId).filter(Boolean);
  if (!ids.length) return [];

  // جيب التفاصيل على دفعات (100 كحد أقصى لكل request)
  let details: Record<string, any> = {};
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50).join(",");
    const d = await fetch(`${BASE}/videos?part=contentDetails,statistics&id=${chunk}&key=${API_KEY}`);
    const dd = await d.json();
    dd.items?.forEach((v: any) => { details[v.id] = v; });
  }

  return all
    .filter(i => i.snippet?.resourceId?.videoId)
    .map((item): VideoResult => {
      const s = item.snippet;
      const vid = s.resourceId.videoId;
      const d = details[vid];
      return {
        type: "video", videoId: vid, title: s.title,
        author: s.videoOwnerChannelTitle || s.channelTitle || "",
        thumbnail: s.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`,
        lengthSeconds: parseDuration(d?.contentDetails?.duration || "PT0S"),
        viewCount: parseInt(d?.statistics?.viewCount || "0"),
      };
    });
}

// ── محتوى القناة ──────────────────────────────────────────────────────────────
export async function getChannelContent(channelId: string): Promise<SearchResult[]> {
  const [vRes, pRes] = await Promise.all([
    fetch(`${BASE}/search?part=snippet&channelId=${channelId}&type=video&maxResults=25&order=date&key=${API_KEY}`),
    fetch(`${BASE}/playlists?part=snippet,contentDetails&channelId=${channelId}&maxResults=15&key=${API_KEY}`),
  ]);
  const [vData, pData] = await Promise.all([vRes.json(), pRes.json()]);

  const ids = (vData.items || []).map((i: any) => i.id.videoId).filter(Boolean).join(",");
  let details: Record<string, any> = {};
  if (ids) {
    const d = await fetch(`${BASE}/videos?part=contentDetails,statistics&id=${ids}&key=${API_KEY}`);
    const dd = await d.json();
    dd.items?.forEach((i: any) => { details[i.id] = i; });
  }

  const videos: VideoResult[] = (vData.items || []).map((item: any): VideoResult => {
    const d = details[item.id.videoId];
    return { type: "video", videoId: item.id.videoId, title: item.snippet.title, author: item.snippet.channelTitle, thumbnail: item.snippet.thumbnails?.medium?.url || "", lengthSeconds: parseDuration(d?.contentDetails?.duration || "PT0S"), viewCount: parseInt(d?.statistics?.viewCount || "0") };
  });

  const playlists: PlaylistResult[] = (pData.items || []).map((item: any): PlaylistResult => ({
    type: "playlist", playlistId: item.id, title: item.snippet.title, channelTitle: item.snippet.channelTitle, thumbnail: item.snippet.thumbnails?.medium?.url || "", itemCount: item.contentDetails?.itemCount || 0,
  }));

  return [...playlists, ...videos];
}

// ── جيب تفاصيل فيديو واحد (للـ AI tools) ────────────────────────────────────
export async function getVideoDetails(videoId: string): Promise<{ title: string; description: string; channelTitle: string } | null> {
  const res = await fetch(`${BASE}/videos?part=snippet&id=${videoId}&key=${API_KEY}`);
  const data = await res.json();
  const item = data.items?.[0];
  if (!item) return null;
  return { title: item.snippet.title, description: item.snippet.description || "", channelTitle: item.snippet.channelTitle };
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1]||"0")*3600)+(parseInt(m[2]||"0")*60)+parseInt(m[3]||"0");
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
