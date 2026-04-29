import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";

/* ─────────────────────────────────────────────────────────────────────────────
   NEVARA – Production Landing Page
   Design: Institutional Intelligence × Futuristic Stewardship × GIS Precision
   Stack: React + Tailwind (no external animation libs required)
   Fonts: Plus Jakarta Sans (display) + JetBrains Mono (data)
   Theme: Dark-first, light-mode ready
───────────────────────────────────────────────────────────────────────────── */

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useCounter(target: number, duration = 2000, decimals = 0) {
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (!started) return;
    const steps = 80;
    const inc = target / steps;
    let cur = 0;
    const t = setInterval(() => {
      cur += inc;
      if (cur >= target) { setValue(target); clearInterval(t); }
      else setValue(parseFloat(cur.toFixed(decimals)));
    }, duration / steps);
    return () => clearInterval(t);
  }, [started, target, duration, decimals]);
  return { value, start: () => setStarted(true) };
}

function useMouse() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const h = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);
  return pos;
}

// ─── Primitives ────────────────────────────────────────────────────────────────

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ─── Background Grid + Topographic ───────────────────────────────────────────

function GridBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Fine grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(20,184,166,0.8) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(20,184,166,0.8) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
      {/* Larger grid accent */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(20,184,166,1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(20,184,166,1) 1px, transparent 1px)
          `,
          backgroundSize: "300px 300px",
        }}
      />
      {/* Topographic sweep lines — organic coastal feel */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="blur1"><feGaussianBlur stdDeviation="2" /></filter>
        </defs>
        <path d="M-100,300 Q200,200 400,350 Q600,500 900,300 Q1200,100 1500,400 Q1800,700 2100,300" stroke="#14b8a6" strokeWidth="1.5" fill="none" filter="url(#blur1)" />
        <path d="M-100,500 Q300,350 500,550 Q700,750 1000,500 Q1300,250 1600,600 Q1900,950 2200,500" stroke="#14b8a6" strokeWidth="1.5" fill="none" filter="url(#blur1)" />
        <path d="M-100,700 Q400,500 600,750 Q800,1000 1100,700 Q1400,400 1700,800 Q2000,1200 2300,700" stroke="#14b8a6" strokeWidth="1.5" fill="none" filter="url(#blur1)" />
        <path d="M-100,150 Q250,50 450,200 Q650,350 950,150 Q1250,−50 1550,250 Q1850,550 2150,150" stroke="#14b8a6" strokeWidth="1" fill="none" filter="url(#blur1)" />
      </svg>
      {/* Ambient glow blobs */}
      <div className="absolute top-[15%] left-[20%] w-[600px] h-[600px] bg-teal-900/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] bg-blue-900/8 rounded-full blur-[100px]" />
    </div>
  );
}

// ─── Custom Cursor ────────────────────────────────────────────────────────────

function CustomCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => { setPos({ x: e.clientX, y: e.clientY }); setVisible(true); };
    const onLeave = () => setVisible(false);
    window.addEventListener("mousemove", onMove);
    document.body.addEventListener("mouseleave", onLeave);

    const addExpand = () => {
      document.querySelectorAll("a, button, [data-cursor-expand]").forEach(el => {
        el.addEventListener("mouseenter", () => setExpanded(true));
        el.addEventListener("mouseleave", () => setExpanded(false));
      });
    };
    const t = setTimeout(addExpand, 500);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.body.removeEventListener("mouseleave", onLeave);
      clearTimeout(t);
    };
  }, []);

  return (
    <div
      className="fixed pointer-events-none z-[9999] mix-blend-difference"
      style={{
        left: pos.x, top: pos.y,
        transform: "translate(-50%, -50%)",
        transition: "left 0.05s linear, top 0.05s linear",
        opacity: visible ? 1 : 0,
      }}
    >
      <div
        className="rounded-full bg-white transition-all duration-200 ease-out"
        style={{
          width: expanded ? 36 : 8,
          height: expanded ? 36 : 8,
          opacity: expanded ? 0.6 : 0.9,
        }}
      />
    </div>
  );
}

// ─── Cinematic Hero Video BG (CSS-only ocean simulation) ─────────────────────

function CinematicBackground({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  const parallaxX = ((mouseX / window.innerWidth) - 0.5) * 20;
  const parallaxY = ((mouseY / window.innerHeight) - 0.5) * 12;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Deep ocean gradient base */}
      <div
        className="absolute inset-[-5%] transition-transform duration-700 ease-out"
        style={{ transform: `translate(${parallaxX * 0.3}px, ${parallaxY * 0.3}px)` }}
      >
        <div
          className="w-full h-full"
          style={{
            background: `
              radial-gradient(ellipse 120% 80% at 30% 60%, #042f2e 0%, transparent 60%),
              radial-gradient(ellipse 100% 60% at 70% 30%, #083344 0%, transparent 50%),
              radial-gradient(ellipse 80% 100% at 50% 100%, #021b1a 0%, transparent 60%),
              linear-gradient(160deg, #040d0b 0%, #071c24 40%, #040d0b 100%)
            `,
          }}
        />
      </div>

      {/* Animated ocean surface shimmer */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `
            repeating-linear-gradient(
              -55deg,
              transparent,
              transparent 8px,
              rgba(20,184,166,0.04) 8px,
              rgba(20,184,166,0.04) 9px
            )
          `,
          animation: "shimmer 8s linear infinite",
        }}
      />

      {/* Moving light rays — coastal sunrise effect */}
      <div
        className="absolute inset-[-20%] opacity-[0.06] transition-transform duration-1000 ease-out"
        style={{
          transform: `translate(${parallaxX * 0.8}px, ${parallaxY * 0.5}px) rotate(${parallaxX * 0.1}deg)`,
          background: `
            conic-gradient(from 200deg at 30% 120%,
              transparent 0deg,
              rgba(20,184,166,0.8) 2deg,
              transparent 6deg,
              transparent 18deg,
              rgba(14,165,233,0.6) 20deg,
              transparent 24deg,
              transparent 36deg,
              rgba(20,184,166,0.4) 38deg,
              transparent 42deg,
              transparent 360deg
            )
          `,
        }}
      />

      {/* Floating particles — bioluminescent plankton */}
      <div className="absolute inset-0">
        {Array.from({ length: 30 }, (_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: i % 3 === 0 ? "#14b8a6" : i % 3 === 1 ? "#0ea5e9" : "#34d399",
              opacity: Math.random() * 0.6 + 0.1,
              animation: `float-${i % 5} ${6 + Math.random() * 8}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 6}s`,
              boxShadow: `0 0 ${Math.random() * 6 + 2}px currentColor`,
            }}
          />
        ))}
      </div>

      {/* Depth overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#040d0b]/60 via-transparent to-[#040d0b]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#040d0b]/40 via-transparent to-[#040d0b]/20" />
    </div>
  );
}

// ─── Hash Ticker ──────────────────────────────────────────────────────────────

const HASHES = [
  "0x4A7F…3C91 → 850 tCO₂e  VERIFIED",
  "0x9D2B…71E4 → 1,200 tCO₂e  VERIFIED",
  "0x1F6A…88D0 → 340 tCO₂e  VERIFIED",
  "0xC3E8…4B2F → 2,100 tCO₂e  VERIFIED",
];

function HashTicker() {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);
  useEffect(() => {
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => { setIdx(i => (i + 1) % HASHES.length); setFade(true); }, 400);
    }, 3000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-teal-500/20 bg-teal-500/[0.06] backdrop-blur-sm">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400" />
      </span>
      <span
        className="font-mono text-xs text-teal-300 tracking-wider"
        style={{ fontFamily: "'JetBrains Mono', monospace", opacity: fade ? 1 : 0, transition: "opacity 0.4s" }}
      >
        {HASHES[idx]}
      </span>
    </div>
  );
}

// ─── Tilt Card ────────────────────────────────────────────────────────────────

function TiltCard({ children, className = "", borderColor = "border-white/8" }: {
  children: React.ReactNode; className?: string; borderColor?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -12;
    setTilt({ x, y });
  };

  return (
    <div
      ref={ref}
      className={`relative rounded-2xl border ${borderColor} transition-all duration-300 cursor-default ${className}`}
      style={{
        transform: hovered ? `perspective(800px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) scale(1.02)` : "perspective(800px) rotateX(0) rotateY(0) scale(1)",
        transition: hovered ? "transform 0.1s ease-out, box-shadow 0.3s" : "transform 0.5s ease-out, box-shadow 0.3s",
        boxShadow: hovered ? "0 0 40px rgba(20,184,166,0.12), 0 20px 60px rgba(0,0,0,0.4)" : "0 4px 20px rgba(0,0,0,0.2)",
      }}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTilt({ x: 0, y: 0 }); }}
    >
      {/* Glow on hover */}
      {hovered && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at ${50 + tilt.x * 3}% ${50 - tilt.y * 3}%, rgba(20,184,166,0.08) 0%, transparent 70%)`,
          }}
        />
      )}
      {children}
    </div>
  );
}

// ─── Magnetic Button ──────────────────────────────────────────────────────────

function MagneticBtn({ children, className = "", href, onClick }: {
  children: React.ReactNode; className?: string; href?: string; onClick?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 14;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 14;
    setOffset({ x, y });
  };

  const content = (
    <div
      ref={ref}
      className={className}
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)`, transition: "transform 0.2s ease-out" }}
      onMouseMove={onMove}
      onMouseLeave={() => setOffset({ x: 0, y: 0 })}
      onClick={onClick}
    >
      {children}
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

// ─── Timeline Step ────────────────────────────────────────────────────────────

function TimelineStep({
  num, icon, label, sub, desc, delay, isLast
}: {
  num: string; icon: React.ReactNode; label: string; sub: string;
  desc: string; delay: number; isLast: boolean;
}) {
  const { ref, inView } = useInView(0.4);
  return (
    <div
      ref={ref}
      className={`relative flex gap-8 md:gap-12 transition-all duration-700 ease-out ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Rail */}
      <div className="flex flex-col items-center flex-shrink-0 w-12">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-500 ${inView ? "border-teal-500/50 bg-teal-500/10 text-teal-400" : "border-white/10 bg-white/5 text-gray-600"}`}
          style={{ boxShadow: inView ? "0 0 20px rgba(20,184,166,0.2)" : "none" }}
        >
          {icon}
        </div>
        {!isLast && (
          <div className="w-px flex-1 mt-3 relative overflow-hidden">
            <div className="absolute inset-0 bg-white/5" />
            <div
              className="absolute top-0 left-0 w-full bg-gradient-to-b from-teal-500 to-transparent transition-all duration-1000 ease-out"
              style={{ height: inView ? "100%" : "0%", transitionDelay: `${delay + 300}ms` }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="pb-14 flex-1">
        <div className="flex items-center gap-3 mb-1">
          <span
            className="font-mono text-[10px] tracking-[0.2em] uppercase"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: inView ? "#14b8a6" : "#6b7280" }}
          >
            {num}
          </span>
          <div className={`h-px flex-1 transition-all duration-700 ${inView ? "bg-teal-500/20" : "bg-white/5"}`} style={{ transitionDelay: `${delay + 200}ms` }} />
        </div>
        <p className="text-xs font-semibold tracking-widest uppercase text-gray-500 mb-1"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}>{sub}</p>
        <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{label}</h3>
        <p className="text-sm text-gray-400 leading-relaxed max-w-md">{desc}</p>
      </div>
    </div>
  );
}

// ─── Word Reveal ──────────────────────────────────────────────────────────────

function WordReveal({ text, className = "" }: { text: string; className?: string }) {
  const { ref, inView } = useInView(0.3);
  const words = text.split(" ");
  return (
    <p ref={ref} className={className}>
      {words.map((word, i) => (
        <span
          key={i}
          className="inline-block transition-all duration-500 ease-out"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(12px)",
            transitionDelay: `${i * 50}ms`,
          }}
        >
          {word}&nbsp;
        </span>
      ))}
    </p>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const Icon = {
  map: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>,
  satellite: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>,
  chain: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
  store: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>,
  arrow: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>,
  bolt: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  chevron: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>,
  menu: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>,
  close: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
  logo: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1M4.22 4.22l.707.707m12.728 12.728.707.707M3 12h1m16 0h1M4.22 19.78l.707-.707m12.728-12.728.707-.707" />
      <circle cx="12" cy="12" r="3.5" strokeWidth={1.5} />
    </svg>
  ),
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ val, suffix, unit, label, sub, color, delay, onStart }: {
  val: number; suffix?: string; unit: string; label: string; sub: string;
  color: string; delay: number; onStart: () => void;
}) {
  const { ref, inView } = useInView(0.3);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (inView && !started) { setStarted(true); onStart(); }
  }, [inView]);

  return (
    <div ref={ref}>
      <TiltCard
        borderColor="border-white/[0.06]"
        className={`p-7 bg-[#060f0c]/80 backdrop-blur-sm transition-all duration-700 ease-out ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        // @ts-ignore
        style={{ transitionDelay: `${delay}ms` }}
      >
        <div className={`text-4xl font-bold mb-1 tabular-nums`}
          style={{ fontFamily: "'JetBrains Mono', monospace", color }}>
          {val}{suffix}
        </div>
        <div className="text-sm font-semibold text-white/80 mb-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{unit}</div>
        <div className="text-base font-bold text-white mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{label}</div>
        <div className="w-8 h-px mb-3" style={{ background: color }} />
        <p className="text-xs text-gray-500 leading-relaxed">{sub}</p>
      </TiltCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const mouse = useMouse();

  // Counters
  const c1 = useCounter(11098, 2200);
  const c2 = useCounter(4991, 2000);
  const c3 = useCounter(4.9, 2400, 1);
  const c4 = useCounter(49.4, 2600, 1);

  useEffect(() => {
    const h = () => { setScrolled(window.scrollY > 50); setScrollY(window.scrollY); };
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const heroParallaxX = ((mouse.x / (window.innerWidth || 1)) - 0.5) * 18;
  const heroParallaxY = ((mouse.y / (window.innerHeight || 1)) - 0.5) * 10;

  return (
    <div
      className="min-h-screen bg-[#040d0b] text-white overflow-x-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif", cursor: "none" }}
    >
      <CustomCursor />
      <GridBackground />

      {/* ════════════════════════════════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════════════════════════════════ */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-[#040d0b]/80 backdrop-blur-xl border-b border-white/[0.06] py-3"
            : "py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-700 flex items-center justify-center text-white">
              <Icon.logo />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base font-bold tracking-tight text-white group-hover:text-teal-300 transition-colors"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: "0.04em" }}>
                NEVARA
              </span>
              <span className="text-[9px] text-gray-600 tracking-[0.15em] uppercase"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                BlueCarbon Ledger
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {[
              ["Home", "/"],
              ["How It Works", "/how-it-works"],
              ["Why NEVARA", "/why-nevara"],
              ["Roadmap", "/roadmap"],
              ["About", "/about"],
            ].map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className="relative text-sm font-medium text-gray-400 hover:text-white transition-colors group"
              >
                {label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-teal-400 transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-400 hover:text-white transition-colors px-3 py-1.5">
              Log in
            </Link>
            <MagneticBtn
              href="/login"
              className="px-5 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-black text-sm font-bold transition-all hover:shadow-lg hover:shadow-teal-500/25"
            >
              Get Started
            </MagneticBtn>
          </div>

          {/* Mobile */}
          <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <Icon.close /> : <Icon.menu />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden absolute top-full inset-x-0 bg-[#040d0b]/95 backdrop-blur-xl border-t border-white/[0.06] px-6 py-5 flex flex-col gap-4">
            {[["Home", "/"], ["How It Works", "/how-it-works"], ["Why NEVARA", "/why-nevara"], ["Roadmap", "/roadmap"], ["About", "/about"]].map(([l, h]) => (
              <Link key={l} href={h} className="text-sm text-gray-300 font-medium hover:text-teal-300 transition-colors" onClick={() => setMenuOpen(false)}>{l}</Link>
            ))}
            <div className="pt-2 border-t border-white/[0.06] flex gap-3">
              <Link href="/login" className="text-sm text-gray-400 py-2">Log in</Link>
              <Link href="/login" className="flex-1 py-2 text-center rounded-lg bg-teal-500 text-black text-sm font-bold" onClick={() => setMenuOpen(false)}>Get Started</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ════════════════════════════════════════════════════════════════════
          HERO — Cinematic, parallax, magnetic CTAs
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden">
        <CinematicBackground mouseX={mouse.x} mouseY={mouse.y} />

        {/* Parallax content layer */}
        <div
          className="relative z-10 max-w-5xl mx-auto px-6 flex flex-col items-center gap-7 pt-24"
          style={{
            transform: `translate(${heroParallaxX * 0.3}px, ${heroParallaxY * 0.3}px)`,
            transition: "transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          }}
        >
          <HashTicker />

          {/* Eyebrow */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-teal-500/20 bg-teal-500/[0.06]">
            <span className="text-xs font-semibold text-teal-400 uppercase tracking-[0.18em]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              India's High-Integrity Blue Carbon Registry
            </span>
          </div>

          {/* Main headline */}
          <h1
            className="text-5xl sm:text-7xl lg:text-[88px] font-black leading-[0.95] tracking-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            <span
              className="block text-white"
              style={{ transform: `translate(${heroParallaxX * -0.15}px, ${heroParallaxY * -0.1}px)`, transition: "transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)" }}
            >
              TURNING COASTAL
            </span>
            <span
              className="block"
              style={{
                background: "linear-gradient(135deg, #14b8a6, #0ea5e9, #34d399)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                transform: `translate(${heroParallaxX * 0.2}px, ${heroParallaxY * 0.15}px)`,
                transition: "transform 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              }}
            >
              ECOSYSTEMS
            </span>
            <span
              className="block text-white/90"
              style={{ transform: `translate(${heroParallaxX * -0.1}px, ${heroParallaxY * -0.05}px)`, transition: "transform 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)" }}
            >
              INTO TRUSTED
            </span>
            <span
              className="block"
              style={{
                background: "linear-gradient(135deg, #0ea5e9, #14b8a6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                transform: `translate(${heroParallaxX * 0.25}px, ${heroParallaxY * 0.2}px)`,
                transition: "transform 1.1s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              }}
            >
              CARBON ASSETS.
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className="max-w-xl text-lg text-gray-400 font-light leading-relaxed"
            style={{ transform: `translate(${heroParallaxX * 0.1}px, ${heroParallaxY * 0.08}px)`, transition: "transform 0.7s ease-out" }}
          >
            India's high-integrity registry for blue carbon — built for transparency, traceability, and real impact.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
            <MagneticBtn
              href="/login"
              className="group flex items-center gap-2.5 px-8 py-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-bold text-sm transition-all hover:shadow-2xl hover:shadow-teal-500/30 relative overflow-hidden"
            >
              <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
              Submit Your Project
              <span className="group-hover:translate-x-1 transition-transform duration-200"><Icon.arrow /></span>
            </MagneticBtn>

            <MagneticBtn
              href="/explorer"
              className="group flex items-center gap-2.5 px-8 py-4 rounded-xl border border-teal-500/30 text-teal-300 hover:bg-teal-500/10 text-sm font-semibold transition-all backdrop-blur-sm"
            >
              <Icon.bolt />
              Explore the Registry
            </MagneticBtn>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-x-7 gap-y-2 mt-1 text-xs text-gray-600 font-medium"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {[
              ["⬡", "Patent Filed — No. 202541114138"],
              ["◎", "Verra VM0033 Aligned"],
              ["◈", "CCTS 2026 Compliant"],
              ["◇", "BEE Offset Ready"],
            ].map(([icon, label]) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className="text-teal-600">{icon}</span>{label}
              </span>
            ))}
          </div>
        </div>

        {/* Disclaimer ribbon */}
        <div className="absolute bottom-20 inset-x-0 px-6 z-10">
          <p className="text-center text-[10px] text-gray-700 max-w-2xl mx-auto leading-relaxed"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            Disclaimer: Nevara operates as a technology platform and is not a government-recognized carbon registry.
            All credits are voluntary digital representations for ESG and sustainability reporting purposes only.
            They do not represent compliance-grade carbon offsets under any regulatory framework.
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-10 animate-bounce">
          <div className="w-px h-10 bg-gradient-to-b from-teal-400/0 via-teal-400/50 to-teal-400/0" />
          <Icon.chevron />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 2 — WHAT WE BUILD
          Three Pillars. Tilt cards. Staggered reveal.
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-32 px-6 bg-[#060f0c]/60 backdrop-blur-sm">
        {/* Section border accent */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-500/20 to-transparent" />

        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center mb-20">
            <span className="inline-block text-xs font-semibold tracking-[0.25em] uppercase text-teal-500 mb-4"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              WHAT WE BUILD
            </span>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-5"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Three Pillars.<br />
              <span style={{ background: "linear-gradient(135deg, #14b8a6, #0ea5e9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                One Unbreakable Chain.
              </span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto text-lg leading-relaxed font-light">
              Every blue carbon credit issued by NEVARA is anchored by three integrated systems — each solving a specific flaw that has undermined carbon market credibility for decades.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: <Icon.map />,
                tag: "BOUNDARIES VERIFIED",
                tagClr: "#14b8a6",
                border: "border-teal-500/15",
                glow: "rgba(20,184,166,0.12)",
                title: "High-Precision GIS Mapping",
                body: "Eliminate boundary fraud through sub-metre precision polygon drawing. Every project is geofenced using absolute coastal data.",
                delay: 0,
              },
              {
                icon: <Icon.satellite />,
                tag: "CONTINUOUS TRUTH",
                tagClr: "#0ea5e9",
                border: "border-blue-500/15",
                glow: "rgba(14,165,233,0.12)",
                title: "MRV (Monitoring, Reporting, Verification)",
                body: "Process multi-spectral satellite imagery and LiDAR to calculate biomass density and soil carbon in real time.",
                delay: 120,
              },
              {
                icon: <Icon.chain />,
                tag: "SHA-256 VERIFIED",
                tagClr: "#34d399",
                border: "border-emerald-500/15",
                glow: "rgba(52,211,153,0.12)",
                title: "Immutable Blockchain Registry",
                body: "Verified data is minted onto a SHA-256 ledger. Trace every credit back to its specific coastal hectare source.",
                delay: 240,
              },
            ].map(({ icon, tag, tagClr, border, glow, title, body, delay }, i) => (
              <Reveal key={i} delay={delay}>
                <TiltCard borderColor={border} className="h-full bg-[#040d0b]/80 backdrop-blur-sm p-8">
                  <div className="flex flex-col h-full">
                    {/* Icon */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 flex-shrink-0"
                      style={{ background: `${glow.replace("0.12", "0.15")}`, border: `1px solid ${tagClr}30`, color: tagClr, boxShadow: `0 0 20px ${glow}` }}
                    >
                      {icon}
                    </div>

                    {/* Tag */}
                    <span
                      className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3"
                      style={{ fontFamily: "'JetBrains Mono', monospace", color: tagClr }}
                    >
                      {tag}
                    </span>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-white mb-3 leading-snug"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {title}
                    </h3>

                    {/* Divider */}
                    <div className="w-8 h-px mb-4" style={{ background: tagClr + "60" }} />

                    {/* Body */}
                    <p className="text-gray-400 text-sm leading-relaxed flex-1">{body}</p>

                    {/* Bottom accent */}
                    <div className="mt-6 flex items-center gap-2 text-xs font-medium" style={{ color: tagClr + "99", fontFamily: "'JetBrains Mono', monospace" }}>
                      <span>→</span>
                      <span>Learn more</span>
                    </div>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 3 — CREDIT LIFECYCLE (Vertical Timeline)
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-32 px-6">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-20">
            <span className="inline-block text-xs font-semibold tracking-[0.25em] uppercase text-teal-500 mb-4"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              THE NEVARA CREDIT LIFECYCLE
            </span>
            <h2 className="text-4xl sm:text-5xl font-black text-white"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              From coastline to credit —<br />transparently tracked at every step.
            </h2>
          </Reveal>

          <div className="max-w-2xl mx-auto">
            <TimelineStep
              num="01" delay={0}
              icon={<Icon.map />}
              label="GIS Polygon"
              sub="Contributor Draws Boundary"
              desc="Contributors use NEVARA's precision mapping interface to draw GPS-locked polygon boundaries around their coastal land. The GIS engine validates regulatory surplus, boundary integrity, and legal carbon rights before proceeding."
              isLast={false}
            />
            <TimelineStep
              num="02" delay={100}
              icon={<Icon.satellite />}
              label="MRV Engine"
              sub="Canopy + Carbon Score"
              desc="Multi-spectral satellite imagery (Sentinel-2), SAR radar, and climate data are processed to compute real-time biomass density, NDVI scores, and carbon stock estimates — replacing infrequent manual audits with continuous digital truth."
              isLast={false}
            />
            <TimelineStep
              num="03" delay={200}
              icon={<Icon.chain />}
              label="SHA-256 Block"
              sub="Immutable Record Minted"
              desc="Verified carbon data is minted as an immutable block on NEVARA's SHA-256 + Merkle tree ledger. Each block is cryptographically linked to the previous — making retroactive tampering computationally impossible."
              isLast={false}
            />
            <TimelineStep
              num="04" delay={300}
              icon={<Icon.store />}
              label="CCC Issued"
              sub="Available to Corporates"
              desc="Carbon Credit Certificates are listed on the NEVARA marketplace. CCTS-obligated industries and voluntary ESG buyers access fully traceable credits — each QR-linked to the originating blockchain block and project coordinates."
              isLast={true}
            />
          </div>

          {/* Bottom note */}
          <Reveal className="text-center mt-10">
            <p className="text-xs text-gray-600" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              From mapped coastal land to verified carbon credits — transparently tracked at every step.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 4 — NATIONAL PROOF / STATS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-32 px-6 bg-[#060f0c]/60 backdrop-blur-sm">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-500/20 to-transparent" />

        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center mb-20">
            <span className="inline-block text-xs font-semibold tracking-[0.25em] uppercase text-teal-500 mb-4"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              THE OPPORTUNITY
            </span>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-5"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Scaling India's<br />
              <span style={{ background: "linear-gradient(135deg, #14b8a6, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Blue Carbon Economy.
              </span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto text-base leading-relaxed">
              The numbers are not projections. They are assessments from India's Forest Survey, BEE carbon market data, and UNFCCC blue carbon methodology research.
            </p>
          </Reveal>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
            <StatCard
              val={c1.value} suffix="" unit="km" label="Re-Assessed Indian Coastline"
              sub="47% more blue asset potential than prior estimates"
              color="#14b8a6" delay={0} onStart={c1.start}
            />
            <StatCard
              val={c2.value} suffix="" unit="sq km" label="Active Mangrove Area"
              sub="India's primary sequestration ecosystem"
              color="#0ea5e9" delay={100} onStart={c2.start}
            />
            <StatCard
              val={c3.value} suffix="M" unit="Tons" label="Annual CO₂e Storage Potential"
              sub="tCO₂e per year from Indian mangroves"
              color="#34d399" delay={200} onStart={c3.start}
            />
            <StatCard
              val={c4.value} suffix="Bn" unit="$" label="Domestic Market Value by 2030"
              sub="Projected CCTS + voluntary market combined"
              color="#f59e0b" delay={300} onStart={c4.start}
            />
          </div>

          <Reveal className="text-center">
            <MagneticBtn
              href="/roadmap"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-teal-500/30 text-teal-300 hover:bg-teal-500/10 text-sm font-semibold transition-all"
            >
              View National Roadmap
              <Icon.arrow />
            </MagneticBtn>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 5 — MISSION / CLOSING
          Word reveal + glow quote + magnetic CTAs
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-32 px-6 overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full opacity-20"
            style={{ background: "radial-gradient(ellipse, rgba(20,184,166,0.3) 0%, rgba(14,165,233,0.15) 40%, transparent 70%)" }}
          />
        </div>

        <div className="relative max-w-3xl mx-auto text-center">
          <Reveal>
            <span className="inline-block text-xs font-semibold tracking-[0.25em] uppercase text-teal-500 mb-8"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              THE MISSION
            </span>
          </Reveal>

          <WordReveal
            text="We're building a system where protecting nature actually pays — for the people who protect it."
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight mb-14"
          />

          {/* Light sweep quote border */}
          <div className="relative inline-block mb-14 w-full">
            <div className="absolute inset-0 rounded-2xl border border-teal-500/10" />
            <div
              className="absolute inset-0 rounded-2xl opacity-20"
              style={{ background: "linear-gradient(90deg, transparent 0%, rgba(20,184,166,0.15) 50%, transparent 100%)", animation: "lightSweep 4s ease-in-out infinite" }}
            />
          </div>

          <Reveal delay={200}>
            <div className="flex flex-wrap justify-center gap-4 mt-10">
              <MagneticBtn
                href="/login"
                className="group flex items-center gap-2.5 px-8 py-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-bold text-sm transition-all hover:shadow-2xl hover:shadow-teal-500/30"
              >
                Submit Your Project
                <span className="group-hover:translate-x-1 transition-transform"><Icon.arrow /></span>
              </MagneticBtn>

              <MagneticBtn
                href="/explorer"
                className="group flex items-center gap-2.5 px-8 py-4 rounded-xl border border-teal-500/30 text-teal-300 hover:bg-teal-500/10 text-sm font-semibold transition-all"
              >
                <Icon.bolt />
                Explore the Blockchain
              </MagneticBtn>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════════ */}
      <footer className="relative z-10 border-t border-white/[0.05] py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-400 to-teal-700 flex items-center justify-center text-white">
              <Icon.logo />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold text-white" style={{ letterSpacing: "0.04em" }}>NEVARA</span>
              <span className="text-[9px] text-gray-600 tracking-[0.12em]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>BLUECARBON LEDGER</span>
            </div>
          </div>

          {/* Nav */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            {[["Home", "/"], ["How It Works", "/how-it-works"], ["Why NEVARA", "/why-nevara"], ["Roadmap", "/roadmap"], ["About", "/about"]].map(([l, h]) => (
              <Link key={l} href={h} className="hover:text-teal-400 transition-colors">{l}</Link>
            ))}
          </div>

          {/* Copyright */}
          <div className="text-center md:text-right">
            <p className="text-xs text-gray-600">© 2026 NEVARA. All rights reserved.</p>
            <p className="text-xs text-gray-700 mt-0.5">Built for India's coastline. Made for the planet.</p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="max-w-4xl mx-auto mt-8 pt-6 border-t border-white/[0.04]">
          <p className="text-center text-[10px] text-gray-700 leading-relaxed"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            Disclaimer: Nevara operates as a technology platform and is not a government-recognized carbon registry.
            All credits are voluntary digital representations for ESG and sustainability reporting purposes only.
            They do not represent compliance-grade carbon offsets under any regulatory framework.
          </p>
        </div>
      </footer>

      {/* ─── Global Keyframe Styles ─── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap');

        @keyframes shimmer {
          0% { background-position: 0 0; }
          100% { background-position: 200px 200px; }
        }

        @keyframes lightSweep {
          0% { opacity: 0; transform: translateX(-100%); }
          50% { opacity: 0.3; }
          100% { opacity: 0; transform: translateX(100%); }
        }

        @keyframes float-0 {
          0%, 100% { transform: translateY(0) translateX(0); }
          33% { transform: translateY(-15px) translateX(8px); }
          66% { transform: translateY(8px) translateX(-5px); }
        }
        @keyframes float-1 {
          0%, 100% { transform: translateY(0) translateX(0); }
          40% { transform: translateY(-20px) translateX(-10px); }
          70% { transform: translateY(10px) translateX(6px); }
        }
        @keyframes float-2 {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(12px) translateX(10px); }
          75% { transform: translateY(-18px) translateX(-8px); }
        }
        @keyframes float-3 {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-10px) translateX(15px); }
        }
        @keyframes float-4 {
          0%, 100% { transform: translateY(0) translateX(0); }
          33% { transform: translateY(18px) translateX(-12px); }
          66% { transform: translateY(-8px) translateX(10px); }
        }

        * { cursor: none !important; }
        html { scroll-behavior: smooth; }
        ::selection { background: rgba(20,184,166,0.3); color: white; }
      `}</style>
    </div>
  );
}