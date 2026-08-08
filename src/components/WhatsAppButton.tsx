export default function WhatsAppButton({ phone, adTitle }: { phone: string; adTitle: string }) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const text = encodeURIComponent(`Olá! Vi seu anúncio "${adTitle}" e tenho interesse.`);
  const href = `https://wa.me/${digits}?text=${text}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-block bg-green-600 text-white rounded px-3 py-1 text-sm">
      WhatsApp
    </a>
  );
}
