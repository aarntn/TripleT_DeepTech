export type PageId = "overview" | "map-view" | "panel-detail" | "revenue-intelligence";

export type NavItem = {
  id: PageId;
  label: string;
  section: "MONITORING" | "INSIGHTS";
  icon: "overview" | "map" | "revenue";
};

type SidebarProps = {
  navItems: NavItem[];
  activePage: PageId;
  open: boolean;
  onNavigate: (page: PageId) => void;
  onClose: () => void;
  dataSource?: "backend" | "mock" | "fallback" | "error";
};

export function Sidebar({ navItems, activePage, open, onNavigate, onClose, dataSource = "mock" }: SidebarProps) {
  const groupedItems = navItems.reduce<Record<NavItem["section"], NavItem[]>>(
    (groups, item) => {
      groups[item.section].push(item);
      return groups;
    },
    { MONITORING: [], INSIGHTS: [] },
  );

  const iconFor = (icon: NavItem["icon"]) => {
    if (icon === "overview") {
      return (
        <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
          <path d="M6.25 13.75V8.5M10 13.75v-7.5M13.75 13.75v-3.25M4.25 16.25h11.5a.5.5 0 0 0 .5-.5V4.25a.5.5 0 0 0-.5-.5H4.25a.5.5 0 0 0-.5.5v11.5a.5.5 0 0 0 .5.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
        </svg>
      );
    }

    if (icon === "map") {
      return (
        <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
          <path d="m7.25 4.5 5.5-2 3.5 1.5v11.5l-3.5-1.5-5.5 2-3.5-1.5V3l3.5 1.5Zm0 0V16m5.5-13.5V14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
        </svg>
      );
    }

    return (
      <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
        <path d="M10 17.25a7.25 7.25 0 1 0 0-14.5 7.25 7.25 0 0 0 0 14.5Zm0-11v7.5m2.25-5.5c-.45-.57-1.14-.86-2.06-.86-1.1 0-1.94.52-1.94 1.46 0 .98.83 1.29 1.75 1.48l.58.12c.95.2 1.67.5 1.67 1.44 0 .94-.82 1.5-2.06 1.5-.99 0-1.77-.33-2.25-.98" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      </svg>
    );
  };
  const dataSourceLabel =
    dataSource === "backend"
      ? "Backend demo CSV"
      : dataSource === "fallback"
        ? "Fallback mock"
        : dataSource === "error"
          ? "Backend error"
          : "Mock demo";

  const content = (
    <aside className="flex h-full w-[280px] flex-col bg-[#fafafa] p-0 text-[#181d27] shadow-xl lg:shadow-none">
      <div className="m-0 flex h-full flex-col justify-between rounded-xl border border-[#e9eaeb] bg-white shadow-[0_1px_2px_rgba(10,13,18,0.05)]">
      <div className="p-5 pt-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative size-7 overflow-hidden rounded-[7px] border border-black/10 bg-white shadow-[0_1px_3px_rgba(10,13,18,0.16)]">
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.4),rgba(10,13,18,0.12))]" />
              <div className="absolute inset-[7px] rounded-full bg-[#6941c6] shadow-inner" />
              <div className="absolute left-2 top-2 size-2 rounded-full bg-white/45" />
            </div>
            <p className="text-xl font-semibold tracking-normal">SolarDust AI</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#e9eaeb] px-2 py-1 text-sm font-semibold text-[#414651] lg:hidden"
          >
            Close
          </button>
        </div>

        <nav className="mt-7 space-y-8">
          {(["MONITORING", "INSIGHTS"] as const).map((section) => (
            <div key={section} className="space-y-1">
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-normal text-[#717680]">{section}</p>
              {groupedItems[section].map((item) => {
                const active = activePage === item.id || (item.id === "map-view" && activePage === "panel-detail");
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onNavigate(item.id);
                      onClose();
                    }}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-base transition ${
                      active ? "bg-[#fafafa] font-semibold text-[#252b37]" : "font-medium text-[#414651] hover:bg-[#fafafa]"
                    }`}
                  >
                    <span className="text-[#717680]">{iconFor(item.icon)}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      <div className="p-5">
        <div className="rounded-xl border border-[#e9eaeb] bg-[#fafafa] px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-normal text-[#717680]">Data source</p>
          <p className="mt-1 text-sm font-semibold text-[#181d27]">{dataSourceLabel}</p>
        </div>
      </div>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block">{content}</div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close sidebar"
            className="absolute inset-0 bg-slate-950/60"
            onClick={onClose}
          />
          <div className="relative h-full">{content}</div>
        </div>
      )}
    </>
  );
}
