export function ReadView({ filePath, offset, limit }: { filePath: string; offset?: number; limit?: number }) {
  return (
    <div className="font-mono text-sm text-muted">
      <span>{filePath}</span>
      {offset !== undefined && <span className="ml-2 text-faint">offset {offset}</span>}
      {limit !== undefined && <span className="ml-2 text-faint">limit {limit}</span>}
    </div>
  );
}
