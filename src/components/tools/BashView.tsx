export function BashView({ command, description }: { command: string; description?: string }) {
  return (
    <div className="space-y-1">
      <div className="whitespace-pre-wrap font-mono text-sm">{`$ ${command}`}</div>
      {description && <div className="text-xs text-neutral-500">{description}</div>}
    </div>
  );
}
