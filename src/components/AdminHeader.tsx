import Link from "next/link";

export default function AdminHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="inline-flex items-baseline gap-1">
          <span className="font-display text-xl font-extrabold tracking-tight text-ink">vitrine</span>
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span className="ml-1 rounded-pill bg-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">admin</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link href="/" className="rounded-pill px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-accent-soft hover:text-accent">Ver site</Link>
          <form action="/logout" method="post">
            <button className="rounded-pill px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-accent-soft hover:text-accent">Sair</button>
          </form>
        </nav>
      </div>
    </header>
  );
}
