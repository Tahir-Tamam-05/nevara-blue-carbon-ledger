import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen text-[#1a1c1c] dark:text-gray-100 font-sans antialiased overflow-x-hidden bg-white dark:bg-[#0A1118] transition-colors duration-300">
      {/* Navbar */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? "bg-white/90 dark:bg-[#0A1118]/90 backdrop-blur-md border-b border-gray-100 dark:border-white/10 py-3" : "bg-transparent py-4"
          }`}
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight">
            NEVARA
          </Link>

          <div className="hidden md:flex items-center gap-10">
            {["Home", "How It Works", "Why NEVARA", "Roadmap", "About"].map((item) => (
              <Link key={item} href={item === "Home" ? "/" : `/${item.toLowerCase().replace(/ /g, "-")}`} className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                {item}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-5">
            <ThemeToggle />
            <Link href="/login" className="text-sm font-bold text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 transition-colors">
              Log in
            </Link>
            <Link href="/login" className="bg-[#007D8A] text-white text-sm font-bold px-6 py-2.5 rounded-full hover:bg-[#006873] transition-colors shadow-md">
              Get Started &gt;
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 w-full border-b border-gray-100 flex flex-col justify-end min-h-[85vh]">
        {/* Background Grid Pattern */}
        <div
          className="absolute inset-0 pointer-events-none z-0 opacity-[0.35] dark:opacity-[0.1]"
          style={{
            backgroundImage: "linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            backgroundPosition: "center top",
            maskImage: "linear-gradient(to bottom, white 40%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, white 40%, transparent 100%)",
          }}
        />

        <div className="max-w-[1100px] mx-auto px-6 relative z-10 w-full">
          <div className="flex flex-col items-center text-center">

            {/* Top Badge */}
            <div className="bg-[#E6F9F9] text-[#007D8A] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-sm mb-10 inline-flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
              INDIA'S HIGH-INTEGRITY BLUE CARBON REGISTRY
            </div>

            {/* Massive Heading */}
            <h1 className="text-[54px] md:text-[80px] lg:text-[100px] leading-[0.95] font-extrabold tracking-[-0.04em] mb-8">
              <span className="block text-[#007D8A]">NEVARA</span>
              <span className="block text-[#059669]">TURNING COASTAL ECOSYSTEMS</span>
              <span className="block text-[#059669]">INTO TRUSTED CARBON ASSETS.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-gray-500 text-lg md:text-xl font-medium max-w-3xl mx-auto mb-10 leading-relaxed">
              Nevara is the world's first decentralized ledger for blue carbon and coastal impact, translating precise GIS intelligence into transparent, tradeable climate assets.
            </p>

            {/* Buttons */}
            <div className="flex items-center gap-4 justify-center">
              <Link href="/login" className="bg-[#007D8A] text-white text-base font-bold px-8 py-4 rounded-full hover:bg-[#006873] transition-colors shadow-lg shadow-teal-900/20">
                Submit Your Project &gt;
              </Link>
              <Link href="/explorer" className="bg-white dark:bg-white/10 text-[#1a1c1c] dark:text-white text-base font-bold px-8 py-4 rounded-full hover:bg-gray-50 dark:hover:bg-white/20 transition-colors shadow-sm inline-flex items-center gap-2 border border-gray-200 dark:border-white/10">
                Explore the Registry
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </Link>
            </div>
          </div>
        </div>

      </section>

      {/* Section: Scale that Matters */}
      <section className="py-24 bg-white dark:bg-[#0A1118] text-center border-b border-gray-100 dark:border-white/10">
        <h2 className="text-[44px] sm:text-[52px] font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
          Scale that Matters.
        </h2>
        <p className="text-xl sm:text-[22px] text-gray-500 dark:text-gray-400 mb-16">
          Unlocking the economic potential of our planet's blue lungs.
        </p>

        <div className="max-w-[1240px] mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="bg-[#f8fcfb] dark:bg-white/5 rounded-[20px] p-8 pb-10 border border-[#e6f2f0] dark:border-white/10 text-left shadow-sm">
            <p className="text-[9px] font-bold tracking-[0.15em] text-[#2c7a7b] dark:text-[#3BA58F] uppercase mb-6">COASTLINE_MANAGED</p>
            <div className="text-[44px] leading-[1] font-bold text-[#1a202c] dark:text-white mb-2 tracking-tight">11,098</div>
            <p className="text-[13px] font-medium text-gray-500">Kilometers</p>
          </div>
          {/* Card 2 */}
          <div className="bg-[#f8fcfb] dark:bg-white/5 rounded-[20px] p-8 pb-10 border border-[#e6f2f0] dark:border-white/10 text-left shadow-sm">
            <p className="text-[9px] font-bold tracking-[0.15em] text-[#2c7a7b] dark:text-[#3BA58F] uppercase mb-6">ACTIVE_POLYGONS</p>
            <div className="text-[44px] leading-[1] font-bold text-[#1a202c] dark:text-white mb-2 tracking-tight">4,991</div>
            <p className="text-[13px] font-medium text-gray-500">Sq Kilometers</p>
          </div>
          {/* Card 3 */}
          <div className="bg-[#f8fcfb] dark:bg-white/5 rounded-[20px] p-8 pb-10 border border-[#e6f2f0] dark:border-white/10 text-left shadow-sm">
            <p className="text-[9px] font-bold tracking-[0.15em] text-[#2c7a7b] dark:text-[#3BA58F] uppercase mb-6">CARBON_POTENTIAL</p>
            <div className="text-[44px] leading-[1] font-bold text-[#1a202c] dark:text-white mb-2 tracking-tight">4.9M</div>
            <p className="text-[13px] font-medium text-gray-500">Annual Tons</p>
          </div>
          {/* Card 4 */}
          <div className="bg-[#f8fcfb] dark:bg-white/5 rounded-[20px] p-8 pb-10 border border-[#e6f2f0] dark:border-white/10 text-left shadow-sm">
            <p className="text-[9px] font-bold tracking-[0.15em] text-[#2c7a7b] dark:text-[#3BA58F] uppercase mb-6">ASSET_VALUATION</p>
            <div className="text-[44px] leading-[1] font-bold text-[#1a202c] dark:text-white mb-2 tracking-tight">$49.4B</div>
            <p className="text-[13px] font-medium text-gray-500">Total Estimated</p>
          </div>
        </div>
      </section>

      {/* Section: Three Pillars */}
      <section className="py-32 px-6 lg:px-12 max-w-[1400px] mx-auto bg-white dark:bg-[#0A1118] border-b border-gray-100 dark:border-white/10">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 mb-20 items-end">
          <div className="flex-1">
            <h2 className="text-[52px] leading-[1.05] font-bold tracking-tight max-w-xl">
              Three Pillars. One Unbreakable Chain.
            </h2>
          </div>
          <div className="flex-1 pb-2">
            <p className="text-xl text-gray-500 dark:text-gray-400 font-medium leading-relaxed max-w-lg">
              We define the new standard for blue carbon combining spatial precision with blockchain immutability.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 p-10 bg-white dark:bg-white/5 hover:border-gray-300 dark:hover:border-white/20 transition-colors shadow-sm">
            <div className="w-12 h-12 bg-[#1a1c1c] dark:bg-white rounded-xl flex items-center justify-center mb-10">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="stroke-white dark:stroke-[#1a1c1c]" strokeWidth="2"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
            </div>
            <h3 className="text-2xl font-bold mb-4">High-Precision GIS Mapping</h3>
            <p className="text-gray-500 text-[15px] font-medium leading-relaxed mb-8">
              Sub-metre polygon drawing eliminates boundary fraud. Every project is geofenced using absolute coastal data.
            </p>
            <p className="text-[9px] font-bold text-[#007D8A] tracking-wider uppercase">SPATIAL_VERIFY_V2</p>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 p-10 bg-white dark:bg-white/5 hover:border-gray-300 dark:hover:border-white/20 transition-colors shadow-sm">
            <div className="w-12 h-12 bg-[#007D8A] dark:bg-[#3BA58F] rounded-xl flex items-center justify-center mb-10">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l3-9 5 18 3-9h6" /></svg>
            </div>
            <h3 className="text-2xl font-bold mb-4">MRV Engine</h3>
            <p className="text-gray-500 text-[15px] font-medium leading-relaxed mb-8">
              Multi-spectral satellite imagery calculates biomass density and soil carbon in real time.
            </p>
            <p className="text-[9px] font-bold text-[#007D8A] tracking-wider uppercase">ALGORITHMIC_TRUST</p>
          </div>

          {/* Card 3 */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 p-10 bg-white dark:bg-white/5 hover:border-gray-300 dark:hover:border-white/20 transition-colors shadow-sm">
            <div className="w-12 h-12 bg-[#1a1c1c] dark:bg-white rounded-xl flex items-center justify-center mb-10">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="stroke-white dark:stroke-[#1a1c1c]" strokeWidth="2"><path d="M4 6a8 3 0 1016 0A8 3 0 104 6zm0 0v12a8 3 0 0016 0V6M4 12a8 3 0 0016 0" /></svg>
            </div>
            <h3 className="text-2xl font-bold mb-4">Immutable Blockchain Registry</h3>
            <p className="text-gray-500 text-[15px] font-medium leading-relaxed mb-8">
              Verified data is minted onto a SHA-256 ledger. Trace every credit to its coastal hectare.
            </p>
            <p className="text-[9px] font-bold text-[#007D8A] tracking-wider uppercase">SHA256_LEDGER</p>
          </div>
        </div>
      </section>

      {/* Section: Image Left / Text Right */}
      <section className="py-32 px-6 lg:px-12 max-w-[1400px] mx-auto bg-white dark:bg-[#0A1118] border-b border-gray-100 dark:border-white/10 flex flex-col lg:flex-row gap-16 items-center">
        <div className="flex-1 order-2 lg:order-1">
          <h2 className="text-[52px] leading-[1.05] font-bold tracking-tight mb-8">
            Institutional Trust Through Scientific Rigor.
          </h2>
          <p className="text-xl text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-12 max-w-lg">
            Protecting nature should create real value. We don't just count trees; we certify a living system's ability to sequester carbon over 100-year horizons.
          </p>

          <div className="space-y-8">
            <div>
              <h4 className="text-lg font-bold mb-2">Sovereign Asset Control</h4>
              <p className="text-gray-500 dark:text-gray-400 font-medium max-w-md">Assessments from India's Forest Survey, BEE carbon market data, and UNFCCC methodology research.</p>
            </div>
            <div>
              <h4 className="text-lg font-bold mb-2">Real-time Telemetry</h4>
              <p className="text-gray-500 dark:text-gray-400 font-medium max-w-md">Live feeds from coastal sensor networks integrated directly into the dashboard.</p>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-2">
            <Link href="/about" className="text-[11px] font-bold tracking-[0.1em] text-[#007D8A] uppercase hover:underline inline-flex items-center gap-2">
              VIEW METHODOLOGY REPORT &gt;
            </Link>
          </div>
        </div>

        <div className="flex-1 order-1 lg:order-2 relative w-full h-[600px]">
          <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm">
            <div
              className="w-full h-full bg-cover bg-center rounded-3xl"
              style={{ backgroundImage: "url('https://upload.wikimedia.org/wikipedia/commons/7/7b/Mangroves_at_sunset.jpg')" }}
            />
          </div>
          <div className="absolute bottom-6 right-6 bg-white/95 dark:bg-[#0A1118]/95 backdrop-blur-md rounded-xl p-4 shadow-xl border dark:border-white/10">
            <p className="text-[8px] font-bold text-gray-400 dark:text-gray-500 tracking-[0.15em] uppercase mb-1">SCAN_COORDINATES</p>
            <p className="text-[13px] font-bold font-mono text-gray-900 dark:text-gray-100">02°14'15"N | 102°15'11"E</p>
          </div>
        </div>
      </section>

      {/* Section: Dark Timeline */}
      <section className="py-32 px-6 lg:px-12 bg-[#0A1118] text-white">
        <div className="max-w-[1400px] mx-auto flex flex-col items-center">
          <div className="text-center mb-24 max-w-2xl">
            <h2 className="text-[48px] leading-[1.05] font-bold tracking-tight mb-6">
              Asset Lifecycle from Shore to Ledger
            </h2>
            <p className="text-lg text-gray-400 font-medium">
              Our four-step institutional workflow ensures every credit is unique, verifiable, and permanent.
            </p>
          </div>

          <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center">
            {/* The vertical divider line */}
            <div className="absolute top-0 bottom-0 left-1/2 -ml-px w-[2px] bg-white/10" />

            <div className="w-full relative z-10 flex flex-col gap-16">
              {/* Step 1 */}
              <div className="flex items-center w-full">
                <div className="w-1/2 pr-12 text-right">
                  <h3 className="text-2xl font-bold mb-3">GIS Polygon Definition</h3>
                  <p className="text-gray-400 dark:text-gray-500 font-medium text-[15px]">Contributors draw GPS‑locked polygon boundaries. The engine validates regulatory surplus and legal carbon rights.</p>
                </div>
                <div className="w-12 h-12 bg-[#007D8A] dark:bg-[#208a79] rounded-full border-4 border-[#0A1118] dark:border-[#050A0F] flex items-center justify-center font-bold text-sm z-10 mx-[-24px]">01</div>
                <div className="w-1/2 pl-12"></div>
              </div>

              {/* Step 2 */}
              <div className="flex items-center w-full">
                <div className="w-1/2 pr-12"></div>
                <div className="w-12 h-12 bg-[#007D8A] dark:bg-[#208a79] rounded-full border-4 border-[#0A1118] dark:border-[#050A0F] flex items-center justify-center font-bold text-sm z-10 mx-[-24px]">02</div>
                <div className="w-1/2 pl-12 text-left">
                  <h3 className="text-2xl font-bold mb-3">MRV Engine Verification</h3>
                  <p className="text-gray-400 dark:text-gray-500 font-medium text-[15px]">Satellite imagery computes real‑time biomass density and carbon stock — replacing manual audits with continuous truth.</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-center w-full">
                <div className="w-1/2 pr-12 text-right">
                  <h3 className="text-2xl font-bold mb-3">SHA-256 Block Creation</h3>
                  <p className="text-gray-400 dark:text-gray-500 font-medium text-[15px]">Verified data becomes an immutable block on the ledger. Each cryptographically linked — tampering is impossible.</p>
                </div>
                <div className="w-12 h-12 bg-[#007D8A] dark:bg-[#208a79] rounded-full border-4 border-[#0A1118] dark:border-[#050A0F] flex items-center justify-center font-bold text-sm z-10 mx-[-24px]">03</div>
                <div className="w-1/2 pl-12"></div>
              </div>

              {/* Step 4 */}
              <div className="flex items-center w-full">
                <div className="w-1/2 pr-12"></div>
                <div className="w-12 h-12 bg-[#007D8A] dark:bg-[#208a79] rounded-full border-4 border-[#0A1118] dark:border-[#050A0F] flex items-center justify-center font-bold text-sm z-10 mx-[-24px]">04</div>
                <div className="w-1/2 pl-12 text-left">
                  <h3 className="text-2xl font-bold mb-3">CCC Issuance</h3>
                  <p className="text-gray-400 dark:text-gray-500 font-medium text-[15px]">Carbon Credit Certificates go live on the marketplace. Each QR‑linked to its blockchain block and source coordinates.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Manifesto Quote */}
      <section className="relative overflow-hidden bg-[#1D748A] py-32 px-6 lg:px-12 text-center text-white">
         <div className="absolute top-0 right-0 bottom-0 pointer-events-none opacity-[0.08] translate-x-24 translate-y-12">
            <svg width="400" height="400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.05c3.55-1.57 10-7.85 10-14.05 0-3.3-2.69-6-6-6-2.6 0-4.8 1.54-5.69 3.75l-.31.84-.31-.84A6.002 6.002 0 0 0 4 1C1.31 1-1.38 3.7 1.38 7c0 6.2 6.45 12.48 10 14.05l.62.27.62-.27z" />
            </svg>
         </div>
         <div className="max-w-[1000px] mx-auto relative z-10 flex flex-col items-center">
            <h2 className="text-3xl md:text-5xl lg:text-[56px] leading-[1.2] font-semibold italic mb-12">
              "We're building a system where protecting nature actually pays — for the people who protect it."
            </h2>
            <div className="w-16 h-[1px] bg-white/40 mb-6" />
            <p className="text-xs font-bold tracking-[0.3em] uppercase text-white/90">
              THE NEVARA MANIFESTO
            </p>
         </div>
      </section>

      {/* Footer matching new design */}
      <footer className="bg-white dark:bg-[#0A1118] text-gray-900 dark:text-white pt-24 pb-12 px-6 lg:px-12">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between mb-16 gap-12">
            <div className="flex flex-col gap-4">
              <h3 className="text-3xl font-black tracking-tight">NEVARA</h3>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] leading-relaxed max-w-[300px]">
                © 2024 NEVARA BLUE CARBON REGISTRY.<br />
                SOVEREIGN ENVIRONMENTAL INTEGRITY.
              </p>
            </div>
            <div className="flex flex-wrap gap-8 text-[11px] font-bold tracking-[0.1em] text-gray-500 uppercase md:pt-4">
              <Link href="/legal" className="hover:text-gray-900 transition-colors">LEGAL</Link>
              <Link href="/privacy" className="hover:text-gray-900 transition-colors">PRIVACY POLICY</Link>
              <Link href="/terms" className="hover:text-gray-900 transition-colors">REGISTRY TERMS</Link>
              <Link href="/methodology" className="hover:text-gray-900 transition-colors">METHODOLOGY</Link>
            </div>
          </div>
          
          <div className="border-t border-gray-100 dark:border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex gap-6 text-gray-500">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /><path d="M2 12h20" /></svg>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" /></svg>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
            </div>
            <p className="text-xs font-medium text-gray-500">
              Built for the future of planetary health.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
