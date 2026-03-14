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

export async function searchYouTube(query: string): Promise<SearchResult[]> {
  const res = await fetch(`${BASE}/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=25&key=${API_KEY}`);
  if (!res.ok) throw new Error("فشل البحث — تحقق من الـ API Key");
  const data = await res.json();
  if (!data.items?.length) return [];

  const videoIds = data.items.filter((i: any) => i.id.kind === "youtube#video").map((i: any) => i.id.videoId).join(",");
  let videoDetails: Record<string, any> = {};
  if (videoIds) {
    const dRes = await fetch(`${BASE}/videos?part=contentDetails,statistics&id=${videoIds}&key=${API_KEY}`);
    const dData = await dRes.json();
    dData.items?.forEach((i: any) => { videoDetails[i.id] = i; });
  }

  return data.items.map((item: any): SearchResult => {
    const s = item.snippet;
    const thumb = s.thumbnails?.medium?.url || s.thumbnails?.default?.url || "";
    if (item.id.kind === "youtube#video") {
      const d = videoDetails[item.id.videoId];
      return { type: "video", videoId: item.id.videoId, title: s.title, author: s.channelTitle, thumbnail: thumb, lengthSeconds: parseDuration(d?.contentDetails?.duration || "PT0S"), viewCount: parseInt(d?.statistics?.viewCount || "0") };
    }
    if (item.id.kind === "youtube#playlist") {
      return { type: "playlist", playlistId: item.id.playlistId, title: s.title, channelTitle: s.channelTitle, thumbnail: thumb, itemCount: 0 };
    }
    return { type: "channel", channelId: item.id.channelId, title: s.title, thumbnail: thumb, subscriberCount: "" };
  });
}

// فيديوهات قائمة تشغيل
export async function getPlaylistVideos(playlistId: string): Promise<VideoResult[]> {
  const res = await fetch(`${BASE}/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=30&key=${API_KEY}`);
  const data = await res.json();
  if (!data.items?.length) return [];
  const ids = data.items.map((i: any) => i.snippet.resourceId.videoId).filter(Boolean).join(",");
  let details: Record<string, any> = {};
  if (ids) {
    const dRes = await fetch(`${BASE}/videos?part=contentDetails,statistics&id=${ids}&key=${API_KEY}`);
    const dData = await dRes.json();
    dData.items?.forEach((i: any) => { details[i.id] = i; });
  }
  return data.items
    .filter((i: any) => i.snippet.resourceId.videoId)
    .map((item: any): VideoResult => {
      const s = item.snippet;
      const vid = s.resourceId.videoId;
      const d = details[vid];
      return { type: "video", videoId: vid, title: s.title, author: s.channelTitle || s.videoOwnerChannelTitle || "", thumbnail: s.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`, lengthSeconds: parseDuration(d?.contentDetails?.duration || "PT0S"), viewCount: parseInt(d?.statistics?.viewCount || "0") };
    });
}

// فيديوهات وقوائم القناة
export async function getChannelContent(channelId: string): Promise<SearchResult[]> {
  const [videosRes, playlistsRes] = await Promise.all([
    fetch(`${BASE}/search?part=snippet&channelId=${channelId}&type=video&maxResults=20&order=date&key=${API_KEY}`),
    fetch(`${BASE}/playlists?part=snippet,contentDetails&channelId=${channelId}&maxResults=10&key=${API_KEY}`),
  ]);
  const videosData = await videosRes.json();
  const playlistsData = await playlistsRes.json();

  const ids = videosData.items?.map((i: any) => i.id.videoId).filter(Boolean).join(",") || "";
  let details: Record<string, any> = {};
  if (ids) {
    const dRes = await fetch(`${BASE}/videos?part=contentDetails,statistics&id=${ids}&key=${API_KEY}`);
    const dData = await dRes.json();
    dData.items?.forEach((i: any) => { details[i.id] = i; });
  }

  const videos: VideoResult[] = (videosData.items || []).map((item: any): VideoResult => {
    const d = details[item.id.videoId];
    return { type: "video", videoId: item.id.videoId, title: item.snippet.title, author: item.snippet.channelTitle, thumbnail: item.snippet.thumbnails?.medium?.url || "", lengthSeconds: parseDuration(d?.contentDetails?.duration || "PT0S"), viewCount: parseInt(d?.statistics?.viewCount || "0") };
  });

  const playlists: PlaylistResult[] = (playlistsData.items || []).map((item: any): PlaylistResult => ({
    type: "playlist", playlistId: item.id, title: item.snippet.title, channelTitle: item.snippet.channelTitle, thumbnail: item.snippet.thumbnails?.medium?.url || "", itemCount: item.contentDetails?.itemCount || 0,
  }));

  return [...playlists, ...videos];
}

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
