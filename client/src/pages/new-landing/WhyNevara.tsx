import { LandingLayout, Section, SectionLabel } from "@/components/layout/LandingLayout";
import { SubHero } from "@/components/layout/SubHero";
import { Link } from "wouter";

export default function WhyNevara() {
  return (
    <LandingLayout>
      <SubHero 
        label="The Problem We Solve"
        title="Closing the Integrity Gap."
        subtitle="Blue carbon represents the world's most powerful natural climate solution — and the least accessible. NEVARA exists to close the $2 billion 'trust deficit' that keeps it underutilised."
      />

      {/* ── THE MARKET GAP ───────────────────────────────────────────── */}
      <section className="bg-gray-50 dark:bg-[#060F0C] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <SectionLabel>Why Blue Carbon Is Underutilised</SectionLabel>
          <h2 className="font-syne mb-6 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl leading-tight">
            The World's Best Climate Asset<br />Has a Measurement Problem.
          </h2>
          <p className="mb-14 max-w-3xl text-lg leading-relaxed text-gray-600 dark:text-gray-400">
            Coastal ecosystems — mangroves, seagrass meadows, salt marshes —
            sequester carbon at up to 10 times the rate of tropical rainforests,
            and store it for thousands of years in anaerobic soil. Despite this,
            blue carbon represents less than 1% of global carbon market volume.
            The reason is not a lack of potential — it is a lack of credible,
            accessible measurement infrastructure.
          </p>

          <div className="grid gap-6 lg:grid-cols-3">
            {[
              {
                num: "01",
                tag: "Technical Barrier",
                title: "Too Complex to Measure",
                body: "Unlike terrestrial forestry, blue carbon stocks exist in tidal wetlands where traditional methods — soil cores, field surveys — are expensive, dangerous, and infrequent. A single manual audit can cost ₹12–50 lakh and take 6–18 months. Most project developers cannot afford the scientific rigour required for institutional credibility — so they simply do not enter the market.",
                border: "border-red-900/30",
                grad: "from-red-900/10"
              },
              {
                num: "02",
                tag: "Regulatory Barrier",
                title: "No India-First Framework",
                body: "Global standards (Verra, Gold Standard) were designed for international markets and do not natively support India's regulatory environment — the Coastal Regulation Zone (CRZ) rules, the Forest Conservation Act, the Forest Rights Act, and now the Carbon Credit Trading Scheme (CCTS) 2026. There is no platform that maps these frameworks together into a single contributor workflow. Until NEVARA.",
                border: "border-amber-900/30",
                grad: "from-amber-900/10"
              },
              {
                num: "03",
                tag: "Market Barrier",
                title: "A $2 Billion Trust Deficit",
                body: "Corporate buyers — particularly Indian conglomerates with SEBI BRSR reporting obligations — cannot purchase blue carbon credits they cannot audit. Without traceable, verifiable provenance, a credit is merely a claim. This trust gap has historically excluded some of the world's most carbon-dense ecosystems from the market that could fund their protection.",
                border: "border-orange-900/30",
                grad: "from-orange-900/10"
              }
            ].map(card => (
              <Section key={card.num}>
                <div className={`relative h-full overflow-hidden rounded-2xl border ${card.border} bg-gradient-to-b ${card.grad} to-[#040D0B] p-8`}>
                  <span className="font-syne absolute right-4 top-2 select-none text-7xl font-bold text-gray-900 dark:text-white/5">{card.num}</span>
                  <span className="mb-4 inline-block rounded-full border border-gray-200 dark:border-white/10 px-3 py-1 text-[10px] uppercase font-semibold text-gray-500 tracking-widest">{card.tag}</span>
                  <h3 className="font-syne mb-3 text-xl font-bold text-gray-900 dark:text-white">{card.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{card.body}</p>
                </div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE EQUITY FAILURE ────────────────────────────────────────── */}
      <section className="bg-white dark:bg-[#040D0B] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <SectionLabel>Who It Fails Most</SectionLabel>
          <h2 className="font-syne mb-6 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl leading-tight">
            The Communities Who Protect<br />the Coastline Are Paid Last.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-gray-600 dark:text-gray-400">
            In traditional carbon project structures, value flows upward.
            Project developers, auditing firms, and international brokers
            capture the majority of credit revenue. The coastal farmers,
            fishing communities, and forest departments who actually
            maintain and protect the ecosystems receive a fraction —
            if anything at all.
          </p>

          <div className="grid gap-8 md:grid-cols-2 mt-12">
            <div className="rounded-2xl border border-red-900/30 bg-red-950/20 p-8 flex flex-col">
              <span className="text-red-400 text-[10px] font-bold uppercase tracking-widest mb-6">Traditional Carbon Project</span>
              <div className="space-y-4 flex-grow">
                {[
                  { step: "Manual field audit", extra: "6–18 months" },
                  { step: "International broker", extra: "30–40% commission" },
                  { step: "Third-party certification", extra: "₹15–50 lakh per project" },
                  { step: "Community payment", extra: "< 20% of credit value" },
                  { step: "Second audit", extra: "2+ years later" },
                  { step: "Credit issuance", extra: "Unverifiable by buyer" },
                ].map((s, i) => (
                  <div key={i} className="flex justify-between items-center text-sm border-b border-red-900/20 pb-3">
                    <span className="text-gray-600 dark:text-gray-300">{s.step}</span>
                    <span className="text-red-300 font-medium">{s.extra}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-4 border-t border-red-900/30 text-xs font-semibold text-red-400">
                Up to 80% of value captured before community payment
              </div>
            </div>

            <div className="rounded-2xl border border-teal-800/30 bg-teal-950/10 p-8 flex flex-col">
              <span className="text-teal-400 text-[10px] font-bold uppercase tracking-widest mb-6">NEVARA Carbon Project</span>
              <div className="space-y-4 flex-grow">
                {[
                  { step: "GIS submission", extra: "Same day" },
                  { step: "AI MRV pre-screening", extra: "72 hours" },
                  { step: "Expert verifier review", extra: "Transparent, fixed" },
                  { step: "Community payment", extra: "60% of credit value" },
                  { step: "Ongoing monitoring", extra: "Continuous, automated" },
                  { step: "Credit issuance", extra: "QR-linked blockchain" },
                ].map((s, i) => (
                  <div key={i} className="flex justify-between items-center text-sm border-b border-teal-900/20 pb-3">
                    <span className="text-gray-600 dark:text-gray-300">{s.step}</span>
                    <span className="text-teal-300 font-medium">{s.extra}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-4 border-t border-teal-800/30 text-xs font-semibold text-teal-400">
                60% of every credit sale goes directly to contributors
              </div>
            </div>
          </div>

          <div className="mt-10 p-7 rounded-2xl border border-teal-800/30 bg-teal-950/10 overflow-hidden">
            <p className="text-teal-400 font-bold mb-5 uppercase tracking-wider text-xs">NEVARA Revenue Distribution</p>
            <div className="h-10 w-full flex rounded-full overflow-hidden border border-gray-200 dark:border-white/5">
              <div className="h-full bg-teal-500 w-[60%] flex items-center px-4 text-[10px] font-bold text-black uppercase">60% Contributor / Community / Government</div>
              <div className="h-full bg-teal-800 w-[20%] flex items-center px-4 text-[10px] font-bold text-gray-900 dark:text-white uppercase">20% Platform</div>
              <div className="h-full bg-teal-900/60 w-[20%] flex items-center px-4 text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase">20% Audit Pool</div>
            </div>
            <p className="text-[10px] text-gray-500 mt-4 leading-relaxed italic">
              "Payments distributed automatically on credit sale through smart
               contract logic — no manual processing, no administrative delay."
            </p>
          </div>
        </div>
      </section>

      {/* ── THE MODEL ─────────────────────────────────────────────────── */}
      <section className="bg-gray-50 dark:bg-[#060F0C] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <SectionLabel>The NEVARA Difference</SectionLabel>
          <h2 className="font-syne mb-12 text-3xl font-bold text-gray-900 dark:text-white leading-tight">
            Automated Verification.<br />Real-Time Distribution.<br />Full Provenance.
          </h2>

          <div className="grid gap-5 md:grid-cols-2">
            {[
              { label: "Audit Method", old: "Manual field survey, 6–18 months", new: "AI + satellite, continuous", icon: "🕒" },
              { label: "Verification Cost", old: "₹15–50 lakh per project", new: "Transparent fixed fee, platform-subsidised for pilots", icon: "📉" },
              { label: "Time to First Credit", old: "2+ years from submission", new: "72-hour expert review, credit issued on approval", icon: "⚡" },
              { label: "Community Revenue", old: "< 20% of credit value", new: "60% of credit value, automated", icon: "💎" },
              { label: "Buyer Traceability", old: "PDF certificate, no live audit trail", new: "QR → blockchain block → project coordinates", icon: "🔗" },
              { label: "Double-Counting Risk", old: "Administrative controls only", new: "Mathematically impossible (SHA-256 ledger)", icon: "🔒" },
            ].map(row => (
              <div key={row.label} className="p-5 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#040D0B] flex gap-4 transition-all hover:bg-black/5 dark:bg-white/[0.02]">
                <div className="text-2xl pt-1">{row.icon}</div>
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{row.label}</div>
                  <div className="flex flex-col gap-2">
                    <div className="text-xs text-red-500/70 border-l border-red-500/20 pl-2">Old: {row.old}</div>
                    <div className="text-[13px] text-teal-400 border-l border-teal-500 pl-2 font-medium">New: {row.new}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OUTCOME ───────────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-[#040D0B] py-20 text-center">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="font-syne mb-6 text-3xl font-bold text-gray-900 dark:text-white">The Result: Credits the Market Can Trust.</h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-400 mb-14 leading-relaxed">
            NEVARA credits are not claims. They are blockchain-verified,
            satellite-monitored, expert-reviewed records of real carbon
            sequestration in real coastal ecosystems. For the first time,
            Indian blue carbon can compete on the global voluntary market —
            and satisfy the mandatory offset requirements of the CCTS 2026.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16">
            <div className="flex flex-col items-center">
              <span className="text-4xl font-bold text-gray-900 dark:text-white mb-2">80–90%</span>
              <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Reduction in verification cost</span>
            </div>
            <div className="flex flex-col items-center border-x border-gray-200 dark:border-white/5 px-4">
              <span className="text-4xl font-bold text-gray-900 dark:text-white mb-2">72 hrs</span>
              <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Expert review turnaround</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-4xl font-bold text-gray-900 dark:text-white mb-2">60%</span>
              <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Community revenue share</span>
            </div>
          </div>

          <Link href="/how-it-works">
            <button className="text-teal-400 text-sm hover:underline">See the Technology Behind This →</button>
          </Link>
        </div>
      </section>
    </LandingLayout>
  );
}
