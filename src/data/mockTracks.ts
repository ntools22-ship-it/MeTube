import type { Track } from "@/contexts/PlayerContext";

export const featuredTracks: Track[] = [
  {
    id: "1",
    title: "Midnight Dreams",
    artist: "Synthwave Collective",
    album: "Neon Horizons",
    coverUrl: "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=300&h=300&fit=crop",
    streamUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: 372,
  },
  {
    id: "2",
    title: "Electric Pulse",
    artist: "Neon Echo",
    album: "Digital Horizon",
    coverUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop",
    streamUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duration: 298,
  },
  {
    id: "3",
    title: "Ocean Breeze",
    artist: "Chill Masters",
    album: "Ambient Waves",
    coverUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&h=300&fit=crop",
    streamUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    duration: 445,
  },
  {
    id: "4",
    title: "Urban Flow",
    artist: "Beat Architects",
    album: "City Sounds",
    coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop",
    streamUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    duration: 312,
  },
  {
    id: "5",
    title: "Starlight Serenade",
    artist: "Cosmic Drift",
    album: "Astral Planes",
    coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop",
    streamUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    duration: 389,
  },
  {
    id: "6",
    title: "Desert Wind",
    artist: "Arabic Fusion",
    album: "Eastern Echoes",
    coverUrl: "https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=300&h=300&fit=crop",
    streamUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    duration: 267,
  },
];

export const recentlyPlayed: Track[] = featuredTracks.slice(0, 4);

export const trendingTracks: Track[] = [...featuredTracks].reverse();
