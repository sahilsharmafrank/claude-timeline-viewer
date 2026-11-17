"use client";

import Link from "next/link";
import type { SessionDetail } from "@/lib/transcripts/types";
import { HeaderStrip } from "./HeaderStrip";
import { RefreshButton } from "./RefreshButton";
import { Timeline } from "./Timeline";

export function SessionDetailView({ detail }: { detail: SessionDetail }) {
  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-7">
      <div className="mb-5 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg"
        >
          <span aria-hidden>←</span> All sessions
        </Link>
        <RefreshButton />
      </div>
      <div className="space-y-6">
        <HeaderStrip summary={detail.summary} />
        <Timeline events={detail.events} subagents={detail.subagents} />
      </div>
    </main>
  );
}
