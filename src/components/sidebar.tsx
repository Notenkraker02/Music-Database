"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Music, Users, Star, ListMusic,
  PlusCircle, BarChart3, Settings, Disc3
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/music", label: "All Music", icon: Music },
  { href: "/artists", label: "Artists", icon: Users },
  { href: "/my-top-4000", label: "My Top 4000", icon: Star },
  { href: "/top-4000", label: "Top 4000 Lists", icon: ListMusic },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/admin/add", label: "Add Music", icon: PlusCircle },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-ink-900 border-r border-ink-800 z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-ink-800">
        <Disc3 className="w-7 h-7 text-groove" />
        <span className="font-display font-bold text-lg text-white tracking-tight">
          My Collection
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-groove/10 text-groove"
                  : "text-ink-400 hover:text-ink-100 hover:bg-ink-800"
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-ink-800">
        <p className="text-xs text-ink-500">Music Collection v1.0</p>
      </div>
    </aside>
  );
}
