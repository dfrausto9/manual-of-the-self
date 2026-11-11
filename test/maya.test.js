// Checks the Maya day count against dates whose Maya date is well established.
const test = require("node:test");
const assert = require("node:assert/strict");
const M = require("../shared/maya.js");

const name = d => `${d.number} ${M.SIGNS[d.sign - 1].name}`;
const haab = d => `${d.haab.day} ${d.haab.name}`;

test("the end of the 13th b'ak'tun: Dec 21, 2012 is 13.0.0.0.0, 4 Ajaw 3 K'ank'in", () => {
  const d = M.day(2012, 12, 21);
  assert.equal(d.longCountText, "13.0.0.0.0");
  assert.equal(name(d), "4 Ajaw");
  assert.equal(haab(d), "3 K'ank'in");
  assert.equal(d.kin, 160);
});

test("Aug 20, 1991 is 12.18.18.6.6, 10 Kimi 14 Yaxk'in, day 166, in the trecena of 1 Kaban", () => {
  const d = M.day(1991, 8, 20);
  assert.equal(d.longCountText, "12.18.18.6.6");
  assert.equal(name(d), "10 Kimi");
  assert.equal(haab(d), "14 Yaxk'in");
  assert.equal(d.kin, 166);
  assert.equal(`${d.trecena.number} ${M.SIGNS[d.trecena.sign - 1].name}`, "1 Kaban");
});

test("the Long Count's zero date is 0.0.0.0.0, 4 Ajaw 8 Kumk'u", () => {
  // Aug 11, 3114 BCE in the proleptic Gregorian calendar = astronomical year -3113
  const d = M.day(-3113, 8, 11);
  assert.equal(d.longCountText, "0.0.0.0.0");
  assert.equal(name(d), "4 Ajaw");
  assert.equal(haab(d), "8 Kumk'u");
});

test("Jan 1, 2000 is 12.19.6.15.2, 11 Ik' 10 K'ank'in", () => {
  const d = M.day(2000, 1, 1);
  assert.equal(d.longCountText, "12.19.6.15.2");
  assert.equal(name(d), "11 Ik'");
  assert.equal(haab(d), "10 K'ank'in");
});

test("consecutive days step the number and the sign by one, and the count repeats after 260 days", () => {
  let prev = M.day(2026, 1, 1);
  const base = M.jdn(2026, 1, 1);
  for (let i = 1; i <= 520; i++) {
    const dt = new Date(Date.UTC(2026, 0, 1 + i));
    const d = M.day(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
    assert.equal(M.jdn(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()), base + i);
    assert.equal(d.number, prev.number % 13 + 1);
    assert.equal(d.sign, prev.sign % 20 + 1);
    prev = d;
  }
  assert.deepEqual(M.day(2026, 1, 1).kin, M.day(2026, 9, 18).kin);   // 260 days apart
});

test("days until the next Kimi day and the next 10 Kimi, counted from Nov 10, 2026", () => {
  const u = M.daysUntil(2026, 11, 10, 10, 6);
  assert.equal(u.sign, 14);    // Nov 24, 2026
  assert.equal(u.day, 134);    // Mar 24, 2027
  const on = M.day(1991, 8, 20), same = M.daysUntil(1991, 8, 20, on.number, on.sign);
  assert.equal(same.sign, 20); // on the day itself, the next one is a full cycle away
  assert.equal(same.day, 260);
});

test("every sign and number has its copy", () => {
  assert.equal(M.SIGNS.length, 20);
  assert.equal(M.NUMBERS.length, 13);
  for (const s of M.SIGNS) for (const k of ["name", "kiche", "themes", "reading", "watch"]) assert.ok(s[k], `${s.name} ${k}`);
  for (const n of M.NUMBERS) for (const k of ["strength", "line"]) assert.ok(n[k]);
  assert.deepEqual(M.NUMBERS.map(n => n.strength), ["gentle", "gentle", "gentle", "moderate", "moderate", "moderate", "measured", "measured", "measured", "strong", "strong", "strong", "strong"]);
});
