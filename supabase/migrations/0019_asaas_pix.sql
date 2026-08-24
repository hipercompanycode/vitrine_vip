-- Pagamento via Asaas (Pix, renovação manual mensal). Substitui o fluxo Stripe.
-- Guardamos o cliente Asaas, a cobrança pendente e a última cobrança JÁ PAGA (idempotência).
alter table public.subscriptions
  add column if not exists asaas_customer_id text,
  add column if not exists asaas_payment_id text,        -- cobrança Pix pendente atual
  add column if not exists asaas_paid_payment_id text;   -- última cobrança creditada (evita crédito duplo)
