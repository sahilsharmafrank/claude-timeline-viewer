export function ReadView({ filePath, offset, limit }: { filePath: string; offset?: number; limit?: number }) {
  return (
    <div className="font-mono text-sm">
      <span>{filePath}</span>
      {offset !== undefined && <span className="ml-2 text-neutral-500">offset {offset}</span>}
      {limit !== undefined && <span className="ml-2 text-neutral-500">limit {limit}</span>}
    </div>
  );
}
