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
  const res = await fetch(
    `${BASE}/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=25&key=${API_KEY}`
  );
  if (!res.ok) throw new Error("فشل البحث — تحقق من الـ API Key");
  const data = await res.json();
  if (!data.items?.length) return [];

  // جيب تفاصيل الفيديوهات
  const videoIds = data.items
    .filter((i: any) => i.id.kind === "youtube#video")
    .map((i: any) => i.id.videoId).join(",");

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
      return {
        type: "video",
        videoId: item.id.videoId,
        title: s.title,
        author: s.channelTitle,
        thumbnail: thumb,
        lengthSeconds: parseDuration(d?.contentDetails?.duration || "PT0S"),
        viewCount: parseInt(d?.statistics?.viewCount || "0"),
      };
    }
    if (item.id.kind === "youtube#playlist") {
      return {
        type: "playlist",
        playlistId: item.id.playlistId,
        title: s.title,
        channelTitle: s.channelTitle,
        thumbnail: thumb,
        itemCount: 0,
      };
    }
    // channel
    return {
      type: "channel",
      channelId: item.id.channelId,
      title: s.title,
      thumbnail: thumb,
      subscriberCount: "",
    };
  });
}

// جيب أول فيديو من قائمة تشغيل
export async function getPlaylistFirstVideo(playlistId: string): Promise<string | null> {
  const res = await fetch(
    `${BASE}/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=1&key=${API_KEY}`
  );
  const data = await res.json();
  return data.items?.[0]?.snippet?.resourceId?.videoId || null;
}

// جيب أول فيديو من قناة
export async function getChannelFirstVideo(channelId: string): Promise<string | null> {
  const res = await fetch(
    `${BASE}/search?part=snippet&channelId=${channelId}&type=video&maxResults=1&order=date&key=${API_KEY}`
  );
  const data = await res.json();
  return data.items?.[0]?.id?.videoId || null;
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
