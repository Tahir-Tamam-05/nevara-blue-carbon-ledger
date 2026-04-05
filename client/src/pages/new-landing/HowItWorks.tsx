import { LandingLayout, Section, SectionLabel } from "@/components/layout/LandingLayout";
import { SubHero } from "@/components/layout/SubHero";
import { Link } from "wouter";

export default function HowItWorks() {
  return (
    <LandingLayout>
      <SubHero 
        label="Technical Architecture"
        title="The Science of Trust."
        subtitle="How NEVARA automates integrity across the entire blue carbon credit lifecycle — from coastline to corporate balance sheet."
        breadcrumb="Home → How It Works"
      />

      {/* ── PHASE 1 ─────────────────────────────────────────────────── */}
      <section className="bg-gray-50 dark:bg-[#060F0C] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <SectionLabel>Phase 01 · GIS Onboarding</SectionLabel>
          <h2 className="font-syne mb-6 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
            Mapping Land. Validating Rights.
          </h2>
          <p className="mb-10 max-w-2xl text-lg leading-relaxed text-gray-600 dark:text-gray-400">
            Contributors — whether state forest departments, coastal farmers,
            or NGOs — submit land parcels through NEVARA's interactive Leaflet
            mapping interface. The GIS engine validates three conditions before
            onboarding can proceed:
          </p>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                title: "Regulatory Surplus",
                body: "The project must demonstrate additionality — the land's carbon benefit must exceed what existing laws like the Coastal Regulation Zone (CRZ) 2019 already mandate. A project within a protected reserve does not qualify unless it provides measurable benefit beyond existing conservation requirements.",
                icon: "🛡",
                border: "border-teal-800/30"
              },
              {
                title: "Boundary Integrity",
                body: "Polygon coordinates are cross-referenced against High-Water Line (HWL) datasets and national cadastral records to prevent overlap with existing registrations. The system enforces a minimum 50-metre buffer between adjacent project boundaries — eliminating double-counting at the source.",
                icon: "🎯",
                border: "border-emerald-800/30"
              },
              {
                title: "Legal Right to Carbon",
                body: "Document verification requires land title, lease agreement, or departmental authorisation letter. For tribal and community land, a gram sabha resolution and Free, Prior and Informed Consent (FPIC) certificate must be submitted — satisfying Forest Rights Act (FRA) 2006 requirements.",
                icon: "⚖️",
                border: "border-blue-800/30"
              }
            ].map(check => (
              <Section key={check.title}>
                <div className={`h-full rounded-2xl border ${check.border} bg-white dark:bg-[#040D0B] p-7 transition-all hover:bg-black/5 dark:bg-white/[0.02]`}>
                  <div className="mb-4 text-2xl">{check.icon}</div>
                  <h3 className="font-syne mb-3 text-lg font-bold text-gray-900 dark:text-white">{check.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{check.body}</p>
                </div>
              </Section>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#040D0B] p-6">
            <p className="text-teal-400 text-xs font-bold mb-4 uppercase tracking-wider">Regulatory Compliance Layer</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                "◈ Forest (Conservation) Act, 1980",
                "◈ CRZ Rules 2019",
                "◈ Forest Rights Act (FRA) 2006",
                "◈ Energy Conservation Act (Amendment) 2022"
              ].map(law => (
                <div key={law} className="px-3 py-2 rounded-lg border border-gray-200 dark:border-white/5 text-xs text-gray-600 dark:text-gray-400 bg-black/5 dark:bg-white/[0.01]">
                  {law}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PHASE 2 ─────────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-[#040D0B] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <SectionLabel>Phase 02 · AI Verification</SectionLabel>
          <h2 className="font-syne mb-6 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl leading-tight">
            Continuous Monitoring.<br />Zero Manual Audits.
          </h2>
          <p className="mb-10 max-w-2xl text-lg leading-relaxed text-gray-600 dark:text-gray-400">
            Once onboarded, every registered project area is continuously
            monitored by NEVARA's AI stack. We use multi-source remote sensing
            data to track vegetation health, canopy density changes, and soil
            carbon stock fluctuations — producing a verifiable digital record
            of every hectare, every month.
          </p>

          <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Sentinel-2 Optical Imagery",
                body: "10-metre resolution multispectral data from ESA's Copernicus programme. NDVI computed from Band 8 and Band 4 provides a daily proxy for biomass density and canopy health.",
                tag: "10m resolution · Daily cadence",
                icon: "🛰",
                border: "border-teal-800/30"
              },
              {
                title: "Synthetic Aperture Radar (SAR)",
                body: "Cloud-penetrating radar imagery ensures monitoring continuity during India's monsoon season when optical imagery is unavailable. SAR data captures structural changes in mangrove canopy with 5-metre precision.",
                tag: "All-weather · Structural mapping",
                icon: "📡",
                border: "border-purple-800/30"
              },
              {
                title: "LiDAR Point Cloud Analysis",
                body: "Phase 3 integration. LiDAR returns three-dimensional canopy structure data — enabling precise above-ground biomass calculation without ground surveys. Required for Verra VM0033 v2.1 high-confidence credit issuance.",
                tag: "Phase 3 · 3D biomass mapping",
                icon: "🗼",
                border: "border-blue-800/30"
              },
              {
                title: "Climate & Tidal Correction",
                body: "Sea-level rise data and tidal migration models automatically adjust project boundary polygons to account for shoreline change over time — satisfying VM0033 v2.1's Dynamic Boundaries requirement without manual intervention.",
                tag: "VM0033 compliant · Auto-updating",
                icon: "🌊",
                border: "border-amber-800/30"
              }
            ].map(source => (
              <Section key={source.title}>
                <div className={`h-full rounded-2xl border ${source.border} bg-gray-50 dark:bg-[#060F0C] p-6 transition-all hover:bg-black/5 dark:bg-white/[0.02]`}>
                  <div className="mb-4 text-2xl">{source.icon}</div>
                  <h3 className="font-syne mb-2 text-sm font-bold text-gray-900 dark:text-white">{source.title}</h3>
                  <p className="mb-4 text-xs leading-relaxed text-gray-500">{source.body}</p>
                  <span className="text-[10px] font-medium text-teal-500 uppercase tracking-widest">{source.tag}</span>
                </div>
              </Section>
            ))}
          </div>

          <div className="mt-10 p-7 rounded-2xl border border-emerald-800/30 bg-emerald-950/10">
            <p className="text-emerald-400 font-bold mb-3 uppercase tracking-wider text-xs">Green Credit Threshold</p>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 mb-5">
              Carbon credits are only generated once a project site achieves
              ≥40% canopy density — the minimum threshold set by India's
              Green Credit Rules 2025. NEVARA's MRV engine monitors and
              certifies this threshold continuously, ensuring credits represent
              real, measurable restoration progress.
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                { label: "40% Minimum Canopy Density", color: "bg-teal-500/10 border-teal-500/20 text-teal-400" },
                { label: "5 Yrs Monitoring Before First Issuance", color: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
                { label: "20% Non-Permanence Buffer Pool", color: "bg-blue-500/10 border-blue-500/20 text-blue-400" }
              ].map(badge => (
                <span key={badge.label} className={`px-3 py-1 rounded-full border text-[10px] font-semibold ${badge.color}`}>
                  {badge.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PHASE 3 ─────────────────────────────────────────────────── */}
      <section className="bg-gray-50 dark:bg-[#060F0C] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <SectionLabel>Phase 03 · Blockchain Minting</SectionLabel>
          <h2 className="font-syne mb-6 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl leading-tight">
            One Credit.<br />One Block.<br />One Record Forever.
          </h2>
          <p className="mb-10 max-w-2xl text-lg leading-relaxed text-gray-600 dark:text-gray-400">
            Every tonne of verified CO₂e sequestration is converted into a
            unique Carbon Credit Certificate (CCC) and minted as a block on
            NEVARA's SHA-256 + Merkle tree ledger. The chain structure ensures
            that tampering with any record invalidates every subsequent block —
            making retroactive fraud computationally impossible.
          </p>

          <div className="grid gap-8 md:grid-cols-2 mt-10">
            <div className="rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#040D0B] p-8">
              <h3 className="text-sm font-bold text-teal-400 uppercase tracking-widest mb-6">Block Structure</h3>
              <div className="space-y-4">
                {[
                  "Block Index + Timestamp",
                  "Project Coordinates (GPS polygon hash)",
                  "Verified tCO₂e amount",
                  "Verifier signature + methodology code",
                  "Previous block hash (chain linkage)",
                  "SHA-256 block hash (tamper seal)",
                  "Merkle root of all transactions"
                ].map(item => (
                  <div key={item} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <span className="text-teal-500 inline-block w-4">⬡</span> {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#040D0B] p-8">
              <h3 className="text-sm font-bold text-teal-400 uppercase tracking-widest mb-6">Sample Block Record</h3>
              <div className="font-mono-jet text-xs text-teal-400 bg-black/40 p-6 rounded-xl border border-teal-900/30 leading-relaxed overflow-x-auto">
                <div className="mb-1">Block #1,247</div>
                <div className="mb-1">Project: Gurupur Estuary, Mangalore</div>
                <div className="mb-1">tCO₂e: 1,200.00</div>
                <div className="mb-1">Verifier: NITK-WROE-002</div>
                <div className="mb-1">Method: VM0033-v2.1</div>
                <div className="mb-1">Hash: 0x9D2B...71E4</div>
                <div className="mb-1">Prev: 0x4A7F...3C91</div>
                <div className="mb-1">Merkle: 0xAB3E...88F2</div>
                <div className="mt-4 text-emerald-400 flex items-center gap-2">
                   Status: IMMUTABLE ✓
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 p-7 rounded-2xl border border-blue-800/30 bg-blue-950/10">
            <p className="text-blue-400 font-bold mb-3 uppercase tracking-wider text-xs">Anti-Double-Counting Architecture</p>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              Once a credit is minted, it receives a unique token ID that cannot
              be duplicated or re-issued. Once retired (used by a corporate buyer
              for offsetting), the block is permanently marked as 'RETIRED' in
              the public explorer — preventing the same credit from being sold
              or claimed a second time. This is enforced at the ledger level,
              not through administrative controls.
            </p>
          </div>
        </div>
      </section>

      {/* ── PHASE 4 ─────────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-[#040D0B] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <SectionLabel>Phase 04 · Market Listing</SectionLabel>
          <h2 className="font-syne mb-6 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
            From Registry to Revenue.
          </h2>
          <p className="mb-10 max-w-2xl text-lg leading-relaxed text-gray-600 dark:text-gray-400">
            Verified credits are listed on NEVARA's transparent marketplace,
            accessible to India's 490+ CCTS-obligated industrial entities and
            voluntary ESG buyers. Every purchase generates an instant PDF
            certificate with an embedded QR code linking directly to the
            originating blockchain block — providing audit-ready documentation
            for ESG disclosures and SEBI reporting.
          </p>

          <div className="grid gap-6 md:grid-cols-2 mt-10">
            {[
              {
                title: "Mandatory Carbon Offset Demand",
                label: "CCTS-Obligated Industries",
                labelColor: "text-teal-400",
                body: "490 industrial entities across cement, aluminum, petrochemicals, textiles, and steel sectors are now mandated under India's Carbon Credit Trading Scheme (CCTS) 2026 to meet greenhouse gas intensity targets. Companies that fail to meet targets must purchase verified Carbon Credit Certificates (CCCs) — or face regulatory penalties. NEVARA's credits are designed to satisfy BEE's Offset Mechanism requirements directly.",
                stat: "490 obligated entities · Penalty for non-compliance",
                border: "border-teal-800/30"
              },
              {
                title: "Voluntary Carbon Demand",
                label: "ESG & Net Zero Commitments",
                labelColor: "text-emerald-400",
                body: "India's largest corporates — Tata Group, Infosys, Wipro, Mahindra — have made net-zero commitments to investors and international sustainability frameworks. NEVARA's blue carbon credits, with their 20–30% premium over standard forestry credits and high biodiversity co-benefits, offer a compelling solution for ESG reporting, SEBI Business Responsibility & Sustainability Reports (BRSR), and investor-facing climate disclosures.",
                stat: "20–30% premium over standard credits · BRSR audit-ready",
                border: "border-emerald-800/30"
              }
            ].map(segment => (
              <div key={segment.title} className={`rounded-2xl border ${segment.border} bg-gray-50 dark:bg-[#060F0C] p-8 h-full flex flex-col`}>
                <span className={`${segment.labelColor} text-[10px] uppercase tracking-widest mb-2 font-bold`}>{segment.label}</span>
                <h3 className="font-syne text-xl font-bold text-gray-900 dark:text-white mb-4">{segment.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 mb-6 flex-grow">{segment.body}</p>
                <div className="pt-4 border-t border-gray-200 dark:border-white/5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{segment.stat}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 p-7 rounded-2xl border border-amber-800/30 bg-amber-950/10">
            <p className="text-amber-400 font-bold mb-5 uppercase tracking-wider text-xs">What a Buyer Receives</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {[
                "PDF Carbon Offset Certificate",
                "Project location coordinates",
                "tCO₂e amount + vintage year",
                "QR code → live blockchain record",
                "Verifier name + methodology",
                "CCTS-ready documentation format"
              ].map(item => (
                <div key={item} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <span className="text-amber-500">◈</span> {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STANDARDS ───────────────────────────────────────────────── */}
      <section className="bg-gray-50 dark:bg-[#060F0C] py-16">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="font-syne mb-10 text-2xl font-bold text-gray-900 dark:text-white">Built to Every Standard That Matters.</h2>
          <div className="grid gap-5 grid-cols-2 md:grid-cols-4">
            {[
              { code: "VM0033 v2.1", name: "Verra VCS", status: "Methodology Aligned", detail: "Additionality, Leakage, Non-Permanence, Stratification, and Dynamic Boundary requirements mapped to NEVARA's project submission workflow.", border: "border-teal-800/30", color: "text-teal-400" },
              { code: "GS4GG", name: "Gold Standard", status: "SDG Tracking Ready", detail: "SDG 13, 14, and 8 auto-tagged on all projects. Safeguarding assessment included in contributor flow.", border: "border-purple-800/30", color: "text-purple-400" },
              { code: "CCTS 2026", name: "BEE India", status: "Offset Mechanism Ready", detail: "NEVARA's CCC format is designed to satisfy the Bureau of Energy Efficiency's Offset Mechanism portal requirements.", border: "border-emerald-800/30", color: "text-emerald-400" },
              { code: "Art. 6.4", name: "Paris Agreement", status: "Phase 5 Target", detail: "Cross-border carbon trading eligibility under UNFCCC Article 6.4 is targeted for Phase 5 (2027).", border: "border-blue-800/30", color: "text-blue-400" }
            ].map(block => (
              <div key={block.code} className={`rounded-xl border ${block.border} bg-white dark:bg-[#040D0B] p-5 text-left`}>
                <div className={`text-sm font-bold ${block.color} mb-1`}>{block.code}</div>
                <div className="text-sm font-bold text-gray-900 dark:text-white mb-2">{block.name}</div>
                <div className="text-[10px] uppercase font-bold text-gray-600 mb-3 tracking-widest">{block.status}</div>
                <p className="text-[10px] leading-relaxed text-gray-500">{block.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <Link href="/roadmap">
              <button className="text-teal-400 text-sm hover:underline">See the National Scaling Roadmap →</button>
            </Link>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}
