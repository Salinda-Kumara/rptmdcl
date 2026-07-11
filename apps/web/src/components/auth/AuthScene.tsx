'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { Sun, Moon, AlertCircle } from 'lucide-react';

/**
 * Animated particle background — drifting, edge-bouncing particles of varied
 * size joined by faint lines. Colors follow the theme (read per-frame from the
 * root `dark` class, exactly like the reference implementation).
 */
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; opacity: number }> = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      particles = [];
      const count = Math.floor((canvas.width * canvas.height) / 8000);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.5 + 0.2,
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const isDarkMode = document.documentElement.classList.contains('dark');

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = isDarkMode
          ? `rgba(52, 211, 153, ${p.opacity})`
          : `rgba(16, 185, 129, ${p.opacity * 0.6})`;
        ctx.fill();

        particles.slice(i + 1).forEach((other) => {
          const dx = p.x - other.x;
          const dy = p.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = isDarkMode
              ? `rgba(52, 211, 153, ${0.15 * (1 - distance / 120)})`
              : `rgba(16, 185, 129, ${0.1 * (1 - distance / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      raf = requestAnimationFrame(animate);
    };

    const onResize = () => { resizeCanvas(); createParticles(); };
    resizeCanvas();
    createParticles();
    animate();
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 z-[1]" aria-hidden />;
}

// Graduation-convocation photos for the animated background collage.
const COLLAGE_IMAGES = [
  '/convo (1).jpg', '/convo (2).jpg', '/convo (3).jpg',
  '/convo (4).jpg', '/convo (5).jpg', '/convo (6).jpg',
];

/** Slowly sliding, seamlessly-looping grid of convocation photos. */
function PhotoCollage() {
  const grid = (keyPrefix: string) => (
    <div className="grid h-[150%] w-[150%] flex-shrink-0 -translate-y-[10%] grid-cols-3 gap-2 p-2">
      {[...COLLAGE_IMAGES, ...COLLAGE_IMAGES, ...COLLAGE_IMAGES].map((img, idx) => (
        <div
          key={`${keyPrefix}-${idx}`}
          className={`relative overflow-hidden rounded-2xl ${idx % 3 === 0 ? 'row-span-2' : ''}`}
          style={{ transform: `rotate(${idx % 2 === 0 ? 2 : -2}deg)` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt="" className="h-full w-full scale-105 object-cover opacity-60" />
        </div>
      ))}
    </div>
  );
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div className="animate-auth-slide-slow absolute inset-0 flex">
        {grid('a')}
        {grid('b')}
      </div>
    </div>
  );
}

interface Props {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

/** Shared login scene — SAB results-portal design. */
export function AuthScene({ title, subtitle, children }: Props) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const dark = mounted ? resolvedTheme === 'dark' : false;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
      {/* Animated convocation-photo collage (backmost layer) */}
      <PhotoCollage />

      {/* Theme toggle */}
      {mounted && (
        <button
          type="button"
          onClick={() => setTheme(dark ? 'light' : 'dark')}
          aria-label="Toggle theme"
          className="absolute right-4 top-4 z-30 rounded-xl border border-white/20 bg-white/10 p-3 shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-white/20"
        >
          {dark ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-white" />}
        </button>
      )}

      {/* Dark overlay + vignette */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-emerald-950/70 to-slate-900/80" />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)]" />

      {/* Particles */}
      <ParticleCanvas />

      {/* Glow orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
        <div className="animate-auth-pulse-slow absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-emerald-500/20 blur-[100px]" />
        <div className="animate-auth-pulse-slow absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-teal-500/20 blur-[100px]" style={{ animationDelay: '2s' }} />
      </div>

      {/* Login card */}
      <div className="relative z-10 mx-4 w-full max-w-md">
        <div className="relative">
          {/* glow behind card */}
          <div aria-hidden className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 opacity-30 blur-lg" />

          <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-gray-50 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            {/* Header */}
            <div className="relative px-8 pb-4 pt-8 text-center">
              <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-emerald-100/50 to-transparent dark:from-emerald-950/30" />
              <div className="relative mb-4 flex justify-center">
                <Image
                  src="/sab-logo-white.png"
                  alt="SAB Campus - The Institute of Chartered Accountants of Sri Lanka"
                  width={200}
                  height={64}
                  priority
                  style={{ width: 'auto', height: 'auto' }}
                  className="max-h-16 rounded-lg object-contain shadow-md"
                />
              </div>
              <h1 className="relative mb-1 text-xl font-bold text-gray-800 dark:text-white">{title}</h1>
              <p className="relative text-sm font-medium text-gray-500 dark:text-gray-400">{subtitle}</p>
            </div>

            {/* Form */}
            <div className="px-8 pb-6 pt-2">{children}</div>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-gray-100 px-8 py-3 dark:border-gray-800 dark:bg-gray-900/80">
              <p className="text-center text-[11px] font-medium text-gray-400 dark:text-gray-500">
                © {new Date().getFullYear()} SAB Campus of CA Sri Lanka
              </p>
              <p className="mt-1 text-center text-[10px]">
                <a
                  href="https://www.linkedin.com/in/salinda-wickramasinghe"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 transition-colors hover:text-emerald-500 dark:text-gray-600 dark:hover:text-emerald-400"
                >
                  Dev@Salinda
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Error banner with icon + shake animation. */
export function AuthError({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-auth-shake mb-1 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800/50 dark:bg-red-950/50">
      <AlertCircle className="shrink-0 text-red-500 dark:text-red-400" size={18} />
      <span className="text-sm text-red-600 dark:text-red-300">{children}</span>
    </div>
  );
}

/** Input group — the leading icon segment lights up green while focused. */
export function AuthField({
  icon,
  trailing,
  onFocus,
  onBlur,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ReactNode; trailing?: React.ReactNode }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="group relative">
      <div
        className={`absolute bottom-0 left-0 top-0 flex w-12 items-center justify-center rounded-l-xl transition-all duration-300 ${
          focused ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
        }`}
      >
        {icon}
      </div>
      <input
        {...input}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        className="w-full rounded-xl border-2 border-gray-200 bg-white py-3.5 pl-14 pr-12 text-gray-900 placeholder-gray-400 transition-all duration-300 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800/50 dark:text-white dark:placeholder-gray-500 dark:focus:bg-gray-800"
      />
      {trailing && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">{trailing}</span>
      )}
    </div>
  );
}

/** Gradient submit button — shine sweep, hover lift, spinner while loading. */
export function AuthButton({
  loading,
  loadingLabel = 'Signing in...',
  children,
  ...btn
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; loadingLabel?: string }) {
  return (
    <button
      {...btn}
      disabled={btn.disabled || loading}
      className="group relative mt-1 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 px-6 py-4 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:scale-[1.01] hover:from-emerald-500 hover:via-green-500 hover:to-teal-500 hover:shadow-emerald-500/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        aria-hidden
        className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-white/0 via-white/25 to-white/0 transition-transform duration-700 group-hover:translate-x-[100%]"
      />
      {loading ? (
        <>
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>{loadingLabel}</span>
        </>
      ) : (
        <span className="relative z-10">{children}</span>
      )}
    </button>
  );
}
