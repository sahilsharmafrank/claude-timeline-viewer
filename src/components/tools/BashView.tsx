export function BashView({ command, description }: { command: string; description?: string }) {
  return (
    <div className="space-y-1">
      <div className="whitespace-pre-wrap font-mono text-sm text-fg">{`$ ${command}`}</div>
      {description && <div className="text-xs text-muted">{description}</div>}
    </div>
  );
}
