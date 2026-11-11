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
    if (!inp.sample) saveProfile(inp);
    renderAll(); renderProfiles();
  }

  // ---------------- render ----------------
  function renderAll() {
    const c = state.chart, inp = state.input;
    const local = new Date(c.date.getTime() + E.tzOffsetMinutes(c.date.getTime(), inp.tz) * 60000);
    const when = local.toLocaleString(undefined, { timeZone: "UTC", year: "numeric", month: "long", day: "numeric", ...(c.timeKnown ? { hour: "numeric", minute: "2-digit" } : {}) });
    $("#banner").innerHTML = inp.sample
      ? `<span class="pill accent">Sample chart</span><span>Born ${esc(when)} in ${esc(inp.label)}. Enter your own birth details above to read your chart.</span>`
      : `<span class="pill accent">${esc(inp.name || "Your chart")}</span><span>Born ${esc(when)} in ${esc(inp.label)}${c.timeKnown ? "" : " · birth time unknown, so houses and the Ascendant are left out"}.</span>`;
    renderOverview(); renderWheel(); renderReading(); renderNow(); renderManual(); renderAspects(); renderMaya(); loadForecast();
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
  // Paid depth (from the server) under the story: where you are in it, what it asks, what to watch for
  const ul = a => `<ul>${a.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
  function depthHtml(d) {
    return `${d.asking.length ? `<span class="prep">What it's asking of you</span>${ul(d.asking)}` : ""}${d.question ? `<p class="q">“${esc(d.question)}”</p>` : ""}
      ${d.watch.length ? `<span class="prep">Keep an eye out for</span>${ul(d.watch)}` : ""}`;
  }
  // Free teaser: one real line, the rest is a blurred placeholder (no paid text is sent to the browser)
  function teaserHtml(t) {
    return `<span class="prep">Keep an eye out for</span><ul><li>${esc(t.line)}</li></ul>
      <div class="depth-lock"><div class="blur" aria-hidden="true"><ul><li>Notes on what this transit is asking of you</li><li>More situations to keep an eye out for</li></ul><p>Where you are in it right now, and a question to sit with</p></div>
      <div class="lockmsg"><span class="pill accent">+${t.more} more notes</span><span>What this asks of you, what to watch for and where you are in it, in your full forecast.</span><a href="#locked" class="btn sm" style="text-decoration:none">Unlock my forecast</a></div></div>`;
  }
  function storyCard(e, dates, extra) {
    const st = L.transitStory(e, state.chart), d = extra && extra.prepare ? extra : null, t = extra && extra.line ? extra : null;
    return `<article class="card"><div class="ttl"><h3><span class="glyph">${P[e.transit].glyph}</span> ${P[e.transit].name} ${e.key} your ${P[e.natal].name}</h3><span class="pill ${st.tone}">${TONE_LABEL[st.tone]}</span></div>
      <div class="meta">${dates}</div>
      <div class="story">${st.lines.map(l => `<p>${esc(l)}</p>`).join("")}</div>
      ${d && d.now ? `<span class="prep">Right now</span><p class="now">${esc(d.now)}</p>` : ""}
      <span class="prep">How to prepare</span>${ul(d ? d.prepare : st.prep)}
      ${d ? depthHtml(d) : t ? teaserHtml(t) : ""}</article>`;
  }
  const idOf = e => `${e.transit}|${e.key}|${e.natal}`;
  function renderNow() {
    const list = E.currentTransits(state.chart, state.now).slice(0, 6);
    $("#nowSub").textContent = `${fmtY(state.now)}. The strongest angles the sky is making to your chart today, slow planets first.`;
    $("#now").innerHTML = list.length ? list.map(t => storyCard(t, `orb ${t.orb.toFixed(1)}° · ${t.applying ? "building" : "easing"}${t.retro ? " · retrograde" : ""} · lasts ${L.TRANSIT[t.transit].pace}`, (state.nowNotes || {})[idOf(t)])).join("")
      : `<p class="empty">A quiet sky for you today: no major angles to your chart.</p>`;
  }

  // ---------- calendar ----------
  // The full forecast is calculated on the server and needs an unlock token (the sample chart is open to all).
  const TOKENS = "manual-of-the-self.tokens", PENDING = "manual-of-the-self.pending";
  const getTokens = () => { try { return JSON.parse(localStorage.getItem(TOKENS) || "{}"); } catch (e) { return {}; } };
  const setToken = (k, t) => { try { const m = getTokens(); if (t) m[k] = t; else delete m[k]; localStorage.setItem(TOKENS, JSON.stringify(m)); } catch (e) {} renderProfiles(); };
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
  // Google Ads: load the tag only when the site has an Ads ID set, and report a purchase once per payment
  let adsReady = null;
  function ads(cfg) {
    if (!cfg || !cfg.ads) return null;
    if (!adsReady) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date()); window.gtag("config", cfg.ads.id);
      const s = document.createElement("script"); s.async = true;
      s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(cfg.ads.id);
      document.head.appendChild(s); adsReady = true;
    }
    return cfg.ads;
  }
  async function trackPurchase(data) {
    const cfg = await getConfig(), a = ads(cfg); if (!a) return;
    const cents = data && data.amount != null ? data.amount : cfg.price;
    window.gtag("event", "conversion", { send_to: a.id + "/" + a.label, value: cents / 100, currency: "USD", transaction_id: (data && data.ref) || "" });
  }
  const money = cents => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
  const priceText = c => money(c.price);
  // last day of the sale, in Pacific time ("Nov 30")
  const saleEnds = c => new Date(Date.parse(c.sale.endsAt) - 1).toLocaleDateString(undefined, { timeZone: "America/Los_Angeles", month: "short", day: "numeric" });
  const priceHtml = c => c.sale ? `<s>${money(c.regularPrice)}</s> ${priceText(c)}` : priceText(c);
  async function renderSale() {
    const c = await getConfig();
    if (!c.sale || !c.regularPrice) return;
    const bar = $("#salebar");
    bar.innerHTML = `<span class="pill accent">${esc(c.sale.name)}</span><span>Full weather forecast <strong>${priceText(c)}</strong> <s>${money(c.regularPrice)}</s>, one time per profile. Ends ${esc(saleEnds(c))}.</span>`;
    bar.hidden = false;
    $("#priceLine").innerHTML = `<s>${money(c.regularPrice)}</s> ${priceText(c)} one time, per profile (${esc(c.sale.name)} through ${esc(saleEnds(c))})`;
  }

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
    if (state.nowNotes) { state.nowNotes = null; renderNow(); }
    if (token) {
      try {
        const r = await post("/api/forecast", { birth: birthOf(inp), months: state.months, token });
        if (mine !== seq) return;
        if (r.ok) {
          state.nowNotes = r.data.now || null; renderNow();
          hydrate(r.data); showPaid(true); renderPaidNote(); renderTimeline(); renderChapters(); renderMayaAhead(); return;
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
    if (t && t.now) { state.nowNotes = t.now; renderNow(); }
    // decorative, blurred stand-in for the timeline (no real dates)
    let ghosts = "", rnd = 7;
    const tones = ["flow", "friction", "blend"];
    for (let i = 0; i < 9; i++) { rnd = (rnd * 9301 + 49297) % 233280; const l = (rnd / 233280) * 70; rnd = (rnd * 9301 + 49297) % 233280; const w = 8 + (rnd / 233280) * 26;
      ghosts += `<span class="ghost ${tones[i % 3]}" style="top:${18 + i * 22}px; left:${l}%; width:${w}%"></span>`; }
    const hl = t && t.headline ? `The biggest: <strong>${P[t.headline.transit].name} ${t.headline.key} your ${P[t.headline.natal].name}</strong>.` : "";
    const stamp = t ? `<div class="stamp"><b>${t.chapters}</b><span>chapters in your next 9 months · ${t.peaks} exact peak dates${t.eclipses ? ` · ${t.eclipses} eclipse${t.eclipses > 1 ? "s" : ""}` : ""}</span></div>` : "";
    const buy = cfg.payments
      ? `<button type="button" class="btn" id="buyBtn">Unlock my forecast · ${priceText(cfg)}</button>${cfg.testMode ? `<span class="fine">Test mode: no real charges. Use card 4242 4242 4242 4242, any future date, any CVC.</span>` : ""}`
        + (cfg.paypal ? `</div><div class="paypal-row"><span class="fine">or pay with PayPal${cfg.paypal.sandbox ? " (sandbox: sign in with a PayPal sandbox buyer account)" : ""}</span><div id="paypalBtns"></div>` : "")
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
        ${cfg.sale ? `<span class="pill accent" style="justify-self:start">${esc(cfg.sale.name)} · ends ${esc(saleEnds(cfg))}</span>` : ""}
        <div class="price">${priceHtml(cfg)}<small>one time</small></div>
        <div class="row">${buy}</div>
        ${cfg.payments ? `<span class="fine">All sales final; the forecast is delivered instantly. Questions: <a href="mailto:${esc(cfg.support || "tarotrightnow@gmail.com")}">${esc(cfg.support || "tarotrightnow@gmail.com")}</a></span>` : ""}
        <button type="button" class="linkbtn" id="seeSample" style="justify-self:start">See a full example on the sample chart</button>
        <p class="err" id="buyErr" role="alert"></p>
        ${cfg.payments ? `<div class="restore">
          <span class="fine">Already bought it on another device? Enter the birth details you bought it for above, then the email you used at checkout (or your PayPal email).</span>
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
    if (cfg.paypal && $("#paypalBtns")) renderPayPal(cfg, $("#paypalBtns"));
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

  // PayPal: PayPal's own checkout window; the server creates the order and confirms the payment
  let paypalSdk = null;
  function loadPayPal(cfg) {
    if (!paypalSdk) paypalSdk = new Promise((ok, fail) => {
      const s = document.createElement("script");
      s.src = "https://www.paypal.com/sdk/js?" + new URLSearchParams({ "client-id": cfg.paypal.clientId, currency: "USD", intent: "capture",
        components: "buttons", "disable-funding": "card,credit,paylater" });
      s.onload = () => (window.paypal ? ok(window.paypal) : fail(new Error("PayPal didn't load")));
      s.onerror = () => { paypalSdk = null; fail(new Error("PayPal didn't load")); };
      document.head.appendChild(s);
    });
    return paypalSdk;
  }
  async function renderPayPal(cfg, el) {
    let pp;
    try { pp = await loadPayPal(cfg); } catch (e) { el.innerHTML = `<span class="fine">PayPal couldn't load right now. Card checkout above still works.</span>`; return; }
    if (!el.isConnected) return;
    let buying = null;   // the chart being paid for, fixed when the PayPal window opens
    pp.Buttons({
      style: { layout: "horizontal", color: "gold", shape: "rect", label: "pay", height: 44, tagline: false },
      createOrder: async () => {
        $("#buyErr").textContent = "";
        buying = { ...state.input };
        try { localStorage.setItem(PENDING, JSON.stringify(buying)); } catch (e) {}
        const r = await post("/api/paypal/order", { birth: birthOf(buying) });
        if (!r.ok || !r.data.id) throw new Error(r.data.error || "Couldn't start PayPal. Please try again.");
        return r.data.id;
      },
      onApprove: async data => {
        const r = await post("/api/paypal/capture", { order_id: data.orderID, birth: birthOf(buying) });
        if (r.ok) {
          setToken(E.chartKey(buying), r.data.token);
          try { localStorage.removeItem(PENDING); localStorage.setItem(STORE, JSON.stringify(buying)); } catch (e) {}
          notice("Thank you. Your full forecast is unlocked below.", true);
          trackPurchase(r.data);
          loadForecast();
        } else $("#buyErr").textContent = r.data.error || "Couldn't confirm the PayPal payment. Refresh and use Restore with your PayPal email.";
      },
      onCancel: () => { $("#buyErr").textContent = "PayPal canceled. Nothing was charged."; },
      onError: err => { $("#buyErr").textContent = (err && err.message && !/^Error/.test(err.message) && err.message.length < 140) ? err.message : "PayPal hit a problem. Please try again, or use card checkout."; },
    }).render(el).catch(() => {});
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
      $("#tlDetail").innerHTML = storyCard(state.selectedEvent, evDates(state.selectedEvent), state.selectedEvent.depth);
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
          ${st.lines.map(l => `<p>${esc(l)}</p>`).join("")}<p><strong>Prepare:</strong> ${esc((e.depth ? e.depth.prepare : st.prep).join(" "))}</p>
          ${e.depth && e.depth.watch.length ? `<p><strong>Keep an eye out for:</strong> ${esc(e.depth.watch.map((w, i) => i ? w[0].toLowerCase() + w.slice(1) : w).join("; "))}.</p>` : ""}
          ${e.depth && e.depth.question ? `<p class="q">“${esc(e.depth.question)}”</p>` : ""}</div></div>`;
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
  // ---------- Maya days ahead (part of the paid forecast) ----------
  function renderMayaAhead() {
    const [y, m, d] = state.input.date.split("-").map(Number), birth = MAYA.day(y, m, d);
    const t = state.now, at = n => new Date(t.getFullYear(), t.getMonth(), t.getDate() + n);
    const dayOf = dt => MAYA.day(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
    const label = md => `${md.number} ${MAYA.SIGNS[md.sign - 1].name}`;
    $("#mayaDays").innerHTML = [...Array(9)].map((_, i) => {
      const dt = at(i), md = dayOf(dt), s = MAYA.SIGNS[md.sign - 1], mine = md.sign === birth.sign;
      const tag = mine && md.number === birth.number ? "Your Maya birthday" : mine ? "Your day sign" : md.number === 1 ? "New 13-day week" : "";
      return `<div class="maya-day ${i === 0 ? "today" : mine ? "mine" : md.number === 1 ? "new" : ""}"><span class="d">${i === 0 ? "Today" : fmt(dt)}</span>
        <span class="n">${esc(label(md))}</span><span class="t">${esc(s.themes)}</span>${tag ? `<span class="tag">${tag}</span>` : ""}</div>`;
    }).join("");
    const today = dayOf(t), until = MAYA.daysUntil(t.getFullYear(), t.getMonth() + 1, t.getDate(), birth.number, birth.sign);
    const wk = 14 - today.number, wkDay = dayOf(at(wk)), wkSign = MAYA.SIGNS[wkDay.sign - 1];
    const mineDay = dayOf(at(until.sign)), sign = MAYA.SIGNS[birth.sign - 1], num = MAYA.NUMBERS[mineDay.number - 1];
    const note = (when, title, pill, tone, lines) => `<div class="chapter"><div class="when">${when}</div><div class="body">
      <h3>${esc(title)} <span class="pill ${tone}">${pill}</span></h3>${lines.map(l => `<p>${l}</p>`).join("")}</div></div>`;
    $("#mayaNotes").innerHTML =
      note(`${fmt(at(wk))} → ${fmt(at(wk + 12))}`, "A new 13-day week begins", "New cycle", "blend",
        [`The count returns to 1 on ${esc(wkSign.name)} (${esc(wkSign.themes.toLowerCase())}). Low numbers are the gentle ones, so the week opens quietly and gathers strength as the numbers climb.`]) +
      (until.sign === until.day ? "" : note(fmtY(at(until.sign)), `${label(mineDay)}: your day sign returns`, "Your sign", "accent",
        [`Your day sign comes round every 20 days. This time it carries the number ${mineDay.number}, which is ${num.strength}.`, `<strong>Keep an eye out for:</strong> ${esc(sign.watch)}`])) +
      note(fmtY(at(until.day)), `Your ${label(birth)} returns`, "Maya birthday", "accent",
        [`Your Maya birthday comes round every 260 days, and the next is ${until.day} day${until.day === 1 ? "" : "s"} away. Use it to look at what ended and what began since the last one.`]);
  }

  // ---------- your Maya day ----------
  // The Maya day of the birth date (the calendar date at the birthplace). Needs no birth time or place.
  const MAYA_ART = ["imix", "ik", "akbal", "kan", "chikchan", "kimi", "manik", "lamat", "muluk", "ok", "chuwen", "eb", "ben", "ix", "men", "kib", "kaban", "etznab", "kawak", "ajaw"];   // static/maya-<name>.jpg, in sign order
  function mayaNumeral(n) {
    // Maya numerals: a dot is one, a bar is five; dots sit above the bars
    const dots = n % 5, bars = Math.floor(n / 5), rows = (dots ? 1 : 0) + bars;
    const h = (dots ? 14 : 0) + bars * 12 + (rows - 1) * 8;
    let y = (96 - h) / 2, out = "";
    if (dots) { const x0 = 48 - (dots - 1) * 10; for (let i = 0; i < dots; i++) out += `<circle cx="${x0 + i * 20}" cy="${y + 7}" r="7"/>`; y += 22; }
    for (let i = 0; i < bars; i++) { out += `<rect x="14" y="${y}" width="68" height="12" rx="4"/>`; y += 20; }
    return `<svg width="96" height="96" viewBox="0 0 96 96" fill="currentColor" aria-hidden="true">${out}</svg>`;
  }
  function renderMaya() {
    const [y, m, d] = state.input.date.split("-").map(Number);
    const day = MAYA.day(y, m, d), sign = MAYA.SIGNS[day.sign - 1], num = MAYA.NUMBERS[day.number - 1];
    const trecena = MAYA.SIGNS[day.trecena.sign - 1];
    const t = state.now, until = MAYA.daysUntil(t.getFullYear(), t.getMonth() + 1, t.getDate(), day.number, day.sign);
    const ahead = n => fmtY(new Date(t.getFullYear(), t.getMonth(), t.getDate() + n));
    const big = (k, v, sub) => `<div class="big"><span class="k">${k}</span><span class="v">${esc(v)}</span><span class="s">${sub}</span></div>`;
    $("#maya").innerHTML =
      `<div class="maya-card">
        <div class="maya-glyph"><img src="/maya-${MAYA_ART[day.sign - 1]}.jpg" alt="Illustration for the day ${esc(sign.name)}" width="232" height="128">
          <span role="img" aria-label="The number ${day.number} in Maya bar-and-dot numerals">${mayaNumeral(day.number)}</span></div>
        <div class="maya-body">
          <div class="maya-ttl"><span class="maya-name">${day.number} ${esc(sign.name)}</span><span class="mono">Day ${day.kin} of 260 · K'iche' name ${esc(sign.kiche)}</span></div>
          <div class="chips"><span class="pill accent">${esc(sign.themes)}</span><span class="pill">Number ${day.number} of 13 · ${num.strength}</span></div>
          <p>${esc(sign.reading)}</p>
          <p>${esc(num.line)}</p>
          <p class="note"><strong>Keep an eye out.</strong> ${esc(sign.watch)}</p>
        </div>
      </div>
      <div class="maya-stats">` +
        big("Trecena", `1 ${trecena.name}`, "The 13-day week you were born in") +
        big("Haab'", `${day.haab.day} ${day.haab.name}`, "Your place in the 365-day year") +
        big("Long Count", day.longCountText, "Days since the Maya creation date") +
      `</div>
      <div class="maya-foot">
        <div class="mono"><span>Next ${esc(sign.name)} day · ${ahead(until.sign)}</span><span>Your next ${day.number} ${esc(sign.name)} · ${ahead(until.day)}</span></div>
        <details class="maya-how"><summary>How the Maya count works</summary>
          <p>Each day the number moves up one, from 1 to 13, and the sign moves on one, through 20 signs. The same pairing returns every 260 days, so your Maya birthday comes round more often than your calendar one. The trecena is the 13-day week that began on number 1 before you were born. The Haab' is the solar year: 18 months of 20 days plus 5 closing days. The Long Count numbers the days from a starting point in 3114 BCE.</p>
        </details>
      </div>
      <p class="maya-src">Source: the day readings follow the teaching of K'iche' daykeepers in Momostenango, Guatemala, as recorded by Barbara Tedlock in <cite>Time and the Highland Maya</cite> (revised edition, University of New Mexico Press, 1992). Sayings from Chichicastenango are as given in Kenneth Johnson, <cite>Jaguar Wisdom</cite> (Llewellyn, 1997). Daykeepers read a day through its rituals, not by translating its name. The picture illustrates the traditional Yucatec day name. No day is simply good or bad: each names its difficulty so that it can be met, and each has its own rites for setting things right. The "you tend to" wording is this site's own. Offered as a tool for reflection and planning.</p>`;
  }

  $("#gloss").innerHTML = L.GLOSSARY.map(([t, d]) => `<div><dt>${t}</dt><dd>${esc(d)}</dd></div>`).join("");


  // ---------- saved profiles ----------
  // Every chart a visitor reads is kept in this browser (no account). A backup link or file moves them, with any unlock tokens, to another device.
  const PROFILES = "manual-of-the-self.profiles";
  const getProfiles = () => { try { const a = JSON.parse(localStorage.getItem(PROFILES) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const setProfiles = a => { try { localStorage.setItem(PROFILES, JSON.stringify(a)); } catch (e) {} };
  const FIELDS = ["name", "date", "time", "noTime", "city", "manual", "lat", "lon", "tz", "label"];
  const clean = inp => { const o = {}; for (const f of FIELDS) if (inp[f] !== undefined) o[f] = inp[f]; return o; };
  function saveProfile(inp) {
    const key = E.chartKey(inp), list = getProfiles(), i = list.findIndex(p => p.key === key);
    const entry = { ...clean(inp), key, saved: (i >= 0 && list[i].saved) || new Date().toISOString().slice(0, 10) };
    if (i >= 0) { if (!inp.name && list[i].name) entry.name = list[i].name; list[i] = entry; } else list.push(entry);
    setProfiles(list);
  }
  const profName = (p, i) => p.name || `Chart ${i + 1}`;
  const bornText = p => {
    const [y, m, d] = p.date.split("-").map(Number);
    const day = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
    return `${day}${p.noTime ? "" : " · " + p.time} · ${p.label || p.city || ""}`;
  };
  function renderProfiles() {
    const bar = $("#profbar"); if (!bar) return;
    const list = getProfiles(), tokens = getTokens(), cur = state.input && !state.input.sample ? E.chartKey(state.input) : null;
    $("#profchips").innerHTML = list.length ? list.map((p, i) => `<button type="button" class="profchip" data-k="${esc(p.key)}" aria-current="${p.key === cur}">${esc(profName(p, i))}<span class="st${tokens[p.key] ? " on" : ""}">${tokens[p.key] ? "forecast ✓" : "free"}</span></button>`).join("")
      : `<span class="hint">Read a chart above and it's saved here, free. No account needed.</span>`;
    $("#profManage").hidden = !list.length;
    $("#proflist").innerHTML = list.map((p, i) => `<div class="profrow" aria-current="${p.key === cur}">
        <span class="nm">${esc(profName(p, i))} <span class="pill ${tokens[p.key] ? "flow" : ""}">${tokens[p.key] ? "Forecast unlocked" : "Free chart"}</span></span>
        <span class="meta">${esc(bornText(p))}</span>
        <span class="acts"><button type="button" class="btn sm" data-open="${esc(p.key)}">Open</button><button type="button" class="btn ghost sm" data-ren="${esc(p.key)}">Rename</button><button type="button" class="btn ghost sm" data-del="${esc(p.key)}" aria-label="Delete ${esc(profName(p, i))}">Delete</button></span>
      </div>`).join("") || `<p class="pnote">No saved profiles yet.</p>`;
  }
  function openProfile(key) {
    const p = getProfiles().find(x => x.key === key); if (!p) return;
    const inp = clean(p); fillForm(inp); load(inp);
    try { localStorage.setItem(STORE, JSON.stringify(inp)); } catch (e) {}
  }
  $("#profchips").addEventListener("click", e => { const b = e.target.closest("[data-k]"); if (b) openProfile(b.dataset.k); });
  const dlg = $("#profDlg");
  $("#profManage").addEventListener("click", () => { $("#profMsg").textContent = ""; renderProfiles(); dlg.showModal(); });
  $("#profClose").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
  $("#proflist").addEventListener("click", e => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.dataset.open) { dlg.close(); openProfile(t.dataset.open); $("#banner").scrollIntoView({ block: "start" }); }
    if (t.dataset.ren) {
      const list = getProfiles(), p = list.find(x => x.key === t.dataset.ren);
      const n = prompt("Name for this profile", p.name || ""); if (n === null) return;
      p.name = n.trim().slice(0, 40); setProfiles(list);
      if (state.input && E.chartKey(state.input) === p.key) { state.input.name = p.name; $("#fName").value = p.name; renderAll(); }
      renderProfiles();
    }
    if (t.dataset.del) {
      const list = getProfiles(), p = list.find(x => x.key === t.dataset.del);
      const paid = !!getTokens()[p.key];
      if (!confirm(`Delete “${p.name || "this chart"}” from this browser?${paid ? " Its forecast unlock goes too, but you can get it back any time with Restore and your checkout email." : ""}`)) return;
      setProfiles(list.filter(x => x.key !== p.key)); setToken(p.key, null);
    }
  });
  // backup: profiles + their unlock tokens, as a link (#backup=...) or a JSON file
  const b64 = { enc: s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
                dec: s => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/")))) };
  function backupData() {
    const list = getProfiles(), tokens = getTokens(), t = {};
    for (const p of list) if (tokens[p.key]) t[p.key] = tokens[p.key];
    return { app: "manual-of-the-self", v: 1, profiles: list.map(clean), tokens: t };
  }
  function importData(data) {
    if (!data || data.app !== "manual-of-the-self" || !Array.isArray(data.profiles)) throw new Error("bad");
    const list = getProfiles(); let added = 0;
    for (const raw of data.profiles) {
      if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw.date) || !isFinite(raw.lat) || !isFinite(raw.lon) || !raw.tz) continue;
      const p = clean(raw); p.key = E.chartKey(p); p.saved = new Date().toISOString().slice(0, 10);
      if (!list.some(x => x.key === p.key)) { list.push(p); added++; }
    }
    setProfiles(list);
    for (const [k, v] of Object.entries(data.tokens || {})) if (typeof v === "string" && !getTokens()[k]) setToken(k, v);
    renderProfiles();
    return added;
  }
  $("#profCopy").addEventListener("click", async () => {
    const url = `${location.origin}${location.pathname}#backup=${b64.enc(JSON.stringify(backupData()))}`;
    try { await navigator.clipboard.writeText(url); $("#profMsg").textContent = "Backup link copied. Open it on your other device."; }
    catch (e) { prompt("Copy your backup link:", url); }
  });
  $("#profDownload").addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(backupData(), null, 2)], { type: "application/json" }));
    a.download = `manual-of-the-self-profiles-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $("#profImport").addEventListener("change", async e => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    try { const n = importData(JSON.parse(await f.text())); $("#profMsg").textContent = n ? `Added ${n} profile${n > 1 ? "s" : ""}.` : "Those profiles are already saved here."; }
    catch (err) { $("#profMsg").textContent = "That file isn't a Manual of the Self backup."; }
  });
  function handleBackupLink() {
    const m = location.hash.match(/^#backup=([\w-]+)$/); if (!m) return;
    history.replaceState(null, "", location.pathname + location.search);
    try {
      const data = JSON.parse(b64.dec(m[1]));
      const n = data.profiles ? data.profiles.length : 0;
      if (!confirm(`Add ${n} saved profile${n === 1 ? "" : "s"} from your backup link to this browser?`)) return;
      importData(data);
    } catch (e) { alert("That backup link looks incomplete. Copy it again from your other device."); }
  }

  // ---------- start ----------
  getConfig().then(ads).catch(() => {});   // Ads tag on landing, so a later purchase is credited to the ad click
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
        trackPurchase(r.data);
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
    if (saved && saved.date && !saved.sample && !getProfiles().length) { try { if (resolve({ ...saved })) saveProfile(saved); } catch (e) {} }
    handleBackupLink();
    renderProfiles();
    renderSale();
    const claimed = await handleReturn();
    const start = claimed || (saved && saved.date ? saved : { ...SAMPLE });
    fillForm(start); load(start);
  })();
})();
