"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Music, Users, Trophy, Star, ListMusic, PlusCircle, BarChart3, Settings } from "lucide-react";

const MOBILE_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/music", label: "Music", icon: Music },
  { href: "/artists", label: "Artists", icon: Users },
  { href: "/my-top-4000", label: "My Top 4000", icon: Star },
  { href: "/top-4000", label: "Top 4000 Lists", icon: ListMusic },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/admin/add", label: "Add", icon: PlusCircle },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur md:hidden">
      <div className="flex overflow-x-auto scrollbar-hide">
        {MOBILE_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            {href}
              <Icon className = "h5 w-5 shrink-0" />
              <span className = "whitespace-nowrap">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
