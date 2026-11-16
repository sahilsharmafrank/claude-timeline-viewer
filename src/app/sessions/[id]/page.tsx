import { notFound } from "next/navigation";
import { SessionDetailView } from "@/components/SessionDetailView";
import { claudeRoot } from "@/lib/transcripts/config";
import { findSession } from "@/lib/transcripts/reader";
import { buildDetail } from "@/lib/transcripts/timeline";

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sf = findSession(claudeRoot(), id);
  if (!sf) notFound();
  return <SessionDetailView detail={buildDetail(sf)} />;
}
