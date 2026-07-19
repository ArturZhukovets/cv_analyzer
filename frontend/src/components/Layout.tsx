import { NavLink, Outlet } from "react-router";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${
    isActive ? "text-ink" : "text-ink-muted hover:text-ink"
  }`;

export default function Layout() {
  return (
    <>
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-3xl items-baseline gap-8 px-4 py-4">
          <NavLink to="/" className="font-display text-lg font-semibold tracking-tight">
            Career<span className="text-accent">·</span>Intel
          </NavLink>
          <nav className="flex gap-5 text-sm">
            <NavLink to="/" end className={navLinkClass}>
              Analyze
            </NavLink>
            <NavLink to="/history" className={navLinkClass}>
              History
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Outlet />
      </main>
    </>
  );
}
