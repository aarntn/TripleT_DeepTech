import type { ReactNode } from "react";

import { Sidebar, type NavItem, type PageId } from "./Sidebar";
import { DataSource } from "../hooks/useSolarGuardData";

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
  status?: {
    source: DataSource;
    error: string | null;
    lastUpdated: Date | null;
    refreshing: boolean;
    staleBackendData: boolean;
    latestSensorTimestamp?: string;
    weatherUnavailable: boolean;
    onRefresh: () => void;
  };
};

function DataStatusBanner({ status }: { status: NonNullable<DashboardShellProps["status"]> }) {
  const tone =
    status.source === "error"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : status.source === "backend"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-amber-200 bg-amber-50 text-amber-800";

  const label =
    status.source === "backend"
      ? status.staleBackendData
        ? "Backend connected - demo CSV"
        : "Backend connected"
      : status.source === "fallback"
        ? "Fallback mock data"
        : status.source === "error"
          ? "Backend error"
          : "Mock data";

  const timestamp = status.latestSensorTimestamp
    ? new Date(status.latestSensorTimestamp).toLocaleString("en-MY", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div className={`flex flex-col gap-3 rounded-xl border px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between ${tone}`}>
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-1 text-xs font-medium opacity-80">
          {status.error
            ? status.error
            : timestamp
              ? `Latest sensor row: ${timestamp}${status.weatherUnavailable ? " - weather unavailable" : ""}`
              : status.weatherUnavailable
                ? "Weather unavailable"
                : "Using configured dashboard data source."}
        </p>
      </div>
      <button
        type="button"
        onClick={status.onRefresh}
        disabled={status.refreshing}
        className="w-fit rounded-md border border-current/20 bg-white/60 px-3 py-1.5 text-xs font-semibold transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status.refreshing ? "Refreshing..." : "Refresh"}
      </button>
    </div>
  );
}

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
  status,
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
            <p className="text-sm font-semibold text-slate-950">SolarDust AI</p>
            <span className="h-9 w-16" />
          </div>
        )}
        <div className={fullHeight ? "relative h-full" : "w-full px-5 py-8 lg:px-8"}>
          {status ? (
            <div className={fullHeight ? "absolute left-4 right-4 top-4 z-20 lg:left-8 lg:right-8" : "mb-5"}>
              <DataStatusBanner status={status} />
            </div>
          ) : null}
          <div className={fullHeight && status ? "h-full pt-28" : fullHeight ? "h-full" : ""}>{children}</div>
        </div>
      </div>
    </main>
  );
}
