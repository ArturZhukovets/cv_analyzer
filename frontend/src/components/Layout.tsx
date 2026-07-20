import { Link, Outlet } from "react-router";

export default function Layout() {
  return (
    <>
      <header className="border-b border-line bg-white">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <Link
            to="/"
            className="rounded-sm font-display text-lg font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            Career<span className="text-accent">·</span>Intel
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        <Outlet />
      </main>
    </>
  );
}
