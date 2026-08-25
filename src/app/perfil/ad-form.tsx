import StateCityPicker from "@/components/StateCityPicker";
import PriceTable from "@/components/PriceTable";
import PhoneInput from "@/components/PhoneInput";
import CharTextarea from "@/components/CharTextarea";
import ReferralInput from "@/components/ReferralInput";
import { inputCls, labelCls } from "@/components/ui";
import { ATTRIBUTE_GROUPS } from "@/lib/attributes";

type Contact = { whatsapp: boolean; call: boolean; telegram: boolean };

type PriceRow = { label: string; price_cents: number };
type City = { id: number; name: string; uf: string };
type Ad = {
  title: string;
  description: string;
  headline?: string | null;
  price_cents: number;
  city_id: number | null;
  age?: number | null;
  attributes?: string[] | null;
  price_table?: PriceRow[] | null;
} | null;

const FORM_ID = "wizard-form";

/** Passo 1 — dados básicos. Sem botão: o "Próximo" do wizard submete (form={FORM_ID}). */
export function AdBasicsForm({ ad, defaultCity, defaultWhatsapp, defaultContact, next }: { ad: Ad; defaultCity?: City | null; defaultWhatsapp?: string; defaultContact?: Contact; next: string }) {
  const contact = defaultContact ?? { whatsapp: true, call: false, telegram: false };
  const CH = [
    { name: "contact_whatsapp", label: "WhatsApp", on: contact.whatsapp },
    { name: "contact_call", label: "Ligação", on: contact.call },
    { name: "contact_telegram", label: "Telegram", on: contact.telegram },
  ];
  return (
    <form id={FORM_ID} action="/api/ads" method="post" className="space-y-5">
      <input type="hidden" name="next" value={next} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_6.5rem]">
        <label className="block">
          <span className={labelCls}>Nome</span>
          <input name="title" defaultValue={ad?.title ?? ""} placeholder="Como você quer aparecer" className={inputCls} required />
        </label>
        <label className="block">
          <span className={labelCls}>Idade</span>
          <input name="age" type="number" min={18} max={99} defaultValue={ad?.age ?? ""} placeholder="25" className={inputCls} />
        </label>
      </div>

      <label className="block">
        <span className={labelCls}>Telefone / contato</span>
        <PhoneInput name="whatsapp" defaultValue={defaultWhatsapp ?? ""} className={inputCls} />
        <span className="mt-1 block text-[11px] text-muted">Só o DDD + número. O código do país (+55) é adicionado automaticamente no contato.</span>
      </label>

      <div className="block">
        <span className={labelCls}>Este número atende por</span>
        <div className="flex flex-wrap gap-2">
          {CH.map((c) => (
            <label key={c.name} className="cursor-pointer">
              <input type="checkbox" name={c.name} value="1" defaultChecked={c.on} className="peer sr-only" />
              <span className="inline-flex items-center rounded-pill border border-line bg-surface-2 px-3.5 py-2 text-[13px] font-medium text-muted transition-all hover:border-accent/50 hover:text-ink peer-checked:border-accent peer-checked:bg-accent peer-checked:text-white peer-checked:shadow-pop">
                {c.label}
              </span>
            </label>
          ))}
        </div>
        <span className="mt-1 block text-[11px] text-muted">Define quais botões de contato aparecem no anúncio.</span>
      </div>

      <div className="block">
        <span className={labelCls}>Estado e cidade <span className="text-accent">*</span></span>
        <StateCityPicker defaultCity={defaultCity ?? null} />
      </div>

      <label className="block">
        <span className={labelCls}>Chamada do card</span>
        <CharTextarea name="headline" defaultValue={ad?.headline ?? ""} maxLength={120} placeholder="Frase curta que aparece no card" className={inputCls} />
        <span className="mt-0.5 block text-[11px] text-muted">É o texto curto que aparece no card da listagem.</span>
      </label>

      <label className="block">
        <span className={labelCls}>Descrição completa</span>
        <textarea name="description" defaultValue={ad?.description ?? ""} placeholder="Texto completo — aparece na página do anúncio." className={`${inputCls} resize-none`} rows={5} />
      </label>

      {!ad && <ReferralInput inputClassName={inputCls} />}
    </form>
  );
}

/** Passo 2 — tabela de preços. */
export function AdPricesForm({ ad, next }: { ad: Ad; next: string }) {
  return (
    <form id={FORM_ID} action="/api/ads" method="post" className="space-y-4">
      <input type="hidden" name="has_prices" value="1" />
      <input type="hidden" name="next" value={next} />
      <p className="text-xs text-muted">Adicione serviços e valores (ex.: 1 hora, pernoite, diária). O menor valor vira “a partir de” no card.</p>
      <PriceTable initial={ad?.price_table ?? undefined} />
    </form>
  );
}

/** Passo 4 — características (atributos, viram filtros). */
export function AdAttributesForm({ ad, next }: { ad: Ad; next: string }) {
  const selected = new Set(ad?.attributes ?? []);
  const byTitle = new Map<string, typeof ATTRIBUTE_GROUPS>();
  for (const g of ATTRIBUTE_GROUPS) {
    const a = byTitle.get(g.title) ?? [];
    a.push(g);
    byTitle.set(g.title, a);
  }

  return (
    <form id={FORM_ID} action="/api/ads" method="post" className="space-y-7">
      <input type="hidden" name="has_attrs" value="1" />
      <input type="hidden" name="next" value={next} />

      {[...byTitle.entries()].map(([title, groups]) => (
        <div key={title}>
          <div className="mb-3 flex items-center gap-2 border-b border-line/60 pb-2">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <h3 className="font-display text-sm font-bold text-ink">{title}</h3>
          </div>
          <div className="space-y-3">
            {groups.map((g, gi) => (
              <div key={gi}>
                {g.label && <span className="mb-1.5 block text-xs font-medium text-muted">{g.label}</span>}
                <div className="flex flex-wrap gap-2">
                  {g.items.map((it) => (
                    <label key={it.slug} className="cursor-pointer">
                      <input type="checkbox" name="attr" value={it.slug} defaultChecked={selected.has(it.slug)} className="peer sr-only" />
                      <span className="inline-flex items-center rounded-pill border border-line bg-surface-2 px-3.5 py-2 text-[13px] font-medium text-muted transition-all hover:border-accent/50 hover:text-ink peer-checked:border-accent peer-checked:bg-accent peer-checked:text-white peer-checked:shadow-pop peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                        {it.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </form>
  );
}
