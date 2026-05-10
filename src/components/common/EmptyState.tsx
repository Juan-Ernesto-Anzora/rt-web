export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-sm">
      <div className="font-semibold text-neutral-900">{title}</div>
      <div className="mt-1 text-neutral-600">{body}</div>
    </div>
  );
}
