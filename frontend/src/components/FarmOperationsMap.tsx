import { getPanelStatus, type PanelId } from "../data/mockSolarData";
import { type RuntimePanel } from "../utils/solarCalculations";
import satelliteMap from "../assets/solar-farm-satellite-vertical.png";

type FarmOperationsMapProps = {
  panels: RuntimePanel[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const panelShapes: Record<PanelId, { points: string; labelX: number; labelY: number }> = {
  A1: { points: "238,171 138,288 138,300 147,303 148,313 240,334 242,334 242,303 250,296 269,178 240,171", labelX: 204, labelY: 253 },
  A2: { points: "334,101 313,112 297,206 289,218 289,256 395,295 396,295 429,225 423,137 336,101", labelX: 359, labelY: 198 },
  B1: { points: "130,324 116,346 103,347 83,410 78,473 198,493 199,493 233,373 232,347 131,324", labelX: 155, labelY: 408 },
  B2: { points: "279,275 253,391 257,420 387,455 388,455 393,316 281,275", labelX: 323, labelY: 365 },
  C1: { points: "75,490 61,528 49,528 39,548 43,580 165,616 167,608 180,606 197,510 77,490", labelX: 118, labelY: 553 },
  C2: { points: "243,434 228,465 213,600 387,562 401,527 401,476 244,434", labelX: 307, labelY: 517 },
};

const statusFill = {
  Clean: "rgba(16, 185, 129, 0.66)",
  "Dust suspected": "rgba(245, 158, 11, 0.72)",
  "Heavy loss": "rgba(225, 29, 72, 0.76)",
};

// Demo-only visual overrides — forces map polygon colors for presentation.
// Does not affect panel data, classifier output, or any other component.
const demoStatusOverride: Partial<Record<PanelId, keyof typeof statusFill>> = {
  A2: "Clean",
  C1: "Clean",
  B1: "Heavy loss",
  C2: "Heavy loss",
};

export function FarmOperationsMap({ panels, selectedId, onSelect }: FarmOperationsMapProps) {
  return (
    <section className="relative h-full overflow-hidden bg-slate-900">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 500 720"
        preserveAspectRatio="none"
        role="img"
        aria-label="Solar farm block map"
      >
        <defs>
          <pattern id="panelDots" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="rgba(255,255,255,0.55)" />
          </pattern>
          <filter id="activeGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#ffffff" floodOpacity="0.65" />
          </filter>
        </defs>
        <image href={satelliteMap} x="0" y="0" width="500" height="720" preserveAspectRatio="xMidYMid slice" />
        <rect width="500" height="720" fill="rgba(2, 6, 23, 0.1)" />
        {panels.map((panel) => {
          const shape = panelShapes[panel.id];
          const status = demoStatusOverride[panel.id as PanelId] ?? getPanelStatus(panel.efficiency);
          const active = panel.id === selectedId;

          return (
            <g key={panel.id} className="cursor-pointer" onClick={() => onSelect(panel.id)}>
              <polygon
                points={shape.points}
                fill={statusFill[status]}
                stroke={active ? "#ffffff" : "rgba(255,255,255,0.72)"}
                strokeWidth={active ? 5 : 2}
                filter={active ? "url(#activeGlow)" : undefined}
              />
              <polygon points={shape.points} fill="url(#panelDots)" opacity="0.72" />
              <text x={shape.labelX} y={shape.labelY} textAnchor="middle" fill="#ffffff" fontSize="21" fontWeight="600">
                {panel.id}
              </text>
              <text x={shape.labelX} y={shape.labelY + 25} textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="600">
                {panel.efficiency}% efficiency
              </text>
            </g>
          );
        })}
        {selectedId && panelShapes[selectedId as PanelId] && (
          <>
            <circle cx={panelShapes[selectedId as PanelId].labelX} cy={panelShapes[selectedId as PanelId].labelY - 44} r="10" fill="#ffffff" opacity="0.95" />
            <circle cx={panelShapes[selectedId as PanelId].labelX} cy={panelShapes[selectedId as PanelId].labelY - 44} r="18" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.72" />
          </>
        )}
      </svg>

      <div className="absolute bottom-5 right-5 flex flex-col gap-2">
        <button type="button" className="h-10 w-10 rounded-lg bg-slate-950/85 text-lg font-semibold text-white shadow-lg">
          +
        </button>
        <button type="button" className="h-10 w-10 rounded-lg bg-slate-950/85 text-lg font-semibold text-white shadow-lg">
          -
        </button>
      </div>
    </section>
  );
}
