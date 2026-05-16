# SolarGuard: Implementation Timeline v3

**Product:** SolarGuard — Solar O&M Intelligence Platform
**Last updated:** 2026-05-15
**Scope:** Product development and commercialisation, hackathon to market

---

## How to Read This Document

Each phase contains:
- **Main Activities** — what the team is doing
- **Research / Business Basis** — why the activity is grounded in evidence
- **Key Deliverables** — concrete outputs
- **Success Criteria** — measurable pass conditions
- **Risks & Mitigation** — known failure modes and responses
- **Owner** — who is accountable (Technical / Commercial / Pilot Partner / Regulatory-Legal / Data-ML)
- **Budget** — estimated cash required
- **Go/No-Go Gate** — the single question the team must answer YES before advancing

---

## Phase 0 — Hackathon MVP
**Timeline:** Month 0

### Main Activities
Prove the concept end-to-end: FastAPI backend with ROI calculator, RandomForest dust classifier, LinearRegression 3-day forecaster, CSV-driven sensor simulation, and React dashboard showing efficiency trend, classification output, and revenue impact.

### Research / Business Basis
Malaysian irradiance 4.5–6.5 kWh/m²/day (Solargis); dust reduces annual yield 15–25% in low-rain corridors (IRENA 2021); RM 0.35/kWh commercial electricity tariff used as revenue recovery baseline (LSS5 2024 competitive bid rate is RM 0.1699/kWh — target tariff class to be confirmed in Phase 2 customer discovery interviews); UM patent PI 2024000995 at TRL 8 provides hardware differentiation.

### Key Deliverables
- Working demo with three scenarios (dusty week, rainy week, normal)
- ROI calculation for 1–50 MW farms
- Dust vs weather classification with confidence score
- 3-day efficiency forecast with confidence bounds
- All API endpoints returning valid JSON

### Success Criteria
Demo runs end-to-end without runtime errors; ROI output within 10% of manual calculation; classifier accuracy >85% on simulated test set.

### Risks & Mitigation
Demo instability → Docker Compose with pre-built images. Model not trained on first run → commit pre-trained joblib files so demo does not require live training.

### Owner
Full team (Technical + Commercial)

### Budget
**RM 0** — free-tier cloud compute, open-source tooling only.

### Go/No-Go Gate
> *Is the demo functional and compelling enough to justify proceeding to product hardening?*

Pass criteria: all three endpoints (`/classify`, `/latest`, `/forecast/{array_id}`) return valid JSON; frontend displays classification result and revenue chart without errors; judges or first external viewer confirms they understand the value proposition.

---

## Phase 1 — Product Hardening
**Timeline:** Months 1–3

### Main Activities

**Technical**
- Replace single weather source with multi-provider layer: NASA POWER (primary) → OpenWeather (secondary) → processed CSV fallback — matching actual backend architecture
- Add SHA-256 model integrity verification for production deployment (`DUST_CLASSIFIER_SHA256`, `DUST_SCALER_SHA256`, `MODEL_LOAD_MODE=verified`)
- API key authentication: Bearer token + SHA-256-stored hashes, per-key sliding-window rate limiting, body size enforcement
- Full pytest suite (84 tests); GitHub Actions CI pipeline on every commit

**Frontend Integration**
- Connect React frontend to hardened backend API (replace mock/CSV-only data with backend-connected mode)
- Keep demo fallback mode for offline demonstrations
- Test dashboard end-to-end with live backend data

**Production Operations**
- Containerise with Docker; deploy to cloud (GCP Cloud Run or AWS ECS)
- Uptime monitoring (UptimeRobot or CloudWatch); target >99% uptime on staging
- Error tracking (Sentry or equivalent)
- Incident response checklist v1: severity levels, escalation path, partner notification template
- Automated backup process for any persistent data

**Legal**
- Pilot data-sharing agreement template
- PDPA 2010 (Malaysia) privacy notice
- Data retention and deletion policy
- Model-training data consent clause
- Confidentiality/NDA template
- Engage Malaysian legal counsel to review all five documents

### Research / Business Basis
PDPA 2010 requires explicit consent for operational data processing; multi-provider weather reduces single-point-of-failure risk; containerisation is the minimum bar for enterprise SaaS procurement; O&M companies will ask about uptime SLA before signing any contract.

### Key Deliverables
- Multi-provider weather integration with documented fallback chain
- Legal pack: NDA, data-sharing agreement, PDPA notice, retention policy, model-training consent (all reviewed by counsel)
- 84-test CI-passing suite with GitHub Actions green badge
- Docker production deployment at HTTPS endpoint with monitoring and error tracking
- Frontend connected to live backend, demo fallback preserved
- Incident response checklist v1

### Success Criteria
All 84 tests pass on every CI run; PDPA legal pack signed off by counsel; backend uptime >99% over 30-day staging run; frontend demo shows live data without hardcoded CSV dependency.

### Risks & Mitigation
Weather API rate limits → exponential backoff plus automatic fallback chain. PDPA non-compliance → engage legal counsel by Month 1 Week 1, not Week 12. Legal pack delayed → draft NDA from MIDF/Amanah template and adapt. Frontend integration breaks backend assumptions → write integration smoke test in CI.

### Owner
- **Technical:** backend hardening, CI/CD, cloud deployment, frontend integration
- **Regulatory/Legal:** PDPA compliance, legal pack review
- **Commercial:** frontend demo validation with first external viewer

### Budget
**RM 2K–5K**
- Legal counsel review: RM 1.5K–3K
- Cloud staging hosting + domain + TLS: RM 0.5K–1.5K
- Error tracking tool (Sentry free tier sufficient at this stage): RM 0

### Go/No-Go Gate
> *Is the backend/frontend production-demo ready?*

Pass criteria: all 84 tests green in CI; PDPA legal pack reviewed; backend reachable at HTTPS endpoint with >99% uptime over 30 days; frontend shows live backend data; incident response checklist written.

---

## Phase 2 — Pilot Partner Preparation
**Timeline:** Months 4–6

### Main Activities

**Customer Discovery (complete before committing to pilot terms)**
- Conduct 10–15 structured interviews with O&M managers and asset owners across Malaysia (Klang Valley, Selangor, Johor, Kedah solar corridors)
- Interview guide:
  - Current cleaning frequency and what triggers a cleaning decision
  - How yield loss is currently estimated (gut feel, inverter data, nothing)
  - Budget authority: who signs a RM 35K–50K engagement
  - Willingness to pay: test RM 35K–50K pilot, RM 6–10/kWp/year wholesale
  - Current monitoring tools and biggest pain points
- Synthesise into customer discovery report; use to validate Tier 1 pricing and feature priority before setting pilot terms

**IEC 61724-Aligned Measurement Protocol (sign before pilot contract, not after)**
- Define baseline capture period: minimum 14 consecutive clear-sky days (GHI > 800 W/m², no curtailment, no rain > 5 mm)
- Irradiance source: calibrated pyrometer on-site or satellite GHI (NASA POWER, ±3% tolerance); source agreed in writing
- Inverter data source: Modbus/SunSpec, 15-minute aggregation
- Exclusion rules: curtailment days, rain events > 5 mm, grid outage days, inverter maintenance windows excluded from performance ratio calculation
- Revenue recovery formula: agreed in writing and signed by both parties before Day 1
- Protocol document reviewed by partner's engineering team and countersigned

**Regulatory Compliance Checkpoint (Month 4–6)**
- Produce regulatory classification memo: is SolarGuard an IoT device, a software service, or both under ST/MCMC/SIRIM frameworks?
- Verify Suruhanjaya Tenaga (ST) IoT device registration requirements for any hardware left on-site
- Engage SEDA Malaysia on data monitoring obligations for FiT/LSS assets
- Confirm PDPA applicability for inverter operational data

**Commercial**
- Site assessment checklist: minimum 1 MW, inverter Modbus/SunSpec accessible, stable internet, on-site coordinator named
- Conduct ≥2 site assessments; select best candidate
- Execute LOI/MOU with pilot partner
- Draft channel partner agreement template: commission bands, white-label rights, resale pricing floors

### Research / Business Basis
IEC 61724-1:2021 defines PV performance monitoring methodology; without a signed measurement protocol, revenue-share disputes become adversarial at the first disagreement. O&M market in Malaysia: 150+ MW managed by fewer than 10 large operators (SEDA 2023). 10–15 customer discovery interviews is the minimum for product-market fit validation (Momtest / Lean Startup standard).

### Key Deliverables
- Customer discovery report (10–15 interviews, synthesised insights, validated ICP and pricing)
- IEC 61724-aligned measurement protocol document (countersigned by partner)
- Regulatory classification memo (ST/SIRIM/MCMC/SEDA)
- Site assessment reports (≥2 completed, ≥1 approved)
- Signed LOI/MOU with first pilot partner
- Channel partner agreement template

### Success Criteria
≥10 customer discovery interviews completed and documented; willingness-to-pay for RM 35K–50K pilot confirmed by ≥3 interviewees; measurement protocol signed; LOI/MOU executed; ≥1 site approved; regulatory memo delivered.

### Risks & Mitigation
Partners slow to sign → approach 3 simultaneously, select first to execute. Regulatory requirements unclear → engage ST compliance consultant in Month 4. IEC 61724 protocol rejected by partner → offer simplified 4-metric PR calculation as minimum viable baseline. Discovery interviews reveal pricing too high → adjust to RM 25K pilot with clear upgrade path.

### Owner
- **Commercial:** customer discovery, LOI/MOU, channel partner template
- **Regulatory/Legal:** measurement protocol, compliance memo, ST/SEDA engagement
- **Pilot Partner:** site access, site assessment coordination

### Budget
**RM 5K–15K**
- Travel for site assessments and interviews: RM 2K–5K
- Legal review of LOI/MOU and channel agreement: RM 2K–5K
- ST/SIRIM compliance consultant: RM 1K–5K

### Go/No-Go Gate
> *Did we secure a signed LOI/MOU and is there a real partner ready for pilot?*

Pass criteria: signed LOI with pilot partner; measurement protocol countersigned; ≥2 site assessments completed with ≥1 approved; customer discovery report delivered (≥10 interviews); regulatory classification memo delivered.

---

## Phase 3 — First Paid Pilot
**Timeline:** Months 7–9

### Main Activities

**Deployment**
- Deploy Tier 1 Inference mode (inverter data + multi-provider weather; no hardware sensors)
- Baseline capture period: Days 1–14 (no cleaning interventions, no revenue-share calculations active)
- Pilot pricing: RM 35K–50K for 90 days (capped at 5 MW); invoice at contract signing

**Production Operations (active from Day 1)**
- Cloud deployment live and monitored
- API uptime target: >99% throughout pilot
- Error tracking active; all errors logged and triaged within 24 hours
- Weekly check-in reports: efficiency trend, classification output, cleaning recommendation, weather-adjusted revenue delta vs IEC 61724 baseline
- Partner O&M team accesses frontend dashboard with login; UX feedback collected weekly

**Post-Pilot Conversion Plan**
- **Day 75:** Issue renewal proposal — Tier 1 annual contract or Tier 2 sensor upgrade; include ROI summary and draft performance report
- **Day 85:** Collect signed LOI for annual contract or Tier 2 upgrade; begin hardware procurement if Tier 2 selected
- **Day 90:** Pilot concludes; issue final 90-day performance report (efficiency delta, classification accuracy, cleaning events triggered, estimated revenue recovered)
- **Day 100:** Contract signed or post-pilot debrief with documented reason for non-conversion

### Research / Business Basis
90-day pilots standard in B2B SaaS for solar O&M. Tier 1 (software-only) has lowest deployment friction and fastest time-to-value. Revenue-share calculation activates only after baseline period (IEC 61724 protocol from Phase 2). Day 75/85 conversion milestones prevent end-of-pilot negotiation surprises.

### Key Deliverables
- Live deployment on partner site (inverter data ingestion confirmed, dashboard accessible Day 1)
- 14-day baseline report (performance ratio established and agreed)
- 12 weekly check-in reports
- 90-day final performance report
- Renewal proposal issued Day 75
- Signed annual contract or upgrade LOI by Day 85–100

### Success Criteria
System uptime >99% during pilot; classification accuracy >80% vs engineer manual assessment (validated at Day 30 check); partner reports positive ROI in final report; renewal or upgrade LOI signed by Day 85.

### Risks & Mitigation
Partner delays inverter data access → establish data credentials in Phase 2 before Month 7 begins. Classification accuracy below 80% at Day 30 → trigger model review; supplement training data with site-calibrated simulations. Partner unwilling to sign by Day 85 → offer 30-day extension at 50% daily rate to reduce pressure. Cloud infrastructure failure during pilot → 4-hour RTO target; backup deployment in separate region.

### Owner
- **Technical:** deployment, production monitoring, incident response
- **Commercial:** weekly check-ins, renewal proposal, contract negotiation
- **Pilot Partner:** site access, inverter data delivery, on-site coordination

### Budget
**RM 10K–25K**
- Travel for deployment and weekly check-ins: RM 3K–8K
- Cloud hosting during 90-day pilot: RM 1K–3K
- Pilot support engineering time: RM 5K–10K
- Legal review of annual contract: RM 1K–4K

### Go/No-Go Gate
> *Did the pilot show enough value to justify an annual contract?*

Pass criteria: system uptime >99%; Day 30 accuracy check passes (>80%); partner confirms positive ROI in pilot report; renewal LOI signed by Day 85.

---

## Phase 4 — Data Validation and Model Upgrade
**Timeline:** Months 10–12

### Main Activities
- Collect and clean real inverter + weather data from pilot (15-minute granularity, ≥5 MW, 90 days)
- Retrain RandomForest classifier on real-world data; use time-based train/test split (no random split — data leakage risk); target F1 > 0.80
- Benchmark forecaster: compare LinearRegression vs XGBoost vs LSTM on 3-day RMSE; select best
- Model versioning: version stamps on joblib files, SHA-256 updated in env vars on each retrain
- A/B testing: route 20% of classification requests to new model; compare accuracy before full cutover
- Model card: training data provenance, accuracy metrics, known failure modes, exclusion rules
- Approach 2 additional O&M partners for data-sharing agreements to expand training dataset

### Research / Business Basis
Simulated training data has distribution mismatch with real-world sensor noise and site-specific dust composition. Time-based train/test split is mandatory for time-series ML — random split causes data leakage and inflates accuracy metrics. Model cards required for enterprise procurement (ISO 42001 AI governance, 2024).

### Key Deliverables
- Retrained classifier (F1 > 0.80 on real data, time-based split)
- Upgraded forecaster (RMSE < 5% on 3-day horizon)
- Model card (training provenance, accuracy, limitations)
- A/B testing infrastructure live
- 2 additional data-sharing agreements executed

### Success Criteria
F1 > 0.80 confirmed on real test set; RMSE < 5% on 3-day forecast; model card approved by technical lead; A/B test shows new model statistically equivalent or superior; 2 additional data partners signed.

### Risks & Mitigation
Insufficient real data volume → supplement with domain-randomised synthetic data calibrated to site GPS and TNB metering standards. LSTM too slow for production inference → fall back to XGBoost (millisecond inference). Partners reluctant to share data → offer data anonymisation and aggregation before transfer.

### Owner
- **Data/ML:** retraining, model card, A/B infrastructure
- **Technical:** versioning, deployment of new model
- **Commercial:** data-sharing agreements with 2 additional partners

### Budget
**RM 3K–8K**
- Cloud compute for retraining and benchmarking (GPU instance if LSTM tested): RM 1K–3K
- Legal review of 2 additional data-sharing agreements: RM 2K–5K

### Go/No-Go Gate
> *Is the real-data model accurate enough for paid cleaning recommendations?*

Pass criteria: F1 > 0.80 on real test set (time-based split); model card approved; A/B test green; at least 1 additional data partner signed.

---

## Phase 5 — Sensor Integration — Tier 2
**Timeline:** Months 13–18

### Main Activities

**Hardware**
- Integrate UM patent hardware (PI 2024000995, TRL 8): BPW34 photodiode arrays and GL5516 LDR photoresistors as soiling proxy sensors
- Develop embedded firmware (ESP32): MQTT/HTTP transmission to backend ingestion pipeline
- Prototype ≥3 units for certification testing
- Validate sensor readings against IEC 61724 pyrometer baseline: target ±5% GHI tolerance

**Certification and Regulatory (Month 13–18 checkpoint)**
- SIRIM certification application: submit Month 13, allow 6-month cycle
- Suruhanjaya Tenaga (ST) device registration for grid-connected monitoring equipment
- EMC and labelling compliance

**Backend**
- Update sensor ingestion pipeline to handle real hardware readings (not CSV simulation)
- Sensor calibration drift detection and automatic correction
- Maintain CSV fallback for software-only deployments

**Production Operations (formalised)**
- Uptime SLA escalated to >99.5% (contractually committed from Tier 2 onwards)
- Grafana or CloudWatch dashboards: latency, error rate, model inference time, sensor packet loss
- Named on-call engineer during business hours (Malaysia and GCC time zones)
- Incident response runbook v2: severity levels, escalation path, partner notification SLA
- Disaster recovery: automated database backup, 4-hour RTO target

**Commercial**
- Tier 2 pricing: RM 50.6K/year + RM 3.5K–7.2K one-time hardware kit (per 5 MW array)
- Deploy Tier 2 at ≥1 site

### Research / Business Basis
UM patent TRL 8 (lab-validated); SIRIM certification standard 3–6 months; BPW34 photodiodes well-documented for solar irradiance proxy applications; ESP32 standard in Malaysian industrial IoT deployments; >99.5% uptime is minimum for enterprise O&M contracts at this price point.

### Key Deliverables
- SIRIM-certified sensor hardware prototype
- Embedded firmware + backend sensor ingestion pipeline
- ST device registration confirmation
- IEC 61724 sensor validation report (±5% tolerance vs pyrometer)
- Production deployment with Grafana/CloudWatch monitoring, incident response runbook v2
- Tier 2 commercial deployment at ≥1 site (signed contract)

### Success Criteria
SIRIM certification obtained; sensor readings within ±5% of pyrometer baseline; ST registration confirmed; production uptime >99.5% over 30 days; Tier 2 contract signed.

### Risks & Mitigation
SIRIM delayed past Month 18 → begin application Month 13; allow provisional commercial deployment on partner sites that accept pre-certification hardware with contractual commitment to certify. Sensor calibration drift → automated weekly drift correction using clear-sky irradiance model. Cloud cost overrun → set auto-scaling ceiling and daily cost alert at 120% of baseline.

### Owner
- **Technical:** firmware, backend pipeline, production operations
- **Regulatory/Legal:** SIRIM application, ST registration
- **Pilot Partner:** deployment site for certification testing

### Budget
**RM 30K–60K**
- SIRIM certification application and testing: RM 15K–20K
- Hardware component procurement (BPW34, GL5516, ESP32, enclosures): RM 8K–15K
- Cloud production infrastructure: RM 5K–10K
- ST registration: RM 2K–5K
- Sensor BOM per 5 MW kit: RM 3.5K–7.2K (customer-facing one-time cost)

### Go/No-Go Gate
> *Does Tier 2 sensor mode outperform Tier 1 inference mode in classification accuracy?*

Pass criteria: SIRIM certification obtained; sensor validation report passed (±5% vs pyrometer); Tier 2 F1 > Tier 1 F1 on same test sites (confirmed by A/B comparison); production uptime >99.5%; Tier 2 contract signed.

---

## Phase 6 — First Annual Contract and Second Partner
**Timeline:** Months 19–24

### Main Activities
- Convert Pilot Partner 1 to 3-year annual contract (Tier 1 or Tier 2)
- **Pricing (corrected):** Tier 1 RM 30K–50K/year wholesale to O&M operator; RM 60K–100K/year resale to asset owner; Tier 2 RM 50.6K/year + hardware amortised over 3 years; minimum contract floor RM 25K/year
- Hormuz audit add-on: 30-day structured assessment for GCC-exposed Malaysian assets — dust-type differentiation, wind transport modelling, Hormuz event correlation; priced RM 15K–25K per engagement
- Second channel partner: approach Progressture Solar, DNV Malaysia, or equivalent; execute channel agreement
- White-label dashboard: partner branding, configurable thresholds, custom report headers
- SEDA compliance confirmation for FiT/LSS asset data reporting
- **Regulatory checkpoint (Month 20–24):** GCC certification pre-assessment — identify G-Mark (UAE), SASO (Saudi), TDRA registration requirements before committing to Phase 7 spend

### Research / Business Basis
3-year B2B contracts reduce annual churn from ~30% to ~10% for O&M SaaS (Bain benchmarks). Wholesale-to-resale margin of 40–60% supports the corrected pricing spread. Hormuz disruption raised demand for dust-type differentiation in GCC-exposed insurance and asset portfolios (Morgan Stanley commodity desk 2024). SEDA requires performance data reporting for FiT contracts.

### Key Deliverables
- Signed 3-year contract with Pilot Partner 1 at corrected pricing
- Hormuz audit product: methodology document, data inputs required, 30-day report template
- Second channel partner agreement executed
- White-label dashboard deployed for second partner
- SEDA compliance confirmation letter
- GCC certification pre-assessment report (G-Mark / SASO / TDRA requirements documented)

### Success Criteria
3-year contract signed at ≥RM 25K/year; second partner LOI executed; Hormuz audit piloted at ≥1 site; SEDA compliance confirmed; GCC pre-assessment complete; cumulative ARR > RM 150K.

### Risks & Mitigation
Partner renegotiates below RM 25K/year → set minimum floor in internal negotiation mandate before talks begin; offer extended payment terms rather than price reduction. Second partner slow to sign → approach 3 simultaneously. Hormuz audit pricing challenged → position as insurance/risk product not O&M product; sell to asset owner directly.

### Owner
- **Commercial:** 3-year contract, Hormuz product, second partner, GCC pre-assessment
- **Technical:** white-label dashboard
- **Regulatory/Legal:** SEDA compliance, GCC pre-assessment brief

### Budget
**RM 8K–15K**
- Partner travel and entertainment: RM 3K–6K
- White-label dashboard development sprint: RM 2K–5K
- SEDA filing: RM 1K–2K
- GCC pre-assessment consultant: RM 2K–4K

### Go/No-Go Gate
> *Did the annual contract and second partner prove that the model is repeatable, not just a one-time pilot?*

Pass criteria: 3-year contract signed; second partner LOI signed; Hormuz audit product documented and piloted; SEDA confirmed; cumulative ARR > RM 150K; GCC pre-assessment complete.

---

## Phase 7 — GCC Expansion and Tier 3
**Timeline:** Months 25–36

### Main Activities

**GCC Market Entry**
- Target UAE, Saudi Arabia, Kuwait: utility-scale O&M >50 MW
- GCC pricing: 1.55× Malaysian wholesale base (mathematically derived: GCC irradiance 5.8 kWh/m²/day ÷ Malaysia 4.5 × GCC tariff ÷ Malaysia RM 0.35/kWh = 1.289 × 1.200 = 1.55×; GCC soiling rates confirmed 3–5× faster than humid tropical — IEA PVPS T13-21 2022; ScienceDirect GCC PV soiling 2021)
- Invoice GCC contracts in USD to eliminate currency risk
- G-Mark certification application (UAE): submit Month 25, ~4-month cycle
- TDRA device registration (UAE) for hardware and IoT connectivity
- UAE PDPL (Personal Data Protection Law) compliance review and data residency confirmation
- **Regulatory checkpoint (Month 25–36):** G-Mark → SASO (Saudi) → TDRA full registration path confirmed

**Tier 3 Full Patent**
- Commercialise automated cleaning controller using curved-flow fluid distribution (UM patent PI 2024000995)
- Tier 3 pricing: RM 64.1K/year + RM 102K–268K one-time hardware installation
- GCC Tier 3: apply 1.55× multiplier, invoice in USD

**ESG Module**
- Automated carbon credit calculation using TNB SESB 2022 grid emission factor (0.585 kg CO₂/kWh) for Malaysian assets; DEWA/SEC factors for GCC
- IEC 61724-compliant data exports for ESG audit submissions
- Aligned with IFRS S2 / ISSB reporting standard (mandatory for KLSE Main Market from FY2025)
- Creates renewal stickiness: asset owners need annual data exports for ESG filings

**Revenue Target**
- Month 36 ARR: RM 500K–1M (5 Malaysian contracts Tier 1/2 + 2 GCC contracts)

### Research / Business Basis
GCC dust losses 2–3× Malaysian levels (NREL 2022); UAE solar capacity 5.6 GW with aggressive O&M demand growth; IFRS S2 mandatory for KLSE-listed asset owners from FY2025 reporting cycle; G-Mark mandatory for hardware sales in UAE; ESG module creates audit-driven renewal without active sales effort.

### Key Deliverables
- G-Mark certification and TDRA registration
- Tier 3 hardware deployed at ≥1 GCC site
- ESG module with IEC 61724 data export and IFRS S2 alignment
- UAE PDPL data residency compliance confirmation
- ARR RM 500K–1M achieved

### Success Criteria
≥1 GCC contract signed at 1.55× pricing; Tier 3 hardware operational at ≥1 site; ESG module accepted by ≥1 asset owner auditor for ESG filing; ARR ≥ RM 500K by Month 36.

### Risks & Mitigation
G-Mark delayed → begin application Month 25; sell software-only Tier 1 in GCC while hardware certification pending. Currency risk → invoice in USD, monthly treasury conversion. ESG standards evolve → track ISSB quarterly updates; maintain flexible calculation engine parameterised by emission factor. Tier 3 hardware cost overrun → set manufacturing ceiling RM 180K/unit; consider hardware-as-a-service lease model.

### Owner
- **Commercial:** GCC sales, USD contracts, Tier 3 commercial deployment
- **Technical:** ESG module, Tier 3 backend integration
- **Regulatory/Legal:** G-Mark, TDRA, UAE PDPL, SASO path

### Budget
**RM 80K–150K**
- G-Mark certification: RM 20K–40K
- Tier 3 hardware manufacturing: RM 50K–80K
- GCC travel and sales: RM 10K–20K
- UAE legal and PDPL compliance: RM 10K–20K

### Go/No-Go Gate
> *Is GCC expansion justified by the Malaysia proof-of-concept?*

Pass criteria: G-Mark certification obtained; ≥1 GCC contract signed; ESG module validated by auditor; ARR ≥ RM 500K; Tier 3 hardware operational at ≥1 site.

---

## Regulatory Timeline Summary

| Period | Checkpoint | Action |
|---|---|---|
| Months 4–6 | Regulatory classification memo | Determine ST/SIRIM/MCMC classification for SolarGuard software and hardware; obtain SEDA compliance confirmation for FiT/LSS data reporting |
| Months 13–18 | ST/SIRIM/MCMC submission | Submit SIRIM certification application (Month 13); obtain ST device registration for Tier 2 hardware; confirm or obtain MCMC exemption for IoT radio hardware |
| Months 20–24 | GCC certification pre-assessment | Document G-Mark (UAE), SASO (Saudi Arabia), TDRA registration requirements; confirm UAE PDPL data residency obligations; budget Phase 7 certification spend |
| Months 25–36 | G-Mark / TDRA / SASO full path | G-Mark application submitted Month 25; TDRA device registration; SASO path initiated if Saudi entry prioritised; UAE PDPL compliance confirmed |

---

## Milestone Scorecard

| Month | Milestone | KPI | Evidence |
|---|---|---|---|
| 3 | Product hardening complete | 84 tests passing in CI; backend deployed at HTTPS endpoint; frontend connected to live backend | GitHub Actions CI badge; demo URL accessible; uptime log |
| 6 | LOI signed with pilot partner | 1 signed LOI; measurement protocol countersigned; ≥10 customer discovery interviews completed | Signed LOI document; signed protocol PDF; discovery report |
| 9 | Paid pilot complete | RM 35K–50K invoice issued; system uptime >99%; classification accuracy >80% vs engineer; renewal LOI signed Day 85 | Pilot invoice; uptime logs; 90-day performance report; signed renewal LOI |
| 12 | Real-data model validated | Classifier F1 > 0.80 on real data (time-based split); forecaster RMSE < 5% on 3-day horizon | Model evaluation report; model card; A/B test results |
| 18 | Tier 2 sensor proven | Classifier F1 > 0.85 with sensor data; sensor packet loss < 5%; SIRIM certification obtained | SIRIM certificate; IEC 61724 validation report; sensor accuracy report |
| 24 | Annual contract + second partner secured | 3-year contract signed ≥RM 25K/year; second partner LOI executed; cumulative ARR RM 100K–200K | Signed 3-year contract; signed partner agreement; ARR summary |
| 36 | GCC/Tier 3 scale achieved | ≥1 GCC contract at 1.55× pricing; ARR RM 500K–1M; ESG module accepted by ≥1 auditor | Signed GCC contract; ARR dashboard; auditor acceptance letter; case study |
