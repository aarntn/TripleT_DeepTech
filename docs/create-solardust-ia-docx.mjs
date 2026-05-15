import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = new URL("./.docx-build/", import.meta.url).pathname;
const output = new URL("./SolarDust_AI_User_Flow_Information_Architecture.docx", import.meta.url).pathname;

const esc = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const p = (text, style = "Normal") =>
  `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr><w:r><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;

const bullet = (text) =>
  `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;

const numbered = (text) =>
  `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr><w:r><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;

const table = (headers, rows) => `
  <w:tbl>
    <w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/><w:left w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/><w:right w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/></w:tblBorders></w:tblPr>
    <w:tr>${headers.map((cell) => `<w:tc><w:tcPr><w:shd w:fill="F3F4F6"/></w:tcPr>${p(cell, "TableText")}</w:tc>`).join("")}</w:tr>
    ${rows.map((row) => `<w:tr>${row.map((cell) => `<w:tc>${p(cell, "TableText")}</w:tc>`).join("")}</w:tr>`).join("")}
  </w:tbl>`;

const blocks = [
  p("SolarDust AI", "Title"),
  p("User Flow, Feature Inventory, Page Structure, and Information Architecture", "Subtitle"),
  p("Frontend prototype reference for Figma refinement", "Subtitle"),
  p("Product positioning", "Heading1"),
  p(
    "SolarDust AI is a weather-aware solar farm operations dashboard that detects panel underperformance, separates dust-related losses from weather-related losses, recommends cleaning actions, estimates RM impact, and supports the business case for commercial O&M adoption.",
  ),
  p("1. Product Goal", "Heading1"),
  p(
    "The prototype should help judges and target O&M buyers understand one clear operational story: detect solar array performance loss, check whether weather explains the loss, identify likely dust accumulation, recommend cleaning only when useful, and quantify the financial impact in RM.",
  ),
  p("Primary target users", "Heading2"),
  bullet("Solar O&M manager: prioritizes cleaning actions and justifies dispatch decisions."),
  bullet("Asset owner or portfolio manager: protects energy yield and recurring revenue."),
  bullet("Procurement or commercial evaluator: needs ROI, payback, and pilot readiness evidence."),
  bullet("Field operations team: needs clear work order recommendations and selected array context."),
  p("Current target companies", "Heading2"),
  bullet("Solarvest Holdings Bhd: asset owner and solar portfolio operator. Pitch angle: protect recurring asset income and reduce avoidable yield loss."),
  bullet("Pekat Teknologi: solar EPCC/O&M player expanding O&M capabilities. Pitch angle: add predictive cleaning intelligence to O&M offering."),
  bullet("TNB Energy Services: government-linked O&M pathway. Pitch angle: enterprise-ready decision support for renewable asset maintenance."),
  p("2. Current Navigation Structure", "Heading1"),
  p("The current app uses a sidebar-based SaaS layout with two major contexts instead of many small pages."),
  table(
    ["Sidebar item", "Purpose", "User question answered"],
    [
      ["Panel Management", "Operations console for detecting, diagnosing, and acting on panel underperformance.", "Which panels are losing money, why, and what should we do now?"],
      ["Business & ROI", "Commercial model for ROI, payback, carbon credits, tariff sensitivity, and dataset transparency.", "Is this worth buying, piloting, and scaling across a solar portfolio?"],
    ],
  ),
  p("3. Global Layout", "Heading1"),
  p("Sidebar", "Heading2"),
  bullet("Product name: SolarDust AI."),
  bullet("Subtitle: Predictive cleaning intelligence."),
  bullet("Demo Mode badge."),
  bullet("Navigation: Panel Management, Business & ROI."),
  bullet("Prototype status note: Frontend-only mock data. No backend services connected."),
  bullet("Desktop behavior: fixed left sidebar."),
  bullet("Mobile behavior: drawer opened from top menu button."),
  p("Page Header", "Heading2"),
  bullet("Eyebrow indicating page category, for example Operations or Business Case."),
  bullet("Main page title."),
  bullet("Short description of the page purpose."),
  bullet("Status badges: Demo Mode: Simulated IoT Feed, Weather Forecast: Auto Input."),
  bullet("Forecast feed card: Farm A: stable irradiance, low rain risk."),
  p("4. User Flow", "Heading1"),
  p("Flow A: O&M manager handles panel underperformance", "Heading2"),
  numbered("User opens Panel Management."),
  numbered("User scans top RM impact cards: RM lost today, RM lost this week, RM saved if cleaned now."),
  numbered("User checks Farm A weather-aware operations summary."),
  numbered("User reviews the map-style operations console and sees color-coded array zones."),
  numbered("User clicks an array zone, for example B2."),
  numbered("Selected array panel updates with efficiency, RM loss, sensor readings, classifier result, and AI dispatch insight."),
  numbered("User checks whether the classifier says Dust, Weather, or Normal."),
  numbered("If Dust, user creates a cleaning work order or uses Clean this panel."),
  numbered("Dashboard animates cleaning, restores panel efficiency, and updates RM loss and saved value."),
  numbered("User checks timeline to confirm expected vs actual output gap and forecast trend."),
  p("Flow B: Asset owner evaluates business impact", "Heading2"),
  numbered("User opens Business & ROI."),
  numbered("User sets farm size in MW."),
  numbered("User chooses target market, Malaysia or GCC desert."),
  numbered("User adjusts tariff RM/kWh and cleaning system cost."),
  numbered("User optionally activates Hormuz tariff shock."),
  numbered("User reviews annual revenue recovered, payback period, NPV, and carbon credits."),
  numbered("User reviews 12-month efficiency with cleaning vs without cleaning."),
  numbered("User reviews cumulative savings vs system cost."),
  numbered("User reviews water harvester synergy and monthly dataset assumptions."),
  numbered("User uses the pitch sentence for procurement or pilot discussion."),
  p("5. Panel Management Page IA", "Heading1"),
  p(
    "Panel Management is the operational heart of the product. It should feel like a real solar farm command center, combining map context, sensor feed, weather forecast input, AI classification, recommendation, and cleaning action in one page.",
  ),
  table(
    ["Section", "Content", "Design intent"],
    [
      ["Top RM impact cards", "RM lost today, RM lost this week, RM saved if cleaned now.", "Immediate business urgency. Judges should instantly understand financial value."],
      ["Weather-aware operations story", "Farm A live monitoring, forecast-driven explanation, dirty array count, selected array, selected status.", "Explain that weather forecast is an input, not a manual scenario toggle."],
      ["Farm operations map", "Map-style solar farm visualization with clickable A1, A2, B1, B2, C1, C2 zones.", "Make the dashboard feel like a real field operations product, not only analytics cards."],
      ["Left operations panel", "Farm metadata, active array count, irradiance, panel temperature, humidity, wind, forecast input, AI dispatch model.", "Give operational context similar to the reference image."],
      ["Floating selected-array detail", "Selected array name, status, efficiency, RM loss today, live sensor readings, classifier summary, AI dispatch insight, cleaning work order button.", "Support fast decisions after clicking a map zone."],
      ["Panel heatmap grid", "Six array cards with efficiency, status, RM loss, classifier signal, Clean this panel button, Clean all dirty panels button.", "Structured comparison view for all arrays."],
      ["Classifier card", "Dust, Weather, or Normal. Confidence score. One-line cause explanation.", "Highlight the core deep tech capability."],
      ["Recommendation card", "What is happening, recommended action, RM impact.", "Turn AI output into a plain-English maintenance decision."],
      ["Energy timeline chart", "Expected output, actual output, 3-day forecast, annotation for dust drop or weather event.", "Explain why the classifier made its decision."],
    ],
  ),
  p("Panel Management interactions", "Heading2"),
  bullet("Clicking a map zone selects the array."),
  bullet("Clicking a heatmap card selects the array."),
  bullet("Selected array state updates map focus, selected detail panel, classifier card, recommendation card, and timeline chart."),
  bullet("Clean this panel creates a cleaning animation and restores the selected panel to high efficiency."),
  bullet("Clean all dirty panels cleans all dust-classified arrays."),
  bullet("Live sensor feed cycles every 3 seconds and updates sensor values, panel efficiency, panel color, and revenue stats."),
  p("Panel status rules", "Heading2"),
  table(
    ["Efficiency", "Status", "Color"],
    [
      ["Above 90%", "Clean", "Green"],
      ["60% to 90%", "Dust suspected", "Amber"],
      ["Below 60%", "Heavy loss", "Red"],
    ],
  ),
  p("6. Business & ROI Page IA", "Heading1"),
  p(
    "Business & ROI translates the operations insight into a commercial argument for asset owners, O&M providers, and procurement stakeholders.",
  ),
  table(
    ["Section", "Content", "Design intent"],
    [
      ["Commercial intelligence header", "Commercial intelligence + IP integration, UM Auto Cleaner PI 2024000995 + Water Harvester UI 2023002890.", "Connect the dashboard to the larger innovation story."],
      ["Input controls", "Farm size slider, market selector, tariff slider, cleaning system cost slider, Hormuz scenario toggle.", "Let users model a commercial case quickly."],
      ["Commercial metrics", "Annual revenue recovered, payback period, NPV project life, carbon credits.", "Answer procurement and investment questions immediately."],
      ["12-month efficiency chart", "With cleaning vs without cleaning.", "Show long-term performance decay and cleaning value."],
      ["Cumulative savings chart", "System cost vs cumulative savings by year.", "Make payback visible."],
      ["Water loop synergy", "Water Harvester integration, water self-supply percentage, water saved per month.", "Show system integration and operational sustainability."],
      ["Monthly dataset table", "Month, efficiency with cleaning, efficiency without cleaning, revenue recovered, kWh recovered, carbon credit.", "Make the mock assumptions transparent for demo credibility."],
      ["Pitch sentence", "Auto-generated sentence summarizing farm size, annual dirty-panel cost, and payback.", "Support sales narrative and judge Q&A."],
    ],
  ),
  p("7. Feature Inventory", "Heading1"),
  table(
    ["Feature", "Current behavior", "Mock or future integration"],
    [
      ["Live sensor feed", "Cycles readings every 3 seconds.", "Mock now. Future IoT integration."],
      ["Weather forecast input", "Displayed as automatic feed with stable irradiance and low rain risk.", "Mock now. Future weather API/forecast model."],
      ["Dust vs weather classifier", "Classifies selected array as Dust, Weather, or Normal with confidence score.", "Mock logic now. Future ML model."],
      ["Cleaning recommendation", "Plain-English recommendation with RM impact.", "Mock rule-based output."],
      ["Cleaning action", "Button restores efficiency and reduces loss values.", "Frontend-only simulation."],
      ["Panel heatmap", "Six arrays with color-coded status, efficiency, RM loss, and action buttons.", "Mock panel data."],
      ["Map-style farm view", "Clickable solar array zones with floating selected-array detail.", "Mock visual map. Future satellite/GIS layer possible."],
      ["Energy timeline chart", "Expected output, actual output, and 3-day forecast.", "Mock forecast and timeline."],
      ["ROI calculator", "Farm size, tariff, market, cost, payback, NPV, carbon, water synergy.", "Mock assumptions."],
      ["Dataset transparency", "Monthly table exposes assumptions behind ROI.", "Mock data."],
    ],
  ),
  p("8. Recommended Figma Refinement Notes", "Heading1"),
  bullet("Keep the first visible screen focused on Panel Management, not Business & ROI."),
  bullet("Make the map view the hero of operations, with the RM impact cards above it."),
  bullet("Use the selected-array floating panel as the main interaction anchor."),
  bullet("Keep the classifier and recommendation cards visually important, but secondary to the map and selected array context."),
  bullet("For procurement viewers, make Business & ROI look calmer, more tabular, and more enterprise-ready."),
  bullet("Avoid adding too many separate pages. The current two-context structure is easier to demo."),
  bullet("Use clear labels: work order, cleaning priority, forecast input, dispatch insight, RM impact."),
  p("9. Suggested Future Enhancements", "Heading1"),
  bullet("Replace mock weather card with real forecast fields: irradiance forecast, rain probability, cloud cover, humidity, wind speed."),
  bullet("Add cleaning priority queue: array, urgency, RM impact, confidence, recommended date."),
  bullet("Add work order state: recommended, scheduled, cleaning in progress, completed."),
  bullet("Add portfolio switcher: Farm A, Farm B, Farm C."),
  bullet("Add buyer-fit panel for Solarvest, Pekat, and TNB Energy Services."),
  bullet("Add exportable pilot report summary for procurement meetings."),
];

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${blocks.join("\n")}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1008" w:right="1008" w:bottom="1008" w:left="1008" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
  </w:body>
</w:document>`;

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="52"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:rPr><w:color w:val="4B5563"/><w:sz w:val="24"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:rPr><w:b/><w:sz w:val="34"/><w:color w:val="0F172A"/></w:rPr><w:pPr><w:spacing w:before="360" w:after="120"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="111827"/></w:rPr><w:pPr><w:spacing w:before="240" w:after="80"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="720"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="TableText"><w:name w:val="Table Text"/><w:basedOn w:val="Normal"/><w:rPr><w:sz w:val="20"/></w:rPr></w:style>
</w:styles>`;

const numberingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>
  <w:abstractNum w:abstractNumId="2"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
  <w:num w:numId="2"><w:abstractNumId w:val="2"/></w:num>
</w:numbering>`;

rmSync(outDir, { recursive: true, force: true });
mkdirSync(join(outDir, "_rels"), { recursive: true });
mkdirSync(join(outDir, "word", "_rels"), { recursive: true });

writeFileSync(
  join(outDir, "[Content_Types].xml"),
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>`,
);
writeFileSync(
  join(outDir, "_rels", ".rels"),
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
);
writeFileSync(
  join(outDir, "word", "_rels", "document.xml.rels"),
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>`,
);
writeFileSync(join(outDir, "word", "document.xml"), documentXml);
writeFileSync(join(outDir, "word", "styles.xml"), stylesXml);
writeFileSync(join(outDir, "word", "numbering.xml"), numberingXml);

rmSync(output, { force: true });
execFileSync("zip", ["-qr", output, "."], { cwd: outDir });
rmSync(outDir, { recursive: true, force: true });
