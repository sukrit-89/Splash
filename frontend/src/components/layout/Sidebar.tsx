import {
  Activity,
  ArrowRightLeft,
  BookOpen,
  GitBranch,
  LayoutDashboard,
  Plus,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  external?: boolean;
}

const mainItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Create Stream", href: "/create", icon: Plus },
  { label: "My Streams", href: "/dashboard", icon: ArrowRightLeft },
  { label: "Activity", href: "/dashboard#activity", icon: Activity },
];

const externalItems: NavItem[] = [
  { label: "Docs", href: "https://developers.stellar.org/docs", icon: BookOpen, external: true },
  { label: "GitHub", href: "https://github.com", icon: GitBranch, external: true },
];

function SidebarLink({
  item,
  active,
}: {
  item: NavItem;
  active: boolean;
}) {
  const Icon = item.icon;

  return (
    <a
      className={`relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150 ${
        active
          ? "border border-[var(--border-subtle)] bg-[var(--bg-active)] text-[var(--text-primary)] before:absolute before:bottom-2 before:left-0 before:top-2 before:w-0.5 before:rounded-full before:bg-[var(--accent)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
      }`}
      href={item.href}
      rel={item.external ? "noreferrer" : undefined}
      target={item.external ? "_blank" : undefined}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </a>
  );
}

export function Sidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="fixed bottom-0 left-0 top-[60px] hidden w-[220px] border-r border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-4 lg:block">
      <nav className="space-y-1">
        {mainItems.map((item) => (
          <SidebarLink
            active={
              pathname === item.href ||
              (item.label === "My Streams" && pathname.startsWith("/stream"))
            }
            item={item}
            key={item.label}
          />
        ))}
        <div className="my-2 border-t border-white/5" />
        {externalItems.map((item) => (
          <SidebarLink active={false} item={item} key={item.label} />
        ))}
      </nav>
      <div className="absolute bottom-4 left-3 right-3 font-mono text-[11px] text-[var(--text-muted)]">
        <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
        RPC Connected
      </div>
    </aside>
  );
}
