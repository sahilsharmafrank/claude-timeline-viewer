"use client";

import Link from "next/link";
import type { SessionDetail } from "@/lib/transcripts/types";
import { HeaderStrip } from "./HeaderStrip";
import { RefreshButton } from "./RefreshButton";
import { Timeline } from "./Timeline";

export function SessionDetailView({ detail }: { detail: SessionDetail }) {
  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm hover:underline">← All sessions</Link>
        <RefreshButton />
      </div>
      <HeaderStrip summary={detail.summary} />
      <Timeline events={detail.events} subagents={detail.subagents} />
    </main>
  );
}
