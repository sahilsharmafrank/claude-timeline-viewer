"use client";

import { useSyncExternalStore } from "react";

const subscribeNoop = () => () => {};

// Server and first client render show the ISO string; after hydration the
// viewer's local date/time replaces it, so there is no hydration mismatch.
export function LocalTime({ iso }: { iso: string | null }) {
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  if (!iso) return <>—</>;
  const d = new Date(iso);
  const text = mounted
    ? `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : iso;
  return <time dateTime={iso}>{text}</time>;
}
