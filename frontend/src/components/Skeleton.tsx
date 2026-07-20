export default function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`motion-safe:animate-pulse rounded bg-line ${className}`} />;
}
