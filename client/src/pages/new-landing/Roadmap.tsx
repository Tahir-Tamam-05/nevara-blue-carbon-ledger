import { LandingLayout, Section, SectionLabel, useCounter, useInView } from "@/components/layout/LandingLayout";
import { SubHero } from "@/components/layout/SubHero";
import { useEffect } from "react";

// ── Components ─────────────────────────────────────────────────────────────

function StatCard({ value, unit, label, started }: { value: number; unit: string; label: string; started: boolean }) {
  const { value: count, start } = useCounter(value, 2000);
  useEffect(() => { if (started) start(); }, [started, start]);
  return (
    <div className="rounded-xl border border-teal-700/40 bg-teal-950/10 p-5 text-center transition-all hover:bg-teal-900/20">
      <div className="font-syne text-3xl font-bold text-white">
        {count.toLocaleString()}{unit}
      </div>
      <div className="mt-1 text-[10px] uppercase font-bold text-teal-400 tracking-widest">{label}</div>
    </div>
  );
}

export default function Roadmap() {
  const { ref: statsRef, inView: statsInView } = useInView(0.15);

  return (
    <LandingLayout>
      <SubHero 
        label="Strategic Roadmap"
        title="Scaling India's Blue Carbon Infrastructure."
        subtitle="From a 5-hectare pilot in Mangalore to a 1.27 billion metric ton national carbon abatement potential — a five-phase progression grounded in regulatory reality."
      />

      {/* ── LIVE STATUS ───────────────────────────────────────────────── */}
      <section className="bg-[#060F0C] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 bg-teal-500/10 rounded-full border border-teal-500/20">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-400" />
            </span>
            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest">● Live Now</span>
          </div>

          <h2 className="font-syne mb-10 text-3xl font-bold text-white sm:text-4xl leading-tight">
            Mangalore Pilot.<br />Gurupur Estuary, Karnataka.
          </h2>
          <p className="mb-14 max-w-3xl text-lg text-gray-400 leading-relaxed">
            India's first AI-verified, blockchain-recorded blue carbon pilot
            is operational. The 5-hectare site near the Gurupur river estuary
            in Dakshina Kannada district is active, with all 14 platform
            modules deployed on AWS EC2 — monitoring, verification, marketplace,
            and certificate issuance all live.
          </p>

          <div className="grid gap-12 lg:grid-cols-2">
            <div className="space-y-6">
              {[
                {
                  status: "Live",
                  title: "5-Hectare Pilot — Gurupur Estuary, Mangalore",
                  body: "Mangrove-dense coastal land in Dakshina Kannada district. Located adjacent to NITK Surathkal and ICAR-CMFRI Mangalore — India's leading marine research centres — providing direct access to scientific validation and biodiversity data."
                },
                {
                  status: "Live",
                  title: "14 Platform Modules — Production Deployed",
                  body: "GIS Contributor Portal · AI Vegetation Scoring · Dual-Layer Verifier Dashboard · SHA-256 Blockchain + Public Explorer · Carbon Credit Marketplace · Certificate Generator · Admin Governance · Audit Logging · Role-based Access Control · Document Vault · Carbon Calculation Engine · Blue Points Reward System · Object Storage · Process Manager"
                },
                {
                  status: "Active",
                  title: "Stakeholder Engagement — Mangalore Division",
                  body: "Formal engagement initiated with Mangalore Forest Division (DCF) for pilot land parcel identification. OPSA Trust partnership under discussion. NITK Surathkal Water Resources & Ocean Engineering department in technical MRV dialogue."
                }
              ].map(m => (
                <div key={m.title} className="p-6 rounded-2xl border border-teal-700/40 bg-teal-950/10">
                   <div className="text-[10px] font-bold text-teal-500 uppercase tracking-widest mb-2 px-1.5 py-0.5 bg-teal-500/10 inline-block rounded-md border border-teal-500/20">{m.status}</div>
                   <h3 className="font-syne mb-2 text-base font-bold text-white">{m.title}</h3>
                   <p className="text-sm leading-relaxed text-gray-500">{m.body}</p>
                </div>
              ))}
            </div>

            <div ref={statsRef} className="grid grid-cols-2 gap-4 h-fit">
              <StatCard value={108093} unit="" label="Carbon Tracked (tCO₂e)" started={statsInView} />
              <StatCard value={66} unit="" label="Credits Available" started={statsInView} />
              <StatCard value={5} unit="" label="Verified Projects" started={statsInView} />
              <StatCard value={7500} unit=" km" label="Coastline Targeted" started={statsInView} />
              <StatCard value={42} unit="" label="API Endpoints" started={statsInView} />
              <StatCard value={14} unit="" label="Platform Modules" started={statsInView} />
              <StatCard value={72} unit=" hrs" label="Avg Verification Time" started={statsInView} />
              <StatCard value={60} unit="%" label="Revenue Share" started={statsInView} />
            </div>
          </div>
        </div>
      </section>

      {/* ── PHASE TIMELINE ─────────────────────────────────────────────── */}
      <section className="bg-[#040D0B] py-28">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="font-syne mb-20 text-3xl font-bold text-white text-center">The Five Phases of National Scale.</h2>

          <div className="relative border-l border-teal-900/40 ml-4 md:ml-10 space-y-20">
            {[
              {
                phase: "Phase 1 — Q4 2025 · Live Now",
                color: "text-teal-400",
                dot: "bg-teal-400",
                title: "Beta Registry Launch & Mangalore Pilot",
                body: "Platform launched with all 14 modules. First 5-hectare blue carbon site registered at Gurupur Estuary. Stakeholder outreach initiated with Mangalore Forest Division (DCF), NITK Surathkal, and ICAR-CMFRI. GIS, AI scoring, blockchain explorer, and marketplace all operational.",
                items: ["GIS Portal", "AI Scoring", "Blockchain Registry", "Marketplace", "Certificates"]
              },
              {
                phase: "Phase 2 — 2026 · In Progress",
                color: "text-amber-400",
                dot: "bg-amber-400",
                title: "CCTS Integration & Satellite MRV Upgrade",
                body: "Full integration with the Bureau of Energy Efficiency (BEE) Offset Mechanism portal, making NEVARA credits eligible for the 490 obligated CCTS industrial entities. Sentinel-2 satellite imagery pipeline replaces heuristic AI scoring with data-driven NDVI-based assessments. Razorpay payment gateway enables real INR transactions with GST invoicing.",
                items: ["BEE API", "Sentinel-2", "NDVI Maps", "Razorpay", "GST Invoicing"]
              },
              {
                phase: "Phase 3 — 2026 Q3–Q4 · Planned",
                color: "text-gray-400",
                dot: "bg-gray-600",
                title: "National Expansion & Mobile Field Infrastructure",
                body: "Platform expansion to Udupi, Karwar, and additional Karnataka coast sites using the established KSCZMA network. Hedera Guardian blockchain integration enables international credit interoperability. React Native mobile app launches for field-based contributor reporting. LiDAR pipeline activated for high-confidence above-ground biomass measurement.",
                items: ["Udupi + Karwar", "Hedera Guardian", "Mobile App", "LiDAR", "Kannada UI"]
              },
              {
                phase: "Phase 4 — 2027 · Planned",
                color: "text-gray-400",
                dot: "bg-gray-600",
                title: "Verra Accreditation & Global Standards Alignment",
                body: "Pursuit of formal Verra VCS project registration under VM0033 v2.1 — making NEVARA-issued credits eligible for international voluntary markets and SEBI ESG disclosures. Gold Standard GS4GG certification pursued for SDG tracking. Government Registry API enables automated ICFRE Green Credit Programme alignment.",
                items: ["Verra VM0033", "Gold Standard GS4GG", "Gov Registry API", "SDG Tracking"]
              },
              {
                phase: "Phase 5 — 2027+ · Targeted",
                color: "text-gray-400",
                dot: "bg-gray-700",
                title: "Article 6.4 Global Carbon Trading",
                body: "Preparation for UNFCCC Paris Agreement Article 6.4 eligibility — enabling cross-border carbon credit trading with international obligated entities. This phase positions NEVARA as a bridge between India's domestic market and the emerging international carbon trading framework, supporting Series A fundraise targeting climate-focused institutional investors.",
                items: ["Article 6.4", "Cross-Border Trading", "Series A", "International Registry Sync"]
              }
            ].map(p => (
              <div key={p.title} className="relative pl-10 md:pl-16">
                 <div className={`absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full ${p.dot} shadow-[0_0_10px_rgba(20,184,166,0.5)]`} />
                 <span className={`${p.color} text-[10px] font-bold uppercase tracking-widest mb-2 block`}>{p.phase}</span>
                 <h3 className="font-syne text-2xl font-bold text-white mb-4">{p.title}</h3>
                 <p className="text-sm leading-relaxed text-gray-400 mb-6 max-w-3xl">{p.body}</p>
                 <div className="flex flex-wrap gap-2">
                    {p.items.map(item => (
                       <span key={item} className="px-3 py-1 rounded-md border border-white/5 bg-[#060F0C] text-[10px] text-gray-500 font-medium">{item}</span>
                    ))}
                 </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FUTURE SCOPE ──────────────────────────────────────────────── */}
      <section className="bg-[#060F0C] py-28">
        <div className="mx-auto max-w-7xl px-6">
          <SectionLabel>Future Scope & Partnerships</SectionLabel>
          <div className="text-center mb-16">
            <h2 className="font-syne mb-6 text-3xl font-bold text-white sm:text-4xl leading-tight">
              The Infrastructure<br />India's Carbon Market Needs.
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-400 leading-relaxed text-center">
              Three strategic pillars define NEVARA's path from operational platform
              to national infrastructure — continuous AI monitoring, international
              standards alignment, and the institutional partnership network required
              to onboard India's government-owned coastline.
            </p>
          </div>

          {/* Pillar A: AI-Powered MRV */}
          <div className="mb-12 rounded-3xl border border-white/5 bg-[#040D0B] p-8 md:p-12 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] select-none pointer-events-none">
              <span className="font-syne text-[200px] font-bold leading-none">A</span>
            </div>
            <div className="relative z-10">
              <span className="text-teal-600 font-bold uppercase tracking-[0.3em] text-[10px] mb-4 block">Pillar A · Technology</span>
              <h3 className="font-syne text-2xl md:text-3xl font-bold text-white mb-6">From Heuristic Scores to Satellite Truth.</h3>
              <p className="max-w-3xl text-gray-400 mb-10 leading-relaxed">
                NEVARA's current AI vegetation scoring uses ecosystem type, land area,
                and GPS location as inputs — a functional heuristic. The next phase
                replaces this with real satellite data. Sentinel-2 NDVI maps, SAR
                structural analysis, and biogeochemical modelling will produce
                carbon stock estimates with the confidence intervals required for
                Verra credit issuance — at 1/10th the cost of manual field surveys.
              </p>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { phase: "Phase 2 · 2026", title: "Sentinel-2 NDVI Integration", body: "Daily 10-metre resolution vegetation index maps for every registered project area.", border: "border-teal-800/30" },
                  { phase: "Phase 2 · 2026", title: "All-Weather SAR Monitoring", body: "Cloud-penetrating radar ensures uninterrupted monitoring through monsoons.", border: "border-purple-800/30" },
                  { phase: "Phase 2 · 2026", title: "VM0033 Dynamic Boundaries", body: "Models update boundaries as coastlines shift — satisfying VM0033 v2.1 sea-level-rise needs.", border: "border-emerald-800/30" },
                  { phase: "Phase 3 · 2026 Q3", title: "Peat Depletion Time (PDT)", body: "Biogeochemical modelling ensures credits are issued only for long-duration carbon.", border: "border-blue-800/30" }
                ].map(card => (
                  <div key={card.title} className={`p-5 rounded-2xl border ${card.border} bg-[#060F0C]`}>
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-2">{card.phase}</span>
                    <h4 className="text-sm font-bold text-white mb-2 leading-snug">{card.title}</h4>
                    <p className="text-[11px] leading-relaxed text-gray-500">{card.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pillar B: Verra & Standards */}
          <div className="mb-12 rounded-3xl border border-white/5 bg-[#060F0C] p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] select-none pointer-events-none">
              <span className="font-syne text-[200px] font-bold leading-none">B</span>
            </div>
            <div className="relative z-10">
              <span className="text-purple-600 font-bold uppercase tracking-[0.3em] text-[10px] mb-4 block">Pillar B · Standards</span>
              <h3 className="font-syne text-2xl md:text-3xl font-bold text-white mb-6">Built to Verra's Specification.</h3>
              <p className="max-w-3xl text-gray-400 mb-10 leading-relaxed">
                NEVARA is designed to be the operational implementation of Verra's
                VM0033 v2.1 methodology. Every feature maps to a specific compliance requirement.
              </p>

              <div className="space-y-3 mb-10">
                {[
                  { name: "Additionality", status: "Mapped", detail: "VMD0052 financial analysis module in submission form" },
                  { name: "Leakage", status: "Mapped", detail: "2 km AI buffer zone monitoring around each polygon" },
                  { name: "Non-Permanence", status: "Mapped", detail: "20% mandatory credit buffer pool, auto-deducted" },
                  { name: "Stratification", status: "Phase 2", detail: "GIS soil strata + salinity mapping via Sentinel-2" },
                  { name: "Dynamic Boundaries", status: "Phase 2", detail: "Tidal migration auto-update (see Pillar A)" }
                ].map(row => (
                  <div key={row.name} className="flex p-4 rounded-xl border border-white/5 bg-[#040D0B] items-center gap-4">
                     <span className="text-sm font-bold text-white flex-1">{row.name}</span>
                     <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${row.status === "Mapped" ? "bg-teal-500/10 text-teal-400" : "bg-amber-500/10 text-amber-400"}`}>{row.status}</span>
                     <span className="text-xs text-gray-500 hidden md:block flex-[2] text-right">{row.detail}</span>
                  </div>
                ))}
              </div>

              <div className="p-6 rounded-2xl border border-purple-800/30 bg-purple-950/10">
                <h4 className="font-bold text-purple-400 text-sm mb-5 uppercase tracking-wider">Gold Standard GS4GG Requirements</h4>
                <div className="grid gap-6 md:grid-cols-3">
                  {[
                    { title: "Safeguarding Assessment", body: "FPIC certificate + safeguard questionnaire in contributor flow" },
                    { title: "SDG Tracking", body: "SDG 13, 14, 8 auto-tagged on all projects" },
                    { title: "Public Registry Transparency", body: "Listed on Gold Standard Impact Registry + blockchain" }
                  ].map(item => (
                    <div key={item.title}>
                       <p className="text-xs font-bold text-white mb-2">{item.title}</p>
                       <p className="text-[10px] text-gray-500 leading-relaxed">{item.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Pillar C: NGOs & Government */}
          <div className="rounded-3xl border border-white/5 bg-[#040D0B] p-8 md:p-12 relative overflow-hidden">
             {/* Pathway cards */}
             <div className="relative z-10">
                <span className="text-blue-600 font-bold uppercase tracking-[0.3em] text-[10px] mb-4 block">Pillar C · Partnerships</span>
                <h3 className="font-syne text-2xl md:text-3xl font-bold text-white mb-6">Unlocking Government-Owned Coastline.</h3>
                <p className="max-w-3xl text-gray-400 mb-10 leading-relaxed">
                  Over 80% of India's mangrove area is government-owned. NEVARA
                  cannot scale without institutional partnerships. Three structured
                  onboarding pathways address these institutional contributors.
                </p>

                <div className="grid gap-6 md:grid-cols-3">
                  {[
                    { label: "Government Bodies", title: "State Forest Departments", border: "border-teal-800/30", body: "We offer monitoring data in exchange for pilot access. Revenue share goes to the Department.", active: "DCF Mangalore · KSCZMA Regional Office" },
                    { label: "NGO Partners", title: "Environmental Trusts", border: "border-emerald-800/30", body: "NEVARA adds verification to existing conservation sites — converting work into income streams.", active: "OPSA Trust · Sahyadri Sanchaya" },
                    { label: "Research Bodies", title: "Universities & Science", border: "border-blue-800/30", body: "Research bodies provide validation of AI estimates in exchange for co-authorship & API access.", active: "ICAR-CMFRI Mangalore · NITK Surathkal" }
                  ].map(card => (
                    <div key={card.title} className={`p-6 rounded-2xl border ${card.border} bg-[#060F0C] flex flex-col`}>
                       <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{card.label}</span>
                       <h4 className="text-sm font-bold text-white mb-4">{card.title}</h4>
                       <p className="text-xs text-gray-500 mb-6 flex-grow">{card.body}</p>
                       <div className="pt-4 border-t border-white/5 text-[9px] font-bold text-teal-400 uppercase tracking-widest">Active Partner: {card.active}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                   <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Regulatory Compliance for Onboarding</p>
                   <div className="flex flex-wrap gap-4 justify-center">
                      <span className="text-xs text-gray-400">FCA 1980</span>
                      <span className="text-xs text-gray-400">CRZ Rules 2019</span>
                      <span className="text-xs text-gray-400">FRA 2006</span>
                      <span className="text-xs text-gray-400 leading-tight">Energy Conservation<br />Act 2022</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* ── NATIONAL DATA STRIP ────────────────────────────────────────── */}
      <section className="bg-[#040D0B] py-20 border-y border-white/5">
        <div className="mx-auto max-w-7xl px-6 text-center">
           <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-gray-600 mb-10">The National Opportunity NEVARA Is Built to Capture</h4>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { val: "11,098 km", label: "Re-assessed Indian Coastline", sub: "47% more than prior estimates" },
                { val: "5.02M Tons", label: "Annual CO₂e Storage Potential", sub: "From Indian mangroves alone" },
                { val: "$49.4 Billion", label: "Domestic Carbon Market by 2030", sub: "CCTS + voluntary combined" },
                { val: "490 Entities", label: "CCTS-Obligated Industries 2026", sub: "Active compliance demand" }
              ].map(stat => (
                <div key={stat.label}>
                   <div className="text-3xl font-bold text-white mb-2">{stat.val}</div>
                   <div className="text-[11px] font-bold text-teal-400 uppercase tracking-widest mb-1">{stat.label}</div>
                   <div className="text-[10px] text-gray-600 italic">"{stat.sub}"</div>
                </div>
              ))}
           </div>
        </div>
      </section>
    </LandingLayout>
  );
}
