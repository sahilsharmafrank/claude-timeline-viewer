"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="space-y-2 p-6">
      <p>Something went wrong while loading this page.</p>
      <button type="button" onClick={reset} className="rounded border px-2 py-1 text-sm">
        Try again
      </button>
    </div>
  );
}
