# Manual of the Self

Your birth chart read as a manual of the self, plus a dated forecast of the "sky weather" moving through it.

- **Free:** how-to-read guide, big three, interactive chart wheel, the manual (every planet), inner aspects, today's sky weather, your Maya day. Calculated in the visitor's browser.
- **Paid ($9 one time, per chart):** weather calendar and chapters ahead for 3, 6 or 9 months. Calculated on the server and only returned with an unlock token.
- The sample chart's full forecast is open as a demo.

## How payments work
Stripe Checkout (cards, wallets) plus an optional PayPal button, no database. Each Checkout Session stores a `chart_hash` (an HMAC of the birth chart, never the birth data). After payment `/api/claim` verifies the session with Stripe and returns an unlock token kept in the buyer's browser. `/api/restore` finds earlier purchases by checkout email + birth details for a new device.

## Render settings
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Environment:
  - `STRIPE_SECRET_KEY` — `sk_test_...` while testing, `sk_live_...` for real sales. Without it the site runs with purchases off.
  - `UNLOCK_SECRET` — optional random string for signing unlock tokens. If set, never change it (existing tokens would stop working; buyers can still restore).
  - `PRICE_CENTS` — optional, default `900`.
  - `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` — optional, from a PayPal REST app (developer.paypal.com → Apps & Credentials). With both set, a PayPal button shows next to card checkout.
  - `PAYPAL_ENV` — `sandbox` (default) while testing, `live` for real payments. Use the matching app's ID and secret.

## PayPal
PayPal buyers pay in PayPal's own window. The server creates the order (price set on the server), captures it, checks it was for this chart, then records it in Stripe as a customer (email + `chart_hash`, `source: paypal`), so Restore works for PayPal buyers too. PayPal money lands in the PayPal account, not in Stripe payouts. Stripe promo codes only apply to card checkout.

## Project layout
- `shared/engine.js` chart maths (browser + server) · `shared/forecast.js` transit calendar (server only) · `shared/interp.js` interpretations · `shared/maya.js` Maya day count and its copy (`npm test` checks it against known dates) · `shared/cities.js` places
- `src/template.html`, `src/app.js` the page · `build.js` assembles `public/index.html`
- `server.js` Express server and API
