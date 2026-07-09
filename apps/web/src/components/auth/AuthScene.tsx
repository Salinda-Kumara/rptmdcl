'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

/** Animated "plexus" constellation — drifting particles joined by faint lines. */
function ConstellationCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = 0, h = 0;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * DPR; canvas.height = h * DPR;
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();

    const N = Math.min(90, Math.floor((window.innerWidth * window.innerHeight) / 22000));
    const pts = Array.from({ length: N }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
    }));
    const LINK = 130;

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -20) p.x = w + 20; else if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20; else if (p.y > h + 20) p.y = -20;
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.hypot(dx, dy);
          if (d < LINK) {
            ctx.strokeStyle = `rgba(167, 110, 255, ${0.18 * (1 - d / LINK)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      }
      for (const p of pts) {
        ctx.fillStyle = 'rgba(190, 150, 255, 0.55)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0" aria-hidden />;
}

interface Props {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

/**
 * Shared login scene, modelled on the SAB results portal: an always-dark purple
 * backdrop (gradient + glow orbs + constellation) with a centered card that
 * follows the light/dark theme.
 */
export function AuthScene({ title, subtitle, children }: Props) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const dark = mounted ? resolvedTheme === 'dark' : false;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
      {/* texture + vignette + glow orbs */}
      <ConstellationCanvas />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-[500px] w-[500px] animate-pulse rounded-full bg-purple-500/15 blur-[100px] [animation-duration:6s]" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] animate-pulse rounded-full bg-indigo-500/15 blur-[100px] [animation-duration:8s]" />
      </div>

      {/* Theme toggle — top-right */}
      {mounted && (
        <button
          type="button"
          onClick={() => setTheme(dark ? 'light' : 'dark')}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="fixed right-5 top-5 z-20 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/10 shadow-lg backdrop-blur transition-colors hover:bg-white/20"
        >
          {dark ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-slate-200" />}
        </button>
      )}

      <div className="relative z-10 mx-4 w-full max-w-md">
        <div className="relative">
          {/* gradient halo behind the card */}
          <div aria-hidden className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500 opacity-30 blur-lg" />

          <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-gray-50 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            {/* header */}
            <div className="relative px-8 pb-4 pt-8 text-center">
              <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-purple-100/50 to-transparent dark:from-purple-950/30" />
              <div className="relative mb-4 flex justify-center">
                <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-md">
                  <Image
                    src="/sab-logo.jpg"
                    alt="SAB Campus — CA Sri Lanka"
                    width={56}
                    height={56}
                    priority
                    className="h-14 w-14 object-contain"
                  />
                </div>
              </div>
              <h1 className="relative mb-1 text-xl font-bold text-gray-800 dark:text-white">{title}</h1>
              <p className="relative text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
            </div>

            {/* form body */}
            <div className="px-8 pb-6 pt-2">{children}</div>

            {/* footer strip */}
            <div className="border-t border-gray-200 bg-gray-100 px-8 py-3 dark:border-gray-800 dark:bg-gray-900/80">
              <p className="text-center text-[11px] font-medium text-gray-400 dark:text-gray-500">
                © 2026 SAB Campus of CA Sri Lanka
              </p>
              <p className="mt-1 text-center text-[10px] text-gray-400 dark:text-gray-600">Dev@Salinda</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Input group with a leading icon segment (and optional trailing adornment). */
export function AuthField({
  icon,
  trailing,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ReactNode; trailing?: React.ReactNode }) {
  return (
    <div className="group relative">
      <div className="absolute bottom-0 left-0 top-0 flex w-12 items-center justify-center rounded-l-xl bg-gray-200 text-gray-400 transition-all dark:bg-gray-800 dark:text-gray-500">
        {icon}
      </div>
      <input
        {...input}
        className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-14 pr-10 text-sm text-gray-800 placeholder-gray-400 outline-none transition-colors focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
      />
      {trailing && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">{trailing}</span>
      )}
    </div>
  );
}

/** Gradient button with a shine sweep on hover. */
export function AuthButton({ children, ...btn }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...btn}
      className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-900/30 transition-all hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50"
    >
      <span
        aria-hidden
        className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-white/0 via-white/25 to-white/0 transition-transform duration-700 group-hover:translate-x-[100%]"
      />
      <span className="relative z-10">{children}</span>
    </button>
  );
}

export const authError =
  'rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300';
