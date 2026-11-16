export function GrepView({ pattern, path, glob }: { pattern: string; path?: string; glob?: string }) {
  return (
    <div className="font-mono text-sm">
      <span>{pattern}</span>
      {path !== undefined && <span className="ml-2 text-neutral-500">in {path}</span>}
      {glob !== undefined && <span className="ml-2 text-neutral-500">glob {glob}</span>}
    </div>
  );
}
