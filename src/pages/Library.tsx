import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import TrackCard from "@/components/TrackCard";
import { featuredTracks } from "@/data/mockTracks";
import { Plus, Music, ListMusic } from "lucide-react";

export default function Library() {
  const [playlists] = useState([
    { id: "fav", name: "Favorites", tracks: featuredTracks.slice(0, 3) },
    { id: "chill", name: "Chill Vibes", tracks: featuredTracks.slice(2, 5) },
  ]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Your Library</h1>
        <Button size="sm" variant="outline" className="gap-2">
          <Plus className="h-4 w-4" /> New Playlist
        </Button>
      </div>

      <Tabs defaultValue="playlists">
        <TabsList className="bg-secondary">
          <TabsTrigger value="playlists" className="gap-1.5">
            <ListMusic className="h-4 w-4" /> Playlists
          </TabsTrigger>
          <TabsTrigger value="tracks" className="gap-1.5">
            <Music className="h-4 w-4" /> All Tracks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="playlists" className="space-y-6 mt-4">
          {playlists.map(pl => (
            <div key={pl.id}>
              <h3 className="font-display font-semibold text-foreground mb-2">{pl.name}</h3>
              <div className="space-y-1">
                {pl.tracks.map(t => (
                  <TrackCard key={t.id} track={t} variant="row" />
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="tracks" className="mt-4">
          <div className="space-y-1">
            {featuredTracks.map(t => (
              <TrackCard key={t.id} track={t} variant="row" />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
