import { SessionListView } from "@/components/SessionListView";
import { listSummaries } from "@/lib/transcripts/aggregate";
import { claudeRoot } from "@/lib/transcripts/config";

export const dynamic = "force-dynamic";

export default function Home() {
  const root = claudeRoot();
  return <SessionListView root={root} sessions={listSummaries(root)} />;
}
