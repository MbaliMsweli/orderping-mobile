'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// ── Initialise ────────────────────────────────────────────────────────────────

if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host:          process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
    capture_pageview:  false, // we capture manually below for Next.js router
    capture_pageleave: true,
    loaded: (ph) => {
      if (process.env.NODE_ENV !== 'production') ph.opt_out_capturing();
    },
  });
}

// ── PageView tracker (fires on every client-side navigation) ──────────────────

function PageViewTracker() {
  const pathname      = usePathname();
  const searchParams  = useSearchParams();
  const ph            = usePostHog();

  useEffect(() => {
    if (pathname) {
      const url = window.origin + pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
      ph.capture('$pageview', { $current_url: url });
    }
  }, [pathname, searchParams, ph]);

  return null;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <PageViewTracker />
      {children}
    </PHProvider>
  );
}

// ── Typed event helpers ───────────────────────────────────────────────────────

export function captureEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window !== 'undefined') {
    posthog.capture(event, properties);
  }
}

export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (typeof window !== 'undefined') {
    posthog.identify(userId, traits);
  }
}

export function resetUser() {
  if (typeof window !== 'undefined') {
    posthog.reset();
  }
}
