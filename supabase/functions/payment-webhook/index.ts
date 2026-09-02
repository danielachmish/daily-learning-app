// DISABLED — this app fully migrated from Stripe to Nedarim Plus (see
// nedarim-callback, its equivalent for the new provider). Left in place
// only as an inert stub rather than deleted outright, since `supabase
// functions delete` is a destructive remote action gated behind explicit
// approval. This never touches Stripe or the database now.
Deno.serve(() => new Response('Gone — this app no longer uses Stripe.', { status: 410 }));
