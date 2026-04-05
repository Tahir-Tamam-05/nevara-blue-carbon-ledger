import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { ThemeToggle } from "@/components/ThemeToggle";

// ── Shared Hooks ─────────────────────────────────────────────────────────────

export function useInView(threshold = 0.2) {
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

export function useCounter(target: number, duration = 2000) {
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

// ── Shared UI Components ──────────────────────────────────────────────────────

export function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
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

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-xs uppercase tracking-[0.2em] text-teal-500">
      {children}
    </p>
  );
}

export function ParticleField() {
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
  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full pointer-events-none" />;
}

// ── Layout Components ────────────────────────────────────────────────────────

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "Why NEVARA", href: "/why-nevara" },
    { label: "Roadmap", href: "/roadmap" },
    { label: "About", href: "/about" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "border-b border-gray-100 dark:border-teal-900/40 bg-white/90 dark:bg-[#040D0B]/90 backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center">
            <img src="/nivara-ring-logo.png" alt="NEVARA Icon" className="h-full w-full object-contain" />
          </div>
          <span className="font-bold text-lg text-gray-900 dark:text-white tracking-wide">NEVARA</span>
        </Link>
        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-gray-400 hover:text-teal-400 transition-colors">
              {link.label}
            </Link>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-4">
          <ThemeToggle />
          <Link href="/login" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Log in</Link>
          <Link href="/login" className="rounded-full bg-teal-500 px-5 py-2 text-sm font-semibold text-white md:text-black hover:bg-teal-600 dark:hover:bg-teal-400 transition-colors">
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
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="text-sm text-gray-400 hover:text-teal-400">
              {link.label}
            </Link>
          ))}
          <hr className="border-gray-200 dark:border-teal-900/30" />
          <div className="flex justify-between items-center w-full">
             <ThemeToggle />
             <Link href="/login" onClick={() => setOpen(false)} className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Log in</Link>
          </div>
          <Link href="/login" onClick={() => setOpen(false)} className="rounded-full bg-teal-500 px-5 py-2.5 text-sm font-semibold text-white dark:text-black text-center hover:bg-teal-600 dark:hover:bg-teal-400 transition-colors">
            Get Started
          </Link>
        </div>
      )}
    </nav>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-100 dark:border-teal-900/20 bg-gray-50 dark:bg-[#040D0B] py-12 transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col items-center md:items-start gap-1">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 flex items-center justify-center">
              <img src="/nivara-ring-logo.png" alt="NEVARA Icon" className="h-full w-full object-contain" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white tracking-wide">NEVARA</span>
          </div>
          <span className="text-gray-500 dark:text-gray-600 text-[10px] uppercase tracking-widest pl-8">BlueCarbon Ledger</span>
        </div>

        <div className="flex gap-6 flex-wrap justify-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-teal-400 transition-colors">Home</Link>
          <Link href="/how-it-works" className="text-sm text-gray-500 hover:text-teal-400 transition-colors">How It Works</Link>
          <Link href="/why-nevara" className="text-sm text-gray-500 hover:text-teal-400 transition-colors">Why NEVARA</Link>
          <Link href="/roadmap" className="text-sm text-gray-500 hover:text-teal-400 transition-colors">Roadmap</Link>
          <Link href="/about" className="text-sm text-gray-500 hover:text-teal-400 transition-colors">About</Link>
        </div>

        <div className="flex flex-col items-center md:items-end gap-1 text-center md:text-right">
          <p className="text-xs text-gray-600">© 2026 NEVARA. All rights reserved.</p>
          <p className="text-xs text-gray-600 font-medium">Built for India's coastline. Made for the planet.</p>
        </div>
      </div>
    </footer>
  );
}

export function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-[#040D0B] text-gray-900 dark:text-white transition-colors duration-300" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&family=JetBrains+Mono:wght@400&display=swap');
        .font-syne { font-family: 'Syne', sans-serif; }
        .font-mono-jet { font-family: 'JetBrains Mono', monospace; }
      `}</style>
      <Nav />
      <main>
        {children}
      </main>
      <Footer />
    </div>
  );
}
