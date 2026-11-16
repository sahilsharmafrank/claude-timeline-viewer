import { notFound } from "next/navigation";
import { SessionDetailView } from "@/components/SessionDetailView";
import { claudeRoot } from "@/lib/transcripts/config";
import { findSession } from "@/lib/transcripts/reader";
import type { SessionDetail } from "@/lib/transcripts/types";
import { buildDetail } from "@/lib/transcripts/timeline";

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sf = findSession(claudeRoot(), id);
  if (!sf) notFound();
  let detail: SessionDetail;
  try {
    detail = buildDetail(sf);
  } catch (err) {
    if ((err as NodeJS.ErrnoException | null)?.code === "ENOENT") notFound();
    throw err;
  }
  return <SessionDetailView detail={detail} />;
}
