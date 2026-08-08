// Placeholder de mídia com identidade: gradiente determinístico + monograma.
// Usado enquanto fotos/vídeos (Plano 2) não existem — parece intencional, não "faltando".

const GRADIENTS = [
  ["#FB5533", "#FF9E3D"], // coral → âmbar
  ["#2CA6A4", "#7BD6C6"], // teal
  ["#7C5CFC", "#B79BFF"], // violeta suave
  ["#F0705A", "#F7B267"], // terracota
  ["#2D9CDB", "#7FD1FF"], // azul
  ["#E0538A", "#FF9EC4"], // rosa
  ["#3FA34D", "#9BE08A"], // verde folha
  ["#E6A400", "#FFD86B"], // mostarda
];

function pick(seed: string): [string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length] as [string, string];
}

export default function CardMediaPlaceholder({
  title,
  className = "",
}: {
  title: string;
  className?: string;
}) {
  const [a, b] = pick(title);
  const letter = (title.trim()[0] ?? "S").toUpperCase();

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
      aria-hidden="true"
    >
      {/* padrão de pontos sutil */}
      <div
        className="absolute inset-0 opacity-20 mix-blend-overlay"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,.9) 1px, transparent 1.4px)",
          backgroundSize: "16px 16px",
        }}
      />
      {/* brilho superior */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
      <span className="font-display text-6xl font-black text-white/85 drop-shadow-sm sm:text-7xl">
        {letter}
      </span>
    </div>
  );
}
