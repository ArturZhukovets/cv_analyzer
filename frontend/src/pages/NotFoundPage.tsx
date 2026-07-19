import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <section>
      <h1 className="font-display text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-ink-muted">
        This page doesn&apos;t exist.{" "}
        <Link to="/" className="text-accent hover:underline">
          Start a new analysis
        </Link>
        .
      </p>
    </section>
  );
}
