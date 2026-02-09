'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo, Suspense } from 'react';

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('ref');
  const [showTick, setShowTick] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // 1. Wrap in setTimeout(..., 0) to make it asynchronous
    // This satisfies the "no synchronous setState" linter rule
    const mountTimer = setTimeout(() => {
      setIsMounted(true);
    }, 0);

    // 2. Trigger Tick Animation
    const tickTimer = setTimeout(() => {
      setShowTick(true);
    }, 200);

    return () => {
      clearTimeout(mountTimer);
      clearTimeout(tickTimer);
    };
  }, []);

  // 3. Generate confetti only when isMounted is true
  const confettiPieces = useMemo(() => {
    if (!isMounted) return [];

    const confettiColors = ['#f97316', '#10b981', '#0ea5e9', '#f59e0b', '#22c55e', '#eab308', '#3b82f6', '#ef4444', '#14b8a6'];
    return Array.from({ length: 80 }, (_, index) => {
      const isLeft = index % 2 === 0;
      const spreadSeed = Math.sin(index * 19.3) * 0.5 + 0.5;
      const delaySeed = Math.sin(index * 7.1) * 0.5 + 0.5;
      const durationSeed = Math.sin(index * 11.7) * 0.5 + 0.5;
      const sizeSeed = Math.sin(index * 5.9) * 0.5 + 0.5;
      const heightSeed = Math.sin(index * 9.4) * 0.5 + 0.5;
      const spread = spreadSeed * 12;
      const left = isLeft ? `${2 + spread}%` : `${86 + spread}%`;
      const delay = `${delaySeed * 0.6}s`;
      const duration = `${2.2 + durationSeed * 0.8}s`;
      const size = 6 + Math.round(sizeSeed * 6);
      const height = 10 + Math.round(heightSeed * 8);
      const color = confettiColors[index % confettiColors.length];
      return { left, delay, duration, size, height, color, drift: isLeft ? 1 : -1 };
    });
  }, [isMounted]);

  return (
    <div className="min-h-screen bg-[#F9F6F0] dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors duration-500">
      <main className="relative max-w-3xl mx-auto px-6 py-20 text-center">
        {/* Confetti Layer */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden confetti-layer" aria-hidden="true">
          {confettiPieces.map((piece, index) => (
            <span
              key={index}
              className="confetti-piece"
              data-drift={piece.drift}
              style={{
                left: piece.left,
                width: `${piece.size}px`,
                height: `${piece.height}px`,
                backgroundColor: piece.color,
                animation: `confetti-fall-${piece.drift > 0 ? 'left' : 'right'} ${piece.duration} ease-in ${piece.delay} 1 forwards`,
                transformOrigin: 'center',
              }}
            />
          ))}
        </div>

        {/* Animated Checkmark */}
        <div className="mx-auto mb-10 h-36 w-36 rounded-full bg-emerald-500/15 flex items-center justify-center">
          <div className={`relative h-28 w-28 rounded-full bg-emerald-500 flex items-center justify-center transition-transform duration-700 ${showTick ? 'scale-100' : 'scale-0'}`}>
            <svg
              className={`h-14 w-14 text-white transition-all duration-700 ${showTick ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-serif mb-4">Order confirmed.</h1>
        <p className="text-stone-600 dark:text-stone-400 mb-6">
          Your hardwoods are queued for milling. We will email you once the slabs are staged for pickup.
        </p>

        {/* Log Cutting Video */}
        <div className="mx-auto mb-8 w-full max-w-lg">
          <div className="relative w-full overflow-hidden rounded-2xl shadow-xl">
            <video
              className="w-full h-auto object-cover"
              autoPlay
              loop
              muted
              playsInline
              src="/log-cutting.mp4" 
            />
          </div>
        </div>

        {reference && (
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-10">
            Order reference: <span className="font-semibold text-stone-900 dark:text-white">{reference}</span>
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-stone-900 text-white dark:bg-white dark:text-stone-900 px-6 py-3 font-medium hover:bg-black dark:hover:bg-stone-200 transition-colors"
          >
            Back to home
          </Link>
          <Link
            href="/cart"
            className="inline-flex items-center justify-center rounded-lg border border-stone-300 dark:border-stone-700 px-6 py-3 font-medium text-stone-700 dark:text-stone-200 hover:border-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors"
          >
            View cart
          </Link>
        </div>
      </main>
      <style jsx>{`
        .confetti-layer { z-index: 10; }
        .confetti-piece {
          position: absolute; top: -30px; display: block; opacity: 0; border-radius: 4px;
          transform: translateY(0) rotate(0deg);
        }
        @keyframes confetti-fall-left {
          0% { opacity: 0; transform: translate3d(0, -10px, 0) rotate(0deg); }
          10% { opacity: 1; }
          100% { opacity: 0; transform: translate3d(120px, 540px, 0) rotate(280deg); }
        }
        @keyframes confetti-fall-right {
          0% { opacity: 0; transform: translate3d(0, -10px, 0) rotate(0deg); }
          10% { opacity: 1; }
          100% { opacity: 0; transform: translate3d(-120px, 540px, 0) rotate(280deg); }
        }
      `}</style>
    </div>
  );
}

// 2. Suspense Wrapper for Page
export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F9F6F0] dark:bg-stone-950">
        <div className="animate-pulse text-stone-500">Loading...</div>
      </div>
    }>
      <OrderConfirmationContent />
    </Suspense>
  );
}