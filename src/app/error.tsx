"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-7">
      <div className="space-y-3 rounded-lg border border-line bg-panel px-5 py-6">
        <p className="text-sm text-fg">Something went wrong while loading this page.</p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center rounded-md border border-line bg-panel px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-line2 hover:text-fg"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
