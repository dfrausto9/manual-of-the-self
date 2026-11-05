/*
 * Manual of the Self — web server
 *
 * Free: the page itself (birth chart, manual, today's sky) is calculated in the visitor's browser.
 * Paid: the weather calendar is calculated here and only returned with a valid unlock token.
 *
 * Payments: Stripe Checkout or PayPal, one-time. Stripe is the record of purchases, so no database is needed:
 *   - each Checkout Session carries a chart_hash (an HMAC of the birth chart, not the birth data itself)
 *   - after payment, /api/claim checks the session with Stripe and issues an unlock token
 *   - PayPal orders carry the same chart_hash as custom_id; /api/paypal/capture checks the order with PayPal,
 *     records the purchase in Stripe as a customer (email + chart_hash) and issues the unlock token
 *   - /api/restore finds earlier purchases (Stripe sessions or PayPal records) by email + chart
 *
 * Environment (Render > Environment):
 *   STRIPE_SECRET_KEY   sk_test_... while testing, sk_live_... to take real payments
 *   UNLOCK_SECRET       optional; random string used to sign unlock tokens (falls back to one derived from the Stripe key)
 *   PRICE_CENTS         optional; default 900 ($9.00)
 *   SALE_PRICE_CENTS    optional sale price (default 499 = $4.99); set to 0 to turn the sale off
 *   SALE_STARTS / SALE_ENDS  optional ISO times for the sale window (default: now until Dec 1 2026 00:00 Pacific)
 *   SALE_NAME           optional label shown on the site (default "Black Friday special")
 *   SUPPORT_EMAIL       optional; shown to buyers (default tarotrightnow@gmail.com)
 *   PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET  optional; from a PayPal REST app. Both set = PayPal button shown
 *   PAYPAL_ENV          "sandbox" (default) while testing, "live" for real payments
 *   PORT                set by Render
 */
const path = require("path");
const crypto = require("crypto");
const express = require("express");

global.Astronomy = require("astronomy-engine");
const ENGINE = require("./shared/engine.js");
const forecast = require("./shared/forecast.js")(ENGINE, global.Astronomy);
const DEPTH = require("./shared/depth.js");   // paid reading depth (server only)

const STRIPE_KEY = (process.env.STRIPE_SECRET_KEY || "").trim();
const stripe = STRIPE_KEY ? require("stripe")(STRIPE_KEY) : null;
const SECRET = (process.env.UNLOCK_SECRET || "").trim() ||
  (STRIPE_KEY ? crypto.createHash("sha256").update("manual-of-the-self:" + STRIPE_KEY).digest("hex") : "dev-only-secret");
const PRICE_CENTS = parseInt(process.env.PRICE_CENTS || "900", 10);
// Time-boxed sale: the price drops between SALE_STARTS and SALE_ENDS and goes back by itself afterwards
const SALE = {
  cents: parseInt(process.env.SALE_PRICE_CENTS ?? "499", 10),
  starts: Date.parse(process.env.SALE_STARTS || "2026-11-01T00:00:00Z"),
  ends: Date.parse(process.env.SALE_ENDS || "2026-12-01T08:00:00Z"),   // midnight Pacific, after Cyber Monday (Nov 30)
  name: (process.env.SALE_NAME || "Black Friday special").trim(),
};
const saleOn = (now = Date.now()) => SALE.cents > 0 && SALE.cents < PRICE_CENTS && now >= SALE.starts && now < SALE.ends;
const priceNow = () => (saleOn() ? SALE.cents : PRICE_CENTS);
const SUPPORT_EMAIL = (process.env.SUPPORT_EMAIL || "tarotrightnow@gmail.com").trim();
const TEST_MODE = STRIPE_KEY.startsWith("sk_test_");
const PAYPAL = {
  id: (process.env.PAYPAL_CLIENT_ID || "").trim(),
  secret: (process.env.PAYPAL_CLIENT_SECRET || "").trim(),
  live: (process.env.PAYPAL_ENV || "").trim().toLowerCase() === "live",
};
PAYPAL.on = !!(stripe && PAYPAL.id && PAYPAL.secret);   // Stripe keeps the purchase record, so PayPal needs it too
PAYPAL.api = PAYPAL.live ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

// Google Ads conversion tracking (optional): set GOOGLE_ADS_ID=AW-123456789 and GOOGLE_ADS_LABEL=abcDEF on Render.
// Purchases are reported to Ads only when both are set; nothing about the buyer's chart is sent.
const ADS = { id: (process.env.GOOGLE_ADS_ID || "").trim(), label: (process.env.GOOGLE_ADS_LABEL || "").trim() };
ADS.on = /^AW-\d{6,15}$/.test(ADS.id) && /^[A-Za-z0-9_-]{4,64}$/.test(ADS.label);
const SITE_URL = (process.env.SITE_URL || "https://manualoftheself.com").replace(/\/+$/, "");
const PRODUCT = "full-forecast-v1";
const PRODUCT_NAME = "Manual of the Self: Full Forecast";
// Sample chart shown to new visitors (Chicago, 15 Jun 1995 09:20) — its full forecast is an open demo
const SAMPLE_KEY = ENGINE.chartKey({ date: "1995-06-15", time: "09:20", noTime: false, lat: 41.8781, lon: -87.6298, tz: "America/Chicago" });

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "4kb" }));

// ---------------- helpers ----------------
const hmac = s => crypto.createHmac("sha256", SECRET).update(s).digest("base64url");
const tokenFor = key => hmac("unlock:" + key);
const chartHash = key => hmac("chart:" + key).slice(0, 32);
const safeEqual = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

function validTz(tz) { try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; } }

// Validate and normalise birth input; returns { inp } or { error }
function readBirth(b) {
  if (!b || typeof b !== "object") return { error: "Missing birth details." };
  const date = String(b.date || ""), time = String(b.time || ""), noTime = !!b.noTime;
  const lat = Number(b.lat), lon = Number(b.lon), tz = String(b.tz || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Invalid date." };
  const year = +date.slice(0, 4); if (year < 1900 || year > 2100) return { error: "Birth year must be between 1900 and 2100." };
  if (!noTime && !/^\d{2}:\d{2}$/.test(time)) return { error: "Invalid time." };
  if (!(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180)) return { error: "Invalid place." };
  if (!validTz(tz)) return { error: "Invalid time zone." };
  return { inp: { date, time: noTime ? "12:00" : time, noTime, lat, lon, tz } };
}
function chartFrom(inp) {
  const [y, m, d] = inp.date.split("-").map(Number), [hh, mm] = inp.time.split(":").map(Number);
  return ENGINE.chart(ENGINE.zonedToUtc(y, m, d, hh, mm, inp.tz), inp.lat, inp.lon, !inp.noTime);
}
function forecastFor(c, months) {
  const start = new Date(); start.setUTCHours(0, 0, 0, 0);
  const cal = forecast.transitCalendar(c, start, months);
  for (const e of cal.events) e.depth = DEPTH.depthFor(e, c, DEPTH.phaseOf(e, start));
  return { start, end: cal.end, events: cal.events, sky: forecast.skyEvents(c, start, cal.end) };
}
// Extra notes for today's transits: full for buyers, a teaser line for everyone else
function nowNotes(c, full) {
  const out = {}, now = new Date();
  for (const t of ENGINE.currentTransits(c, now).slice(0, 6)) {
    const ph = DEPTH.phaseOf(t, now);
    const n = full ? DEPTH.depthFor(t, c, ph) : DEPTH.teaserFor(t, c, ph);
    if (n) out[DEPTH.idOf(t)] = n;
  }
  return out;
}
const origin = req => `${req.headers["x-forwarded-proto"] || req.protocol}://${req.get("host")}`;

// Very small per-IP rate limit (calculations are cheap, but keep bots polite)
const limiters = [];
function limit(max) {
  const hits = new Map(); limiters.push(hits);          // one counter per endpoint
  return (req, res, next) => {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.ip, now = Date.now();
    const h = (hits.get(ip) || []).filter(t => now - t < 60000); h.push(now); hits.set(ip, h);
    if (h.length > max) return res.status(429).json({ error: "Too many requests. Please wait a minute." });
    next();
  };
}
setInterval(() => { const now = Date.now(); for (const hits of limiters) for (const [k, v] of hits) if (!v.some(t => now - t < 60000)) hits.delete(k); }, 300000).unref();

// ---------------- API ----------------
app.get("/api/config", (req, res) => {
  res.json({ payments: !!stripe, testMode: TEST_MODE, price: priceNow(), regularPrice: PRICE_CENTS, currency: "usd", support: SUPPORT_EMAIL,
             paypal: PAYPAL.on ? { clientId: PAYPAL.id, sandbox: !PAYPAL.live } : null,
             sale: saleOn() ? { name: SALE.name, endsAt: new Date(SALE.ends).toISOString() } : null,
             ads: ADS.on ? { id: ADS.id, label: ADS.label } : null });
});

// Free teaser: how much is in the forecast, without dates or details
app.post("/api/teaser", limit(40), (req, res) => {
  const { inp, error } = readBirth(req.body?.birth); if (error) return res.status(400).json({ error });
  const c = chartFrom(inp), f = forecastFor(c, 9);
  const slow = ["pluto", "neptune", "uranus", "saturn", "jupiter"];
  const big = f.events.filter(e => slow.includes(e.transit));
  const W = { pluto: 5, neptune: 4, uranus: 4, saturn: 3, jupiter: 2 };
  const weight = e => W[e.transit] * (e.endI - e.startI + 1);   // significance x how long it lasts in the window
  const headline = big.slice().sort((a, b) => weight(b) - weight(a))[0];
  res.json({
    chapters: f.events.length, bigShifts: big.length,
    peaks: f.events.reduce((n, e) => n + e.exacts.length, 0),
    eclipses: f.sky.filter(s => s.kind === "eclipse").length,
    headline: headline ? { transit: headline.transit, key: headline.key, natal: headline.natal } : null,
    now: nowNotes(c, false),
  });
});

// Start a Stripe Checkout for one chart
app.post("/api/checkout", limit(10), async (req, res) => {
  if (!stripe) return res.status(503).json({ error: "Payments aren't set up yet." });
  const { inp, error } = readBirth(req.body?.birth); if (error) return res.status(400).json({ error });
  const key = ENGINE.chartKey(inp);
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: priceNow(), product_data: {
        name: PRODUCT_NAME + (saleOn() ? ` (${SALE.name})` : ""),
        description: "Unlocks the weather calendar and chapters ahead for one birth chart. It updates every time you return.",
      } } }],
      metadata: { chart_hash: chartHash(key), product: PRODUCT },
      payment_intent_data: { metadata: { chart_hash: chartHash(key), product: PRODUCT } },
      allow_promotion_codes: true,
      custom_text: { submit: { message: `Delivered instantly on the Manual of the Self site. All sales are final. Questions or problems with your purchase: ${SUPPORT_EMAIL}` } },
      success_url: `${origin(req)}/?paid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin(req)}/?canceled=1`,
    });
    res.json({ url: session.url });
  } catch (e) {
    console.error("checkout failed:", e.message);
    res.status(502).json({ error: "Couldn't start checkout. Please try again." });
  }
});

// After Stripe redirects back: confirm payment and issue the unlock token
app.post("/api/claim", limit(20), async (req, res) => {
  if (!stripe) return res.status(503).json({ error: "Payments aren't set up yet." });
  const sid = String(req.body?.session_id || "");
  const { inp, error } = readBirth(req.body?.birth); if (error) return res.status(400).json({ error });
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sid)) return res.status(400).json({ error: "Invalid checkout reference." });
  try {
    const s = await stripe.checkout.sessions.retrieve(sid);
    if (s.payment_status !== "paid") return res.status(402).json({ error: "This payment hasn't completed." });
    const key = ENGINE.chartKey(inp);
    if (!s.metadata || !safeEqual(s.metadata.chart_hash, chartHash(key)))
      return res.status(409).json({ error: "This purchase was for a different chart. Re-enter the birth details you bought it for." });
    res.json({ token: tokenFor(key), email: s.customer_details?.email || null, amount: s.amount_total ?? null, ref: s.id });
  } catch (e) {
    console.error("claim failed:", e.message);
    res.status(502).json({ error: "Couldn't confirm the payment. Please refresh to try again." });
  }
});

// Restore on a new device: email + the same birth details
app.post("/api/restore", limit(10), async (req, res) => {
  if (!stripe) return res.status(503).json({ error: "Payments aren't set up yet." });
  const email = String(req.body?.email || "").trim().toLowerCase();
  const { inp, error } = readBirth(req.body?.birth); if (error) return res.status(400).json({ error });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: "Enter the email you used at checkout." });
  const want = chartHash(ENGINE.chartKey(inp));
  try {
    const list = await stripe.checkout.sessions.list({ customer_details: { email }, status: "complete", limit: 100 });
    let hit = list.data.find(s => s.payment_status === "paid" && s.metadata && safeEqual(s.metadata.chart_hash, want));
    if (!hit && PAYPAL.on) {
      const people = await stripe.customers.list({ email, limit: 100 });
      hit = people.data.find(c => c.metadata && c.metadata.source === "paypal" && safeEqual(c.metadata.chart_hash || "", want));
    }
    if (!hit) return res.status(404).json({ error: "No purchase found for that email and these birth details." });
    res.json({ token: tokenFor(ENGINE.chartKey(inp)) });
  } catch (e) {
    console.error("restore failed:", e.message);
    res.status(502).json({ error: "Couldn't check purchases right now. Please try again." });
  }
});

// ---------------- PayPal ----------------
let ppAuth = { token: "", expires: 0 };
async function paypalToken() {
  if (ppAuth.token && Date.now() < ppAuth.expires) return ppAuth.token;
  const r = await fetch(PAYPAL.api + "/v1/oauth2/token", {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(PAYPAL.id + ":" + PAYPAL.secret).toString("base64"),
               "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new Error("PayPal sign-in failed (" + r.status + ")");
  ppAuth = { token: d.access_token, expires: Date.now() + Math.max(60, (d.expires_in || 300) - 120) * 1000 };
  return ppAuth.token;
}
async function paypal(method, url, body) {
  const r = await fetch(PAYPAL.api + url, {
    method,
    headers: { Authorization: "Bearer " + (await paypalToken()), "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}

// Start a PayPal order for one chart (the price is set here, never by the browser)
app.post("/api/paypal/order", limit(10), async (req, res) => {
  if (!PAYPAL.on) return res.status(503).json({ error: "PayPal isn't set up yet." });
  const { inp, error } = readBirth(req.body?.birth); if (error) return res.status(400).json({ error });
  try {
    const r = await paypal("POST", "/v2/checkout/orders", {
      intent: "CAPTURE",
      purchase_units: [{
        custom_id: chartHash(ENGINE.chartKey(inp)),
        description: (PRODUCT_NAME + (saleOn() ? ` (${SALE.name})` : "")).slice(0, 127),
        amount: { currency_code: "USD", value: (priceNow() / 100).toFixed(2) },
      }],
      payment_source: { paypal: { experience_context: {
        brand_name: "Manual of the Self", shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW",
      } } },
    });
    if (!r.ok || !r.data.id) throw new Error("create order " + r.status + " " + (r.data.name || ""));
    res.json({ id: r.data.id });
  } catch (e) {
    console.error("paypal order failed:", e.message);
    res.status(502).json({ error: "Couldn't start PayPal. Please try again." });
  }
});

// After the buyer approves in PayPal: take the payment, check it, record it, issue the unlock token
app.post("/api/paypal/capture", limit(20), async (req, res) => {
  if (!PAYPAL.on) return res.status(503).json({ error: "PayPal isn't set up yet." });
  const id = String(req.body?.order_id || "");
  const { inp, error } = readBirth(req.body?.birth); if (error) return res.status(400).json({ error });
  if (!/^[A-Z0-9]{10,30}$/.test(id)) return res.status(400).json({ error: "Invalid PayPal reference." });
  try {
    let r = await paypal("POST", `/v2/checkout/orders/${id}/capture`, {});
    if (!r.ok && r.data?.details?.some(d => d.issue === "ORDER_ALREADY_CAPTURED")) r = await paypal("GET", `/v2/checkout/orders/${id}`);
    if (!r.ok) {
      const declined = r.data?.details?.some(d => d.issue === "INSTRUMENT_DECLINED");
      console.error("paypal capture failed:", r.status, r.data?.name || "");
      return res.status(402).json({ error: declined ? "PayPal declined that payment. Try another funding source in PayPal." : "This PayPal payment didn't complete." });
    }
    const unit = r.data.purchase_units?.[0] || {};
    const cap = unit.payments?.captures?.[0];
    if (r.data.status !== "COMPLETED" || !cap || cap.status !== "COMPLETED" || cap.amount?.currency_code !== "USD")
      return res.status(402).json({ error: "This PayPal payment hasn't completed." });
    const key = ENGINE.chartKey(inp), hash = chartHash(key);
    if (!safeEqual(unit.custom_id || cap.custom_id || "", hash))
      return res.status(409).json({ error: "This purchase was for a different chart. Re-enter the birth details you bought it for." });
    const email = (r.data.payer?.email_address || "").toLowerCase() || null;
    // Keep Stripe as the one record of purchases, so Restore works for PayPal buyers too
    try {
      if (email) {
        const existing = await stripe.customers.list({ email, limit: 100 });
        if (!existing.data.some(c => c.metadata?.paypal_order === id))
          await stripe.customers.create({
            email, name: [r.data.payer?.name?.given_name, r.data.payer?.name?.surname].filter(Boolean).join(" ") || undefined,
            description: `PayPal purchase: ${PRODUCT_NAME} (${cap.amount.value} USD)`,
            metadata: { source: "paypal", paypal_order: id, paypal_capture: cap.id || "", chart_hash: hash, product: PRODUCT },
          });
      }
    } catch (e) { console.error("paypal record failed (buyer still unlocked):", e.message); }
    res.json({ token: tokenFor(key), email, amount: Math.round(parseFloat(cap.amount.value) * 100) || null, ref: id });
  } catch (e) {
    console.error("paypal capture failed:", e.message);
    res.status(502).json({ error: "Couldn't confirm the PayPal payment. Please refresh and use Restore with your PayPal email." });
  }
});

// The paid forecast
app.post("/api/forecast", limit(40), (req, res) => {
  const { inp, error } = readBirth(req.body?.birth); if (error) return res.status(400).json({ error });
  const months = [3, 6, 9].includes(+req.body?.months) ? +req.body.months : 6;
  const key = ENGINE.chartKey(inp);
  const isSample = req.body?.token === "sample" && key === SAMPLE_KEY;   // the sample chart's forecast is free to preview
  if (!isSample && !safeEqual(req.body?.token || "", tokenFor(key)))
    return res.status(403).json({ error: "locked" });
  const c = chartFrom(inp);
  res.json({ ...forecastFor(c, months), now: nowNotes(c, true) });
});

// ---------------- page ----------------
// Search engines: one public page, the API stays out of the index
app.get("/robots.txt", (req, res) => res.type("text/plain").send(`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`));
app.get("/sitemap.xml", (req, res) => res.type("application/xml").send(
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE_URL}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n</urlset>\n`));

app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"], maxAge: "10m" }));
app.get("/healthz", (req, res) => res.send("ok"));

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Manual of the Self on :${PORT} | payments ${stripe ? (TEST_MODE ? "TEST mode" : "LIVE") : "off (no STRIPE_SECRET_KEY)"} | PayPal ${PAYPAL.on ? (PAYPAL.live ? "LIVE" : "sandbox") : "off"}`));
}
module.exports = { app, tokenFor, chartHash };
