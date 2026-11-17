export function SkillView({ skill, args }: { skill: string; args?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="rounded-full border border-signal/40 bg-signalsoft px-1.5 py-0.5 font-mono text-xs text-signal">
        {skill}
      </span>
      {args && <span className="font-mono text-muted">{args}</span>}
    </div>
  );
}
