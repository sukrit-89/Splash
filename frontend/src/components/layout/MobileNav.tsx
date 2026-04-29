import { Activity, ArrowRightLeft, LayoutDashboard, Plus } from "lucide-react";

const items = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Create", href: "/create", icon: Plus },
  { label: "Streams", href: "/dashboard", icon: ArrowRightLeft },
  { label: "Activity", href: "/dashboard#activity", icon: Activity },
];

export function MobileNav({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 grid h-16 grid-cols-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] lg:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href ||
          (item.label === "Streams" && pathname.startsWith("/stream"));

        return (
          <a
            className={`flex flex-col items-center justify-center gap-1 text-[10px] tracking-wide ${
              active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
            }`}
            href={item.href}
            key={item.label}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
