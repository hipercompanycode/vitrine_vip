export default function WhatsAppButton({ phone, adTitle }: { phone: string; adTitle: string }) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  const text = encodeURIComponent(`Olá! Vi seu anúncio "${adTitle}" e tenho interesse.`);
  const href = `https://wa.me/${digits}?text=${text}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-pill bg-wa px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-wa-strong active:scale-95"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.5 14.4c-.3-.15-1.7-.83-2-.93-.26-.1-.45-.15-.65.14-.19.29-.74.93-.9 1.12-.17.19-.33.21-.62.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.29-.02-.45.13-.6.13-.13.29-.33.44-.5.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.08-.15-.65-1.57-.9-2.15-.24-.56-.48-.48-.65-.49h-.56c-.19 0-.5.07-.77.36s-1.01.99-1.01 2.41 1.04 2.8 1.18 2.99c.15.19 2.05 3.13 4.96 4.39.69.3 1.23.48 1.65.61.69.22 1.32.19 1.82.12.56-.08 1.7-.7 1.95-1.37.24-.67.24-1.25.17-1.37-.07-.12-.26-.19-.56-.34z" />
        <path d="M12 2a10 10 0 0 0-8.6 15.06L2 22l5.05-1.32A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3 .78.8-2.92-.2-.31A8.2 8.2 0 1 1 12 20.2z" />
      </svg>
      WhatsApp
    </a>
  );
}
