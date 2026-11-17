export function GrepView({ pattern, path, glob }: { pattern: string; path?: string; glob?: string }) {
  return (
    <div className="font-mono text-sm text-fg">
      <span>{pattern}</span>
      {path !== undefined && <span className="ml-2 text-faint">in {path}</span>}
      {glob !== undefined && <span className="ml-2 text-faint">glob {glob}</span>}
    </div>
  );
}
