// Placeholder de mídia com identidade: gradiente determinístico + monograma.
// Usado enquanto fotos/vídeos (Plano 2) não existem — parece intencional, não "faltando".

const GRADIENTS = [
  ["#FF2E88", "#FF7AB8"], // rosa forte
  ["#7C2BFF", "#B57BFF"], // violeta
  ["#2CA6A4", "#59E0D0"], // teal
  ["#FF5D8F", "#FFA36C"], // rosa → coral
  ["#2D7FFF", "#7FB2FF"], // azul
  ["#E0538A", "#FF9EC4"], // rosa suave
  ["#00B894", "#55EFC4"], // verde menta
  ["#F5A623", "#FFD86B"], // âmbar
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
