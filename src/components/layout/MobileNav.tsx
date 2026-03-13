import { NavLink } from "react-router-dom";
import { Home, Search, Library, Mic, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/search", icon: Search, label: "Search" },
  { to: "/library", icon: Library, label: "Library" },
  { to: "/ai-tools", icon: Mic, label: "AI" },
  { to: "/live-share", icon: Radio, label: "Live" },
];

export default function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-[72px] left-0 right-0 z-40 glass border-t border-border">
      <div className="flex items-center justify-around h-14">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
