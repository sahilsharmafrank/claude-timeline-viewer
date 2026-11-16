import { Collapsible } from "../Collapsible";

export function WriteView({ filePath, content }: { filePath: string; content: string }) {
  return (
    <div className="space-y-1">
      <div className="font-mono text-sm">{filePath}</div>
      <Collapsible label="Content">
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-mono text-xs">{content}</pre>
      </Collapsible>
    </div>
  );
}
