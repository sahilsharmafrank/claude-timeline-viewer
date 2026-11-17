import { Collapsible } from "../Collapsible";

export function WriteView({ filePath, content }: { filePath: string; content: string }) {
  return (
    <div className="space-y-1">
      <div className="font-mono text-sm text-muted">{filePath}</div>
      <Collapsible label="Content">
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-code p-2 font-mono text-xs text-fg">{content}</pre>
      </Collapsible>
    </div>
  );
}
