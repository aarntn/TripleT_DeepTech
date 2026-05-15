export type PageId = "panel-management" | "business-roi";

export type NavItem = {
  id: PageId;
  label: string;
  description: string;
};

type SidebarProps = {
  navItems: NavItem[];
  activePage: PageId;
  open: boolean;
  onNavigate: (page: PageId) => void;
  onClose: () => void;
};

export function Sidebar({ navItems, activePage, open, onNavigate, onClose }: SidebarProps) {
  const content = (
    <aside className="flex h-full w-72 flex-col border-r border-slate-200 bg-slate-950 text-white shadow-xl lg:shadow-none">
      <div className="border-b border-white/10 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xl font-bold tracking-normal">SolarDust AI</p>
            <p className="mt-1 text-sm text-slate-400">Predictive cleaning intelligence</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/10 px-2 py-1 text-sm text-slate-300 lg:hidden"
          >
            Close
          </button>
        </div>
        <span className="mt-4 inline-flex rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-bold text-sky-200">
          Demo Mode
        </span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item, index) => {
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onNavigate(item.id);
                onClose();
              }}
              className={`w-full rounded-lg px-3 py-3 text-left transition ${
                active ? "bg-white text-slate-950 shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold ${
                    active ? "bg-slate-950 text-white" : "bg-white/10 text-slate-300"
                  }`}
                >
                  {index + 1}
                </span>
                <span>
                  <span className="block text-sm font-bold">{item.label}</span>
                  <span className={`mt-0.5 block text-xs ${active ? "text-slate-500" : "text-slate-500"}`}>
                    {item.description}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prototype status</p>
        <p className="mt-2 text-sm text-slate-300">Frontend-only mock data. No backend services connected.</p>
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
