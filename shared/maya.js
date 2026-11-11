/* ===================== MAYA DAY COUNT =====================
   Turns a calendar date into its place in the Maya counts: the 260-day Tzolk'in (a number 1-13 and one of
   20 day signs), the 365-day Haab' and the Long Count. Pure date arithmetic: no birth time or place.
   Uses the traditional count still kept by daykeepers in Guatemala (correlation constant 584283), not Dreamspell.
   The day readings are grounded in Barbara Tedlock's "Time and the Highland Maya"; see the notes by SIGNS below. */
const MAYA = (() => {
  const CORRELATION = 584283;   // Julian Day Number of Long Count 0.0.0.0.0 (4 Ajaw 8 Kumk'u)
  const mod = (n, m) => ((n % m) + m) % m;

  // Julian Day Number of a Gregorian calendar date
  function jdn(y, m, d) {
    const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }

  // name: modern Yucatec spelling · kiche: the name K'iche' daykeepers use
  // themes, reading and watch follow the teaching of daykeepers in Momostenango, Guatemala, as recorded by
  // Barbara Tedlock in "Time and the Highland Maya" (rev. ed., University of New Mexico Press, 1992), chapter 5.
  // Daykeepers read a day through its rituals and remembered phrases, not by translating its name, so the themes
  // are what the day is for, not a picture of the name. The "you tend to" wording is this site's own.
  const SIGNS = [
    { name: "Imix", kiche: "Imox", themes: "Being overwhelmed, humility",
      reading: "In K'iche' teaching, Imox is a day when greater forces can sweep a person off balance, and daykeepers use it to humble themselves before the powers of the year. You tend to feel things at full strength. The practice this day teaches is humility: knowing what is bigger than you, so that it does not carry you off.",
      watch: "Getting swamped by complexity or by other people's pull. Slow down, ask for help, and take on one thing at a time." },
    { name: "Ik'", kiche: "Iq'", themes: "Wind, force, strong feeling",
      reading: "Iq' is one of the four year-bearers, and daykeepers treat it as a fierce day: the wind that brings the storm, and the anger that rises in people. You tend to have real force of personality, and people born on this day often end up in positions of command.",
      watch: "Rage and frenzy. Your intensity can flatten the people closest to you, so learn what sets it off." },
    { name: "Ak'bal", kiche: "Aq'ab'al", themes: "Dawn, opening",
      reading: "Aq'ab'al is the day of dawn and of openings: shrines are opened on it, and marriage approaches are traditionally made at first light. You tend to be good with words and at starting things between people, and the day is linked with prosperity.",
      watch: "Blame, concealment and talk behind backs, which are the day's other face. Say it to the person, not about them." },
    { name: "K'an", kiche: "K'at", themes: "Debts and settling them",
      reading: "K'at is the day for paying what is owed, to other people, to the ancestors and to the Earth; offerings are burned by the netful to set accounts right. You tend to take on a great deal, and obligations gather around you. The skill this day teaches is setting accounts right.",
      watch: "Carrying a heavy net. Debts and entanglements grow more serious the longer they sit, so settle them early." },
    { name: "Chikchan", kiche: "Kan", themes: "Power, the healer's strength",
      reading: "Kan belongs to the most powerful of the healers, who can cure and can also do harm; shrines are swept on this day and protection is asked for. You tend to have a strong, commanding nature that others feel right away.",
      watch: "Power turned against people. The teaching is to tame it and put it to work in healing, and the higher your number, the more this matters." },
    { name: "Kimi", kiche: "Kame", themes: "Asking for good, the ancestors",
      reading: "Kame is the day of asking for good, and of the dead who stand behind every family. Daykeepers use it to ask for peace: between the living and their ancestors, within a marriage, and between peoples. In Chichicastenango it is a day for seeking forgiveness. You tend to be good with words and suited to making alliances and settling things between sides.",
      watch: "Neglecting those who came before, or leaving a quarrel unmended. Peace is something this day asks you to keep making." },
    { name: "Manik'", kiche: "Kej", themes: "Strength, leadership",
      reading: "Kej is one of the four year-bearers and a strong, commanding day. It is the day of the mother-father, the priest who speaks for the community, and of the meetings of the town's elders. In Chichicastenango it is also a day for thanking the ancestors. You tend to be strong in body, mind and speech, and people look to you to lead.",
      watch: "Dominating. The same force that leads can ride over weaker people, and in this teaching it comes back on you in the end." },
    { name: "Lamat", kiche: "Q'anil", themes: "Ripening, harvest, feeding",
      reading: "Q'anil is the yellow of ripe maize: the day of sowing and planting, of harvest, and of feeding the Earth and the ancestors in thanks. You tend to bring things to ripeness and to look after what feeds people.",
      watch: "Taking the harvest without giving back. What is ripe also ends, as the day does at sunset, so give thanks and share it in time." },
    { name: "Muluk", kiche: "Toj", themes: "Payment, making up what was missed",
      reading: "Toj is the day of payment. Daykeepers use it to make up any offerings they have missed, with something added for the delay. You tend to feel what is owed, by you and to you, more sharply than most. The remedy is built into the day: what is paid is finished.",
      watch: "Letting things go unpaid. In this teaching, pain is the price of a debt left standing, and it eases when the debt is met." },
    { name: "Ok", kiche: "Tz'i'", themes: "Uncertainty, wavering confidence",
      reading: "Tz'i' is the day of uncertainty: wanting something one minute and doubting it the next. It falls on the eve of a new daykeeper's initiation, when the teacher asks whether the student still has the confidence to go through with it. You tend to feel pulled two ways, especially by desire. The teacher's question is the day's question, and answering it is your strength: are you sure?",
      watch: "Jealous words, and loyalty given in the wrong place. Decide, then stay with the decision." },
    { name: "Chuwen", kiche: "B'atz'", themes: "The thread, winding, asking",
      reading: "B'atz' is the day of spinning and winding thread, and of asking: marriage proposals are made on it, and new daykeepers are initiated on 8 B'atz'. You tend to gather good things to you as thread winds onto a spindle, and the day is counted lucky in business, marriage and life.",
      watch: "Taking luck for granted. In this teaching, trouble on a B'atz' day means that thanks owed have been left undone." },
    { name: "Eb", kiche: "E", themes: "The road",
      reading: "E is the road: the good, straight, long road of a life. It is one of the four year-bearers and brings a calm year, and new daykeepers begin their service on it. You tend to see life as a path, and the day promises a good, long and healthy one; many born on it guide others, as priests or midwives.",
      watch: "Losing your road. When you feel adrift, look for a guide instead of pushing on alone." },
    { name: "Ben", kiche: "Aj", themes: "The house, the family line",
      reading: "Aj is the day of the house and the family line, when a family's foundation shrines are tended and its dead are remembered. In Chichicastenango it is tied to a person's destiny. You tend to be dutiful and lucky in love, work and family life, a keeper of the home and of the people in it.",
      watch: "Quarrels inside the family. In this teaching, an old fight at home can cause trouble long after it happened, so mend it." },
    { name: "Ix", kiche: "I'x", themes: "The Earth",
      reading: "I'x is the day given to the Earth itself, when thanks are offered that people and animals are well. You tend to have a close bond with the natural world, and the day is linked with wealth, since everything precious comes out of the ground.",
      watch: "Sudden setbacks, especially of the body, when that bond is neglected. Give back to what sustains you." },
    { name: "Men", kiche: "Tz'ikin", themes: "Asking, money and silver",
      reading: "Tz'ikin is the day of crying out for what is needed, and of money and silver; families ask on it for the means to live well. You tend to want a full life, material and spiritual, and to be eloquent in asking for it.",
      watch: "Wanting without limit, and asking for ill as readily as for good. Be careful what you call for." },
    { name: "Kib", kiche: "Ajmaq", themes: "Pardon",
      reading: "Ajmaq is the day of asking pardon, before the sky, the Earth and the ancestors, for wrongs done within the family. You tend to be lucky in work and money, and to be forgiven more easily than most.",
      watch: "Leaning on that forgiveness. The day's weak spot is carelessness toward a partner or children." },
    { name: "Kaban", kiche: "No'j", themes: "Thought",
      reading: "No'j is thought itself, and one of the four year-bearers: the day of meditating, arguing, resolving and worrying, of good ideas and bad ones. You tend to be an original thinker and a problem solver, and people born on this day are often asked to lead.",
      watch: "Thinking that turns into worry or scheming. Not every idea is a good one, so test it." },
    { name: "Etz'nab", kiche: "Tijax", themes: "Disputes, sharp words",
      reading: "Tijax is the day of quarrels and slander. Daykeepers use it to ask that there be no jealousy or secrets within the family, and that those who speak against them leave them alone. You tend to find yourself in the middle of arguments, about beliefs, loyalties and who said what, and you learn early how to stand your ground.",
      watch: "Being worn down by disputes, as their target or as their source. Choose which fights are worth it." },
    { name: "Kawak", kiche: "Kawoq", themes: "The set table, gathered troubles",
      reading: "Kawoq is the day when offerings are laid on the Earth's table, and when daykeepers ask that troubles sent their way go back where they came from. You tend to have more than your share set in front of you. The practice of this day is to send trouble back, not to carry it.",
      watch: "Gossip and harassment piling up. Look after your own strength first, and do not gather other people's troubles." },
    { name: "Ajaw", kiche: "Ajpu", themes: "The ancestors' day",
      reading: "Ajpu is the ancestors' day. Offerings are made before them, their agreement is asked before a house is built, and the dead are helped on their way. You tend to live close to those who came before, and some born on this day are said to speak for them.",
      watch: "A tie with the past that grows too close. Honor the dead, and keep living among the living." },
  ];

  // Tedlock records three bands: 1-3 gentle (young, new), 7-9 of measured strength (used for regular ceremonies),
  // 11-13 strong (older, riper, more serious). The wording for 4-6 and 10 fills the gaps between them.
  const NUMBERS = [
    { strength: "gentle", line: "A low number is gentle. It shows your sign in a young, new form, so its pull is light and its troubles are small." },
    { strength: "gentle", line: "A low number is gentle. It shows your sign in a young, new form, so its pull is light and its troubles are small." },
    { strength: "gentle", line: "A low number is gentle. It shows your sign in a young, new form, so its pull is light and its troubles are small." },
    { strength: "moderate", line: "This number sits between the gentle ones and the days of measured strength, so your sign comes through at a modest strength." },
    { strength: "moderate", line: "This number sits between the gentle ones and the days of measured strength, so your sign comes through at a modest strength." },
    { strength: "moderate", line: "This number sits between the gentle ones and the days of measured strength, so your sign comes through at a modest strength." },
    { strength: "measured", line: "This is a number of measured strength, neither gentle nor fierce. Daykeepers choose these numbers for their regular ceremonies." },
    { strength: "measured", line: "This is a number of measured strength, neither gentle nor fierce. Daykeepers choose these numbers for their regular ceremonies." },
    { strength: "measured", line: "This is a number of measured strength, neither gentle nor fierce. Daykeepers choose these numbers for their regular ceremonies." },
    { strength: "strong", line: "This number sits just below the strongest ones. Your sign runs strong, and what it brings is weightier." },
    { strength: "strong", line: "A high number is powerful. It shows your sign in an older, riper, more serious form, with its gifts and its difficulties both turned up." },
    { strength: "strong", line: "A high number is powerful. It shows your sign in an older, riper, more serious form, with its gifts and its difficulties both turned up." },
    { strength: "strong", line: "A high number is powerful. It shows your sign in an older, riper, more serious form, with its gifts and its difficulties both turned up." },
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
