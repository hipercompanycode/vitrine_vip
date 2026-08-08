type Ad = { id: string; is_available: boolean; bumped_at: string | null };

export default function AdActions({ ad }: { ad: Ad }) {
  return (
    <div className="space-y-3 border-t pt-4">
      <form action="/api/ads/bump" method="post">
        <button className="w-full border rounded p-2">⬆ Subir pro topo</button>
      </form>
      <form action="/api/ads/availability" method="post" className="flex items-center gap-2">
        <input type="hidden" name="is_available" value={(!ad.is_available).toString()} />
        <button className={`w-full rounded p-2 ${ad.is_available ? "bg-green-600 text-white" : "border"}`}>
          {ad.is_available ? "✅ Disponível agora (clique p/ desligar)" : "Marcar como disponível agora"}
        </button>
      </form>
    </div>
  );
}
