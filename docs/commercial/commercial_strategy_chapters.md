# SolarGuard: Commercial Strategy — Buyer Decision Map & O&M Partner Profit Model

**Product:** SolarGuard / SolarSense — Solar O&M Intelligence Platform
**Document type:** Commercial strategy — hackathon appendix / investor deck supplement / early commercialization plan
**Last updated:** 2026-05-16
**Evidence standard:** All claims backed by named source or labeled as [Inferred] where assumption is made.

---

# Chapter 1: Buyer Decision Map

## 1.1 Why the Buying Committee Matters

SolarGuard is not a consumer app. A single sale to a Malaysian O&M company or LSS asset owner involves 6–9 people across multiple departments, and any one of them can block deployment. The most common failure mode in enterprise SaaS is winning the economic buyer while losing the IT manager or legal counsel — which delays the deal by 3–6 months or kills it entirely.

This chapter maps every role, what they care about, what objection they will raise, what evidence answers it, and when they enter the sales process.

---

## 1.2 Why O&M Companies Are the Better First Buyer (vs. Asset Owners)

**Selling directly to an asset owner (the LSS SPV or project company)** requires navigating the SPV's legal structure, project finance covenants, lender approval for new service contracts, and sometimes board-level authority for any spend above a threshold. Asset owners are the correct end-users of SolarGuard's value, but they are slow to decide.

**Selling to the O&M operator first** is faster because:
1. The O&M contract already exists between the O&M company and the asset owner — adding a new tool to their stack does not require a new procurement process on the asset owner's side.
2. O&M companies have commercial mandates to grow service revenue and differentiate from commodity cleaning contractors.
3. The O&M company becomes a channel partner, reselling at RM 12–20/kWp after buying wholesale at RM 6–10/kWp — it earns margin and SolarGuard gains a multiplied distribution channel.
4. One O&M company (e.g., Pekat at 195 MWp, Solarvest at 470+ MWp under O&M) represents a portfolio that makes a single enterprise deal cover dozens of sites.
5. The O&M company handles the PDPA compliance burden and inverter data access negotiation with its own clients — removing those blockers from SolarGuard's sales cycle.

**The correct entry sequence is:** O&M company (channel partner) → O&M company bundles SolarGuard into service contract → Asset owner receives SolarGuard reports as part of their existing O&M service.

---

## 1.3 Buying Committee Role Map

### Role 1: Economic Buyer

| Field | Detail |
|---|---|
| **Example titles** | General Manager, Managing Director, CEO (O&M company); Head of Asset Management; CFO (if spend threshold requires CFO approval, which it may for Bursa-listed companies at RM 35–50K pilot level) |
| **Example companies** | Pekat Group MD; Solarvest Asset Management Head; Samaiden CEO; Progressture Solar CEO |
| **What they care about** | Total cost of ownership, ROI, whether the pilot is recoverable against yield improvement, contractual risk, whether this creates a new recurring revenue line (if O&M company) |
| **Likely objection** | "Show me the numbers. If soiling loss at our site is 4%, does SolarGuard pay for itself?" |
| **Proof that answers it** | Site-specific ROI model: 5 MW at 4–7% soiling loss (IEA PVPS) = RM 69K–171K/year recoverable at RM 0.35/kWh. Pilot fee RM 35–50K. If cleaning schedule optimization is demonstrated in 90 days, the pilot pays back within 1–3 cleaning events avoided or one yield recovery event. |
| **Document required** | One-page business case with site-specific numbers; ROI calculator output; Sulaiman et al. 2018 Perak field study reference (RM 9,307/MW/4-month period) as local anchor data |
| **Sales stage** | Enters at LOI/MOU stage; must approve before pilot contract is signed |
| **Decision power** | **Approve** |

---

### Role 2: Technical Buyer

| Field | Detail |
|---|---|
| **Example titles** | Head of Operations, Operations Manager, Head of Asset Performance, Senior Engineer |
| **Example companies** | Pekat Solar Operations Head; Solarvest O&M Division; Samaiden Site Operations Manager; TNB Renewables Asset Performance team |
| **What they care about** | Does SolarGuard integrate with their existing SCADA / inverter monitoring? Can it handle Modbus/SunSpec data? Is the dust-vs-weather classifier accurate enough to rely on for cleaning decisions? Does it comply with IEC 61724-1:2021? |
| **Likely objection** | "Our inverters already give us performance ratio data. What does SolarGuard add that we can't get from Huawei FusionSolar or SMA Data Manager?" |
| **Proof that answers it** | Inverter monitoring shows *total* yield loss, not *cause*. SolarGuard's RandomForest classifier discriminates dust soiling loss from weather-driven irradiance reduction. Without this discrimination, the operations team cannot know whether cleaning is financially justified on any given day. Live demo: same inverter data, different interpretation by the classifier. |
| **Document required** | Technical specification: API integration guide (Modbus/SunSpec, 15-minute aggregation), multi-provider weather fallback chain (NASA POWER → OpenWeather → CSV), classifier accuracy report (target >85% on simulated test set, >80% on field data), IEC 61724-1:2021 methodology alignment document |
| **Sales stage** | Enters at technical validation stage (before pilot contract); owns the Day 30 accuracy check in the pilot |
| **Decision power** | **Influence + Block** (if they are not convinced the tool is technically sound, they will recommend against the pilot to the economic buyer) |

---

### Role 3: Daily User

| Field | Detail |
|---|---|
| **Example titles** | O&M Engineer, Performance Analyst, Site Supervisor, Asset Management Analyst |
| **Example companies** | Field engineers at Pekat, Samaiden, or Plus Xnergy; monitoring desk at TNB Renewables Sepang; Solarvest O&M team |
| **What they care about** | Ease of use, actionability of output (does it tell them clearly when to clean?), whether it saves time vs. current manual process, whether the dashboard adds to their workload or reduces it |
| **Likely objection** | "We already track PR manually. This is another system I have to check every morning." |
| **Proof that answers it** | Dashboard is read-only for daily users — it surfaces one cleaning recommendation per site per day. Weekly check-in report is auto-generated (PDF). The user does not configure the system; they only act on its output. Demo the three-scenario interface (dusty week / rainy week / normal). |
| **Document required** | Dashboard demo (live or recorded), user guide (one page), sample weekly check-in report |
| **Sales stage** | Enters at pilot kickoff (Day 1); provides UX feedback at weekly check-ins; their positive feedback to the operations manager is critical for renewal |
| **Decision power** | **Use** (not a decision-maker, but a renewal influencer — if daily users hate the tool, the O&M manager will not renew) |

---

### Role 4: Blocker

| Field | Detail |
|---|---|
| **Example titles** | Conservative Procurement Officer, risk-averse CFO, Head of Internal Audit (for GLCs or Bursa-listed companies with strict capex/opex approval thresholds) |
| **Example companies** | Pekat Group (Bursa: 0233) — any spend at RM 35–50K pilot level may trigger internal approval workflow; TNB or GSPARX — GLC procurement rules apply |
| **What they care about** | Precedent (has this been done before?), vendor qualification (is SolarGuard an approved vendor?), budget availability (was this in the annual plan?), risk of paying for something that doesn't deliver |
| **Likely objection** | "This is not in the budget. We have a new-vendor approval process that takes 3–4 months." |
| **Proof that answers it** | (1) UM patent PI 2024000995 and UMCIE affiliation provides institutional credibility. (2) Pilot is structured as a fixed-fee service contract (not a SaaS subscription), which may fall under opex rather than capex and avoid the approval ceiling. (3) 90-day fixed term with clear exit — no long-term commitment required at pilot stage. (4) Cradle Fund backing (if approved) adds a government endorsement that satisfies vendor qualification. |
| **Document required** | Vendor qualification pack: company registration, UM affiliation letter, patent certificate, insurance certificates, PDPA compliance statement, financial references |
| **Sales stage** | Can appear at any stage; most dangerous when appearing after the economic buyer has already approved in principle |
| **Decision power** | **Block** |

---

### Role 5: Influencer

| Field | Detail |
|---|---|
| **Example titles** | UMCIE commercialization officer; SEDA Malaysia technical staff; Inverter vendor account manager (Huawei Malaysia, Sungrow Malaysia, SMA Solar); Industry consultant or EPCC advisor |
| **What they care about** | Technical legitimacy of SolarGuard's claims; alignment with Malaysian regulatory and performance standards; industry peer validation |
| **Likely positive influence** | "We know UM is behind this — it has credibility. The IEC 61724 alignment is the right standard to use." |
| **How to activate** | UMCIE: Ensure UMCIE is listed as a co-applicant or institutional reference in grant applications and can provide a letter of support. SEDA: Brief SEDA on SolarGuard's soiling measurement methodology and its alignment with SEDA's FiT/LSS performance monitoring requirements. Inverter vendors: Huawei FusionSolar and Sungrow already have monitoring portals — position SolarGuard as a complementary layer (dust classifier add-on, not a replacement). These vendors could co-introduce SolarGuard to their O&M customers. |
| **Document required** | Technical brief (2 pages); UM endorsement letter; IEC 61724 methodology alignment document |
| **Sales stage** | Pre-sales (most effective before first meeting with economic buyer; warm introduction unlocks the door) |
| **Decision power** | **Influence (positive)** |

---

### Role 6: Procurement Owner

| Field | Detail |
|---|---|
| **Example titles** | Commercial Manager, Contracts Manager, Senior Procurement Executive |
| **Example companies** | Any Bursa-listed O&M company (Pekat, Solarvest, Samaiden) has a procurement function; TNB and GSPARX operate under GLC procurement rules (Ministry of Finance procurement guidelines) |
| **What they care about** | Pricing transparency, payment terms, contract structure, vendor qualifications, whether the contract can be renewed on the same terms, whether there is a Bumiputera vendor preference (for GLC procurement) |
| **Likely objection** | "The pilot price of RM 35–50K is not in the budget cycle. Can we do a smaller proof-of-concept first? Also, are you a Bumiputera company?" [Inferred as common for GLC procurement] |
| **Proof that answers it** | (1) Offer a RM 5K–15K "Cleaning Intelligence Report" as a pre-pilot scoping product — lower commitment, easier to procure, and creates a path to the full pilot. (2) For GLC procurement: UM spinoff structure through UMCIE may qualify for Bumiputera or local university preference. |
| **Document required** | Formal quotation (itemised), draft pilot contract with payment schedule, vendor qualification pack, standard T&Cs, optional: pre-pilot scoping product one-pager |
| **Sales stage** | Contracting (after economic buyer approval, before LOI is signed) |
| **Decision power** | **Influence / Approve procurement process** |

---

### Role 7: Legal / Compliance Owner

| Field | Detail |
|---|---|
| **Example titles** | Legal Counsel, Company Secretary (mandatory for all Bursa-listed companies), Compliance Manager, Data Protection Officer |
| **Example companies** | Pekat, Solarvest, Samaiden (all Bursa-listed, must comply with Listing Requirements on material contracts); TNB (GLC, Cybersecurity Act 2018 and PDPA 2010 compliance mandatory) |
| **What they care about** | Data ownership and residency (PDPA 2010), IP rights (who owns inverter data that SolarGuard trains on?), liability for yield claims (if SolarGuard's cleaning recommendation is wrong and they clean unnecessarily, who bears cost?), whether the contract is a "material contract" requiring Bursa disclosure |
| **Likely objection** | "Who owns the performance data after the contract ends? If your model incorrectly recommends cleaning and we incur RM 20K in cleaning costs, are you liable?" |
| **Proof that answers it** | (1) Data-sharing agreement: inverter performance data remains owned by the asset owner / O&M partner — SolarGuard holds a time-limited, anonymised licence for model training only. (2) Liability limitation clause: SolarGuard provides recommendations, not decisions — the O&M team retains final authority on cleaning scheduling. This is explicitly stated in the contract and agreed to by both parties. (3) Measurement protocol (IEC 61724): the signed protocol document defines the evidence standard for revenue-share disputes, removing ambiguity. (4) PDPA 2010 compliance: SolarGuard processes operational (not personal) data; privacy notice is provided; data retention policy limits storage to contract term + 1 year. |
| **Document required** | Data-sharing agreement (PDPA-compliant, reviewed by Malaysian legal counsel); NDA; IP licensing terms (UM patent + SolarGuard software); liability limitation clause; PDPA compliance notice; data retention policy; measurement protocol document (IEC 61724-aligned) |
| **Sales stage** | Enters before pilot contract is signed — this is the most common deal-delaying role. Must be resolved in Phase 2 (legal pack preparation). |
| **Decision power** | **Block** (unsigned data agreement = no API access = no pilot) |

---

### Role 8: IT / Security Owner

| Field | Detail |
|---|---|
| **Example titles** | IT Manager, Head of IT, CTO, System Administrator, SCADA / OT Security Officer |
| **Example companies** | TNB, GSPARX, and larger Bursa-listed companies have dedicated IT/OT security functions; smaller O&M companies [Inferred] may use a shared IT resource or outsource |
| **What they care about** | How does SolarGuard access inverter data (read-only API, or does it require SCADA credentials)? Where is data stored (local, cloud region)? Does the backend comply with Malaysia's Cybersecurity Act 2018? Can SolarGuard's API access be revoked instantly if the contract ends? Does SolarGuard write anything back to the SCADA/inverter system? |
| **Likely objection** | "Our inverter SCADA is an OT system — we cannot expose it to a third-party cloud API without a full security assessment." |
| **Proof that answers it** | (1) SolarGuard accesses inverter data via Modbus/SunSpec read-only pull — it does not write to any SCADA system. (2) API key authentication: Bearer token + SHA-256-hashed keys; per-key sliding-window rate limiting; body size enforcement. (3) Cloud hosting: GCP Cloud Run or AWS ECS (Asia Pacific / Singapore region) — data does not leave the ASEAN region. (4) SHA-256 model integrity verification on every deployment. (5) API access can be revoked by the customer at any time by rotating the API key. |
| **Document required** | Security architecture document (API access scope: read-only Modbus/SunSpec; no SCADA write access); cloud hosting specification (region, data residency); API key management procedure; Cybersecurity Act 2018 compliance statement; penetration testing report (recommended for Tier 2+ deployments) |
| **Sales stage** | Enters at technical validation (before pilot); must sign off on API access before Day 1 of pilot. Most dangerous in Weeks 5–6 of pilot preparation — delays here push the go-live date. |
| **Decision power** | **Block** (no API access = no data = no pilot) |

---

### Role 9: ESG / Sustainability Stakeholder

| Field | Detail |
|---|---|
| **Example titles** | Sustainability Manager, Head of ESG, Head of Investor Relations, Sustainability Reporting Officer |
| **Example companies** | All Bursa Main Market issuers (Pekat, Solarvest, Samaiden, TNB, Cypark) are subject to IFRS S2 mandatory climate disclosures from FY2025. GSPARX (TNB subsidiary) and Gentari (PETRONAS subsidiary) also face parent-company ESG reporting requirements. |
| **What they care about** | Can SolarGuard generate data that is usable in the IFRS S2 annual sustainability report? Does it calculate carbon credits (avoided emissions) in a methodology that an ESG auditor will accept? Does it align with the TNB SESB 2022 grid emission factor (0.585 kg CO₂/kWh)? |
| **Likely objection** | "Can your reports actually be cited in our sustainability report, or do they produce data that our ESG auditor will reject?" |
| **Proof that answers it** | (1) SolarGuard uses the TNB SESB 2022 grid emission factor (0.585 kg CO₂/kWh) for Malaysian assets, consistent with IPCC-aligned calculation methodology. (2) IEC 61724-compliant data exports are audit-ready and can be attached to IFRS S2 disclosures as supporting evidence. (3) The annual ESG report narrative: "X MWh recovered through soiling monitoring, equivalent to Y tonnes CO₂ avoided, valued at RM Z at carbon price RM 40/tonne" is directly generatable from SolarGuard's output. |
| **Document required** | ESG data output specification: what SolarGuard generates, format, calculation methodology, alignment with IFRS S2; carbon credit calculation methodology note; IEC 61724 data export format description |
| **Sales stage** | Enters at annual contract renewal — the ESG stakeholder is rarely involved in the pilot decision, but becomes the strongest internal advocate for renewal because SolarGuard's data accumulates value over time (historical baseline, annual comparison, carbon credits trend) |
| **Decision power** | **Influence (positive)** + **Renewal advocate** |

---

### Role 10: Executive Sponsor

| Field | Detail |
|---|---|
| **Example titles** | CEO/MD (O&M company); Group CEO (if part of a GLC group); Board Director responsible for sustainability or technology |
| **Example companies** | Pekat Group Berhad CEO/MD; Solarvest Group CEO; TNB Group CEO (or delegated to TRe MD); GSPARX CEO; Gentari CEO |
| **What they care about** | Strategic positioning, competitive differentiation (does SolarGuard help win new O&M contracts by offering something competitors cannot?), regulatory alignment (IFRS S2 driver), earnings quality (sector earnings growing 63% per Maybank IB 2025), UM partnership credibility |
| **Likely objection** | "How does SolarGuard fit into our 5-year strategy? Is this a distraction, or does it genuinely differentiate us from Progressture or Plus Xnergy?" |
| **Proof that answers it** | (1) No Malaysian O&M company currently deploys a domestic AI-soiling classification tool — first-mover window is open. (2) IFRS S2 mandatory disclosure creates a procurement mandate for ESG-quality yield data that SolarGuard directly addresses. (3) GCC expansion (Months 25–36) positions the O&M partner for premium GCC O&M contracts using the same SolarGuard data export capability. (4) UM patent TRL 8 and local IP ownership reduces technology dependency on foreign vendors. |
| **Document required** | 2-page executive summary: strategic positioning, market size (5,777 MW installed, 117 LSS holders), GCC opportunity, ESG mandate driver, why now |
| **Sales stage** | LOI/MOU stage — the executive sponsor signs the LOI. Without their blessing, the economic buyer cannot proceed. |
| **Decision power** | **Approve LOI; Champion internally** |

---

## 1.4 Summary Table

| Role | Example Title | Decision Power | Main Concern | Likely Objection | Required Proof | Sales-Stage Involvement |
|---|---|---|---|---|---|---|
| Economic Buyer | GM / MD / CEO (O&M) | **Approve** | ROI and contractual risk | "Does the pilot pay for itself?" | Site-specific ROI model (RM 69K–171K/year at 5 MW) | LOI/MOU stage |
| Technical Buyer | Head of Operations | **Influence + Block** | Classifier accuracy, IEC 61724 compliance, integration | "What does this add over our inverter monitoring?" | Classifier accuracy report, technical spec, live demo | Technical validation (pre-pilot) |
| Daily User | O&M Engineer / Analyst | **Use** | Ease of use, actionability | "Another system to check" | Dashboard demo, sample report, user guide | Pilot kickoff + weekly |
| Blocker | Procurement Officer / Auditor | **Block** | Precedent, budget, vendor qualification | "Not in budget / no approved vendor process" | Vendor qualification pack, UM affiliation, pilot exit clause | Any stage (unpredictable) |
| Influencer | UMCIE / SEDA / Inverter vendor | **Influence (positive)** | Industry legitimacy, technical standards | (Generally positive if briefed) | Technical brief, UM endorsement | Pre-sales |
| Procurement Owner | Contracts Manager | **Influence / Approve procurement** | Pricing, payment terms, vendor fit | "RM 35–50K not in budget cycle" | Formal quote, draft contract, pre-pilot scoping option | Contracting |
| Legal / Compliance | Legal Counsel / Company Secretary | **Block** | PDPA, data ownership, liability | "Who owns the data? Who bears liability for bad recommendations?" | Data-sharing agreement, PDPA notice, liability clause, measurement protocol | Pre-pilot (deal-blocking) |
| IT / Security | IT Manager / OT Security | **Block** | API security, SCADA integrity, cloud residency | "We can't expose OT to a third-party API" | Security architecture doc, read-only API proof, cloud region spec | Pre-pilot (deal-blocking) |
| ESG / Sustainability | Sustainability Manager | **Influence + Renewal advocate** | IFRS S2 usability, carbon credit methodology | "Will your data hold up to ESG audit?" | ESG output spec, IEC 61724 exports, carbon credit methodology | Annual contract renewal |
| Executive Sponsor | CEO / MD / Group CEO | **Approve LOI** | Strategic fit, competitive differentiation | "How does this fit our 5-year plan?" | 2-page executive summary, sector data, GCC roadmap | LOI/MOU stage |

---

## 1.5 Key Buying Committee Questions — Answered

**Who signs?**
The Economic Buyer (MD/GM of the O&M company) signs the pilot contract and, with the Executive Sponsor, signs the LOI/MOU. For Bursa-listed companies, the Company Secretary must also certify that the contract is not a "material transaction" requiring Bursa disclosure (which it is not for a RM 35–50K pilot).

**Who uses?**
Daily Users — O&M engineers, site supervisors, performance analysts. They are not decision-makers, but they are the voice of product-market fit at renewal time.

**Who approves the budget?**
The Economic Buyer approves, subject to the Blocker/Procurement Owner ensuring the spend does not require a higher approval level. For listed companies, pilot spend at RM 35–50K [Inferred] likely falls within GM-level authority without board approval.

**Who blocks deployment?**
The Legal/Compliance Owner (unsigned data agreement), the IT/Security Owner (no API access), or the Blocker (budget not approved). All three must be resolved before Day 1 of the pilot.

**Who owns technical validation?**
The Technical Buyer (Head of Operations or Asset Performance) owns the Day 30 accuracy check. They assess whether the classifier output matches their own engineer's manual assessment.

**Who owns data access?**
The IT/Security Owner must grant and configure the Modbus/SunSpec API read credentials. Practically, the O&M engineer coordinating the site may also hold these credentials. Both must be engaged in Phase 2.

**Who owns the ESG/reporting value?**
The ESG/Sustainability Stakeholder owns this — but they are often not involved in the pilot decision. Strategically, brief them during the pilot so they are already engaged when the annual contract renewal comes.

**Who must be convinced before pilot?**
At minimum: Economic Buyer (approve) + Technical Buyer (no block) + Legal/Compliance Owner (data agreement signed) + IT/Security Owner (API access granted). These four are the **minimum pilot buying committee**.

**Who must be convinced before 3-year contract?**
All ten roles must be aligned, with active involvement from: Economic Buyer, Technical Buyer, Procurement Owner (contract structure), Legal/Compliance (contract terms), Executive Sponsor (LOI). ESG/Sustainability stakeholder becomes involved from Year 1 onward.

---

## 1.6 Recommended Sales Approach

**First contact:** Head of Operations or Senior O&M Engineer (Technical Buyer) — they understand the problem immediately and can champion internally. Do not start with the CEO. Do not start with IR/Communications.

**Recommended internal champion:** Head of Operations or Asset Performance — they feel the pain of inefficient cleaning decisions daily and will benefit most visibly from SolarGuard's recommendations.

**Recommended executive sponsor:** CEO/MD (O&M company) — engage after the internal champion has established interest and secured a technical pre-demonstration. Approach via warm introduction through UMCIE or an inverter vendor contact.

**Minimum buying committee for a paid pilot:**
1. Economic Buyer — approves spend
2. Technical Buyer — validates technically, does not block
3. Legal/Compliance Owner — signs data-sharing agreement
4. IT/Security Owner — configures API access

**Minimum buying committee for a 3-year contract:**
All four above, plus:
5. Procurement Owner — executes contract
6. Executive Sponsor — signs LOI / strategic commitment
7. ESG/Sustainability stakeholder — briefed on annual ESG report value (sets up renewal stickiness)

---

# Chapter 2: O&M Partner Profit Model

## 2.1 Why an O&M Company Would Buy SolarGuard

An O&M company's commercial problem is commoditisation. Manual solar panel cleaning and basic inverter monitoring are services that any contractor can provide. There is no pricing power in commodity O&M. SolarGuard gives an O&M company:

1. A new recurring revenue line with 33–70% gross margin (depending on pricing tier)
2. A cleaning justification tool that reduces wasted cleaning trips (saves direct cost)
3. An ESG data output that creates annual renewal stickiness independent of cleaning performance
4. A differentiation story for competitive O&M contract bids: "We use AI-based soiling monitoring — our competitors do not"
5. A UM-patented platform that cannot be easily replicated by a competitor

None of these benefits require the O&M company to hire additional staff or invest in new equipment beyond what SolarGuard provides.

---

## 2.2 Pricing Architecture

| Entity | Price to them | Price they charge | Their gross margin |
|---|---|---|---|
| SolarGuard → O&M partner (wholesale) | RM 6–10/kWp/year | — | — |
| O&M partner → Asset owner (resale) | — | RM 12–20/kWp/year | 33–70% (varies by tier) |
| Pilot (90 days, up to 5 MW) | RM 35K–50K | RM 50K–75K [Inferred resale] | ~25–33% |
| Revenue share (optional, if applicable) | — | 15–25% of verified recovered revenue | Shared with asset owner |
| Minimum contract term | — | 3 years | — |

**Pricing floor rule:** SolarGuard's wholesale price floor is RM 6/kWp. Below this, support burden and model retraining cost erodes SolarGuard's own gross margin. The resale price floor that must be enforced in the channel agreement is RM 12/kWp — below this, the margin does not justify the O&M partner's sales and onboarding effort.

---

## 2.3 Annual Fee Model by Site Size

The table below shows the fee structure for four reference site sizes. Mid-case uses wholesale RM 8/kWp and resale RM 16/kWp.

### Wholesale fee to SolarGuard (O&M partner pays SolarGuard):

| Site size | kWp | @ RM 6/kWp | @ RM 8/kWp | @ RM 10/kWp |
|---|---|---|---|---|
| 1 MW | 1,000 | RM 6,000 | RM 8,000 | RM 10,000 |
| 5 MW | 5,000 | RM 30,000 | RM 40,000 | RM 50,000 |
| 20 MW | 20,000 | RM 120,000 | RM 160,000 | RM 200,000 |
| 50 MW | 50,000 | RM 300,000 | RM 400,000 | RM 500,000 |

### Resale fee to asset owner (O&M partner charges):

| Site size | kWp | @ RM 12/kWp | @ RM 16/kWp | @ RM 20/kWp |
|---|---|---|---|---|
| 1 MW | 1,000 | RM 12,000 | RM 16,000 | RM 20,000 |
| 5 MW | 5,000 | RM 60,000 | RM 80,000 | RM 100,000 |
| 20 MW | 20,000 | RM 240,000 | RM 320,000 | RM 400,000 |
| 50 MW | 50,000 | RM 600,000 | RM 800,000 | RM 1,000,000 |

### Partner gross profit and margin (mid-case: RM 8 wholesale / RM 16 resale):

| Site size | Wholesale (paid to SolarGuard) | Resale (received from asset owner) | Gross profit | Gross margin |
|---|---|---|---|---|
| 1 MW | RM 8,000 | RM 16,000 | RM 8,000 | 50% |
| 5 MW | RM 40,000 | RM 80,000 | RM 40,000 | 50% |
| 20 MW | RM 160,000 | RM 320,000 | RM 160,000 | 50% |
| 50 MW | RM 400,000 | RM 800,000 | RM 400,000 | 50% |

### Gross margin sensitivity across pricing tiers:

| Wholesale ↓ \ Resale → | RM 12/kWp resale | RM 16/kWp resale | RM 20/kWp resale |
|---|---|---|---|
| RM 6/kWp wholesale | 50% GM | 62.5% GM | 70% GM |
| RM 8/kWp wholesale | 33% GM | **50% GM (mid-case)** | 60% GM |
| RM 10/kWp wholesale | 17% GM | 37.5% GM | 50% GM |

At RM 10/kWp wholesale and RM 12/kWp resale, the partner earns only 17% gross margin — insufficient to justify onboarding, support, and account management effort. The minimum viable pricing pair is **RM 8 wholesale / RM 16 resale** (50% GM) or **RM 6 wholesale / RM 12 resale** (50% GM) for low-margin introductory contracts.

---

## 2.4 Three-Year Contract Value

Three-year minimum terms protect both SolarGuard's revenue predictability and the O&M partner's customer retention commitment.

### Three-year accumulated revenue (mid-case: RM 8 wholesale / RM 16 resale):

| Site size | 3-year SolarGuard revenue | 3-year O&M partner resale revenue | 3-year partner gross profit |
|---|---|---|---|
| 1 MW | RM 24,000 | RM 48,000 | RM 24,000 |
| 5 MW | RM 120,000 | RM 240,000 | RM 120,000 |
| 20 MW | RM 480,000 | RM 960,000 | RM 480,000 |
| 50 MW | RM 1,200,000 | RM 2,400,000 | RM 1,200,000 |

**Portfolio effect (Pekat example):** Pekat manages approximately 195 MWp. At RM 8/kWp wholesale and 60% portfolio penetration (117 MWp contracted), SolarGuard's 3-year revenue = 117,000 kWp × RM 8 × 3 = **RM 2.8M**. Pekat's resale revenue at RM 16/kWp over 3 years = **RM 5.6M**. This is a single channel-partner deal generating SolarGuard's Month 36 ARR target from one relationship. Even at 20% penetration (39 MWp), the 3-year SolarGuard revenue = RM 936K.

---

## 2.5 Value Retention Analysis — Asset Owner Perspective (5 MW Reference Site)

**This section demonstrates that pricing must leave the asset owner with visible upside. The resale price charged to the asset owner must not consume the full recoverable value.**

### Conservative recoverable value (IEA PVPS 4–7% soiling loss at RM 0.35/kWh, 5 MW):
- Low end: RM 69,000/year
- High end: RM 171,000/year

### High-soiling demo case — DUST-HEAVY INDUSTRIAL SITE ONLY (not the market average):
- ~RM 316,000/year (labeled as high-soiling / dust-heavy case; do not present as the default)

### Asset owner net value retained after paying O&M resale fee:

| Scenario | Recoverable value | O&M resale fee (RM 12/kWp) | Net retained (RM 12) | O&M resale fee (RM 16/kWp) | Net retained (RM 16) | O&M resale fee (RM 20/kWp) | Net retained (RM 20) |
|---|---|---|---|---|---|---|---|
| Conservative low (4% soiling) | RM 69,000 | RM 60,000 | **RM 9,000** | RM 80,000 | **-RM 11,000** | RM 100,000 | **-RM 31,000** |
| Conservative high (7% soiling) | RM 171,000 | RM 60,000 | **RM 111,000** | RM 80,000 | **RM 91,000** | RM 100,000 | **RM 71,000** |
| High-soiling demo case* | RM 316,000 | RM 60,000 | **RM 256,000** | RM 80,000 | **RM 236,000** | RM 100,000 | **RM 216,000** |

*The RM 316K/year figure is a dust-heavy industrial site scenario. It is presented as a ceiling case, not the default market average. Always qualify this number when presenting it.

### Pricing implications from the value retention table:
1. **RM 12/kWp resale is only safe at 4% soiling loss** — the asset owner keeps just RM 9,000/year, which is thin. If cleaning costs are higher than expected or yield recovery is lower, the ROI turns negative. Use RM 12/kWp only as an entry price for pilot conversion.
2. **RM 16/kWp resale is defensible from 5% soiling loss upward** — asset owner keeps RM 56K–236K/year depending on soiling intensity. This is the recommended standard contract price.
3. **RM 20/kWp resale should only be quoted for confirmed high-soiling sites (industrial, construction proximity, low rainfall)** — at 4% soiling, this fee consumes more than the recovered value, making it an impossible sell to a finance-literate asset owner.
4. **Site-specific soiling assessment before contract pricing** — SolarGuard should use the 90-day pilot to measure actual soiling intensity, then set the annual contract price based on confirmed soiling percentile. This protects both SolarGuard and the asset owner from pricing mismatches.

---

## 2.6 Partner Incentives Beyond Gross Margin

The gross margin analysis above focuses on the direct resale spread. But O&M partners gain several additional benefits:

| Incentive | Mechanism | Estimated value |
|---|---|---|
| **Reduced wasted cleaning trips** | SolarGuard's classifier flags weather-driven yield loss (not dust) — O&M partner does not dispatch a cleaning crew for a non-soiling event | RM 5K–15K/site/year in avoided cleaning cost [Inferred from Malaysian cleaning crew cost of RM 1,500–3,000/trip × 3–10 avoided trips/year] |
| **Predictive cleaning schedule** | Cleaning is scheduled when dust accumulation reaches the ROI threshold, not on a fixed calendar — reduces over-cleaning by 20–40% [Inferred] | Higher asset uptime, lower consumables cost |
| **ESG data generation** | SolarGuard's IEC 61724-aligned output can be cited in sustainability reports — the O&M partner can offer this as a premium service add-on | RM 5K–20K/year per client for an ESG data pack (separate line item, [Inferred pricing]) |
| **Asset owner retention** | When an asset owner's ESG auditor relies on SolarGuard's historical data (3-year accumulation), switching the O&M provider becomes costly — the O&M partner's churn rate drops from ~30% to ~10% (Bain B2B SaaS benchmark) | Retained contract value: RM 80K–320K/year per 5–20 MW site at 3-year terms |
| **Competitive differentiation in O&M bids** | "AI-backed soiling intelligence" is a differentiator in RFP responses for new LSS5/CGPP O&M contracts — no Malaysian O&M company currently offers this tool natively [verified: no domestic AI soiling classifier deployed as of 2026-05-16] | Win rate improvement for new O&M contracts — not quantified, but strategic |
| **Hormuz audit add-on** (GCC-exposed portfolios) | For LSS assets that import panels from GCC-transit supply chains, SolarGuard can offer a structured dust-type assessment for insurance and asset management — priced RM 15K–25K per engagement (Phase 6 product) | Additional engagement revenue |

---

## 2.7 Revenue Share Model (Optional Track)

Revenue share is **an alternative pricing track** for asset owners who resist fixed annual fees but are willing to pay a percentage of verified recovered yield revenue.

**Structure:**
- SolarGuard (via O&M partner) receives 15–25% of the revenue value of verified recovered yield
- Verified recovered yield = (actual generation during cleaned period − IEC 61724 baseline) × RM 0.35/kWh (or confirmed site tariff)
- The measurement baseline must be signed before Day 1 of the pilot — no baseline, no revenue share

**Revenue share example (5 MW, conservative case):**
- Recovered revenue: RM 69K–171K/year
- SolarGuard share (20% of recovered): RM 13,800–RM 34,200/year
- Asset owner retains: RM 55,200–136,800/year

**Revenue share is only viable if:**
1. The IEC 61724-aligned measurement protocol is signed and countersigned by both parties before Day 1.
2. The measurement baseline period (14 clear-sky days minimum) is completed before any cleaning interventions.
3. All exclusion rules (curtailment days, rain events >5mm, grid outages) are agreed in writing and adhered to during calculation.

**Risk:** Revenue-share disputes are the most common cause of relationship breakdown in performance-based contracts. SolarGuard's data must be the agreed-upon source of truth — not the O&M company's SCADA system, which may have different calibration. The measurement protocol is the legal document that prevents this dispute.

**Recommendation:** Revenue share is appropriate only for asset owners with existing soiling data confirming >5% annual yield loss. For first-time pilots, fixed-fee pricing (RM 35K–50K for 90 days) eliminates the baseline dispute risk.

---

## 2.8 Risks and Mitigations

| Risk | Practical Mitigation |
|---|---|
| **Asset owner rejects the resale markup** ("Why am I paying RM 16/kWp when the wholesale rate might be lower?") | Do not reveal the wholesale price in standard commercial terms. The resale price is the O&M partner's commercial decision. Include a resale pricing floor clause in the channel agreement: the O&M partner may not resell below RM 12/kWp, protecting SolarGuard's brand from commodity pricing. |
| **O&M partner demands white-label rights** (wants to rebrand as their own product) | White-label rights are available as an add-on fee: recommended RM 15K–25K one-time white-label setup fee plus RM 2/kWp/year incremental on wholesale price. White-label does not transfer the UM patent or the underlying ML models. The channel agreement specifies that UM patent PI 2024000995 remains UM property regardless of white-label arrangement. |
| **Revenue-share disputes** (O&M partner or asset owner contests verified recovered yield) | Only offer revenue share when the IEC 61724 measurement protocol is signed in advance. The protocol document specifies: irradiance source (pyrometer or NASA POWER ±3%), inverter data source (Modbus/SunSpec 15-min), exclusion rules, and the agreed revenue recovery formula. Disputes are resolved by reference to this signed document. |
| **Partner tries to bypass SolarGuard after pilot** (trains their own model using data gathered during the pilot) | Data-sharing agreement restricts the partner's use of SolarGuard-processed data outputs to the contracted scope. The UM patent protects the core sensor calibration method and fluid distribution hardware. The ML model (RandomForest classifier + forecaster) is owned by SolarGuard; model weights are not transferred to the partner under any standard contract. Include a 3-year non-compete clause on soiling ML classifier development in the channel agreement. |
| **Wholesale price is too low to cover support burden** (RM 6/kWp may not be viable if the partner has poor data infrastructure requiring heavy onboarding) | Include an annual minimum fee clause in the channel agreement: minimum RM 30,000/year per partner regardless of site kWp. This ensures viability for smaller-site partners. For sites below 3 MW, negotiate a site minimum of RM 12,000/year rather than kWp-based pricing. |
| **Data access delays block deployment** (inverter vendor or partner IT team delays API credential issuance) | The site assessment checklist (Phase 2) must confirm inverter Modbus/SunSpec accessibility and a named IT contact before the LOI is signed. Include a "Data Readiness" clause: pilot start date is Day 1 of confirmed data ingestion, not Day 1 of contract signing. If data access is delayed >14 days, the pilot timeline extends accordingly. |

---

## 2.9 Recommended Offer Structure

### Recommended pilot offer:
- **Price:** RM 35,000 (entry) to RM 50,000 (standard) for a 5 MW site, 90 days
- **What it includes:** Tier 1 inference mode (inverter data + multi-provider weather); 14-day baseline period; 12 weekly check-in reports; 90-day final performance report; cleaning recommendation output from Day 15 onward
- **What it does not include:** Hardware sensors (Tier 2), SIRIM-certified equipment, custom dashboard branding
- **Payment terms:** 50% at contract signing; 50% at Day 45
- **Exit:** No automatic renewal from pilot — renewal requires a new contract signature

### Recommended O&M partner channel offer:
- **Wholesale price:** RM 8/kWp/year (midpoint of RM 6–10 range)
- **Minimum annual fee:** RM 30,000/year per partner (protects against small-site economics)
- **Resale pricing floor:** RM 12/kWp (enforced contractually; partner cannot resell below floor)
- **Recommended resale guidance:** RM 16/kWp (standard sites) to RM 20/kWp (confirmed high-soiling sites)
- **White-label rights:** RM 20,000 one-time + RM 2/kWp/year premium on wholesale
- **Minimum contract term:** 3 years (with annual review of soiling data and pricing)
- **Annual escalation:** CPI-linked, capped at 5%/year

### Recommended annual contract structure (post-pilot):
- **Base fee:** RM 6–10/kWp/year (wholesale) on contracted MWp
- **ESG report add-on:** RM 5K–10K/year per site for IEC 61724 + IFRS S2 aligned annual ESG data export (separate line item, high margin)
- **Hormuz audit add-on (GCC-exposed assets):** RM 15K–25K/engagement (Phase 6+)
- **Upsell path:** Tier 2 sensor hardware at RM 50.6K/year + RM 3.5K–7.2K one-time BOM from Month 13 onward

### Recommended pricing floor (absolute minimum):
- **Wholesale:** RM 6/kWp/year
- **Site minimum:** RM 12,000/year for sites under 3 MW
- **Partner minimum:** RM 30,000/year regardless of contracted MWp
- **Rationale:** Below these floors, SolarGuard's own gross margin (currently ~91% for Tier 1 software) compresses below a sustainable level given cloud hosting, model retraining, and support costs.

### Recommended first target segment:
**Bursa-listed EPCC/O&M companies with >50 MWp under active O&M management and IFRS S2 reporting obligations.** The combination of (a) large portfolio = high ACV, (b) public financial disclosure = verifiable ROI case, (c) IFRS S2 mandate = ESG data pull, and (d) earnings growth trajectory = budget availability makes Pekat Group (195 MWp, 65.5% profit growth FY2024) and Samaiden (RM 521M order book, O&M primary revenue line) the highest-probability entry points for both paid pilots and channel agreements.

---

*All financial figures are based on documented sources cited in assumptions_register.md unless labeled [Inferred]. Revenue figures should be stress-tested against actual site-specific soiling measurements in Phase 2 customer discovery interviews.*
