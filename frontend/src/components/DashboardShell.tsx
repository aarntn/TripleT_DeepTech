import type { ReactNode } from "react";

import { Sidebar, type NavItem, type PageId } from "./Sidebar";
import { DataSource } from "../hooks/useSolarGuardData";
import solareLogo from "../assets/solare-logo.svg";

type DashboardShellProps = {
  activePage: PageId;
  navItems: NavItem[];
  sidebarOpen: boolean;
  children: ReactNode;
  fullHeight?: boolean;
  onNavigate: (page: PageId) => void;
  onOpenSidebar: () => void;
  onCloseSidebar: () => void;
  dataSource: DataSource;
};

export function DashboardShell({
  activePage,
  navItems,
  sidebarOpen,
  children,
  fullHeight = false,
  onNavigate,
  onOpenSidebar,
  onCloseSidebar,
  dataSource,
}: DashboardShellProps) {
  return (
    <main className={`${fullHeight ? "h-screen overflow-hidden" : "min-h-screen"} bg-[#fafafa] text-[#181d27]`}>
      <Sidebar
        navItems={navItems}
        activePage={activePage}
        open={sidebarOpen}
        onNavigate={onNavigate}
        onClose={onCloseSidebar}
        dataSource={dataSource}
      />
      <div className={`lg:pl-[280px] ${fullHeight ? "h-full" : ""}`}>
        {!fullHeight && (
          <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
            <button
              type="button"
              onClick={onOpenSidebar}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm"
            >
              Menu
            </button>
            <div className="flex items-center gap-2">
              <img src={solareLogo} alt="" className="size-6 rounded-md" />
              <p className="text-sm font-semibold text-slate-950">Solare</p>
            </div>
            <span className="h-9 w-16" />
          </div>
        )}
        <div className={fullHeight ? "h-full" : "w-full px-5 py-8 lg:px-8"}>{children}</div>
      </div>
    </main>
  );
}
