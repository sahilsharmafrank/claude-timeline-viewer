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
      <div>
        {filePath}
        {replaceAll && (
          <span className="ml-2 rounded bg-neutral-200 px-1 text-xs dark:bg-neutral-700">replace_all</span>
        )}
      </div>
      <div className="overflow-auto">
        {lines(oldString).map((l, i) => (
          <div key={`o${i}`} className="whitespace-pre text-red-600 dark:text-red-400">{`- ${l}`}</div>
        ))}
        {lines(newString).map((l, i) => (
          <div key={`n${i}`} className="whitespace-pre text-green-700 dark:text-green-400">{`+ ${l}`}</div>
        ))}
      </div>
    </div>
  );
}
