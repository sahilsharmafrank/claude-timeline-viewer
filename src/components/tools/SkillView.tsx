export function SkillView({ skill, args }: { skill: string; args?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-800 dark:bg-purple-900 dark:text-purple-100">
        {skill}
      </span>
      {args && <span className="font-mono">{args}</span>}
    </div>
  );
}
