import { Collapsible } from "../Collapsible";

export function GenericToolView({ input }: { input: Record<string, unknown> }) {
  return (
    <Collapsible label="Input">
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-mono text-xs">
        {JSON.stringify(input, null, 2)}
      </pre>
    </Collapsible>
  );
}
