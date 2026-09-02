// DISABLED — this app fully migrated from Stripe to Nedarim Plus (see
// create-nedarim-payment). This function is no longer called by any client
// code, but was still live and deployed with a real Stripe secret attached
// — a security review flagged it as an unnecessary, unmaintained attack
// surface (any signed-up user could have invoked it directly to open a
// real Stripe checkout session). Left in place only as an inert stub
// rather than deleted outright, since `supabase functions delete` is a
// destructive remote action gated behind explicit approval.
Deno.serve(() => new Response('Gone — this app no longer uses Stripe.', { status: 410 }));
