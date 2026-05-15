import type { ReactNode } from "react";

import { Sidebar, type NavItem, type PageId } from "./Sidebar";
import { DataSource } from "../hooks/useSolarGuardData";

type DashboardShellProps = {
  activePage: PageId;
  navItems: NavItem[];
  sidebarOpen: boolean;
  children: ReactNode;
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
  onNavigate,
  onOpenSidebar,
  onCloseSidebar,
  dataSource,
}: DashboardShellProps) {
  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <Sidebar
        navItems={navItems}
        activePage={activePage}
        open={sidebarOpen}
        onNavigate={onNavigate}
        onClose={onCloseSidebar}
        dataSource={dataSource}
      />
      <div className="lg:pl-72">
        <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm"
          >
            Menu
          </button>
          <p className="text-sm font-bold text-slate-950">SolarGuard</p>
          <span className="h-9 w-16" />
        </div>
        <div className="mx-auto max-w-7xl px-5 py-6 lg:px-8">{children}</div>
      </div>
    </main>
  );
}
