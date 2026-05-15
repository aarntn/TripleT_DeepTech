# SolarPanel Dashboard Design

This document captures the current product direction for the updated Figma-aligned dashboard, specifically the `Overview` and `Map View` screens.

The UI direction is a clean solar O&M monitoring platform: light theme, operationally dense, map-forward, and designed for quick scanning by asset owners and O&M teams.

## Design Goals

- Make the product feel like a real solar monitoring SaaS, not a generic analytics dashboard.
- Let users answer two primary questions quickly:
  - Overview: "How is the farm performing right now?"
  - Map View: "Which panel block needs attention, and why?"
- Keep the visual system calm and professional: white cards, subtle borders, small shadows, clear hierarchy.
- Preserve demo storytelling with mocked data only.
- Keep map-based operation and panel detail workflows connected.

## Global Layout

The app uses a fixed left sidebar and a content area on the right.

- Sidebar width: `280px`
- Main background: `#fafafa`
- Card background: `#ffffff` or `#fdfdfd`
- Border color: `#e9eaeb`
- Primary text: `#181d27`
- Secondary text: `#535862`
- Tertiary text: `#717680`
- Border radius: mostly `12px`
- Shadows: very subtle, usually `0 1px 2px rgba(10,13,18,0.05)`

Typography:
- Maximum font weight is `600`.
- Use `font-semibold` for headings, key metrics, badges, and buttons.
- Do not use `font-bold`, `font-extrabold`, `font-black`, or numeric weights above `600`.

## Sidebar

Brand:
- Product label: `SolarPanel`
- Small rounded logomark with purple center mark

Navigation structure:

MONITORING
- Overview
- Map View

INSIGHTS
- Revenue Intelligence

Behavior:
- Active nav item uses a light gray background: `#fafafa`
- Active text uses stronger weight and color: `#252b37`
- Inactive text uses `#414651`
- `panel-detail` is treated as part of `Map View` in active state logic.

## Overview Page

Purpose:
- Provide high-level solar farm health and production summary.
- This is the first page users see.

Page structure:
1. Header
2. Metric card grid
3. Energy Production card

### Header

Content:
- Page title: `Overview`
- Weather pill: `+35 C` with sun icon

Layout:
- Horizontal flex
- Title left
- Weather pill right

### Metric Cards

Grid:
- 3 columns on desktop
- 6 cards total

Cards:
- Total Installed Capacity: `2.380 kWp`
- Total Yield: `560,7 kWh`
- Current Power Output: `353,2 kW`
- Total Consumption: `140,25 kWh`
- Self-Sufficiency Rate: `76%`
- Active Panels: `29/32`

Card anatomy:
- Header row with icon and label
- Inner white value container
- Large value text at `30px`
- Unit shown smaller and aligned to baseline

### Energy Production Card

Purpose:
- Show production trend and high-level performance indicators.

Top header:
- Title: `Energy Production`
- More options button: vertical dots

Stats row:
- Total Generated Energy: `8.8k`, positive change `7.4%`
- Total Capacity: `10.2k`, positive change `7.2%`
- Avg. Efficiency: `46.2%`, negative change `0.2%`
- CO2 Reduced: `4m 4s`, positive change `10.8%`

Chart:
- Recharts `AreaChart`
- Green line: `#12b76a`
- Soft green area fill
- X-axis labels repeat `12:00 PM` to match current Figma mock
- Hidden Y-axis
- Light horizontal grid

## Map View Page

Purpose:
- Provide spatial panel monitoring with satellite/heatmap context.
- Let users select a panel from either the list or map.
- Show detail panel and retain the `7-day energy timeline` card for selected panels.

Page structure:
1. Left monitoring pane
2. Right map area
3. Detail state inside the left pane when a panel is selected

### Left Monitoring Pane

Width:
- `500px`

Background:
- `#fafafa`

Height and scrolling:
- The Map View page is full viewport height.
- The left monitoring pane is the only vertical scroll container.
- Use `h-full min-h-0 overflow-y-auto` on the pane so longer detail content scrolls without shrinking or moving the map.
- The right map area should remain full-height and visually stable while the left pane scrolls.

Spacing:
- `32px` padding
- `24px` vertical section gap

Default state content:
- Page title: `Panel Monitoring`
- Location row: `Selangor, Malaysia • Farm A`
- 2x2 metric block
- Panels List table

### Map View Metrics

2x2 metric block:
- Total Output Now
- Avg Sufficiency
- Active Panels
- Need To Clean

Style:
- White block
- Divided by thin borders
- Large values at `30px`
- Units smaller and aligned to baseline

### Panels List

Columns:
- Name
- Output
- Last Clean
- Status

Row behavior:
- Clicking a row selects a panel and changes the left pane into detail state.
- Row hover uses `#fafafa`.

Status badges:
- Clean: green badge
- Dirty: amber badge
- Small dot included in badge

### Panel Detail State

Triggered by selecting a panel from the list or map.

Content:
- Back button
- Panel ID headline, e.g. `A1`
- Metadata: `ID A1-PV-04 • Farm A`
- Status badge: `Clean` or `Dirty`
- Schedule Cleaning button when panel is not clean
- Battery level progress strip
- Detail metrics grid
- `7-day energy timeline` card

Battery level progress strip:
- Placed above the detail metrics grid.
- Shows storage percentage and a compact horizontal progress bar on a white surface.
- Should not be styled as a metric card.

Detail metrics grid:
- Current Output
- Electrical Load: voltage and current
- Panel Temperature
- Efficiency
- Saved Today
- RM Loss Today

Additional detail sections:
- Production Summary:
  - Energy today
  - Peak power today
  - Energy this month
  - Energy this year
  - Lifetime energy
- Environment:
  - Irradiance in W/m²
  - Weather condition
  - Ambient temperature
  - Wind speed when available
- System & Analytics:
  - Inverter status
  - Grid export/import state when grid-connected
  - Performance Ratio
  - Estimated CO₂ offset
- Health & Asset Info:
  - Latest alert or health signal
  - Maintenance schedule / due state
  - Module capacity and brand
  - Inverter model
  - Installation date
  - Panel coordinate

Important layout note:
- This is a compact detail-specific grid.
- Do not reuse the taller overview metrics grid here, because it can cause the card to clip in the left pane.
- Keep these additional sections compact and scannable. They should use small key-value rows inside the left pane, not large metric cards.
- Prioritize values that help an O&M user decide whether to keep monitoring, investigate a fault, or create a cleaning/maintenance work order.

### 7-Day Energy Timeline

This card must remain in the selected panel detail state.

Purpose:
- Explain expected vs actual production.
- Show forecast for the next 3 days.
- Preserve the key technical story: dust-related production loss over time.

Chart lines:
- Expected output
- Actual output

Annotation:
- Dust drop marker on Thursday for dust scenario.

Detail chart simplification:
- Do not show the forecast pill, forecast line, or forecast legend in the selected panel detail chart.
- Do not include the explanatory paragraph below the chart.

### Right Map Area

Purpose:
- Spatial context for the solar farm.
- Show the heatmap/satellite visual from Figma.

Implementation:
- Uses `frontend/src/assets/map-view-heatmap.png`
- Image fills the map region with `object-cover`
- Map takes all remaining horizontal space after the 500px monitoring pane.

Map overlays:
- Top-left control stack
- Bottom-left alert/layer controls
- Top-right small map scale/source label
- Bottom-right minimap preview

Behavior:
- Selecting a panel on the map should update the left detail pane.
- If a panel is selected, the map can visually reflect selection state when custom overlays are added later.

## Interaction Model

Overview:
- Read-only summary screen.
- No backend behavior.
- Chart tooltip is interactive through Recharts.

Map View:
- Click panel row or map panel to open detail state.
- Back button returns to panel list state.
- Schedule Cleaning triggers the existing mock cleaning behavior.
- Cleaning state may temporarily show `Cleaning...`.

## Data Model

All data is mocked.

Sources:
- `frontend/src/data/mockSolarData.ts`
- `frontend/src/utils/solarCalculations.ts`

Current map page derives:
- Output from `efficiency * PANEL_RATED_KW`
- Status from `getPanelStatus(efficiency)`
- Last clean from local mock map in `PanelManagementPage`

No backend, API, database, authentication, or real ML model is used.

## Implementation References

Main components:
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/components/DashboardShell.tsx`
- `frontend/src/components/pages/OverviewPage.tsx`
- `frontend/src/components/pages/PanelManagementPage.tsx`
- `frontend/src/components/FarmOperationsMap.tsx`
- `frontend/src/components/EnergyTimelineChart.tsx`

Figma source:
- Overview node: `31108:36664`
- Map View node: `31130:68627`

## Future Menu Direction

Next Figma menu implementations should keep:
- Same sidebar structure and styling.
- Same light theme and card system.
- Same 280px sidebar width.
- Same use of `#fafafa`, `#ffffff`, `#e9eaeb`, `#181d27`, `#535862`.

Do not reintroduce the old dark command-center layout into these Figma-aligned pages unless explicitly requested.
