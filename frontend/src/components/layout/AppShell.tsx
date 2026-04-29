import { ReactNode } from "react";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

interface AppShellProps {
  children: ReactNode;
  pathname: string;
  withSidebar?: boolean;
}

export function AppShell({
  children,
  pathname,
  withSidebar = true,
}: AppShellProps) {
  return (
    <>
      <Topbar />
      {withSidebar ? <Sidebar pathname={pathname} /> : null}
      <main
        className={`min-h-screen pt-[60px] ${
          withSidebar ? "pb-20 lg:ml-[220px] lg:pb-0" : ""
        }`}
      >
        {children}
      </main>
      {withSidebar ? <MobileNav pathname={pathname} /> : null}
    </>
  );
}
