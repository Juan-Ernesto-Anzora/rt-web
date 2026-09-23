export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`h-3 rounded-small bg-surface-hover ${className}`} />;
}
