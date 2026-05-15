type PageHeaderProps = {
  title: string;
  eyebrow: string;
  description: string;
};

export function PageHeader({ title, eyebrow, description }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
            {eyebrow}
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Demo Mode: Simulated IoT Feed
          </span>
          <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            Weather Forecast: Auto Input
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">{title}</h1>
        <p className="mt-2 max-w-3xl text-base leading-6 text-slate-600">{description}</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Forecast feed</p>
        <p className="mt-1 text-sm font-semibold text-slate-950">Farm A: stable irradiance, low rain risk</p>
      </div>
    </header>
  );
}
