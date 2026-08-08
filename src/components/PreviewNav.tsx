import Link from "next/link";

// Barra de navegação só das telas de preview (dados fictícios).
export default function PreviewNav({ active }: { active: "home" | "painel" | "login" }) {
  const items = [
    { key: "home", href: "/preview", label: "Home" },
    { key: "painel", href: "/preview/painel", label: "Painel" },
    { key: "login", href: "/login", label: "Login" },
  ] as const;

  return (
    <div className="w-full border-b border-line bg-accent-soft">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-xs">
        <span className="font-semibold text-accent">● Preview · dados fictícios</span>
        <nav className="ml-auto flex items-center gap-1">
          {items.map((it) => (
            <Link
              key={it.key}
              href={it.href}
              className={`rounded-pill px-3 py-1 font-medium transition-colors ${
                active === it.key ? "bg-accent text-white" : "text-muted hover:text-ink"
              }`}
            >
              {it.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
