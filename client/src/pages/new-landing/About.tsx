import { LandingLayout, Section, SectionLabel } from "@/components/layout/LandingLayout";
import { SubHero } from "@/components/layout/SubHero";
import { Link } from "wouter";

export default function About() {
  return (
    <LandingLayout>
      <SubHero
        label="About NEVARA"
        title="Anchored in Innovation."
        subtitle="From the engineering labs of BITM Ballari to the coastlines of Karnataka — the story of building India's first institutional-grade blue carbon registry from the ground up."
      />

      {/* ── THE MISSION ───────────────────────────────────────────────── */}
      <section className="bg-[#060F0C] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <SectionLabel>Why We Exist</SectionLabel>
          <h2 className="font-syne mb-6 text-3xl font-bold text-white sm:text-4xl leading-tight">
            To Make Coastal Protection<br />Economically Rational.
          </h2>
          <div className="max-w-2xl text-lg text-gray-400 leading-relaxed mb-12 space-y-6">
            <p>
              India's 11,098 km coastline is one of the most carbon-dense natural
              environments on the planet. Mangroves, seagrass meadows, and salt
              marshes sequester carbon at rates that no terrestrial reforestation
              programme can match. Yet these ecosystems remain almost entirely
              outside the global carbon market — not because the value is absent,
              but because the infrastructure to capture it did not exist.
            </p>
            <p>
              NEVARA was built to create that infrastructure. Not another voluntary
              carbon programme. Not another intermediary. A permanent, verifiable
              digital ledger — built on the provenance of SHA-256 cryptography and
              the precision of satellite monitoring — that makes every blue carbon
              credit provably real, provably unique, and provably valuable.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 mt-12">
            {[
              { title: "Transparency", body: "Every credit traceable to a GPS coordinate, a verifier, and a blockchain block." },
              { title: "Equity", body: "60% of every credit sale goes directly to the community or institution that protects the land." },
              { title: "Scale", body: "Built for India's entire coastline — not a pilot, a template for national carbon infrastructure." }
            ].map(m => (
              <div key={m.title} className="p-6 rounded-2xl border border-white/5 bg-[#040D0B] transition-all hover:bg-white/[0.02]">
                <h3 className="font-syne mb-3 text-lg font-bold text-white tracking-widest uppercase text-center">{m.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500 text-center">{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE ORIGIN STORY ─────────────────────────────────────────── */}
      <section className="bg-[#040D0B] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="flex flex-col justify-center">
              <SectionLabel>The Founder's Story</SectionLabel>
              <h2 className="font-syne mb-6 text-3xl font-bold text-white leading-tight">A Realization on the Coastline.</h2>
              <div className="space-y-6 text-gray-400 leading-relaxed max-w-xl">
                <p>
                  NEVARA began with a question: why does India's most powerful
                  natural climate asset — its 7,500 km of mangrove-lined coastline —
                  generate zero economic return for the communities that protect it?
                  The answer was not a lack of value. It was a lack of verifiable,
                  accessible measurement.
                </p>
                <p>
                  Tahir Tamam, a 3rd-year Computer Science undergraduate at Ballari
                  Institute of Technology and Management (BITM), Karnataka, began
                  building NEVARA in 2024 — merging blockchain engineering with
                  environmental science to produce India's first fully deployed
                  blue carbon registry. Six months later, the platform was live
                  on AWS EC2, a patent was filed, and India's first AI-monitored
                  blue carbon pilot site was active at the Gurupur river estuary,
                  Mangalore.
                </p>
                <p>
                  NEVARA was not built for a hackathon. It was built because the
                  problem was real, the market gap was documented, and the
                  technology to solve it existed — it had simply never been
                  assembled for India's coastal regulatory environment.
                </p>
              </div>
            </div>

            <div className="p-8 rounded-2xl border border-teal-800/30 bg-teal-950/10 flex flex-col justify-center">
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-[0.3em] mb-4">Founder</span>
              <h3 className="font-syne text-2xl font-bold text-white mb-2 leading-none">Tahir Tamam</h3>
              <p className="text-gray-500 text-sm mb-8 leading-snug">B.E. Computer Science, BITM Ballari, Karnataka · 2023–2027</p>
              <div className="space-y-4">
                {[
                  { icon: "⬡", text: "Filed Indian Patent — Application No. 202541114138 (Nov 2025)" },
                  { icon: "◎", text: "Built & deployed NEVARA end-to-end in 6 months" },
                  { icon: "◈", text: "14 production modules · 42 API endpoints · AWS EC2 live" },
                  { icon: "◇", text: "Active engagement: DCF Mangalore, NITK Surathkal, CMFRI" },
                  { icon: "◆", text: "Aligned with CCTS 2026, Verra VM0033, Green Credit Rules 2025" }
                ].map(p => (
                  <div key={p.text} className="flex gap-3 text-sm text-gray-400">
                    <span className="text-teal-500">{p.icon}</span>
                    <span className="leading-snug">{p.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── THE VISION ───────────────────────────────────────────────── */}
      <section className="bg-[#060F0C] py-28 text-center">
        <div className="mx-auto max-w-7xl px-6">
          <SectionLabel>Where We Are Going</SectionLabel>
          <h2 className="font-syne mb-6 text-3xl font-bold text-white sm:text-4xl leading-tight">
            The Default Digital Backbone<br />of India's Carbon Market.
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-400 leading-relaxed mb-16 px-4">
            The vision is not to become another carbon credit platform.
            The vision is to become the infrastructure layer that every
            other participant in India's carbon market depends on —
            the public ledger of record for nature-based solutions,
            starting with the coastlines of Karnataka and expanding
            to every coastal state in India.
          </p>

          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {[
              { label: "2026", title: "National Registry", color: "text-teal-400", body: "NEVARA becomes the operational offset registry for CCTS-obligated industries via BEE integration — providing India's 490 mandated entities with a credible, traceable blue carbon offset source." },
              { label: "2027", title: "International Credits", color: "text-emerald-400", body: "Article 6.4 eligibility enables NEVARA credits to be traded across borders — positioning Indian coastal ecosystems on the global voluntary carbon market for the first time." },
              { label: "2030+", title: "National Infrastructure", color: "text-blue-400", body: "NEVARA operates as the default verification and registry layer for India's Green Credit Programme, CCTS Offset Mechanism, and international nature-based solution credits." }
            ].map(v => (
              <div key={v.label} className="p-7 rounded-2xl border border-white/5 bg-[#040D0B] text-center transition-all hover:bg-white/[0.01]">
                <span className={`${v.color} text-xs font-bold uppercase tracking-widest block mb-1`}>{v.label}</span>
                <h3 className="font-syne text-lg font-bold text-white mb-4">{v.title}</h3>
                <p className="text-xs leading-relaxed text-gray-500">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PARTNERS ─────────────────────────────────────────────────── */}
      <section className="bg-[#040D0B] py-20 overflow-hidden">
        <div className="mx-auto max-w-7xl px-6">
          <SectionLabel>Partners in Scientific Rigour</SectionLabel>
          <h2 className="font-syne mb-6 text-2xl font-bold text-white">Built With, Not Around, Institutional Science.</h2>
          <p className="text-gray-400 max-w-xl mb-14 leading-relaxed">
            NEVARA's verification methodology is developed in collaboration
            with India's leading coastal science institutions — not as
            clients, but as technical partners who inform the scientific
            credibility of every credit issued.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {[
              { title: "ICAR-CMFRI", sub: "Central Marine Fisheries Research Institute, Mangalore", role: "Biodiversity datasets · Marine carbon stock validation", contact: "Dr. Sujitha Thomas, Head & Principal Scientist", border: "border-teal-800/30" },
              { title: "NITK Surathkal", sub: "NITK · WROE Dept", role: "Coastal hydraulics · LiDAR · MRV methodology · Wave modelling", contact: "Dr. Ramesh H, Head of WROE", border: "border-emerald-800/30" },
              { title: "Karnataka Forest Division", sub: "Dakshina Kannada Forest Dept", role: "Land identification · CRZ clearance · Government onboarding", contact: "Deputy Conservator of Forests (DCF), Mangalore", border: "border-blue-800/30" },
              { title: "OPSA Trust", sub: "Mangrove Restoration", role: "Community onboarding · Field operations · Restoration identification", contact: "+91 9439256512", border: "border-amber-800/30" },
              { title: "KSCZMA", sub: "Regional Office, Mangalore", role: "CRZ compliance · Boundary validation · Environmental clearance", contact: "Regional Director, Mangalore Office", border: "border-purple-800/30" }
            ].map(card => (
              <div key={card.title} className={`p-6 rounded-2xl border ${card.border} bg-[#060F0C] flex flex-col`}>
                <h4 className="font-syne text-base font-bold text-white mb-1 leading-tight">{card.title}</h4>
                <p className="text-[10px] uppercase font-bold text-gray-600 mb-4 h-8 flex items-center leading-tight tracking-wide">{card.sub}</p>
                <div className="text-[10px] text-gray-500 mb-6 flex-grow leading-relaxed">Role: {card.role}</div>
                <div className="pt-4 border-t border-white/5 text-[9px] font-bold text-teal-400 uppercase tracking-widest">{card.contact}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CLOSING ──────────────────────────────────────────────────── */}
      <section className="bg-teal-950/20 py-28 text-center border-t border-white/5">
        <div className="mx-auto max-w-4xl px-6">
          <blockquote className="font-light italic text-2xl sm:text-3xl text-white mb-8 leading-relaxed max-w-2xl mx-auto">
            "The vision is not a feature. It is a market — where a fishing
            community in Mangalore earns a transparent, verifiable income
            from the carbon their coastline sequesters, and a corporate
            buyer in Mumbai can verify that income source to a specific
            block on an immutable ledger."
          </blockquote>
          <div className="text-sm text-gray-500 mb-10">NEVARA</div>

          <Link href="/login">
            <button className="px-8 py-4 bg-teal-500 text-black font-bold rounded-xl transition-all hover:bg-teal-400">
              Join the Registry →
            </button>
          </Link>
        </div>
      </section>
    </LandingLayout>
  );
}
