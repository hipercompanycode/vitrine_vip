-- Canais de contato do anúncio (antes eram atributos ligacao/whatsapp/telegram).
alter table public.ads
  add column if not exists contact_whatsapp boolean not null default true,
  add column if not exists contact_call boolean not null default false,
  add column if not exists contact_telegram boolean not null default false;
