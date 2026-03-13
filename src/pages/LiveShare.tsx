import { useState, useEffect, useRef, useCallback } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Radio, Copy, Users, LogIn, Loader2, AlertCircle, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { joinRoom, isSupabaseConfigured, RoomChannel, RoomSyncPayload } from "@/lib/supabaseClient";

export default function LiveShare() {
  const { currentTrack, isPlaying, currentTime, audioRef, play, seek } = usePlayer();
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [isHosting, setIsHosting] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [memberCount, setMemberCount] = useState(1);
  const channelRef = useRef<RoomChannel | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const isGuestRef = useRef(false);

  // Broadcast current state every 3s (host only)
  const broadcastState = useCallback(async () => {
    if (!channelRef.current || !currentTrack || isGuestRef.current) return;
    const payload: RoomSyncPayload = {
      trackId: currentTrack.id,
      trackTitle: currentTrack.title,
      trackArtist: currentTrack.artist,
      trackCoverUrl: currentTrack.coverUrl,
      streamUrl: currentTrack.streamUrl || "",
      seekTime: audioRef.current?.currentTime || currentTime,
      isPlaying,
      timestamp: Date.now(),
    };
    await channelRef.current.broadcast(payload).catch(() => {});
    setMemberCount(channelRef.current.memberCount);
  }, [currentTrack, isPlaying, currentTime, audioRef]);

  // Auto-broadcast when host's track changes
  useEffect(() => {
    if (!isHosting || !channelRef.current) return;
    broadcastState();
  }, [isHosting, currentTrack, isPlaying, broadcastState]);

  // Periodic sync for seek position
  useEffect(() => {
    if (!isHosting) return;
    syncIntervalRef.current = setInterval(broadcastState, 3000);
    return () => clearInterval(syncIntervalRef.current);
  }, [isHosting, broadcastState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(syncIntervalRef.current);
      channelRef.current?.leave().catch(() => {});
    };
  }, []);

  const handleCreateRoom = async () => {
    if (!isSupabaseConfigured) {
      toast.error("أضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في .env");
      return;
    }
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setIsConnecting(true);
    try {
      isGuestRef.current = false;
      channelRef.current = await joinRoom(code);
      setRoomCode(code);
      setIsHosting(true);
      setMemberCount(1);
      toast.success(`🎙️ الغرفة ${code} جاهزة! شارك الكود مع أصدقائك.`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast.success("تم نسخ الكود!");
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    if (!isSupabaseConfigured) {
      toast.error("أضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في .env");
      return;
    }
    setIsConnecting(true);
    try {
      isGuestRef.current = true;
      channelRef.current = await joinRoom(joinCode);
      setIsJoined(true);

      // Subscribe to host's sync events
      channelRef.current.onSync((payload: RoomSyncPayload) => {
        const latency = Date.now() - payload.timestamp;
        const adjustedSeek = payload.seekTime + latency / 1000;

        if (payload.streamUrl) {
          play({
            id: payload.trackId,
            title: payload.trackTitle,
            artist: payload.trackArtist,
            coverUrl: payload.trackCoverUrl,
            streamUrl: payload.streamUrl,
          });
          // Sync seek position after short delay (audio needs to load)
          setTimeout(() => seek(adjustedSeek), 800);
        }
        setMemberCount(channelRef.current?.memberCount || 2);
      });

      toast.success(`✅ انضممت إلى الغرفة ${joinCode}`);
    } catch (err: any) {
      toast.error(err.message);
      setIsJoined(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLeave = async () => {
    clearInterval(syncIntervalRef.current);
    await channelRef.current?.leave().catch(() => {});
    channelRef.current = null;
    setIsHosting(false);
    setIsJoined(false);
    setRoomCode("");
    setJoinCode("");
    setMemberCount(1);
    toast.info("غادرت الغرفة");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">مشاركة مباشرة</h1>
        <p className="text-sm text-muted-foreground mt-1">استمع مع أصدقائك في الوقت الفعلي</p>
      </div>

      {/* Supabase config notice */}
      {!isSupabaseConfigured && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">يتطلب Supabase للمزامنة الحية</p>
            <p className="text-yellow-400/70 mt-0.5">أضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في .env (مشروع Supabase مجاني يكفي)</p>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {/* ── Host ──────────────────────────────────────────────────────── */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Radio className="h-5 w-5 text-primary" /> استضف غرفة
            </CardTitle>
            <CardDescription>شارك جلسة الاستماع مع الآخرين</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AnimatePresence mode="wait">
              {!isHosting ? (
                <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Button onClick={handleCreateRoom} className="w-full gap-2" disabled={isConnecting}>
                    {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
                    {isConnecting ? "جاري الإنشاء..." : "إنشاء غرفة"}
                  </Button>
                </motion.div>
              ) : (
                <motion.div key="hosting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-secondary rounded-lg px-4 py-3 font-mono text-xl text-center text-primary font-bold tracking-widest">
                      {roomCode}
                    </div>
                    <Button variant="outline" size="icon" onClick={handleCopyCode}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    الغرفة مباشرة — شارك الكود مع أصدقائك
                  </div>

                  {currentTrack ? (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary text-xs">
                      {currentTrack.coverUrl && (
                        <img src={currentTrack.coverUrl} className="w-8 h-8 rounded object-cover" alt="" />
                      )}
                      <div className="min-w-0">
                        <p className="text-foreground font-medium truncate">{currentTrack.title}</p>
                        <p className="text-muted-foreground">{currentTrack.artist}</p>
                      </div>
                      <div className={`ml-auto w-2 h-2 rounded-full ${isPlaying ? "bg-primary animate-pulse" : "bg-muted-foreground"}`} />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">شغّل أغنية لمشاركتها تلقائياً</p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" /> {memberCount} {memberCount === 1 ? "مستمع" : "مستمعين"}
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={handleLeave}>
                      إغلاق الغرفة
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* ── Join ──────────────────────────────────────────────────────── */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <LogIn className="h-5 w-5 text-accent" /> انضم لغرفة
            </CardTitle>
            <CardDescription>أدخل كود الغرفة للاستماع معاً</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AnimatePresence mode="wait">
              {!isJoined ? (
                <motion.div key="join-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  <Input
                    placeholder="أدخل الكود..."
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    className="bg-secondary border-border text-center font-mono text-xl tracking-widest uppercase"
                    maxLength={6}
                  />
                  <Button
                    onClick={handleJoin}
                    variant="outline"
                    className="w-full gap-2"
                    disabled={joinCode.length < 4 || isConnecting}
                  >
                    {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                    {isConnecting ? "جاري الانضمام..." : "انضم الآن"}
                  </Button>
                </motion.div>
              ) : (
                <motion.div key="joined" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    متصل بالغرفة {joinCode}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" /> {memberCount} مستمعين
                  </div>
                  <p className="text-xs text-muted-foreground">
                    الصوت يتزامن تلقائياً مع المضيف...
                  </p>
                  {currentTrack && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary text-xs">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <p className="text-foreground truncate">{currentTrack.title}</p>
                    </div>
                  )}
                  <Button variant="ghost" size="sm" className="text-xs" onClick={handleLeave}>
                    مغادرة الغرفة
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
