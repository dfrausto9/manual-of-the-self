/* ===================== ENGINE: positions, houses, aspects, time ===================== */
const ENGINE = (() => {
  const A = Astronomy;
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const norm = x => ((x % 360) + 360) % 360;
  const sep = (a, b) => { const d = Math.abs(norm(a) - norm(b)) % 360; return d > 180 ? 360 - d : d; };

  const BODIES = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
  const ABODY = { sun: "Sun", moon: "Moon", mercury: "Mercury", venus: "Venus", mars: "Mars", jupiter: "Jupiter",
                  saturn: "Saturn", uranus: "Uranus", neptune: "Neptune", pluto: "Pluto" };

  function lonOf(key, date) {
    if (key === "sun") return A.SunPosition(date).elon;
    if (key === "moon") return A.EclipticGeoMoon(date).lon;
    if (key === "node") return trueNode(date);
    return A.Ecliptic(A.GeoVector(ABODY[key], date, true)).elon;
  }
  const addDays = (date, d) => new Date(date.getTime() + d * 86400000);

  // True (osculating) lunar node from the Moon's geocentric ecliptic position and velocity.
  function trueNode(date) {
    const p = t => { const m = A.EclipticGeoMoon(t); const la = m.lat * D2R, lo = m.lon * D2R, r = 1;
      return [r * Math.cos(la) * Math.cos(lo), r * Math.cos(la) * Math.sin(lo), r * Math.sin(la)]; };
    const dt = 1 / 24;
    const r0 = p(date), r1 = p(addDays(date, dt)), rm = p(addDays(date, -dt));
    const v = [(r1[0] - rm[0]) / 2, (r1[1] - rm[1]) / 2, (r1[2] - rm[2]) / 2];
    const h = [r0[1] * v[2] - r0[2] * v[1], r0[2] * v[0] - r0[0] * v[2], r0[0] * v[1] - r0[1] * v[0]];
    return norm(Math.atan2(h[0], -h[1]) * R2D);
  }

  function speedOf(key, date) {
    const a = lonOf(key, addDays(date, -0.5)), b = lonOf(key, addDays(date, 0.5));
    return ((b - a + 540) % 360) - 180;
  }

  function obliquity(date) {
    const T = (date.getTime() / 86400000 + 2440587.5 - 2451545.0) / 36525;
    return 23.439291111 - 0.0130041667 * T - 1.639e-7 * T * T + 5.036e-7 * T * T * T;
  }

  // Ascendant, MC and Placidus cusps (falls back to Porphyry above ~66° latitude)
  function houses(date, lat, lon) {
    const eps = obliquity(date) * D2R;
    const ramc = norm(A.SiderealTime(date) * 15 + lon) * D2R;
    const phi = lat * D2R;
    const mc = norm(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps)) * R2D);
    const asc = norm(Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))) * R2D);
    const cusps = new Array(12);
    cusps[0] = asc; cusps[9] = mc; cusps[6] = norm(asc + 180); cusps[3] = norm(mc + 180);
    let system = "Placidus";
    const placidus = (frac, above) => {
      // frac: 1/3 or 2/3 of the semi-arc; above: houses 11,12 (true) or 2,3 (false)
      // Placidus: cusp RA divides the diurnal (above) or nocturnal (below) semi-arc in thirds
      let ra = above ? ramc + frac * Math.PI / 2 : ramc + Math.PI - frac * Math.PI / 2;
      for (let i = 0; i < 60; i++) {
        const decl = Math.asin(Math.sin(eps) * Math.sin(lonFromRA(ra)));
        const x = Math.tan(phi) * Math.tan(decl);
        if (Math.abs(x) >= 1) return null;
        const ad = Math.asin(x);
        const next = above ? ramc + frac * (Math.PI / 2 + ad) : ramc + Math.PI - frac * (Math.PI / 2 - ad);
        if (Math.abs(next - ra) < 1e-9) { ra = next; break; }
        ra = next;
      }
      return norm(lonFromRA(ra) * R2D);
    };
    function lonFromRA(ra) { return Math.atan2(Math.sin(ra), Math.cos(ra) * Math.cos(eps)); }
    const c11 = placidus(1 / 3, true), c12 = placidus(2 / 3, true);
    const c2 = placidus(2 / 3, false), c3 = placidus(1 / 3, false);
    if ([c11, c12, c2, c3].some(c => c === null) || Math.abs(lat) > 66) {
      system = "Porphyry";
      const q1 = norm(asc - mc);              // MC -> ASC arc
      const q2 = norm(cusps[3] - asc);        // ASC -> IC arc
      cusps[10] = norm(mc + q1 / 3); cusps[11] = norm(mc + 2 * q1 / 3);
      cusps[1] = norm(asc + q2 / 3); cusps[2] = norm(asc + 2 * q2 / 3);
    } else {
      cusps[10] = c11; cusps[11] = c12; cusps[1] = c2; cusps[2] = c3;
    }
    cusps[4] = norm(cusps[10] + 180); cusps[5] = norm(cusps[11] + 180);
    cusps[7] = norm(cusps[1] + 180); cusps[8] = norm(cusps[2] + 180);
    return { asc, mc, cusps, system };
  }

  function houseOf(lon, cusps) {
    for (let i = 0; i < 12; i++) {
      const a = cusps[i], b = cusps[(i + 1) % 12];
      const span = norm(b - a), off = norm(lon - a);
      if (off < span) return i + 1;
    }
    return 1;
  }

  // ---------- time zones: local wall time in an IANA zone -> UTC Date ----------
  function tzOffsetMinutes(utcMs, tz) {
    const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit",
      day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const p = Object.fromEntries(f.formatToParts(new Date(utcMs)).map(x => [x.type, x.value]));
    const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
    return (asUtc - utcMs) / 60000;
  }
  function zonedToUtc(y, mo, d, h, mi, tz) {
    const wall = Date.UTC(y, mo - 1, d, h, mi);
    let utc = wall;
    for (let i = 0; i < 3; i++) utc = wall - tzOffsetMinutes(utc, tz) * 60000;
    return new Date(utc);
  }

  // ---------- natal chart ----------
  const POINTS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "node"];
  function chart(date, lat, lon, timeKnown) {
    const planets = {};
    for (const k of POINTS) {
      planets[k] = { key: k, lon: lonOf(k, date), speed: k === "node" ? -0.05 : speedOf(k, date) };
      planets[k].retro = k !== "node" && planets[k].speed < 0 && k !== "sun" && k !== "moon";
    }
    let h = null;
    if (timeKnown) {
      h = houses(date, lat, lon);
      for (const k of POINTS) planets[k].house = houseOf(planets[k].lon, h.cusps);
    }
    return { date, lat, lon, timeKnown, planets, houses: h };
  }

  const ASPECTS = [
    { key: "conjunction", angle: 0, glyph: "☌", tone: "blend" },
    { key: "sextile", angle: 60, glyph: "⚹", tone: "flow" },
    { key: "square", angle: 90, glyph: "□", tone: "friction" },
    { key: "trine", angle: 120, glyph: "△", tone: "flow" },
    { key: "opposition", angle: 180, glyph: "☍", tone: "friction" },
  ];
  function aspectBetween(a, b, orb) {
    const s = sep(a, b);
    for (const asp of ASPECTS) { const o = Math.abs(s - asp.angle); if (o <= orb) return { ...asp, orb: o }; }
    return null;
  }
  function natalAspects(c) {
    const keys = POINTS.filter(k => k !== "node");
    const pts = keys.map(k => [k, c.planets[k].lon]);
    if (c.timeKnown) { pts.push(["asc", c.houses.asc]); pts.push(["mc", c.houses.mc]); }
    const out = [];
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const lum = ["sun", "moon"].includes(pts[i][0]) || ["sun", "moon"].includes(pts[j][0]);
      const asp = aspectBetween(pts[i][1], pts[j][1], lum ? 8 : 6);
      if (asp) out.push({ a: pts[i][0], b: pts[j][0], ...asp });
    }
    return out.sort((x, y) => x.orb - y.orb);
  }

  // ---------- transits ----------
  const NATAL_TARGETS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "asc", "mc"];
  function targetLon(c, k) { return k === "asc" ? c.houses.asc : k === "mc" ? c.houses.mc : c.planets[k].lon; }
  function targets(c) { return NATAL_TARGETS.filter(k => c.timeKnown || (k !== "asc" && k !== "mc")); }

  function currentTransits(c, now) {
    const ORB = { sun: 2, mercury: 2, venus: 2, mars: 2, jupiter: 2.5, saturn: 2.5, uranus: 2, neptune: 2, pluto: 2, node: 2 };
    const out = [];
    for (const t of ["sun", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "node"]) {
      const tl = lonOf(t, now), sp = t === "node" ? -0.05 : speedOf(t, now);
      for (const n of targets(c)) {
        const nl = targetLon(c, n);
        const asp = aspectBetween(tl, nl, ORB[t]);
        if (!asp) continue;
        const soon = aspectBetween(lonOf(t, addDays(now, 1)), nl, 99);
        const applying = soon && Math.abs(sep(lonOf(t, addDays(now, 1)), nl) - asp.angle) < asp.orb;
        out.push({ transit: t, natal: n, ...asp, applying, retro: sp < 0 && t !== "node",
                   house: c.timeKnown ? houseOf(tl, c.houses.cusps) : null, lon: tl });
      }
    }
    const W = { pluto: 9, neptune: 8, uranus: 8, saturn: 7, jupiter: 6, node: 5, mars: 4, sun: 2, venus: 2, mercury: 2 };
    return out.sort((x, y) => (W[y.transit] - y.orb) - (W[x.transit] - x.orb));
  }

  // Canonical key for a birth chart (name excluded). Used to tie a purchase to one chart.
  function chartKey(inp) {
    return ["v1", inp.date, inp.noTime ? "notime" : inp.time, (+inp.lat).toFixed(4), (+inp.lon).toFixed(4), inp.tz].join("|");
  }

  return { chart, natalAspects, currentTransits, zonedToUtc, tzOffsetMinutes, chartKey,
           houseOf, lonOf, speedOf, norm, sep, ASPECTS, POINTS, addDays, aspectBetween, targets, targetLon };
})();
if (typeof module !== "undefined") module.exports = ENGINE;
