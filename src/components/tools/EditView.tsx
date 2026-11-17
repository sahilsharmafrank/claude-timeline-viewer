export function EditView({
  filePath,
  oldString,
  newString,
  replaceAll,
}: {
  filePath: string;
  oldString: string;
  newString: string;
  replaceAll: boolean;
}) {
  const lines = (s: string) => (s === "" ? [] : s.split("\n"));
  return (
    <div className="space-y-1 font-mono text-sm">
      <div className="text-muted">
        {filePath}
        {replaceAll && (
          <span className="ml-2 rounded bg-code px-1 text-xs text-faint">replace_all</span>
        )}
      </div>
      <div className="overflow-auto rounded-md bg-code p-2">
        {lines(oldString).map((l, i) => (
          <div key={`o${i}`} className="whitespace-pre text-danger">{`- ${l}`}</div>
        ))}
        {lines(newString).map((l, i) => (
          <div key={`n${i}`} className="whitespace-pre text-add">{`+ ${l}`}</div>
        ))}
      </div>
    </div>
  );
}
