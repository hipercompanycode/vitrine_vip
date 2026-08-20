"use client";

// Link de contato que registra o clique antes de abrir (WhatsApp/Telegram/ligação).
export default function TrackedContactLink({
  adId, href, className, children, target, rel,
}: {
  adId: string;
  href: string;
  className?: string;
  children: React.ReactNode;
  target?: string;
  rel?: string;
}) {
  function onClick() {
    try {
      const url = "/api/ads/contact";
      const body = JSON.stringify({ ad_id: adId });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      } else {
        fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
      }
    } catch {}
  }
  return (
    <a href={href} target={target} rel={rel} onClick={onClick} className={className}>
      {children}
    </a>
  );
}
