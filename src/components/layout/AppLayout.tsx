import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import NowPlayingBar from "@/components/player/NowPlayingBar";

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 pb-[140px] md:pb-[80px] overflow-y-auto">
        <Outlet />
      </main>
      <MobileNav />
      <NowPlayingBar />
    </div>
  );
}
