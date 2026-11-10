/* ===================== MAYA DAY COUNT =====================
   Turns a calendar date into its place in the Maya counts: the 260-day Tzolk'in (a number 1-13 and one of
   20 day signs), the 365-day Haab' and the Long Count. Pure date arithmetic: no birth time or place.
   Uses the traditional count still kept by daykeepers in Guatemala (correlation constant 584283), not Dreamspell.
   The sign meanings follow widely shared tradition; the readings and "keep an eye out" lines are this site's own. */
const MAYA = (() => {
  const CORRELATION = 584283;   // Julian Day Number of Long Count 0.0.0.0.0 (4 Ajaw 8 Kumk'u)
  const mod = (n, m) => ((n % m) + m) % m;

  // Julian Day Number of a Gregorian calendar date
  function jdn(y, m, d) {
    const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }

  // name: modern Yucatec spelling · kiche: the name living K'iche' daykeepers use
  const SIGNS = [
    { name: "Imix", kiche: "Imox", meaning: "Water lily, the first waters",
      reading: "Imix is the day of beginnings and nourishment. You tend to start things, feed things, and sense what a situation needs before anyone says it.",
      watch: "Starting more than you can tend. Pick what to raise and let the rest go." },
    { name: "Ik'", kiche: "Iq'", meaning: "Wind, breath",
      reading: "Ik' is the day of breath, voice and spirit. You tend to move ideas between people, and your words carry further than you expect.",
      watch: "Changing direction with every gust. Say less, and mean it." },
    { name: "Ak'bal", kiche: "Aq'ab'al", meaning: "Night, the house",
      reading: "Ak'bal is the dark before dawn and the shelter of home. You tend to do your best thinking in private, and you are at ease with what others avoid looking at.",
      watch: "Staying inside too long. Bring what you find in the dark into the day." },
    { name: "K'an", kiche: "K'at", meaning: "Seed, ripe maize",
      reading: "K'an is the day of the seed and the harvest. You tend to see potential early and have the patience to grow it.",
      watch: "Hoarding what is ripe. A harvest left unshared spoils." },
    { name: "Chikchan", kiche: "Kan", meaning: "Serpent",
      reading: "Chikchan is the day of life force and instinct. You tend to feel things in your body first, and your energy is hard to ignore.",
      watch: "Striking before you think. Let the first surge pass, then act." },
    { name: "Kimi", kiche: "Kame", meaning: "Death, transformation",
      reading: "Kimi is the day of endings that make room. In the living K'iche' tradition it is a calm day for honoring those who came before. You tend to stay steady when things change, and you are at ease with closings that unsettle other people.",
      watch: "Holding on past the point of usefulness. Finish things on purpose, then let them rest." },
    { name: "Manik'", kiche: "Kej", meaning: "Deer, the hand",
      reading: "Manik' is the day of the deer and the working hand. You tend to carry responsibility quietly and get things done without needing credit.",
      watch: "Carrying everyone's load. Ask whose work it really is." },
    { name: "Lamat", kiche: "Q'anil", meaning: "Star, rabbit",
      reading: "Lamat is the day of the star and of things that multiply. You tend to make more out of whatever you are given, and luck seems to find you.",
      watch: "Scattering your effort. Growth needs one field, not ten." },
    { name: "Muluk", kiche: "Toj", meaning: "Water, offering",
      reading: "Muluk is the day of water and of paying what is owed. You tend to feel deeply and to notice when something is out of balance between people.",
      watch: "Letting a debt or a feeling pool. Settle it while it is small." },
    { name: "Ok", kiche: "Tz'i'", meaning: "Dog",
      reading: "Ok is the day of the loyal guide. You tend to stand by people, keep your word, and care a great deal about what is fair.",
      watch: "Loyalty to the wrong thing. Check that what you guard still deserves it." },
    { name: "Chuwen", kiche: "B'atz'", meaning: "Monkey, the thread",
      reading: "Chuwen is the day of the artisan and the thread of time. You tend to make things, play with ideas, and weave separate strands into one piece.",
      watch: "Leaving threads loose. The craft is in the finishing." },
    { name: "Eb", kiche: "E", meaning: "Road",
      reading: "Eb is the day of the road and the journey of a life. You tend to think in terms of the long path, and people trust you to know the way.",
      watch: "Walking so far ahead that no one can follow. Look back now and then." },
    { name: "Ben", kiche: "Aj", meaning: "Reed, corn stalk",
      reading: "Ben is the day of the growing stalk and of the home it feeds. You tend to stand upright, hold a household or a team together, and grow steadily.",
      watch: "Rigidity. A reed that cannot bend in the wind breaks." },
    { name: "Ix", kiche: "I'x", meaning: "Jaguar",
      reading: "Ix is the day of the jaguar and the living earth. You tend to move quietly, see well in the dark, and keep a strong inner life.",
      watch: "Keeping everything hidden. Power that is never shown is never shared." },
    { name: "Men", kiche: "Tz'ikin", meaning: "Eagle",
      reading: "Men is the day of the eagle and the wide view. You tend to see the whole landscape, aim high, and spot opportunity from a distance.",
      watch: "Circling without landing. A plan pays only when you come down to earth." },
    { name: "Kib", kiche: "Ajmaq", meaning: "Vulture, owl",
      reading: "Kib is the day of old wisdom and of forgiveness. You tend to learn from what went wrong, and you can turn a mistake into something useful.",
      watch: "Carrying old faults, yours or other people's. Forgive, then travel lighter." },
    { name: "Kaban", kiche: "No'j", meaning: "Earth, thought",
      reading: "Kaban is the day of the moving earth and the thinking mind. You tend to work things through carefully, and your ideas can shift the ground for others.",
      watch: "Living in your head. Test the idea against the world." },
    { name: "Etz'nab", kiche: "Tijax", meaning: "Flint, the blade",
      reading: "Etz'nab is the day of the flint knife, which cuts and also heals. You tend to see the truth of a matter quickly and say it plainly.",
      watch: "Cutting when a word would do. Sharpness needs a careful hand." },
    { name: "Kawak", kiche: "Kawoq", meaning: "Storm",
      reading: "Kawak is the day of the rainstorm that clears the air. You tend to gather people together, and you come alive when things get intense.",
      watch: "Stirring a storm you do not need. Not every sky wants clearing." },
    { name: "Ajaw", kiche: "Ajpu", meaning: "Sun, lord",
      reading: "Ajaw is the day of the sun and the last of the twenty signs. You tend to bring warmth and light into a room, and you hold yourself to a high standard.",
      watch: "Expecting to be finished. The sun rises again every day, and so does the work." },
  ];

  // strength (gentle, balanced, strong) is the traditional reading of a number; the themes are a modern one
  const NUMBERS = [
    { strength: "gentle", theme: "beginning", line: "Your sign shows up in its newest, simplest form. You are still finding out what it can do." },
    { strength: "gentle", theme: "choice", line: "You tend to see both sides of your sign and feel the pull between them." },
    { strength: "gentle", theme: "movement", line: "Your sign wants action. You learn it by doing, not by planning." },
    { strength: "gentle", theme: "foundation", line: "Your sign stands on four corners. You bring it order and a steady base." },
    { strength: "balanced", theme: "the working hand", line: "Your sign gets put to use. You tend to turn it into practical effort." },
    { strength: "balanced", theme: "flow", line: "Your sign runs evenly through you, without much strain either way." },
    { strength: "balanced", theme: "the midpoint", line: "You stand in the middle of the count and can see the whole of your sign, start to finish." },
    { strength: "balanced", theme: "wholeness", line: "Your sign is well rounded in you. Daykeepers favor this number for ceremony." },
    { strength: "balanced", theme: "patience", line: "Your sign ripens slowly. What you build with it takes its full time." },
    { strength: "strong", theme: "taking form", line: "Your sign comes out in solid, visible ways. What you intend tends to become real." },
    { strength: "strong", theme: "clearing", line: "Your sign arrives with force and shakes loose what no longer fits." },
    { strength: "strong", theme: "understanding", line: "Your sign carries gathered experience. You tend to make sense of things for others." },
    { strength: "strong", theme: "completion", line: "Your sign is at full strength. Its gifts and its excesses are both turned all the way up." },
  ];

  const HAAB = ["Pop", "Wo'", "Sip", "Sotz'", "Sek", "Xul", "Yaxk'in", "Mol", "Ch'en", "Yax", "Sak'", "Keh", "Mak", "K'ank'in", "Muwan", "Pax", "K'ayab", "Kumk'u", "Wayeb'"];

  // number 1-13, sign 1-20 (index into SIGNS + 1)
  function tzolkin(days) { return { number: mod(days + 3, 13) + 1, sign: mod(days + 19, 20) + 1 }; }

  // position 1-260 in the Tzolk'in for a number + sign pair
  function kin(number, sign) { for (let k = 1; k <= 260; k++) if ((k - 1) % 13 + 1 === number && (k - 1) % 20 + 1 === sign) return k; return 0; }

  // Everything the card shows for one calendar date
  function day(y, m, d) {
    const days = jdn(y, m, d) - CORRELATION;   // days since the Long Count's zero date
    const t = tzolkin(days);
    const h = mod(days + 348, 365);            // the zero date fell on 8 Kumk'u, day 348 of the Haab'
    const units = [144000, 7200, 360, 20, 1];
    let rest = days;
    const longCount = units.map(u => { const n = Math.floor(rest / u); rest -= n * u; return n; });
    return {
      number: t.number, sign: t.sign, kin: kin(t.number, t.sign),
      trecena: { number: 1, sign: mod(t.sign - 1 - (t.number - 1), 20) + 1 },   // the 13-day week's first day
      haab: { day: h % 20, month: Math.floor(h / 20) + 1, name: HAAB[Math.floor(h / 20)] },
      longCount, longCountText: longCount.join("."),
    };
  }

  // Days from a date until the next day (after it) with this sign, and with this number + sign together
  function daysUntil(y, m, d, number, sign) {
    const now = tzolkin(jdn(y, m, d) - CORRELATION);
    const toSign = mod(sign - now.sign, 20) || 20;
    const toDay = mod(kin(number, sign) - kin(now.number, now.sign), 260) || 260;
    return { sign: toSign, day: toDay };
  }

  return { CORRELATION, SIGNS, NUMBERS, HAAB, jdn, day, daysUntil };
})();
if (typeof module !== "undefined") module.exports = MAYA;
