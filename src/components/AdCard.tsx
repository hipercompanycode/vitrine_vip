import { formatBRL, timeAgo } from "@/lib/format";
import WhatsAppButton from "./WhatsAppButton";

export type AdCardData = {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  is_available: boolean;
  created_at: string;
  city: { name: string; uf: string } | null;
  whatsapp: string;
};

export default function AdCard({ ad, now }: { ad: AdCardData; now: Date }) {
  return (
    <div className="rounded-xl border shadow-sm overflow-hidden bg-white">
      <div className="aspect-video bg-gray-100 flex items-center justify-center text-gray-400">
        sem foto
      </div>
      <div className="p-3 space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold truncate">{ad.title}</h3>
          {ad.is_available && (
            <span className="text-xs bg-green-100 text-green-700 rounded px-2 py-0.5">Disponível</span>
          )}
        </div>
        <p className="text-sm text-gray-600 line-clamp-2">{ad.description}</p>
        <div className="flex items-center justify-between pt-1">
          <span className="font-bold">{formatBRL(ad.price_cents)}</span>
          <span className="text-xs text-gray-400">{timeAgo(new Date(ad.created_at), now)}</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-gray-500">{ad.city ? `${ad.city.name}-${ad.city.uf}` : ""}</span>
          <WhatsAppButton phone={ad.whatsapp} adTitle={ad.title} />
        </div>
      </div>
    </div>
  );
}
