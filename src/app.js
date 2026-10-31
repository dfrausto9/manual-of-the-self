(() => {
  const E = ENGINE, L = LIB, P = L.PLANETS;
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const STORE = "manual-of-the-self.v1";
  const SAMPLE = { name: "", date: "1995-06-15", time: "09:20", noTime: false, city: "Chicago, IL, USA", sample: true };
  const ORDER = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "node"];
  const TONE_LABEL = { flow: "supportive", friction: "challenging", blend: "new cycle" };
  const SLOW = ["pluto", "neptune", "uranus", "saturn", "jupiter", "node"];
  const fmt = (d, opts = { month: "short", day: "numeric" }) => d.toLocaleDateString(undefined, opts);
  const fmtY = d => d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  let state = { chart: null, months: 6, filter: "all", selected: "sun", selectedEvent: null, input: null, cal: null, sky: null, now: new Date() };

  // ---------------- form ----------------
  const cityByName = new Map(CITIES.map(c => [c.name.toLowerCase(), c]));
  // City picker: a dropdown under the field (replaces the browser's own suggestion list, which some browsers misplace)
  (() => {
    const input = $("#fCity"), menu = $("#cityMenu");
    let items = [], active = -1;
    const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    function open(list) {
      items = list; active = list.length ? 0 : -1;
      const q = norm(input.value.trim());
      menu.innerHTML = list.length ? list.map((c, i) => {
        const n = norm(c.name), at = q ? n.indexOf(q) : -1;
        const label = at >= 0 ? esc(c.name.slice(0, at)) + "<mark>" + esc(c.name.slice(at, at + q.length)) + "</mark>" + esc(c.name.slice(at + q.length)) : esc(c.name);
        return `<li role="option" id="city-${i}" data-i="${i}" aria-selected="${i === active}">${label}</li>`;
      }).join("") : `<li class="none" role="option" aria-disabled="true">No match. Try a nearby big city, or enter coordinates.</li>`;
      menu.hidden = false; input.setAttribute("aria-expanded", "true");
      if (active >= 0) input.setAttribute("aria-activedescendant", "city-" + active);
    }
    function close() { menu.hidden = true; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); }
    function search() {
      const q = norm(input.value.trim());
      if (!q) return open(CITIES.slice(0, 8));
      const starts = [], has = [];
      for (const c of CITIES) { const n = norm(c.name); if (n.startsWith(q)) starts.push(c); else if (n.includes(q)) has.push(c); }
      open(starts.concat(has).slice(0, 8));
    }
    function pick(i) { if (items[i]) { input.value = items[i].name; close(); } }
    function move(d) {
      if (menu.hidden) return search();
      if (!items.length) return;
      active = (active + d + items.length) % items.length;
      menu.querySelectorAll("li[data-i]").forEach(li => li.setAttribute("aria-selected", +li.dataset.i === active));
      input.setAttribute("aria-activedescendant", "city-" + active);
      menu.querySelector(`#city-${active}`)?.scrollIntoView({ block: "nearest" });
    }
    input.addEventListener("input", search);
    input.addEventListener("focus", search);
    input.addEventListener("keydown", e => {
      if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (e.key === "Enter" && !menu.hidden && active >= 0) { e.preventDefault(); pick(active); }
      else if (e.key === "Escape") close();
    });
    menu.addEventListener("mousedown", e => { const li = e.target.closest("li[data-i]"); if (li) { e.preventDefault(); pick(+li.dataset.i); } });
    input.addEventListener("blur", () => setTimeout(close, 120));
  })();
  let zones = [];
  try { zones = Intl.supportedValuesOf("timeZone"); } catch (e) { zones = [...new Set(CITIES.map(c => c.tz))].sort(); }
  $("#fTz").innerHTML = zones.map(z => `<option>${esc(z)}</option>`).join("");
  try { $("#fTz").value = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}
  $("#togglePlace").addEventListener("click", () => {
    const m = $("#manualPlace"); m.hidden = !m.hidden;
    $("#togglePlace").textContent = m.hidden ? "City not listed? Enter coordinates" : "Use the city list instead";
  });
  $("#fNoTime").addEventListener("change", e => { $("#fTime").disabled = e.target.checked; });

  function fillForm(inp) {
    $("#fName").value = inp.name || ""; $("#fDate").value = inp.date; $("#fTime").value = inp.time || "";
    $("#fNoTime").checked = !!inp.noTime; $("#fTime").disabled = !!inp.noTime;
    if (inp.manual) { $("#manualPlace").hidden = false; $("#fLat").value = inp.lat; $("#fLon").value = inp.lon; $("#fTz").value = inp.tz; $("#fCity").value = ""; }
    else { $("#fCity").value = inp.city || ""; }
  }

  function readForm() {
    const date = $("#fDate").value, noTime = $("#fNoTime").checked, time = noTime ? "12:00" : $("#fTime").value;
    if (!date) return { err: "Enter your birth date." };
    if (!noTime && !time) return { err: "Enter your birth time, or tick “I don't know my birth time”." };
    const manual = !$("#manualPlace").hidden && $("#fLat").value !== "" && $("#fLon").value !== "";
    let place;
    if (manual) {
      const lat = +$("#fLat").value, lon = +$("#fLon").value;
      if (!(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180)) return { err: "Latitude must be −90 to 90 and longitude −180 to 180." };
      place = { lat, lon, tz: $("#fTz").value, label: `${lat.toFixed(2)}, ${lon.toFixed(2)}` };
    } else {
      const c = cityByName.get($("#fCity").value.trim().toLowerCase());
      if (!c) return { err: "Pick a city from the list, or choose “Enter coordinates”." };
      place = { lat: c.lat, lon: c.lon, tz: c.tz, label: c.name };
    }
    return { name: $("#fName").value.trim(), date, time, noTime, city: manual ? "" : $("#fCity").value.trim(),
             manual, lat: place.lat, lon: place.lon, tz: place.tz, label: place.label };
  }

  function resolve(inp) {
    if (!inp.manual) { const c = cityByName.get((inp.city || "").toLowerCase()); if (!c) return null; Object.assign(inp, { lat: c.lat, lon: c.lon, tz: c.tz, label: c.name }); }
    const [y, m, d] = inp.date.split("-").map(Number), [hh, mm] = (inp.noTime ? "12:00" : inp.time).split(":").map(Number);
    const utc = E.zonedToUtc(y, m, d, hh, mm, inp.tz);
    return E.chart(utc, inp.lat, inp.lon, !inp.noTime);
  }

  $("#birthForm").addEventListener("submit", ev => {
    ev.preventDefault();
    const inp = readForm();
    if (inp.err) { $("#formErr").textContent = inp.err; return; }
    $("#formErr").textContent = "";
    load(inp);
    try { localStorage.setItem(STORE, JSON.stringify(inp)); } catch (e) {}
    $("#banner").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  });
  $("#sampleBtn").addEventListener("click", () => { fillForm(SAMPLE); load({ ...SAMPLE }); });

  function load(inp) {
    const c = resolve(inp);
    if (!c) { $("#formErr").textContent = "Couldn't find that place."; return; }
    state.input = inp; state.chart = c; state.selected = "sun"; state.selectedEvent = null; state.now = new Date();
    renderAll();
  }

  // ---------------- render ----------------
  function renderAll() {
    const c = state.chart, inp = state.input;
    const local = new Date(c.date.getTime() + E.tzOffsetMinutes(c.date.getTime(), inp.tz) * 60000);
    const when = local.toLocaleString(undefined, { timeZone: "UTC", year: "numeric", month: "long", day: "numeric", ...(c.timeKnown ? { hour: "numeric", minute: "2-digit" } : {}) });
    $("#banner").innerHTML = inp.sample
      ? `<span class="pill accent">Sample chart</span><span>Born ${esc(when)} in ${esc(inp.label)}. Enter your own birth details above to read your chart.</span>`
      : `<span class="pill accent">${esc(inp.name || "Your chart")}</span><span>Born ${esc(when)} in ${esc(inp.label)}${c.timeKnown ? "" : " · birth time unknown, so houses and the Ascendant are left out"}.</span>`;
    renderOverview(); renderWheel(); renderReading(); renderNow(); renderManual(); renderAspects(); loadForecast();
  }

  function renderOverview() {
    const c = state.chart, sun = L.signOf(c.planets.sun.lon), moon = L.signOf(c.planets.moon.lon);
    const rise = c.timeKnown ? L.signOf(c.houses.asc) : null;
    const big = (k, sign, sub) => `<div class="big"><span class="k">${k}</span><span class="v"><span class="glyph">${sign ? sign.glyph : ""}</span>${sign ? sign.name : "Unknown"}</span><span class="s">${sub}</span></div>`;
    const counts = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
    for (const k of ORDER.slice(0, 10)) counts[L.signOf(c.planets[k].lon).el] += (k === "sun" || k === "moon") ? 2 : 1;
    if (c.timeKnown) counts[L.signOf(c.houses.asc).el] += 2;
    const max = Math.max(...Object.values(counts));
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    const EL = { Fire: "spirit and action", Earth: "practical and grounded", Air: "ideas and connection", Water: "feeling and intuition" };
    const retros = ORDER.slice(2, 10).filter(k => c.planets[k].retro);
    $("#overview").innerHTML =
      big("Sun · core self", sun, sun.gift) +
      big("Moon · emotional needs", moon, moon.gift) +
      big("Rising · how you show up", rise, rise ? rise.gift : "Needs an exact birth time") +
      `<div class="balance"><span class="eyebrow">Element balance · mostly ${top}, ${EL[top]}</span>` +
      Object.entries(counts).map(([k, v]) => `<div class="bar"><span>${k}</span><span class="track"><span class="fill" style="width:${(v / max * 100).toFixed(0)}%; display:block"></span></span><span class="mono">${v}</span></div>`).join("") +
      `<span class="s" style="font-size:12.5px; color:var(--muted)">${retros.length ? `Born with ${retros.length} retrograde planet${retros.length > 1 ? "s" : ""}: ${retros.map(k => P[k].name).join(", ")}.` : "No planets retrograde at birth."}</span></div>`;
  }

  // ---------- wheel ----------
  function renderWheel() {
    const c = state.chart, S = 640, cx = S / 2, cy = S / 2;
    const R = { zOut: 300, zIn: 262, tr: 240, nat: 192, house: 152, asp: 140 };
    const base = c.timeKnown ? c.houses.asc : 0;
    const ang = lon => (180 + (lon - base)) * Math.PI / 180;
    const pt = (lon, r) => [cx + r * Math.cos(ang(lon)), cy - r * Math.sin(ang(lon))];
    const showT = $("#showTransits").checked;
    let s = `<svg viewBox="0 0 ${S} ${S}" role="img" aria-label="Birth chart wheel">`;
    s += `<circle cx="${cx}" cy="${cy}" r="${R.zOut}" fill="var(--sunken)" stroke="var(--line)"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${R.zIn}" fill="var(--surface)" stroke="var(--line)"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${R.asp}" fill="var(--bg)" stroke="var(--line)"/>`;
    for (let i = 0; i < 12; i++) {
      const [x1, y1] = pt(i * 30, R.zIn), [x2, y2] = pt(i * 30, R.zOut);
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--line)"/>`;
      const [gx, gy] = pt(i * 30 + 15, (R.zIn + R.zOut) / 2);
      s += `<text x="${gx}" y="${gy}" text-anchor="middle" dominant-baseline="central" font-family="var(--glyph)" font-size="19" fill="var(--muted)">${L.SIGNS[i].glyph}</text>`;
      for (let d = 5; d < 30; d += 5) { const [a1, b1] = pt(i * 30 + d, R.zIn), [a2, b2] = pt(i * 30 + d, R.zIn + (d % 10 ? 4 : 7)); s += `<line x1="${a1}" y1="${b1}" x2="${a2}" y2="${b2}" stroke="var(--line)"/>`; }
    }
    if (c.timeKnown) {
      c.houses.cusps.forEach((cu, i) => {
        const angle = i % 3 === 0;
        const [x1, y1] = pt(cu, R.asp), [x2, y2] = pt(cu, angle ? R.zOut + 8 : R.zIn);
        s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${angle ? "var(--ink)" : "var(--line)"}" stroke-width="${angle ? 1.6 : 1}"/>`;
        const mid = cu + E.norm(c.houses.cusps[(i + 1) % 12] - cu) / 2;
        const [hx, hy] = pt(mid, R.asp + 11);
        s += `<text x="${hx}" y="${hy}" text-anchor="middle" dominant-baseline="central" font-family="var(--mono)" font-size="10.5" fill="var(--muted)">${i + 1}</text>`;
      });
      for (const [lon, lab] of [[c.houses.asc, "AC"], [c.houses.mc, "MC"]]) {
        const [x, y] = pt(lon, R.zOut + 14);
        s += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="var(--mono)" font-size="11" font-weight="500" fill="var(--ink)">${lab}</text>`;
      }
    }
    // aspect lines
    for (const a of E.natalAspects(state.chart)) {
      if (a.key === "conjunction") continue;
      const la = a.a === "asc" ? c.houses.asc : a.a === "mc" ? c.houses.mc : c.planets[a.a].lon;
      const lb = a.b === "asc" ? c.houses.asc : a.b === "mc" ? c.houses.mc : c.planets[a.b].lon;
      const [x1, y1] = pt(la, R.asp - 2), [x2, y2] = pt(lb, R.asp - 2);
      const col = a.tone === "flow" ? "var(--flow)" : "var(--friction)";
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${a.orb < 2 ? 1.6 : 1}" stroke-opacity="${(1 - a.orb / 9).toFixed(2)}"/>`;
    }
    // planets with collision spreading
    const spread = (items, minGap) => {
      const arr = items.map(o => ({ ...o, disp: o.lon })).sort((a, b) => a.lon - b.lon);
      for (let it = 0; it < 40; it++) {
        let moved = false;
        for (let i = 0; i < arr.length; i++) {
          const a = arr[i], b = arr[(i + 1) % arr.length];
          const gap = E.norm(b.disp - a.disp);
          if (arr.length > 1 && gap < minGap) { const push = (minGap - gap) / 2; a.disp = E.norm(a.disp - push); b.disp = E.norm(b.disp + push); moved = true; }
        }
        if (!moved) break;
      }
      return arr;
    };
    const natal = spread(ORDER.map(k => ({ key: k, lon: c.planets[k].lon })), 8.5);
    for (const p of natal) {
      const [tx, ty] = pt(p.lon, R.zIn), [tx2, ty2] = pt(p.lon, R.zIn - 8);
      s += `<line x1="${tx}" y1="${ty}" x2="${tx2}" y2="${ty2}" stroke="var(--ink)" stroke-width="1.4"/>`;
      const [x, y] = pt(p.disp, R.nat), [lx, ly] = pt(p.lon, R.asp + 22);
      const sel = state.selected === p.key ? " sel" : "";
      s += `<g class="wheel-planet${sel}" data-k="${p.key}" tabindex="0" role="button" aria-label="${P[p.key].name} in ${L.signOf(p.lon).name}">
        <circle class="hit" cx="${x}" cy="${y}" r="17" fill="transparent"/>
        <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="var(--glyph)" font-size="21" fill="var(--ink)">${P[p.key].glyph}</text>
        <text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central" font-family="var(--mono)" font-size="9.5" fill="var(--muted)">${Math.floor(p.lon % 30)}°${c.planets[p.key].retro ? "℞" : ""}</text></g>`;
    }
    if (showT) {
      const now = state.now;
      const tr = spread(ORDER.map(k => ({ key: k, lon: E.lonOf(k, now) })), 7.5);
      for (const p of tr) {
        const [x, y] = pt(p.disp, R.tr), [t1x, t1y] = pt(p.lon, R.zIn), [t2x, t2y] = pt(p.lon, R.zIn - 5);
        s += `<line x1="${t1x}" y1="${t1y}" x2="${t2x}" y2="${t2y}" stroke="var(--accent)" stroke-width="1.4"/>`;
        s += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="var(--glyph)" font-size="14" fill="var(--accent)"><title>Today: ${P[p.key].name} ${L.deg(p.lon)} ${L.signOf(p.lon).name}</title>${P[p.key].glyph}</text>`;
      }
    }
    s += `</svg>`;
    // move var() colors/fonts from SVG attributes into style (attributes don't resolve var() in every browser)
    s = s.replace(/<(\w+)([^<>]*?)(\/?)>/g, (m, tag, attrs, slash) => {
      const st = [];
      attrs = attrs.replace(/\s(fill|stroke|font-family)="(var\([^"]+\))"/g, (x, k, v) => { st.push(`${k}:${v}`); return ""; });
      return `<${tag}${attrs}${st.length ? ` style="${st.join(";")}"` : ""}${slash}>`;
    });
    $("#wheel").innerHTML = s;
    $("#legendTransit").hidden = !showT;
    $("#wheel").querySelectorAll(".wheel-planet").forEach(g => {
      const go = () => { state.selected = g.dataset.k; renderWheel(); renderReading(); if (matchMedia("(max-width: 900px)").matches) $("#reading").scrollIntoView({ block: "nearest" }); };
      g.addEventListener("click", go);
      g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });
  }
  $("#showTransits").addEventListener("change", renderWheel);

  function renderReading() {
    const c = state.chart, k = state.selected, p = c.planets[k], sign = L.signOf(p.lon);
    const pl = L.placement(k, p, c.timeKnown);
    const asps = E.natalAspects(c).filter(a => a.a === k || a.b === k).slice(0, 4);
    const trs = E.currentTransits(c, state.now).filter(t => t.natal === k).slice(0, 3);
    $("#reading").innerHTML = `
      <div class="title"><span class="glyph">${P[k].glyph}</span><div><h2>${P[k].name} in ${sign.name}</h2>
        <div class="pos">${L.deg(p.lon)} ${sign.name}${c.timeKnown && p.house ? ` · ${L.ord(p.house)} house` : ""}${p.retro ? " · retrograde" : ""}</div></div></div>
      <p class="q">${esc(pl.question)}</p>
      <p>${esc(pl.text)}</p>
      <dl class="kv"><dt>Strength</dt><dd>${esc(pl.gift)}</dd><dt>Growth edge</dt><dd>${esc(pl.edge)}</dd>
        <dt>Element</dt><dd>${sign.el} · ${sign.mode}</dd></dl>
      ${pl.retro ? `<p class="note">${esc(pl.retro)}</p>` : ""}
      ${asps.length ? `<div style="display:grid; gap:6px"><span class="eyebrow">Talks to</span>${asps.map(a => { const o = a.a === k ? a.b : a.a; return `<div style="font-size:14px"><span class="pill ${a.tone}">${a.key}</span> ${P[o].name} · <span style="color:var(--muted)">${esc(L.ASPECT_TEXT[a.key].natal)}</span></div>`; }).join("")}</div>` : ""}
      ${trs.length ? `<div style="display:grid; gap:6px"><span class="eyebrow">Sky weather on it now</span>${trs.map(t => `<div style="font-size:14px"><span class="pill ${t.tone}">${TONE_LABEL[t.tone]}</span> ${P[t.transit].name} ${t.key} · orb ${t.orb.toFixed(1)}°</div>`).join("")}</div>` : ""}
      <div class="chips">${ORDER.map(o => `<button type="button" class="chipbtn" data-k="${o}" aria-pressed="${o === k}"><span class="glyph">${P[o].glyph}</span>${P[o].name}</button>`).join("")}</div>`;
    $("#reading").querySelectorAll(".chipbtn").forEach(b => b.addEventListener("click", () => { state.selected = b.dataset.k; renderWheel(); renderReading(); }));
  }

  // ---------- now ----------
  function storyCard(e, dates) {
    const st = L.transitStory(e, state.chart);
    return `<article class="card"><div class="ttl"><h3><span class="glyph">${P[e.transit].glyph}</span> ${P[e.transit].name} ${e.key} your ${P[e.natal].name}</h3><span class="pill ${st.tone}">${TONE_LABEL[st.tone]}</span></div>
      <div class="meta">${dates}</div>
      <div class="story">${st.lines.map(l => `<p>${esc(l)}</p>`).join("")}</div>
      <span class="prep">How to prepare</span><ul>${st.prep.map(x => `<li>${esc(x)}</li>`).join("")}</ul></article>`;
  }
  function renderNow() {
    const list = E.currentTransits(state.chart, state.now).slice(0, 6);
    $("#nowSub").textContent = `${fmtY(state.now)}. The strongest angles the sky is making to your chart today, slow planets first.`;
    $("#now").innerHTML = list.length ? list.map(t => storyCard(t, `orb ${t.orb.toFixed(1)}° · ${t.applying ? "building" : "easing"}${t.retro ? " · retrograde" : ""} · lasts ${L.TRANSIT[t.transit].pace}`)).join("")
      : `<p class="empty">A quiet sky for you today: no major angles to your chart.</p>`;
  }

  // ---------- calendar ----------
  // The full forecast is calculated on the server and needs an unlock token (the sample chart is open to all).
  const TOKENS = "manual-of-the-self.tokens", PENDING = "manual-of-the-self.pending";
  const getTokens = () => { try { return JSON.parse(localStorage.getItem(TOKENS) || "{}"); } catch (e) { return {}; } };
  const setToken = (k, t) => { try { const m = getTokens(); if (t) m[k] = t; else delete m[k]; localStorage.setItem(TOKENS, JSON.stringify(m)); } catch (e) {} };
  const birthOf = inp => ({ date: inp.date, time: inp.time, noTime: !!inp.noTime, lat: inp.lat, lon: inp.lon, tz: inp.tz });
  async function post(path, body) {
    const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    let data = {}; try { data = await r.json(); } catch (e) {}
    return { ok: r.ok, status: r.status, data };
  }
  let config = null;
  async function getConfig() {
    if (config) return config;
    try { const r = await fetch("/api/config"); config = r.ok ? await r.json() : { offline: true }; } catch (e) { config = { offline: true }; }
    return config;
  }
  const priceText = c => `$${(c.price / 100).toFixed(c.price % 100 ? 2 : 0)}`;

  function showPaid(on) { $("#paid").hidden = !on; $("#segRow").hidden = !on; $("#locked").hidden = on; }

  function hydrate(d) {
    const D = x => (x ? new Date(x) : x);
    d.events.forEach(e => { e.start = D(e.start); e.end = D(e.end); e.peak = D(e.peak); e.exacts = (e.exacts || []).map(D); });
    d.sky.forEach(s => { s.start = D(s.start); s.end = D(s.end); s.date = D(s.date); });
    state.cal = { events: d.events, start: D(d.start), end: D(d.end) }; state.sky = d.sky;
  }

  let seq = 0;
  async function loadForecast() {
    const inp = state.input, key = E.chartKey(inp), mine = ++seq;
    const token = inp.sample ? "sample" : getTokens()[key];
    state.selectedEvent = null; $("#tlDetail").innerHTML = "";
    if (token) {
      try {
        const r = await post("/api/forecast", { birth: birthOf(inp), months: state.months, token });
        if (mine !== seq) return;
        if (r.ok) {
          hydrate(r.data); showPaid(true); renderPaidNote(); renderTimeline(); renderChapters(); return;
        }
        if (r.status === 403 && !inp.sample) setToken(key, null);
      } catch (e) { if (mine !== seq) return; }
    }
    showPaid(false); renderLocked(mine);
  }

  async function renderPaidNote() {
    let el = $("#paidNote");
    if (!el) { el = document.createElement("div"); el.id = "paidNote"; el.className = "unlocked-note"; $("#paid").prepend(el); }
    if (state.input.sample) {
      const cfg = await getConfig();
      el.innerHTML = `<span class="pill accent">Sample</span><span>This is the full forecast for the sample chart, so you can see what's included. Enter your birth details above to unlock your own${cfg.price ? ` for ${priceText(cfg)}` : ""}.</span>`;
    } else {
      el.innerHTML = `<span class="pill flow">Unlocked</span><span>Full forecast unlocked for this chart. Come back any time; it moves forward with the sky.</span>`;
    }
  }

  async function renderLocked(mine) {
    const box = $("#locked"), cfg = await getConfig();
    if (mine !== seq) return;
    if (cfg.offline) {
      box.innerHTML = `<div class="offer" style="grid-column:1/-1"><h3>The full forecast lives on the website</h3><p>The weather calendar and chapters ahead are calculated by the Manual of the Self server, which this copy of the page can't reach.</p></div>`;
      return;
    }
    let t = null;
    try { const r = await post("/api/teaser", { birth: birthOf(state.input) }); if (r.ok) t = r.data; } catch (e) {}
    if (mine !== seq) return;
    // decorative, blurred stand-in for the timeline (no real dates)
    let ghosts = "", rnd = 7;
    const tones = ["flow", "friction", "blend"];
    for (let i = 0; i < 9; i++) { rnd = (rnd * 9301 + 49297) % 233280; const l = (rnd / 233280) * 70; rnd = (rnd * 9301 + 49297) % 233280; const w = 8 + (rnd / 233280) * 26;
      ghosts += `<span class="ghost ${tones[i % 3]}" style="top:${18 + i * 22}px; left:${l}%; width:${w}%"></span>`; }
    const hl = t && t.headline ? `The biggest: <strong>${P[t.headline.transit].name} ${t.headline.key} your ${P[t.headline.natal].name}</strong>.` : "";
    const stamp = t ? `<div class="stamp"><b>${t.chapters}</b><span>chapters in your next 9 months · ${t.peaks} exact peak dates${t.eclipses ? ` · ${t.eclipses} eclipse${t.eclipses > 1 ? "s" : ""}` : ""}</span></div>` : "";
    const buy = cfg.payments
      ? `<button type="button" class="btn" id="buyBtn">Unlock my forecast · ${priceText(cfg)}</button>${cfg.testMode ? `<span class="fine">Test mode: no real charges. Use card 4242 4242 4242 4242, any future date, any CVC.</span>` : ""}`
      : `<p class="fine">Purchases open soon. Meanwhile, look at the sample chart's full forecast to see what's included.</p>`;
    box.innerHTML = `
      <div class="peek" aria-hidden="true"><span class="lines"></span>${ghosts}${stamp}</div>
      <div class="offer">
        <h3>Your sky weather, dated</h3>
        ${hl ? `<p>${hl}</p>` : ""}
        <ul>
          <li>A calendar of every slow-planet transit to your chart, 3, 6 or 9 months ahead</li>
          <li>Peak days, retrogrades, eclipses and New and Full Moons</li>
          <li>A story and preparation notes for each chapter</li>
          <li>One payment, kept forever for this chart: it moves forward every time you come back</li>
        </ul>
        <div class="price">${priceText(cfg)}<small>one time</small></div>
        <div class="row">${buy}</div>
        ${cfg.payments ? `<span class="fine">All sales final; the forecast is delivered instantly. Questions: <a href="mailto:${esc(cfg.support || "tarotrightnow@gmail.com")}">${esc(cfg.support || "tarotrightnow@gmail.com")}</a></span>` : ""}
        <button type="button" class="linkbtn" id="seeSample" style="justify-self:start">See a full example on the sample chart</button>
        <p class="err" id="buyErr" role="alert"></p>
        ${cfg.payments ? `<div class="restore">
          <span class="fine">Already bought it on another device? Enter the birth details you bought it for above, then the email you used at checkout.</span>
          <div class="row"><input id="restoreEmail" type="email" autocomplete="email" placeholder="you@example.com" aria-label="Checkout email"><button type="button" class="btn ghost" id="restoreBtn">Restore</button></div>
          <span id="restoreMsg" role="status"></span>
        </div>` : ""}
      </div>`;
    $("#seeSample").addEventListener("click", () => { fillForm(SAMPLE); load({ ...SAMPLE }); $("#calSec").scrollIntoView({ block: "start" }); });
    const buyBtn = $("#buyBtn");
    if (buyBtn) buyBtn.addEventListener("click", async () => {
      buyBtn.disabled = true; $("#buyErr").textContent = "";
      try { localStorage.setItem(PENDING, JSON.stringify(state.input)); } catch (e) {}
      try {
        const r = await post("/api/checkout", { birth: birthOf(state.input) });
        if (r.ok && r.data.url) { location.assign(r.data.url); return; }
        $("#buyErr").textContent = r.data.error || "Couldn't start checkout. Please try again.";
      } catch (e) { $("#buyErr").textContent = "Couldn't reach the server. Check your connection and try again."; }
      buyBtn.disabled = false;
    });
    const rb = $("#restoreBtn");
    if (rb) rb.addEventListener("click", async () => {
      const msg = $("#restoreMsg"); msg.className = ""; msg.textContent = "Checking…"; rb.disabled = true;
      try {
        const r = await post("/api/restore", { email: $("#restoreEmail").value, birth: birthOf(state.input) });
        if (r.ok) { setToken(E.chartKey(state.input), r.data.token); msg.className = "ok"; msg.textContent = "Found it. Unlocking…"; loadForecast(); }
        else { msg.className = "err"; msg.textContent = r.data.error || "Couldn't find that purchase."; }
      } catch (e) { msg.className = "err"; msg.textContent = "Couldn't reach the server. Try again."; }
      rb.disabled = false;
    });
  }

  document.querySelectorAll(".seg button").forEach(b => b.addEventListener("click", () => {
    state.months = +b.dataset.m;
    document.querySelectorAll(".seg button").forEach(x => x.setAttribute("aria-pressed", x === b));
    loadForecast();
  }));

  function evTitle(e) { return `${P[e.transit].name} ${e.key} ${P[e.natal].name}`; }
  function evDates(e) {
    const ex = e.exacts.length ? `exact ${e.exacts.map(d => fmt(d)).join(" & ")}` : `closest ${fmt(e.peak)}`;
    return `${e.startedBefore ? "already active" : fmt(e.start)} → ${e.ongoing ? "continues past " + fmt(e.end) : fmt(e.end)} · ${ex}`;
  }

  function renderTimeline() {
    const { events, start, end } = state.cal, span = end - start;
    const pct = d => Math.max(0, Math.min(100, (d - start) / span * 100));
    let h = `<div class="tl-row tl-axis"><div class="tl-label"></div><div class="tl-track">`;
    const m = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    for (; m < end; m.setMonth(m.getMonth() + 1)) h += `<span class="tl-month" style="left:${pct(m)}%">${fmt(m, { month: "short", ...(m.getMonth() === 0 ? { year: "2-digit" } : {}) })}</span>`;
    h += `</div></div>`;
    const grid = () => { let g = ""; const mm = new Date(start.getFullYear(), start.getMonth() + 1, 1); for (; mm < end; mm.setMonth(mm.getMonth() + 1)) g += `<span class="tl-grid" style="left:${pct(mm)}%"></span>`; return g + `<span class="tl-today" style="left:0%" title="Today"></span>`; };
    const groups = ["pluto", "neptune", "uranus", "saturn", "jupiter", "node", "mars"];
    let idx = 0;
    const ids = [];
    for (const g of groups) {
      const evs = events.filter(e => e.transit === g);
      if (!evs.length) continue;
      // stack non-overlapping events into lanes
      const lanes = [];
      for (const e of evs) { let lane = lanes.find(l => l.at(-1).end < e.start); if (!lane) { lane = []; lanes.push(lane); } lane.push(e); }
      lanes.forEach((lane, li) => {
        h += `<div class="tl-row"><div class="tl-label">${li === 0 ? `<span class="glyph">${P[g].glyph}</span>${P[g].name}` : ""}</div><div class="tl-track">${grid()}`;
        for (const e of lane) {
          const i = idx++; ids.push(e);
          const tone = L.ASPECT_TEXT[e.key].tone, l = pct(e.start), w = Math.max(pct(e.end) - l, 1.2);
          h += `<button type="button" class="tl-bar ${tone}${state.selectedEvent === e ? " sel" : ""}" data-i="${i}" style="left:${l}%; width:${w}%" title="${esc(evTitle(e) + " · " + evDates(e))}"><span class="glyph">${L.ASPECT_TEXT[e.key] && E.ASPECTS.find(a => a.key === e.key).glyph}</span>${P[e.natal].name}</button>`;
          for (const x of (e.exacts.length ? e.exacts : [])) h += `<span class="tl-exact" style="left:${pct(x)}%; color:var(--${tone})"></span>`;
        }
        h += `</div></div>`;
      });
    }
    // retrogrades + eclipses row
    const retro = state.sky.filter(s => s.kind === "retro");
    if (retro.length) {
      h += `<div class="tl-row"><div class="tl-label"><span class="glyph">℞</span>Retrogrades</div><div class="tl-track">${grid()}`;
      for (const r of retro) { const l = pct(r.start), w = Math.max(pct(r.end) - l, 1); h += `<span class="tl-bar retro" style="left:${l}%; width:${w}%; cursor:default" title="${P[r.planet].name} retrograde ${fmt(r.start)} – ${fmt(r.end)}"><span class="glyph">${P[r.planet].glyph}</span>${P[r.planet].name}</span>`; }
      h += `</div></div>`;
    }
    const ecl = state.sky.filter(s => s.kind === "eclipse");
    const lun = state.sky.filter(s => s.kind === "lunation");
    h += `<div class="tl-row"><div class="tl-label"><span class="glyph">${L.PLANETS.moon.glyph}</span>Moons &amp; eclipses</div><div class="tl-track">${grid()}`;
    for (const s of lun) h += `<span class="tl-dot" style="left:${pct(s.date)}%; color:var(--muted)" title="${s.phase === "new" ? "New" : "Full"} Moon in ${L.signOf(s.lon).name} · ${fmt(s.date)}${s.house ? " · your " + L.ord(s.house) + " house" : ""}">${s.phase === "new" ? "●" : "○"}</span>`;
    for (const s of ecl) h += `<span class="tl-dot eclipse" style="left:${pct(s.date)}%" title="${s.type === "solar" ? "Solar" : "Lunar"} eclipse (${s.ekind}) in ${L.signOf(s.lon).name} · ${fmt(s.date)}">◐</span>`;
    h += `</div></div>`;
    $("#timeline").innerHTML = h;
    $("#timeline").querySelectorAll(".tl-bar[data-i]").forEach(b => b.addEventListener("click", () => {
      state.selectedEvent = ids[+b.dataset.i]; renderTimeline();
      $("#tlDetail").innerHTML = storyCard(state.selectedEvent, evDates(state.selectedEvent));
    }));
  }

  function renderChapters() {
    const f = state.filter;
    const evs = state.cal.events.filter(e => f === "all" ? true : f === "slow" ? SLOW.includes(e.transit) : L.ASPECT_TEXT[e.key].tone === f);
    const extra = f === "all" ? state.sky.filter(s => s.kind === "eclipse" || (s.kind === "retro" && s.planet !== "mars")) : [];
    const all = [...evs.map(e => ({ t: e.start, e })), ...extra.map(s => ({ t: s.start || s.date, s }))].sort((a, b) => a.t - b.t);
    const LIMIT = 9, items = state.showAll ? all : all.slice(0, LIMIT);
    $("#chapters").innerHTML = (items.length ? items.map(({ e, s }) => {
      if (e) {
        const st = L.transitStory(e, state.chart);
        return `<div class="chapter"><div class="when">${esc(evDates(e))}</div><div class="body">
          <h3><span class="glyph">${P[e.transit].glyph}</span>${esc(evTitle(e))} <span class="pill ${st.tone}">${TONE_LABEL[st.tone]}</span></h3>
          ${st.lines.map(l => `<p>${esc(l)}</p>`).join("")}<p><strong>Prepare:</strong> ${esc(st.prep.join(" "))}</p></div></div>`;
      }
      if (s.kind === "retro") return `<div class="chapter"><div class="when">${s.startedBefore ? "already active" : fmt(s.start)} → ${fmt(s.end)}</div><div class="body">
        <h3><span class="glyph">${P[s.planet].glyph}</span>${P[s.planet].name} retrograde <span class="pill">review</span></h3>
        <p>${s.planet === "mercury" ? "A season to revisit plans, messages and decisions. Back up files, re-read contracts and expect delays. Good for editing, not launching." : "A season to review relationships, money and what you value. Old connections may resurface. Hold off on big purchases or makeovers until it ends."}</p></div></div>`;
      return `<div class="chapter"><div class="when">${fmtY(s.date)}</div><div class="body">
        <h3><span class="glyph">◐</span>${s.type === "solar" ? "Solar" : "Lunar"} eclipse in ${L.signOf(s.lon).name} <span class="pill accent">turning point</span></h3>
        <p>Eclipses mark endings and beginnings that tend to unfold over the following six months${s.house ? `, here ${L.HOUSES[s.house].where}` : ""}.${s.hits.length ? ` It falls right on your ${s.hits.map(h => P[h.n].name).join(" and ")}, so it is personal for you.` : ""}</p></div></div>`;
    }).join("") : `<p class="empty">Nothing matching in this window. Try a longer forecast or another filter.</p>`)
      + (all.length > LIMIT ? `<div style="padding-top:14px; border-top:1px solid var(--line)"><button type="button" class="btn ghost" id="moreCh">${state.showAll ? "Show fewer" : `Show all ${all.length} chapters`}</button></div>` : "");
    const more = $("#moreCh"); if (more) more.addEventListener("click", () => { state.showAll = !state.showAll; renderChapters(); });
  }
  document.querySelectorAll("#filters .chipbtn").forEach(b => b.addEventListener("click", () => {
    state.filter = b.dataset.f; document.querySelectorAll("#filters .chipbtn").forEach(x => x.setAttribute("aria-pressed", x === b)); renderChapters();
  }));

  // ---------- manual + aspects ----------
  function renderManual() {
    const c = state.chart;
    let h = ORDER.map(k => {
      const p = c.planets[k], s = L.signOf(p.lon), pl = L.placement(k, p, c.timeKnown);
      return `<article class="card"><h3><span class="glyph">${P[k].glyph}</span>${P[k].name} in ${s.name}</h3>
        <div class="meta">${L.deg(p.lon)} ${s.name}${c.timeKnown && p.house ? ` · ${L.ord(p.house)} house` : ""}${p.retro ? " · ℞" : ""}</div>
        <p class="q" style="font-size:16px">${esc(pl.question)}</p><p style="font-size:14px">${esc(pl.text)}</p>
        <dl class="kv" style="font-size:13.5px"><dt>Strength</dt><dd>${esc(pl.gift)}</dd><dt>Growth edge</dt><dd>${esc(pl.edge)}</dd></dl>
        ${pl.retro ? `<p class="note" style="font-size:13px">${esc(pl.retro)}</p>` : ""}</article>`;
    }).join("");
    if (c.timeKnown) h = ["asc", "mc"].map(k => {
      const lon = k === "asc" ? c.houses.asc : c.houses.mc, s = L.signOf(lon), pl = L.anglePlacement(k, lon);
      return `<article class="card"><h3><span class="ac">${P[k].glyph}</span>${P[k].name} in ${s.name}</h3><div class="meta">${L.deg(lon)} ${s.name}</div>
        <p class="q" style="font-size:16px">${esc(pl.question)}</p><p style="font-size:14px">${esc(pl.text)}</p>
        <dl class="kv" style="font-size:13.5px"><dt>Strength</dt><dd>${esc(pl.gift)}</dd><dt>Growth edge</dt><dd>${esc(pl.edge)}</dd></dl></article>`;
    }).join("") + h;
    $("#manual").innerHTML = h;
  }
  function renderAspects() {
    const a = E.natalAspects(state.chart).slice(0, 9);
    $("#aspects").innerHTML = a.map(x => `<div class="asp"><div class="pair"><span>${P[x.a].glyph}</span><span style="color:var(--${x.tone})">${x.glyph}</span><span>${P[x.b].glyph}</span><span class="pill ${x.tone}" style="font-family:var(--body)">${x.key}</span></div>
      <div><strong>${P[x.a].name} ${x.key} ${P[x.b].name}</strong> <span class="mono" style="color:var(--muted); font-size:12.5px">orb ${x.orb.toFixed(1)}°</span><br>${esc(L.natalAspect(x))}</div></div>`).join("");
  }
  $("#gloss").innerHTML = L.GLOSSARY.map(([t, d]) => `<div><dt>${t}</dt><dd>${esc(d)}</dd></div>`).join("");

  // ---------- start ----------
  // Returning from Stripe Checkout: ?paid=<session id> or ?canceled=1
  async function handleReturn() {
    const q = new URLSearchParams(location.search), sid = q.get("paid");
    if (!sid && !q.has("canceled")) return null;
    history.replaceState(null, "", location.pathname);
    if (!sid) { notice("Checkout canceled. Nothing was charged.", false); return null; }
    let pending = null;
    try { pending = JSON.parse(localStorage.getItem(PENDING) || "null"); } catch (e) {}
    if (!pending) { notice("Payment received. Enter the birth details you bought it for, then use Restore with your checkout email.", false); return null; }
    try {
      const r = await post("/api/claim", { session_id: sid, birth: birthOf(pending) });
      if (r.ok) {
        setToken(E.chartKey(pending), r.data.token);
        try { localStorage.removeItem(PENDING); localStorage.setItem(STORE, JSON.stringify(pending)); } catch (e) {}
        notice("Thank you. Your full forecast is unlocked below.", true);
      } else notice(r.data.error || "Couldn't confirm the payment. Refresh to try again.", false);
    } catch (e) { notice("Couldn't confirm the payment. Refresh to try again.", false); }
    return pending;
  }
  function notice(text, good) {
    let el = $("#notice");
    if (!el) { el = document.createElement("p"); el.id = "notice"; el.setAttribute("role", "status"); $("#banner").after(el); }
    el.className = good ? "ok" : "err"; el.textContent = text;
    if (good) setTimeout(() => $("#calSec").scrollIntoView({ block: "start" }), 400);
  }

  (async () => {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) {}
    const claimed = await handleReturn();
    const start = claimed || (saved && saved.date ? saved : { ...SAMPLE });
    fillForm(start); load(start);
  })();
})();
