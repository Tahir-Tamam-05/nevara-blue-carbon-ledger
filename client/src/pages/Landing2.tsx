import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";

// ── Hooks ────────────────────────────────────────────────────────────────────

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useCounter(target: number, duration = 2000) {
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);
  const start = useCallback(() => setStarted(true), []);
  useEffect(() => {
    if (!started) return;
    const steps = 60;
    const inc = target / steps;
    let cur = 0;
    const id = setInterval(() => {
      cur += inc;
      if (cur >= target) { setValue(target); clearInterval(id); }
      else setValue(Math.floor(cur));
    }, duration / steps);
    return () => clearInterval(id);
  }, [started, target, duration]);
  return { value, start };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { ref, inView } = useInView(0.2);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
    >
      {children}
    </div>
  );
}

const HASHES = [
  "0x4A7F...3C91 → 850 tCO₂e VERIFIED",
  "0x9D2B...71E4 → 1,200 tCO₂e VERIFIED",
  "0x1F6A...88D0 → 340 tCO₂e VERIFIED",
  "0xC3E8...4B2F → 2,100 tCO₂e VERIFIED",
  "0x7A1D...92C6 → 670 tCO₂e VERIFIED",
];

function HashTicker() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % HASHES.length);
        setVisible(true);
      }, 350);
    }, 2800);
    return () => clearInterval(id);
  }, []);
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/[0.08] px-4 py-1.5"
      style={{ transition: "opacity 350ms", opacity: visible ? 1 : 0 }}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-400" />
      </span>
      <span className="font-mono text-xs text-teal-300">{HASHES[idx]}</span>
    </div>
  );
}

function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.7,
      vy: (Math.random() - 0.5) * 0.7,
      r: 0.6 + Math.random() * 1.8,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(20,184,166,0.55)";
        ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(20,184,166,${(1 - dist / 130) * 0.18})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}

// Stat counter card for roadmap section
function StatCard({ value, unit, label, started }: { value: number; unit: string; label: string; started: boolean }) {
  const { value: count, start } = useCounter(value, 2000);
  useEffect(() => { if (started) start(); }, [started, start]);
  return (
    <div className="rounded-xl border border-white/5 bg-[#040D0B] p-5 text-center">
      <div className="font-['Syne'] text-3xl font-bold text-white">
        {count.toLocaleString()}{unit}
      </div>
      <div className="mt-1 text-xs text-teal-400">{label}</div>
    </div>
  );
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "border-b border-teal-900/40 bg-[#040D0B]/90 backdrop-blur-xl" : ""
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-emerald-600">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="3" fill="currentColor" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
            </svg>
          </div>
          <span className="font-bold text-lg text-white tracking-wide">NEVARA</span>
        </Link>
        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/explorer" className="text-sm text-gray-400 hover:text-teal-400 transition-colors">Explorer</Link>
          <Link href="/marketplace" className="text-sm text-gray-400 hover:text-teal-400 transition-colors">Marketplace</Link>
          <Link href="/explorer" className="text-sm text-gray-400 hover:text-teal-400 transition-colors">Blockchain</Link>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Log in</Link>
          <Link href="/login" className="rounded-full bg-teal-500 px-5 py-2 text-sm font-semibold text-black hover:bg-teal-400 transition-colors">
            Get Started
          </Link>
        </div>
        {/* Mobile hamburger */}
        <button className="md:hidden text-gray-400" onClick={() => setOpen(!open)}>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {open ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>
      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden bg-[#040D0B]/95 backdrop-blur-xl border-t border-teal-900/30 px-6 py-6 flex flex-col gap-4">
          <Link href="/explorer" className="text-sm text-gray-400 hover:text-teal-400">Explorer</Link>
          <Link href="/marketplace" className="text-sm text-gray-400 hover:text-teal-400">Marketplace</Link>
          <Link href="/explorer" className="text-sm text-gray-400 hover:text-teal-400">Blockchain</Link>
          <hr className="border-teal-900/30" />
          <Link href="/login" className="text-sm text-gray-400 hover:text-white">Log in</Link>
          <Link href="/login" className="rounded-full bg-teal-500 px-5 py-2.5 text-sm font-semibold text-black text-center hover:bg-teal-400 transition-colors">
            Get Started
          </Link>
        </div>
      )}
    </nav>
  );
}

// ── MAIN LANDING ──────────────────────────────────────────────────────────────
export default function Landing() {
  // roadmap section counter trigger
  const { ref: roadmapRef, inView: roadmapInView } = useInView(0.15);

  return (
    <div className="min-h-screen bg-[#040D0B] text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&family=JetBrains+Mono:wght@400&display=swap');
        .font-syne { font-family: 'Syne', sans-serif; }
        .font-mono-jet { font-family: 'JetBrains Mono', monospace; }
      `}</style>

      <Nav />

      {/* ── SECTION 2: HERO ──────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <ParticleField />
        {/* Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0 opacity-40"
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>
        {/* Gradient overlays */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#040D0B]/20 to-[#040D0B]" />
        <div className="pointer-events-none absolute top-0 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-teal-900/20 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[500px] rounded-full bg-emerald-900/15 blur-[100px]" />

        <div className="relative z-10 mx-auto max-w-5xl px-6 pt-24 pb-32 text-center">
          {/* Hash ticker */}
          <div className="mb-5 flex justify-center">
            <HashTicker />
          </div>
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-teal-700/40 bg-teal-950/60 px-4 py-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-400" />
            </span>
            <span className="text-xs font-medium uppercase tracking-widest text-teal-300">
              India's First Blue Carbon Registry &amp; Marketplace
            </span>
          </div>
          {/* Headline */}
          <h1 className="font-syne mb-6 text-5xl font-bold leading-[1.05] sm:text-7xl lg:text-8xl">
            <span className="block text-white">Where Coastlines</span>
            <span className="block bg-gradient-to-r from-teal-300 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">
              Become Capital.
            </span>
          </h1>
          {/* Subtitle */}
          <p className="mx-auto mb-10 max-w-2xl text-lg font-light leading-relaxed text-gray-400 sm:text-xl">
            NEVARA transforms India's 7,500 km coastline into verified carbon assets.
            Blockchain-backed credit registry, GIS land mapping, and AI-driven verification
            — fully compliant with India's Carbon Credit Trading Scheme 2026.
          </p>
          {/* CTAs */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Link href="/login"
              className="group flex items-center gap-2 rounded-xl bg-teal-500 px-7 py-3.5 text-sm font-semibold text-black transition-all hover:bg-teal-400 hover:shadow-2xl hover:shadow-teal-500/30">
              Start Your Project
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
            <Link href="/explorer"
              className="group flex items-center gap-2 rounded-xl border border-teal-700/50 px-7 py-3.5 text-sm text-teal-300 transition-all hover:bg-teal-950/50">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Live Blockchain Explorer
            </Link>
          </div>
          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-6 text-xs text-gray-500">
            {[
              { icon: "⬡", text: "Patent Filed — No. 202541114138" },
              { icon: "◎", text: "AWS EC2 — Live & Deployed" },
              { icon: "◈", text: "CCTS 2026 Aligned" },
              { icon: "◇", text: "Verra VM0033 Compatible" },
            ].map(b => (
              <span key={b.text} className="flex items-center gap-1.5">
                <span className="text-teal-500">{b.icon}</span>{b.text}
              </span>
            ))}
          </div>
        </div>
        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce">
          <div className="h-12 w-px bg-gradient-to-b from-teal-400 to-transparent" />
          <svg className="h-4 w-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </section>

      {/* ── SECTION 3: INTRODUCING NEVARA ─────────────────────────────────── */}
      <section className="bg-[#060F0C] py-28">
        <div className="mx-auto max-w-7xl px-6">
          <Section className="text-center mb-16">
            <p className="mb-4 text-xs uppercase tracking-[0.2em] text-teal-500">Introducing NEVARA</p>
            <h2 className="font-syne mb-6 text-4xl font-bold text-white sm:text-5xl">
              A Living Registry for<br />India's Blue Carbon Future.
            </h2>
            <p className="mx-auto max-w-3xl text-gray-400 leading-relaxed mb-5">
              NEVARA — derived from the ancient word for 'water-keeper' — is a full-stack, live-deployed platform
              that brings institutional-grade transparency to India's coastal carbon ecosystem. We combine blockchain
              immutability, AI-driven monitoring, and GIS precision to transform coastal land into verified, tradeable carbon assets.
            </p>
            <p className="mx-auto max-w-3xl text-gray-400 leading-relaxed">
              India holds 4,900 sq km of mangroves — one of the world's most carbon-dense ecosystems, capable of
              sequestering carbon at 10× the rate of tropical forests. Yet no domestic platform existed to register,
              verify, and trade these credits in a way that meets India's 2026 Carbon Credit Trading Scheme (CCTS)
              mandates. NEVARA is that platform.
            </p>
          </Section>
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              {
                color: "teal",
                border: "border-teal-800/30",
                iconBg: "bg-teal-950/80",
                iconColor: "text-teal-400",
                icon: <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
                title: "Blockchain Transparency",
                body: "Every carbon credit issued on NEVARA is permanently recorded on a custom SHA-256 + Merkle tree blockchain. Anyone — buyers, regulators, or the public — can audit any credit's origin, verification history, and current ownership through our public explorer.",
              },
              {
                color: "emerald",
                border: "border-emerald-800/30",
                iconBg: "bg-emerald-950/80",
                iconColor: "text-emerald-400",
                icon: <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="9" strokeWidth={1.5} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v2M21 12h-2M12 21v-2M3 12h2" /></svg>,
                title: "GIS-Verified Land Boundaries",
                body: "Contributors define their coastal land using GPS-precise polygon drawing directly in the browser. Every project is geographically anchored — eliminating overlap fraud, boundary disputes, and double-registration that plagued previous carbon registries.",
              },
              {
                color: "blue",
                border: "border-blue-800/30",
                iconBg: "bg-blue-950/80",
                iconColor: "text-blue-400",
                icon: <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
                title: "Community-First Revenue",
                body: "The 60/20/20 revenue model ensures that 60% of every credit sale goes directly to the contributor — farmers, NGOs, tribal communities, and government bodies — bypassing intermediaries entirely through automated smart contract distribution.",
              },
            ].map(card => (
              <Section key={card.title}>
                <div className={`rounded-2xl border ${card.border} bg-[#040D0B] p-7 h-full`}>
                  <div className={`mb-5 inline-flex rounded-xl ${card.iconBg} p-3 ${card.iconColor}`}>
                    {card.icon}
                  </div>
                  <h3 className="font-syne mb-3 text-lg font-bold text-white">{card.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-400">{card.body}</p>
                </div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: WHY NEVARA ─────────────────────────────────────────── */}
      <section className="bg-[#040D0B] py-28">
        <div className="mx-auto max-w-7xl px-6">
          <Section className="text-center mb-16">
            <p className="mb-4 text-xs uppercase tracking-[0.2em] text-teal-500">Why NEVARA</p>
            <h2 className="font-syne mb-6 text-4xl font-bold text-white sm:text-5xl">
              India's Blue Carbon Ecosystems<br />Generate Zero Economic Return.
            </h2>
            <p className="mx-auto max-w-2xl text-gray-400 leading-relaxed">
              Mangroves sequester carbon at 10× the rate of tropical forests — yet India's 4,900 sq km
              of coastal ecosystems earn nothing from global carbon markets. Three systemic failures keep them undervalued.
            </p>
          </Section>
          <div className="grid gap-6 lg:grid-cols-3 mb-16">
            {[
              {
                num: "01", tag: "Trust Deficit", title: "No Transparent Verification",
                body: "Manual carbon audits take 6–18 months per project, cost lakhs, and happen infrequently. Credit buyers have no way to confirm what they're purchasing is real.",
                border: "border-red-900/30", grad: "from-red-900/20",
              },
              {
                num: "02", tag: "Market Gap", title: "No India-First Platform",
                body: "Global platforms like Verra and Gold Standard have no Indian regulatory workflow — no CRZ compliance, no FCA alignment, no CCTS offset mechanism integration.",
                border: "border-amber-900/30", grad: "from-amber-900/20",
              },
              {
                num: "03", tag: "Equity Failure", title: "Communities Are Excluded",
                body: "Carbon credit revenue is captured by intermediaries. Coastal farmers and fishing communities who protect these ecosystems receive less than 10% of the credit's market value.",
                border: "border-teal-900/30", grad: "from-teal-900/20",
              },
            ].map(c => (
              <Section key={c.num}>
                <div className={`relative overflow-hidden rounded-2xl border ${c.border} bg-gradient-to-b ${c.grad} to-[#040D0B] p-7 h-full`}>
                  <span className="font-syne absolute right-4 top-2 select-none text-6xl font-bold text-white/5">{c.num}</span>
                  <span className="mb-3 inline-block rounded-full border border-white/10 px-3 py-0.5 text-xs text-gray-400">{c.tag}</span>
                  <h3 className="font-syne mb-3 text-lg font-bold text-white">{c.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-400">{c.body}</p>
                </div>
              </Section>
            ))}
          </div>
          {/* Old vs New flow */}
          <Section>
            <div className="rounded-2xl border border-white/5 bg-[#060F0C] p-8">
              <div className="grid gap-8 lg:grid-cols-2">
                {/* Old Way */}
                <div>
                  <p className="mb-5 text-sm font-semibold text-red-400">Old Way — Broken</p>
                  <div className="flex items-start gap-3">
                    {[
                      { label: "Coastal Land", sub: "Unregistered, unmapped" },
                      { label: "Manual Audit", sub: "6–18 months, expensive" },
                      { label: "Uncertain Credits", sub: "Low trust, low value" },
                    ].map((step, i) => (
                      <div key={step.label} className="flex items-center gap-3">
                        <div className="rounded-xl border border-red-900/40 bg-red-950/20 px-3 py-3 text-center min-w-[90px]">
                          <p className="text-xs font-semibold text-red-300">{step.label}</p>
                          <p className="mt-1 text-[10px] text-gray-600">{step.sub}</p>
                        </div>
                        {i < 2 && <span className="text-red-900 text-lg">→</span>}
                      </div>
                    ))}
                  </div>
                </div>
                {/* New Way */}
                <div>
                  <p className="mb-5 text-sm font-semibold text-teal-400">NEVARA Way — Fixed</p>
                  <div className="flex items-start gap-3">
                    {[
                      { label: "GIS Submission", sub: "GPS-precise boundary" },
                      { label: "AI + Verifier", sub: "72-hour dual review" },
                      { label: "Blockchain Credit", sub: "Immutable, traceable" },
                    ].map((step, i) => (
                      <div key={step.label} className="flex items-center gap-3">
                        <div className="rounded-xl border border-teal-800/40 bg-teal-950/20 px-3 py-3 text-center min-w-[90px]">
                          <p className="text-xs font-semibold text-teal-300">{step.label}</p>
                          <p className="mt-1 text-[10px] text-gray-600">{step.sub}</p>
                        </div>
                        {i < 2 && <span className="text-teal-700 text-lg">→</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Section>
        </div>
      </section>

      {/* ── SECTION 5: HOW NEVARA WORKS ───────────────────────────────────── */}
      <section className="bg-[#060F0C] py-28">
        <div className="mx-auto max-w-7xl px-6">
          <Section className="text-center mb-16">
            <p className="mb-4 text-xs uppercase tracking-[0.2em] text-teal-500">Platform Workflow</p>
            <h2 className="font-syne text-4xl font-bold text-white sm:text-5xl">
              From Coastline to Carbon Credit<br />
              <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">in Four Steps.</span>
            </h2>
          </Section>
          <div className="grid gap-5 lg:grid-cols-4">
            {[
              {
                step: "01", role: "Contributor",
                icon: <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>,
                title: "Draw Your Land on GIS",
                body: "Contributors use our interactive Leaflet map to draw GPS-precise polygon boundaries around coastal land. Mangroves, seagrass beds, and salt marshes are all supported.",
              },
              {
                step: "02", role: "Verifier",
                icon: <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
                title: "Dual-Layer Verification",
                body: "An AI vegetation score pre-screens each project using ecosystem type, area, and location data. Expert verifiers then review, approve, or request clarification — completing audits in 72 hours.",
              },
              {
                step: "03", role: "Blockchain",
                icon: <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
                title: "Blockchain Carbon Credits",
                body: "Approved projects generate Carbon Credit Certificates (CCCs) recorded on our SHA-256 + Merkle tree ledger. Each credit is a unique, tamper-proof digital asset — publicly verifiable by anyone.",
              },
              {
                step: "04", role: "Buyer",
                icon: <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
                title: "Corporate Marketplace",
                body: "Companies mandated under India's CCTS 2026 — cement, steel, petroleum, textiles — browse and purchase verified blue carbon credits. Each purchase auto-generates a QR-linked certificate.",
              },
            ].map((s, i) => (
              <Section key={s.step}>
                <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#040D0B] p-7 h-full">
                  <span className="font-syne absolute right-4 top-2 select-none text-5xl font-bold text-white/[0.04]">{s.step}</span>
                  <div className="mb-1 text-[10px] uppercase tracking-widest text-gray-600">{s.role}</div>
                  <div className="mb-4 inline-flex rounded-xl bg-teal-950 p-3 text-teal-400">{s.icon}</div>
                  <h3 className="font-syne mb-3 text-base font-bold text-white">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-400">{s.body}</p>
                  {i < 3 && (
                    <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                      <div className="h-px w-6 bg-gradient-to-r from-teal-800/60 to-transparent" />
                    </div>
                  )}
                </div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 6: PLATFORM FEATURES BENTO ───────────────────────────── */}
      <section className="bg-[#040D0B] py-28">
        <div className="mx-auto max-w-7xl px-6">
          <Section className="text-center mb-14">
            <p className="mb-4 text-xs uppercase tracking-[0.2em] text-teal-500">Platform</p>
            <h2 className="font-syne mb-4 text-4xl font-bold text-white sm:text-5xl">Everything Built. Live Today.</h2>
            <p className="text-gray-400">14 production modules deployed on AWS EC2. Not a prototype — a working platform.</p>
          </Section>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {/* Large card */}
            <Section className="col-span-2 row-span-2">
              <div className="relative overflow-hidden rounded-2xl border border-teal-800/30 bg-[#060F0C] p-8 min-h-[300px] h-full">
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10">
                  <div className="h-64 w-64 rounded-full bg-teal-500 blur-3xl" />
                </div>
                <div className="relative z-10">
                  <div className="mb-5 inline-flex rounded-xl bg-teal-950 p-3 text-teal-400">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                  </div>
                  <h3 className="font-syne mb-3 text-xl font-bold text-white">Interactive GIS Land Mapping</h3>
                  <p className="mb-6 text-sm leading-relaxed text-gray-400">
                    Contributors draw GPS-precise polygon boundaries on a live Leaflet map directly in the browser.
                    Automatic area calculation, ecosystem type selection, and overlap detection — no external GIS software needed.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["Polygon Drawing", "GPS Coordinates", "Overlap Detection", "Area Auto-Calc"].map(tag => (
                      <span key={tag} className="rounded-md border border-teal-800/30 bg-teal-950/60 px-2.5 py-1 text-xs text-teal-400">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Section>
            {/* AI Vegetation */}
            <Section>
              <div className="rounded-2xl border border-white/5 bg-[#060F0C] p-6 h-full">
                <div className="mb-4 inline-flex rounded-xl bg-purple-950/50 p-3 text-purple-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <h3 className="font-syne mb-2 text-sm font-bold text-white">AI Vegetation Score</h3>
                <p className="text-xs leading-relaxed text-gray-400">Ecosystem type, land area, GPS location, and historical data combine into a real-time quality score (0–100) displayed on every project card.</p>
              </div>
            </Section>
            {/* SHA-256 */}
            <Section>
              <div className="rounded-2xl border border-white/5 bg-[#060F0C] p-6 h-full">
                <div className="mb-4 inline-flex rounded-xl bg-teal-950/80 p-3 text-teal-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <h3 className="font-syne mb-2 text-sm font-bold text-white">SHA-256 Blockchain Ledger</h3>
                <p className="mb-3 text-xs leading-relaxed text-gray-400">Every carbon credit is an immutable block. Merkle tree verification. Public explorer. Double-counting is mathematically impossible.</p>
                <div className="rounded-lg bg-teal-950/30 px-3 py-2">
                  <code className="font-mono-jet text-xs text-teal-500">0x9D2B...71E4 → 1,200 tCO₂e ✓</code>
                </div>
              </div>
            </Section>
            {/* Marketplace */}
            <Section>
              <div className="rounded-2xl border border-white/5 bg-[#060F0C] p-6 h-full">
                <div className="mb-4 inline-flex rounded-xl bg-emerald-950/50 p-3 text-emerald-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                </div>
                <h3 className="font-syne mb-2 text-sm font-bold text-white">Carbon Credit Marketplace</h3>
                <p className="text-xs leading-relaxed text-gray-400">Browse, filter, and purchase verified credits by ecosystem type, price, and location. Instant certificate delivery with QR-linked blockchain proof.</p>
              </div>
            </Section>
            {/* Certificates */}
            <Section>
              <div className="rounded-2xl border border-white/5 bg-[#060F0C] p-6 h-full">
                <div className="mb-4 inline-flex rounded-xl bg-blue-950/50 p-3 text-blue-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <h3 className="font-syne mb-2 text-sm font-bold text-white">Verifiable Certificates</h3>
                <p className="text-xs leading-relaxed text-gray-400">PDF carbon offset certificates with embedded QR codes. Scan any certificate to verify the originating blockchain block in real time.</p>
              </div>
            </Section>
            {/* Revenue sharing */}
            <Section className="col-span-2 lg:col-span-1">
              <div className="rounded-2xl border border-white/5 bg-[#060F0C] p-6 h-full">
                <div className="mb-4 inline-flex rounded-xl bg-amber-950/50 p-3 text-amber-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="font-syne mb-2 text-sm font-bold text-white">Smart Revenue Sharing</h3>
                <p className="mb-4 text-xs leading-relaxed text-gray-400">Automated 60/20/20 split on every credit sale. Contributors receive 60% directly — no intermediaries, no delay.</p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-md bg-teal-950/60 border border-teal-800/30 px-2.5 py-1 text-xs font-bold text-teal-400">60% Contributor</span>
                  <span className="rounded-md bg-white/5 px-2.5 py-1 text-xs text-gray-400">20% Platform</span>
                  <span className="rounded-md bg-white/5 px-2.5 py-1 text-xs text-gray-400">20% Audit</span>
                </div>
              </div>
            </Section>
          </div>
        </div>
      </section>

      {/* ── SECTION 7: CURRENT ROADMAP ────────────────────────────────────── */}
      <section className="bg-[#060F0C] py-28">
        <div className="mx-auto max-w-7xl px-6">
          <Section className="text-center mb-14">
            <p className="mb-4 text-xs uppercase tracking-[0.2em] text-teal-500">Where We Are</p>
            <h2 className="font-syne mb-4 text-4xl font-bold text-white sm:text-5xl">
              Mangalore Pilot — Live on India's Coast.
            </h2>
            <p className="mx-auto max-w-2xl text-gray-400 leading-relaxed">
              NEVARA's first deployment is active at the Gurupur river estuary, Dakshina Kannada.
              Every module listed below is running in production on AWS EC2 right now.
            </p>
          </Section>
          <div className="grid gap-12 lg:grid-cols-2 items-start">
            {/* Milestones */}
            <div className="space-y-4">
              {[
                {
                  title: "5-Hectare Pilot Site — Gurupur Estuary",
                  body: "India's first AI-verified, blockchain-recorded blue carbon pilot is operational near Mangalore's Gurupur river estuary. The site covers mangrove-dense coastal land in Dakshina Kannada district, selected for its proximity to NITK Surathkal and CMFRI Mangalore for scientific validation support.",
                },
                {
                  title: "All 14 Platform Modules Deployed",
                  body: "GIS Contributor Portal · Dual-Layer Verifier Dashboard · SHA-256 Blockchain + Public Explorer · Carbon Credit Marketplace · Certificate Generator · Admin Governance Layer · Audit Logging · Role-based Access Control · Document Vault · Carbon Calculation Engine · Blue Points Reward System · Object Storage (GCS) · PostgreSQL (AWS RDS) · PM2 Process Manager",
                },
                {
                  title: "Stakeholder Engagement Initiated",
                  body: "Formal engagement initiated with Mangalore Forest Division (DCF) for pilot land parcel identification. OPSA Trust partnership under discussion for community contributor onboarding. NITK Surathkal Water Resources & Ocean Engineering department contacted for technical MRV collaboration.",
                },
              ].map(m => (
                <Section key={m.title}>
                  <div className="rounded-2xl border border-teal-700/40 bg-teal-950/[0.08] p-6">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-400" />
                      </span>
                      <span className="rounded-full bg-teal-950/60 px-2.5 py-0.5 text-xs font-semibold text-teal-400">Live</span>
                    </div>
                    <h3 className="font-syne mb-2 text-base font-bold text-white">{m.title}</h3>
                    <p className="text-sm leading-relaxed text-gray-400">{m.body}</p>
                  </div>
                </Section>
              ))}
            </div>
            {/* Metrics */}
            <div ref={roadmapRef}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: 108093, unit: "", label: "Carbon Tracked", sub: "tCO₂e" },
                  { value: 66, unit: "", label: "Credits Available", sub: "" },
                  { value: 5, unit: "", label: "Verified Projects", sub: "" },
                  { value: 7500, unit: " km", label: "Coastline Targeted", sub: "" },
                  { value: 42, unit: "", label: "API Endpoints", sub: "" },
                  { value: 14, unit: "", label: "Platform Modules", sub: "" },
                  { value: 72, unit: " hrs", label: "Avg Verification Time", sub: "" },
                  { value: 60, unit: "%", label: "Contributor Revenue Share", sub: "" },
                ].map(m => (
                  <StatCard key={m.label} value={m.value} unit={m.unit} label={m.label} started={roadmapInView} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 9: FUTURE SCOPE & PLAN ───────────────────────────────── */}
      <section className="bg-[#060F0C] py-28">
        <div className="mx-auto max-w-7xl px-6">
          <Section className="text-center mb-20">
            <p className="mb-4 text-xs uppercase tracking-[0.2em] text-teal-500">Future Scope &amp; Plan</p>
            <h2 className="font-syne mb-6 text-4xl font-bold text-white sm:text-5xl">
              Where NEVARA Is Going.<br />
              <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">AI. Standards. Partnerships.</span>
            </h2>
            <p className="mx-auto max-w-3xl text-gray-400 leading-relaxed">
              NEVARA's live platform is the foundation. The next phases build the scientific rigour, institutional
              credibility, and partnership infrastructure required to scale India's blue carbon market from a pilot
              to a national registry. Three pillars define this future scope: AI-powered MRV, Verra & Gold Standard
              alignment, and structured onboarding of NGOs and government bodies.
            </p>
          </Section>

          {/* 9A: AI MRV */}
          <Section>
            <div className="mb-12 rounded-2xl border border-white/5 bg-[#040D0B] px-8 py-16">
              <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-teal-600">Subsection A</p>
              <h3 className="font-syne mb-2 text-3xl font-bold text-white sm:text-4xl">Satellite Intelligence.</h3>
              <p className="font-syne mb-4 text-3xl font-bold text-white sm:text-4xl">Continuous. Unbiased. Automated.</p>
              <p className="max-w-2xl text-gray-400 leading-relaxed mt-4">
                The next frontier for NEVARA is replacing periodic, manual audits with a continuous, satellite-powered
                Monitoring, Reporting, and Verification (MRV) system. By integrating Sentinel-2 multispectral imagery
                and machine learning models, NEVARA will be able to assess carbon stock changes in real time —
                day by day, hectare by hectare, without a single field auditor needing to set foot on the site.
              </p>
              <div className="mt-10 grid gap-6 md:grid-cols-2">
                {[
                  {
                    border: "border-teal-800/30", iconBg: "bg-teal-950/80", iconColor: "text-teal-400",
                    tag: "Phase 2 — Month 2–3", tagColor: "text-amber-500",
                    title: "Sentinel-2 Satellite Integration",
                    body: "NEVARA will ingest Sentinel-2 multispectral imagery at 10-metre resolution for every registered project area. The Normalized Difference Vegetation Index (NDVI) computed from Band 8 and Band 4 provides a daily proxy for canopy health, biomass density, and carbon sequestration rate — aligned with Verra VM0033 v2.1 stratification requirements.",
                    icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
                  },
                  {
                    border: "border-purple-800/30", iconBg: "bg-purple-950/80", iconColor: "text-purple-400",
                    tag: "Phase 2 — Month 2–3", tagColor: "text-amber-500",
                    title: "ML Carbon Stock Baseline",
                    body: "A supervised machine learning model trained on soil organic carbon samples, ecosystem type classifications, GPS elevation data, and historical satellite imagery will replace the current heuristic scoring system. The model will output carbon stock estimates in tCO₂e per hectare with confidence intervals — providing the statistical rigour required for Verra and BEE credit issuance.",
                    icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="3" strokeWidth={1.5}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" /></svg>,
                  },
                  {
                    border: "border-emerald-800/30", iconBg: "bg-emerald-950/80", iconColor: "text-emerald-400",
                    tag: "Phase 2 — Month 2–3", tagColor: "text-amber-500",
                    title: "Dynamic Project Boundary Tracking",
                    body: "Verra VM0033 v2.1 requires that project boundaries account for landward migration of wetlands due to sea-level rise. NEVARA's AI layer will automatically update registered GIS polygons using tidal migration models and NDVI-detected shoreline change data — ensuring credits remain valid even as coastlines shift.",
                    icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
                  },
                  {
                    border: "border-blue-800/30", iconBg: "bg-blue-950/80", iconColor: "text-blue-400",
                    tag: "Phase 3 — Q3 2026", tagColor: "text-gray-500",
                    title: "Peat Depletion Time Estimation",
                    body: "For long-duration credits, NEVARA will compute the Peat Depletion Time (PDT) and Soil Organic Carbon Depletion Time (SDT) for each project site using biogeochemical modelling. This ensures credits are only issued for carbon that remains stored over the 20–100 year horizons required by Verra and BEE — preventing over-issuance.",
                    icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>,
                  },
                ].map(c => (
                  <div key={c.title} className={`rounded-xl border ${c.border} bg-[#060F0C] p-6`}>
                    <div className={`mb-3 inline-flex rounded-xl ${c.iconBg} p-2.5 ${c.iconColor}`}>{c.icon}</div>
                    <span className={`mb-3 block text-xs ${c.tagColor}`}>{c.tag}</span>
                    <h4 className="font-syne mb-2 text-sm font-bold text-white">{c.title}</h4>
                    <p className="text-xs leading-relaxed text-gray-400">{c.body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-10 rounded-2xl border border-teal-800/30 bg-teal-950/10 p-8">
                <p className="mb-3 text-sm font-bold text-teal-400">Why This Matters</p>
                <p className="text-sm leading-relaxed text-gray-400">
                  Current blue carbon verification globally is slow, expensive, and intermittent — taking 6–18 months
                  per audit. NEVARA's AI MRV system compresses this to continuous daily monitoring, reducing verification
                  costs by an estimated 80–90% while producing higher-fidelity carbon stock data than traditional field
                  surveys alone. This is what makes NEVARA credits genuinely 'investment-grade.'
                </p>
              </div>
            </div>
          </Section>

          {/* 9B: Verra */}
          <Section>
            <div className="mb-12 rounded-2xl border border-white/5 bg-[#060F0C] px-8 py-16">
              <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-teal-600">Subsection B</p>
              <h3 className="font-syne mb-1 text-3xl font-bold text-white sm:text-4xl">Built to Verra's Standard.</h3>
              <p className="font-syne mb-4 text-3xl font-bold text-white sm:text-4xl">Aligned from Day One.</p>
              <p className="max-w-2xl text-gray-400 leading-relaxed mt-4 mb-10">
                NEVARA does not reinvent carbon credit standards — it implements them. The platform is designed ground-up
                to align with Verra's VM0033 Methodology for Tidal Wetland and Seagrass Restoration (v2.1) and the Gold
                Standard for the Global Goals (GS4GG). Every feature in NEVARA's project submission workflow maps directly
                to a compliance requirement in these internationally recognised frameworks.
              </p>
              <div className="grid gap-12 lg:grid-cols-2">
                {/* Verra table */}
                <div>
                  <p className="mb-6 text-sm font-bold text-teal-400">Verra VCS — VM0033 v2.1 Compliance Map</p>
                  <div className="space-y-3">
                    {[
                      { req: "Additionality", status: "Mapped", color: "teal", detail: "NEVARA uses Module VMD0052 for financial and barrier analysis. Contributors must demonstrate projects would not occur without carbon finance — captured in the submission form's additionality checklist." },
                      { req: "Leakage", status: "Mapped", color: "teal", detail: "AI monitoring of a 2 km buffer zone around each registered project boundary will detect displacement of carbon-emitting activities outside the project area, as required by VM0033 §5.4." },
                      { req: "Non-Permanence", status: "Mapped", color: "teal", detail: "A mandatory 20% credit buffer pool is deducted from every project's issued credits. The buffer covers sea-level rise risk, fire, and anthropogenic disturbance — directly satisfying VM0033's non-permanence buffer requirements." },
                      { req: "Stratification", status: "Planned — Phase 2", color: "amber", detail: "GIS-based mapping of organic vs. mineral soil strata and salinity zones will be implemented alongside Sentinel-2 integration in Phase 2. Required for accurate methane emission accounting under VM0033 §6.2." },
                      { req: "Dynamic Boundaries", status: "Planned — Phase 2", color: "amber", detail: "VM0033 v2.1 requires accounting for landward wetland migration due to sea-level rise. NEVARA's AI boundary tracking system will handle polygon updates automatically — planned for Phase 2." },
                    ].map(r => (
                      <div key={r.req} className="rounded-xl border border-white/5 bg-[#040D0B] p-4">
                        <div className="mb-2 flex items-center gap-3">
                          <span className="text-sm font-semibold text-white">{r.req}</span>
                          <span className={`rounded-md px-2 py-0.5 text-xs ${r.color === "teal" ? "bg-teal-950/60 text-teal-400" : "bg-amber-950/60 text-amber-400"}`}>{r.status}</span>
                        </div>
                        <p className="text-xs leading-relaxed text-gray-500">{r.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Gold Standard */}
                <div>
                  <p className="mb-6 text-sm font-bold text-purple-400">Gold Standard GS4GG — Social Impact Layer</p>
                  <div className="space-y-4">
                    {[
                      { title: "Safeguarding Assessment", body: "Gold Standard requires a formal assessment ensuring no negative impact on local livelihoods, water access, or land rights. NEVARA's contributor onboarding workflow includes a structured safeguard questionnaire and requires documentation of Free, Prior and Informed Consent (FPIC) from affected communities." },
                      { title: "SDG Contribution Tracking", body: "Gold Standard mandates tracking of at least 3 Sustainable Development Goals. NEVARA auto-tags every registered project with SDG 13 (Climate Action), SDG 14 (Life Below Water), and SDG 8 (Decent Work)." },
                      { title: "Public Registry Transparency", body: "All Gold Standard-registered projects must appear on the public Gold Standard Impact Registry. NEVARA's blockchain explorer serves as an additional layer of transparency, providing an immutable on-chain record alongside the Gold Standard's own registry listing." },
                    ].map(b => (
                      <div key={b.title} className="rounded-xl border border-purple-800/30 bg-[#040D0B] p-5">
                        <h4 className="font-syne mb-2 text-sm font-bold text-white">{b.title}</h4>
                        <p className="text-xs leading-relaxed text-gray-400">{b.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Status bar */}
              <div className="mt-10 flex flex-wrap gap-3">
                {[
                  { label: "Verra VM0033 v2.1 — Methodology Aligned", color: "text-teal-400" },
                  { label: "Gold Standard GS4GG — Workflow Compatible", color: "text-purple-400" },
                  { label: "BEE Offset Mechanism — API Integration Planned", color: "text-emerald-400" },
                  { label: "Green Credit Rules 2023 — Contributor Workflow Aligned", color: "text-blue-400" },
                ].map(c => (
                  <span key={c.label} className={`flex items-center gap-1.5 rounded-full border border-white/[0.08] px-3 py-1.5 text-xs text-gray-400`}>
                    <span className={c.color}>◈</span>{c.label}
                  </span>
                ))}
              </div>
            </div>
          </Section>

          {/* 9C: Onboarding */}
          <Section>
            <div className="rounded-2xl border border-white/5 bg-[#040D0B] px-8 py-16">
              <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-teal-600">Subsection C</p>
              <h3 className="font-syne mb-1 text-3xl font-bold text-white sm:text-4xl">Government Land. Community Trust.</h3>
              <p className="font-syne mb-4 text-3xl font-bold text-white sm:text-4xl">One Unified Platform.</p>
              <p className="max-w-2xl text-gray-400 leading-relaxed mt-4 mb-10">
                The majority of India's coastal mangrove land is government-owned — managed by State Forest Departments
                and Coastal Zone Authorities. NEVARA's success depends on building institutional partnerships before
                scaling the marketplace. We have designed a structured onboarding pathway for three distinct types of
                institutional contributors.
              </p>
              <div className="grid gap-6 lg:grid-cols-3">
                {[
                  {
                    border: "border-teal-800/30", iconBg: "bg-teal-950/80", iconColor: "text-teal-400", labelColor: "text-teal-400",
                    contactBorder: "border-teal-900/30", contactBg: "bg-teal-950/10", contactColor: "text-teal-400",
                    label: "Government Bodies", title: "State Forest Departments & Coastal Authorities",
                    body: "Government land accounts for the vast majority of India's 4,900 sq km of mangroves. NEVARA approaches government bodies not as commercial partners but as data stewards — offering AI-generated coastal monitoring data, GIS mapping of forest boundaries, and carbon sequestration reports in exchange for pilot land access and CRZ clearance facilitation.",
                    steps: ["Submit 1-page concept note to State Forest Dept (DCF)", "Present NEVARA platform — emphasise data sharing, no land transfer", "Identify 5-hectare pilot parcel for baseline measurement", "Sign carbon rights agreement (revenue share to Dept)", "Obtain CRZ clearance for monitoring activities"],
                    contacts: ["Mangalore Forest Division (DCF) — 0824-2423913", "KSCZMA Regional Office — regionaldirector.env@karnataka.gov.in", "Coastal Development Authority — 0824-2457389"],
                    icon: <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
                  },
                  {
                    border: "border-emerald-800/30", iconBg: "bg-emerald-950/80", iconColor: "text-emerald-400", labelColor: "text-emerald-400",
                    contactBorder: "border-emerald-900/30", contactBg: "bg-emerald-950/10", contactColor: "text-emerald-400",
                    label: "NGO Partners", title: "Environmental NGOs & Mangrove Restoration Trusts",
                    body: "NGOs are NEVARA's fastest onboarding pathway because they already have community trust, field teams, and restoration sites. NEVARA offers NGOs a new revenue stream for their existing conservation work — transforming volunteer-funded restoration projects into verified carbon credit generators with automated income distribution.",
                    steps: ["Register NGO as Contributor on NEVARA platform", "Map existing restoration sites using GIS polygon tool", "Submit project documentation (land rights, restoration plan)", "Await dual-layer verification (AI score + expert review)", "Credits issued — 60% revenue share active immediately on sale"],
                    contacts: ["OPSA Trust (Mangrove Restoration) — +91 9439256512", "Sahyadri Sanchaya — Dinesh Holla — 9341116111"],
                    icon: <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
                  },
                  {
                    border: "border-blue-800/30", iconBg: "bg-blue-950/80", iconColor: "text-blue-400", labelColor: "text-blue-400",
                    contactBorder: "border-blue-900/30", contactBg: "bg-blue-950/10", contactColor: "text-blue-400",
                    label: "Research Institutions", title: "Universities, Marine Research Bodies & Scientific Validators",
                    body: "Research institutions provide the scientific credibility that turns NEVARA's AI scores into internationally accepted methodology. NEVARA offers institutions API access to project data, co-authorship on MRV methodology papers, and student research opportunities — in exchange for biodiversity data, carbon stock validation, and technical advisory.",
                    steps: ["Sign technical collaboration MoU with NEVARA", "Provide existing coastal biodiversity & soil carbon datasets", "Validate AI-generated carbon estimates against field measurements", "Co-develop MRV methodology for BEE and Verra submission", "Ongoing: Push research data via Research Institution API (Phase 3)"],
                    contacts: ["ICAR-CMFRI Mangalore — Dr. Sujitha Thomas — cmfrimng@gmail.com", "NITK Surathkal (WROE) — Dr. Ramesh H — head.wo@nitk.edu.in"],
                    icon: <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
                  },
                ].map(card => (
                  <div key={card.label} className={`rounded-2xl border ${card.border} bg-[#060F0C] p-6`}>
                    <div className={`mb-3 inline-flex rounded-xl ${card.iconBg} p-3 ${card.iconColor}`}>{card.icon}</div>
                    <p className={`mb-1 text-[10px] uppercase tracking-widest ${card.labelColor}`}>{card.label}</p>
                    <h4 className="font-syne mb-3 text-sm font-bold text-white">{card.title}</h4>
                    <p className="mb-4 text-xs leading-relaxed text-gray-400">{card.body}</p>
                    <div className="mb-4 space-y-2">
                      {card.steps.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-gray-400">
                          <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal-500" />
                          {s}
                        </div>
                      ))}
                    </div>
                    <div className={`rounded-xl border ${card.contactBorder} ${card.contactBg} p-4`}>
                      <p className={`mb-2 text-xs font-bold ${card.contactColor}`}>Active Engagements</p>
                      {card.contacts.map(c => (
                        <p key={c} className="text-xs text-gray-500">{c}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {/* Legal framework */}
              <div className="mt-10 rounded-2xl border border-white/5 bg-[#060F0C] p-8">
                <p className="mb-4 text-sm font-bold text-teal-400">Regulatory Compliance for Onboarding</p>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {[
                    { law: "Forest (Conservation) Act, 1980", req: "Required for any land classified as forest. Permissions from State Forest Department and MoEFCC mandatory before listing." },
                    { law: "Coastal Regulation Zone (CRZ) Rules 2019", req: "Required for all coastal project areas. KSCZMA Regional Director approval needed before contributor onboarding begins." },
                    { law: "Forest Rights Act (FRA), 2006", req: "Governs tribal and community land. FPIC documentation and gram sabha resolution required before listing community-owned land." },
                    { law: "Energy Conservation Act (Amendment), 2022", req: "Enables carbon credit trading in India under CCTS. Provides the legal foundation for NEVARA's entire marketplace operation." },
                  ].map(b => (
                    <div key={b.law} className="rounded-xl border border-white/5 bg-[#040D0B] p-4">
                      <p className="mb-2 text-xs font-semibold text-teal-300">{b.law}</p>
                      <p className="text-xs leading-relaxed text-gray-500">{b.req}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Section>
        </div>
      </section>

      {/* ── SECTION 10: CONCLUSION ────────────────────────────────────────── */}
      <section className="relative py-32" style={{ background: "linear-gradient(to bottom, #040D0B, rgba(19,78,74,0.08), #040D0B)" }}>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(20,184,166,0.12) 0%, transparent 70%)" }} className="h-full w-full" />
        </div>
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <Section>
            <p className="mb-6 text-xs uppercase tracking-widest text-teal-500">Why NEVARA Exists</p>
            <blockquote className="mb-4 text-2xl font-light italic leading-relaxed text-white sm:text-3xl">
              "India's coastline is not just a geographic boundary — it is a carbon sink, a biodiversity corridor,
              and the livelihood of millions of fishing and farming communities. We built NEVARA because no one else
              was building the infrastructure to make its protection economically rational."
            </blockquote>
            <p className="text-sm text-gray-500">— Tahir Tamam, Founder, NEVARA</p>
          </Section>
          <div className="mx-auto my-12 h-16 w-px bg-gradient-to-b from-transparent via-teal-500/40 to-transparent" />
          <Section>
            <h2 className="font-syne mb-5 text-4xl font-bold text-white sm:text-5xl">
              A Platform. A Patent.<br />
              <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">A Movement.</span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-400">
              In six months, a 3rd-year Computer Science undergraduate from BITM Ballari has built and deployed
              what no Indian climate-tech company has: a live, end-to-end blue carbon credit registry with blockchain
              immutability, GIS precision, AI verification, and full CCTS 2026 regulatory alignment — and filed a
              patent to protect it.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm">
              {[
                "Patent Filed — Application No. 202541114138",
                "Live on AWS EC2 — Deployed & Accessible",
                "14 Modules · 42 APIs · PostgreSQL + Blockchain",
                "Verra VM0033 + CCTS 2026 + CRZ Aligned",
                "Mangalore Pilot — Gurupur Estuary Active",
              ].map(p => (
                <span key={p} className="flex items-center gap-2 text-teal-300">
                  <span className="text-teal-500">◈</span>{p}
                </span>
              ))}
            </div>
          </Section>
          <Section>
            <div className="mx-auto mt-14 max-w-2xl rounded-2xl border border-teal-800/30 bg-teal-950/10 p-8">
              <p className="text-lg font-light italic leading-relaxed text-gray-300">
                "The vision is not a feature. It is a market — where India's mangroves and seagrass meadows are as
                valued by financial systems as they are by the ecosystems they anchor. Where a fishing community in
                Mangalore earns a transparent, verifiable income from the carbon their coastline sequesters. Where a
                corporate buyer in Mumbai can trace their offset to a specific hectare, a specific community, and a
                specific blockchain block."
              </p>
            </div>
            <div className="mt-14 flex flex-wrap justify-center gap-4">
              <Link href="/login"
                className="group flex items-center gap-2 rounded-xl bg-teal-500 px-8 py-4 font-bold text-black transition-all hover:bg-teal-400 hover:shadow-2xl hover:shadow-teal-500/30">
                Submit Your First Project
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
              <Link href="/explorer"
                className="rounded-xl border border-teal-700/40 px-8 py-4 text-teal-300 transition-all hover:bg-teal-950/50">
                Explore the Blockchain
              </Link>
            </div>
            <p className="mt-8 text-xs text-gray-600">
              Patent No. 202541114138 · AWS EC2 Deployed · CCTS 2026 Aligned · Verra VM0033 Compatible
            </p>
            <p className="mt-1 text-xs text-gray-600">© 2026 NEVARA. Made for India's coastline. Built for the planet.</p>
          </Section>
        </div>
      </section>

      {/* ── SECTION 11: FOOTER ────────────────────────────────────────────── */}
      <footer className="border-t border-teal-900/20 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-6 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-emerald-600">
              <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="3" fill="currentColor" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-white">NEVARA</div>
              <div className="text-xs text-gray-600">BlueCarbon Ledger</div>
            </div>
          </div>
          <nav className="flex gap-6">
            {[{ label: "Explorer", href: "/explorer" }, { label: "Marketplace", href: "/marketplace" }, { label: "Login", href: "/login" }, { label: "Sign Up", href: "/signup" }].map(l => (
              <Link key={l.label} href={l.href} className="text-sm text-gray-500 hover:text-teal-400 transition-colors">{l.label}</Link>
            ))}
          </nav>
          <div className="text-right text-xs text-gray-600">
            <p>© 2026 NEVARA. All rights reserved.</p>
            <p>Made for India's coastline. Built for the planet.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
