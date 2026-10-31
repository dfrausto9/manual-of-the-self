/*
 * Manual of the Self — web server
 *
 * Free: the page itself (birth chart, manual, today's sky) is calculated in the visitor's browser.
 * Paid: the weather calendar is calculated here and only returned with a valid unlock token.
 *
 * Payments: Stripe Checkout, one-time. Stripe is the record of purchases, so no database is needed:
 *   - each Checkout Session carries a chart_hash (an HMAC of the birth chart, not the birth data itself)
 *   - after payment, /api/claim checks the session with Stripe and issues an unlock token
 *   - /api/restore finds earlier paid sessions by email + chart, for a new device or cleared browser
 *
 * Environment (Render > Environment):
 *   STRIPE_SECRET_KEY   sk_test_... while testing, sk_live_... to take real payments
 *   UNLOCK_SECRET       optional; random string used to sign unlock tokens (falls back to one derived from the Stripe key)
 *   PRICE_CENTS         optional; default 900 ($9.00)
 *   SUPPORT_EMAIL       optional; shown to buyers (default tarotrightnow@gmail.com)
 *   PORT                set by Render
 */
const path = require("path");
const crypto = require("crypto");
const express = require("express");

global.Astronomy = require("astronomy-engine");
const ENGINE = require("./shared/engine.js");
const forecast = require("./shared/forecast.js")(ENGINE, global.Astronomy);

const STRIPE_KEY = (process.env.STRIPE_SECRET_KEY || "").trim();
const stripe = STRIPE_KEY ? require("stripe")(STRIPE_KEY) : null;
const SECRET = (process.env.UNLOCK_SECRET || "").trim() ||
  (STRIPE_KEY ? crypto.createHash("sha256").update("manual-of-the-self:" + STRIPE_KEY).digest("hex") : "dev-only-secret");
const PRICE_CENTS = parseInt(process.env.PRICE_CENTS || "900", 10);
const SUPPORT_EMAIL = (process.env.SUPPORT_EMAIL || "tarotrightnow@gmail.com").trim();
const TEST_MODE = STRIPE_KEY.startsWith("sk_test_");
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
  return { start, end: cal.end, events: cal.events, sky: forecast.skyEvents(c, start, cal.end) };
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
  res.json({ payments: !!stripe, testMode: TEST_MODE, price: PRICE_CENTS, currency: "usd", support: SUPPORT_EMAIL });
});

// Free teaser: how much is in the forecast, without dates or details
app.post("/api/teaser", limit(40), (req, res) => {
  const { inp, error } = readBirth(req.body?.birth); if (error) return res.status(400).json({ error });
  const f = forecastFor(chartFrom(inp), 9);
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
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: PRICE_CENTS, product_data: {
        name: "Manual of the Self: Full Forecast",
        description: "Unlocks the weather calendar and chapters ahead for one birth chart. It updates every time you return.",
      } } }],
      metadata: { chart_hash: chartHash(key), product: "full-forecast-v1" },
      payment_intent_data: { metadata: { chart_hash: chartHash(key), product: "full-forecast-v1" } },
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
    res.json({ token: tokenFor(key), email: s.customer_details?.email || null });
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
    const hit = list.data.find(s => s.payment_status === "paid" && s.metadata && safeEqual(s.metadata.chart_hash, want));
    if (!hit) return res.status(404).json({ error: "No purchase found for that email and these birth details." });
    res.json({ token: tokenFor(ENGINE.chartKey(inp)) });
  } catch (e) {
    console.error("restore failed:", e.message);
    res.status(502).json({ error: "Couldn't check purchases right now. Please try again." });
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
  res.json(forecastFor(chartFrom(inp), months));
});

// ---------------- page ----------------
app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"], maxAge: "10m" }));
app.get("/healthz", (req, res) => res.send("ok"));

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Manual of the Self on :${PORT} | payments ${stripe ? (TEST_MODE ? "TEST mode" : "LIVE") : "off (no STRIPE_SECRET_KEY)"}`));
}
module.exports = { app, tokenFor, chartHash };
