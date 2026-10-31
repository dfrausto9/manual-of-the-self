/* ===================== FORECAST (server only): transit calendar and sky events ===================== */
// Kept out of the browser bundle so the paid forecast can only come from the server.
function makeForecast(ENGINE, A) {
  const { lonOf, speedOf, sep, houseOf, addDays, aspectBetween, targets, targetLon, ASPECTS } = ENGINE;
  // Scan slow planets day by day; return periods when each transit is within orb, with exact dates.
  function transitCalendar(c, start, months) {
    const SLOW = { mars: 1.2, jupiter: 2, saturn: 2, uranus: 1.5, neptune: 1.5, pluto: 1.5, node: 1.5 };
    const end = new Date(start); end.setMonth(end.getMonth() + months);
    const days = Math.ceil((end - start) / 86400000);
    const lons = {}; for (const t in SLOW) lons[t] = [];
    for (let i = 0; i <= days + 1; i++) { const d = addDays(start, i); for (const t in SLOW) lons[t].push(lonOf(t, d)); }
    const events = [];
    for (const t in SLOW) for (const n of targets(c)) {
      if (t === "node" && !["sun", "moon", "asc", "mc"].includes(n)) continue;
      const nl = targetLon(c, n);
      for (const asp of ASPECTS) {
        if (t === "node" && asp.key !== "conjunction" && asp.key !== "opposition") continue;
        let cur = null;
        for (let i = 0; i <= days; i++) {
          const o = Math.abs(sep(lons[t][i], nl) - asp.angle);
          if (o <= SLOW[t]) {
            if (!cur) cur = { transit: t, natal: n, ...asp, startI: i, exacts: [], minOrb: o, minI: i };
            if (o < cur.minOrb) { cur.minOrb = o; cur.minI = i; }
            const oPrev = i > 0 ? Math.abs(sep(lons[t][i - 1], nl) - asp.angle) : 99;
            const oNext = Math.abs(sep(lons[t][i + 1], nl) - asp.angle);
            if (o <= oPrev && o < oNext && o < 0.35) cur.exacts.push(addDays(start, i));
          } else if (cur) { cur.endI = i - 1; events.push(cur); cur = null; }
        }
        if (cur) { cur.endI = days; cur.ongoing = true; events.push(cur); }
      }
    }
    // merge passes of the same transit separated by a short wobble (true node, stations)
    events.sort((a, b) => a.startI - b.startI);
    const merged = [];
    for (const e of events) {
      const m = merged.find(x => x.transit === e.transit && x.natal === e.natal && x.key === e.key && e.startI - x.endI <= 14);
      if (m) { m.endI = Math.max(m.endI, e.endI); m.exacts.push(...e.exacts); if (e.minOrb < m.minOrb) { m.minOrb = e.minOrb; m.minI = e.minI; } m.ongoing = m.ongoing || e.ongoing; }
      else merged.push(e);
    }
    events.length = 0; events.push(...merged);
    for (const e of events) {
      // keep one exact date per pass (within 10 days)
      e.exacts.sort((a, b) => a - b);
      e.exacts = e.exacts.filter((d, i, arr) => i === 0 || d - arr[i - 1] > 10 * 86400000);
      e.start = addDays(start, e.startI); e.end = addDays(start, e.endI);
      e.startedBefore = e.startI === 0;
      if (!e.exacts.length) e.peak = addDays(start, e.minI);
      e.house = c.timeKnown ? houseOf(lons[e.transit][e.minI], c.houses.cusps) : null;
      e.natalHouse = c.timeKnown && !["asc", "mc"].includes(e.natal) ? c.planets[e.natal].house : null;
    }
    return { events: events.sort((a, b) => a.start - b.start || a.end - b.end), end };
  }

  // Retrograde periods, eclipses and lunations in a window
  function skyEvents(c, start, end) {
    const out = [];
    const days = Math.ceil((end - start) / 86400000);
    for (const p of ["mercury", "venus", "mars"]) {
      let prev = speedOf(p, addDays(start, -1)) < 0, rs = prev ? start : null;
      for (let i = 0; i <= days; i++) {
        const d = addDays(start, i), r = speedOf(p, d) < 0;
        if (r && !prev) rs = d;
        if (!r && prev) { out.push({ kind: "retro", planet: p, start: rs, end: d, startedBefore: rs === start }); rs = null; }
        prev = r;
      }
      if (prev && rs) {
        let j = days; while (speedOf(p, addDays(start, j)) < 0 && j < days + 120) j++;
        out.push({ kind: "retro", planet: p, start: rs, end: addDays(start, j), startedBefore: rs === start, runsPast: true });
      }
    }
    let t = A.MakeTime(start);
    for (let k = 0; k < 4; k++) {
      const e = A.SearchLunarEclipse(t); if (e.peak.date > end) break;
      if (e.kind !== "penumbral") out.push(eclipse("lunar", e.kind, e.peak.date, c));
      t = e.peak.AddDays(10);
    }
    t = A.MakeTime(start);
    for (let k = 0; k < 4; k++) {
      const e = A.SearchGlobalSolarEclipse(t); if (e.peak.date > end) break;
      out.push(eclipse("solar", e.kind, e.peak.date, c)); t = e.peak.AddDays(10);
    }
    for (const [ph, name] of [[0, "new"], [180, "full"]]) {
      let s = A.MakeTime(start);
      for (let k = 0; k < 14; k++) {
        const m = A.SearchMoonPhase(ph, s, 40); if (!m || m.date > end) break;
        const lon = lonOf("moon", m.date);
        out.push({ kind: "lunation", phase: name, date: m.date, lon,
                   house: c.timeKnown ? houseOf(lon, c.houses.cusps) : null });
        s = m.AddDays(5);
      }
    }
    return out;
  }
  function eclipse(type, kind, date, c) {
    const lon = type === "solar" ? lonOf("sun", date) : lonOf("moon", date);
    const hits = targets(c).map(n => ({ n, a: aspectBetween(lon, targetLon(c, n), 3) }))
      .filter(x => x.a && (x.a.key === "conjunction" || x.a.key === "opposition"));
    return { kind: "eclipse", type, ekind: kind, date, lon, house: c.timeKnown ? houseOf(lon, c.houses.cusps) : null, hits };
  }

  return { transitCalendar, skyEvents };
}
module.exports = makeForecast;
