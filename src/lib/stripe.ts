import Stripe from "stripe";

// LEGADO: o fluxo de pagamento é via Asaas Pix (ver lib/asaas.ts). As rotas Stripe
// ficam dormentes e nunca são chamadas. Usamos um placeholder quando STRIPE_SECRET_KEY
// não está setado para não quebrar o build (o construtor exige uma string não-vazia).
// Server-only: a secret key nunca vai ao client.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_placeholder_unused");
