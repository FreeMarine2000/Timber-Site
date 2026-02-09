'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function OrderConfirmationPage() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('ref');
  const [showTick, setShowTick] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowTick(true), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#F9F6F0] dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors duration-500">
      <main className="max-w-3xl mx-auto px-6 py-20 text-center">
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
    </div>
  );
}
