"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { BuddyCheckinPopup } from "./buddy-checkin-popup";
import { getBuddyCheckinProfile } from "@/app/actions/buddy-checkin";

// Pages where the popup must not appear (unauthenticated / pre-auth flows)
const EXCLUDED_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
];

function isExcluded(path: string): boolean {
  return EXCLUDED_PREFIXES.some(
    (p) => path === p || path.startsWith(p + "/")
  );
}

/**
 * Mounts BuddyCheckinPopup once at the app shell level so the active-time
 * timer accumulates across all authenticated pages, not just the dashboard.
 *
 * - Skips excluded (auth / onboarding) routes entirely.
 * - Fetches the user's buddy_checkin_enabled + thesis_deadline once on the
 *   first authenticated render; subsequent navigations keep the popup mounted.
 * - If enabled is false the popup renders but runs no timer (handled inside
 *   BuddyCheckinPopup itself).
 */
export function BuddyCheckinShell() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<{
    enabled: boolean;
    isDeadlineDay: boolean;
  } | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Don't fetch on auth/onboarding pages; retry on next navigation to an
    // authenticated page if the user arrived here via an excluded route first.
    if (fetchedRef.current) return;
    if (isExcluded(pathname)) return;

    fetchedRef.current = true;
    getBuddyCheckinProfile().then((data) => {
      if (data) setProfile(data);
    });
  }, [pathname]); // pathname dep allows the first fetch to happen after login redirect

  // Keep the popup mounted across navigations once loaded; hide on excluded routes
  if (!profile || isExcluded(pathname)) return null;

  return (
    <BuddyCheckinPopup
      enabled={profile.enabled}
      isDeadlineDay={profile.isDeadlineDay}
    />
  );
}
