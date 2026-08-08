// Pílula "Disponível agora" com ponto verde pulsante.
// Verde distinto do WhatsApp: aqui é indicador de status "online".
export default function AvailableBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface/85 px-2.5 py-1 text-[11px] font-semibold text-ink shadow-sm backdrop-blur">
      <span className="dot-live h-2 w-2 rounded-full bg-available" />
      Disponível agora
    </span>
  );
}
