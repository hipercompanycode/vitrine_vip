import Stripe from "stripe";

// Server-only. Secret key nunca vai ao client.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
