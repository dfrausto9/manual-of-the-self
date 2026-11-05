/* ===================== INTERPRETATION LIBRARY ===================== */
const LIB = (() => {
  const G = s => s + "︎";   // force text (not emoji) glyphs

  const PLANETS = {
    sun: { name: "Sun", glyph: G("☉"), role: "your core self", detail: "your identity, vitality and what makes you feel most alive",
      question: "Who am I becoming?",
      transit: "a spotlight: attention, energy and visibility" },
    moon: { name: "Moon", glyph: G("☽"), role: "your emotional needs", detail: "your feelings, instincts, habits and what makes you feel safe",
      question: "What do I need to feel at home?",
      transit: "a passing mood" },
    mercury: { name: "Mercury", glyph: G("☿"), role: "your mind", detail: "how you think, learn, speak and make sense of things",
      question: "How do I process the world?",
      transit: "news, conversations, plans and paperwork" },
    venus: { name: "Venus", glyph: G("♀"), role: "your values", detail: "what you love, how you relate, and what you find worth having, including money",
      question: "What do I value, and how do I receive?",
      transit: "warmth, pleasure, attraction and money matters" },
    mars: { name: "Mars", glyph: G("♂"), role: "your drive", detail: "how you go after what you want, assert yourself and handle conflict",
      question: "How do I act on what I want?",
      transit: "a surge of energy, drive and heat" },
    jupiter: { name: "Jupiter", glyph: G("♃"), role: "your growth", detail: "where you find faith, generosity, opportunity and room to expand",
      question: "Where do I grow, and what do I believe?",
      transit: "growth, opportunity, optimism and expansion" },
    saturn: { name: "Saturn", glyph: G("♄"), role: "your structure", detail: "your discipline, responsibilities, fears and the mastery you earn over time",
      question: "What am I building, and what holds it up?",
      transit: "tests, structure, responsibility and maturity" },
    uranus: { name: "Uranus", glyph: G("♅"), role: "your independence", detail: "where you break from convention and need freedom",
      question: "Where must I be free?",
      transit: "sudden change, awakening and a push for freedom" },
    neptune: { name: "Neptune", glyph: G("♆"), role: "your ideals", detail: "your imagination, spirituality, compassion and longing for something beyond",
      question: "What do I dream of and surrender to?",
      transit: "inspiration, sensitivity, dissolving edges and some fog" },
    pluto: { name: "Pluto", glyph: G("♇"), role: "your power", detail: "where you transform, face what is hidden and reclaim your strength",
      question: "What must end so something truer can begin?",
      transit: "deep transformation, intensity and letting go" },
    node: { name: "North Node", glyph: G("☊"), role: "your direction of growth", detail: "the unfamiliar path that stretches you; the South Node opposite it is what comes easily",
      question: "Which way is growth?",
      transit: "a turning point about direction and the people who shape it" },
    asc: { name: "Ascendant", glyph: "AC", role: "how you meet the world", detail: "your approach to new situations, your body and the first impression you give",
      question: "How do I show up?", transit: "" },
    mc: { name: "Midheaven", glyph: "MC", role: "your public path", detail: "your career, reputation and the mark you want to leave",
      question: "What is my calling?", transit: "" },
  };

  // How long each transiting planet's contacts tend to last, and how to work with them
  const TRANSIT = {
    sun:     { pace: "a few days", flow: ["Good days to be seen and take the lead."], friction: ["Pace yourself; ego clashes run hotter."], blend: ["Recharge and set intentions."] },
    mercury: { pace: "a few days", flow: ["Have the conversation, send the pitch."], friction: ["Double-check details and tone."], blend: ["Write things down; ideas arrive fast."] },
    venus:   { pace: "a few days", flow: ["Reach out, create, enjoy yourself."], friction: ["Watch overspending and people-pleasing."], blend: ["Spend time on what you love."] },
    mars: { pace: "days to a few weeks",
      flow: ["Start the hard task now; motivation is high.","Exercise or physical work channels the energy well.","Stand up for yourself clearly and calmly."],
      friction: ["Expect impatience and conflict; pause before you react.","Move your body before you send the angry message.","Drive and handle tools with extra care."],
      blend: ["Pick one goal and push on it.","Burn off excess energy physically.","Use the fire for courage, not combat."] },
    jupiter: { pace: "weeks to several months",
      flow: ["Doors open more easily now. Apply, pitch, publish, travel.","Say yes to introductions and invitations.","Share your gifts generously; it tends to come back multiplied."],
      friction: ["Growth is available, but excess is the risk: overpromising, overspending, overextending.","Check that the big plan has a budget and a timeline.","Say yes with intention, not because everything looks good at once."],
      blend: ["A growth cycle begins. Plant seeds you want to harvest over the next year.","Expand your world: a class, a trip, a new circle.","Generosity and gratitude amplify what is already good."] },
    saturn: { pace: "several months",
      flow: ["Effort compounds now. Build something meant to last.","Make commitments real: contracts, routines, plans with dates.","Mentors and experience are on your side; ask for guidance and offer yours."],
      friction: ["Expect slower progress or heavier responsibility. Steady effort will carry you further than force.","Release what is not sustainable instead of pushing harder to hold it up.","Rest is part of the work. Protect your energy like the resource it is."],
      blend: ["A chapter of maturity begins. Define what you are truly committed to.","Take one serious, long-term step and keep showing up for it.","Boundaries are a form of self-respect; draw them clearly."] },
    uranus: { pace: "up to a year or more",
      flow: ["Try the new approach; experiments go well right now.","Freedom and fresh ideas arrive without breaking what works.","Connect with people who think differently; they spark something."],
      friction: ["Leave room for surprises; flexible plans hold up better than rigid ones.","If something feels too tight, change it on purpose before it breaks.","Keep savings and backups ready, so change feels like freedom, not chaos."],
      blend: ["An awakening chapter begins. Expect the unexpected and stay curious.","Let yourself change your mind.","Follow what feels alive and true, even if it is unconventional."] },
    neptune: { pace: "a year or more",
      flow: ["Make art, meditate, help others; your intuition is strong.","Let inspiration guide a creative or spiritual project.","Compassion flows easily; offer it, including to yourself."],
      friction: ["Things may feel unclear. Verify before you trust, and read the fine print.","Watch escapism: substances, oversleeping, endless scrolling.","Get facts in writing, and give decisions more time."],
      blend: ["A softer, more spiritual chapter begins. Lean into imagination and stillness.","Keep boundaries clear while staying open.","Trust what you sense, then check it against what you know."] },
    pluto: { pace: "one to two years",
      flow: ["Deep change moves with you now, not against you. Use it to rebuild on truer ground.","Inner work goes far right now: therapy, research, honest journaling, reinvention.","Quietly take back what you handed over: a habit, a decision, your time."],
      friction: ["Something has run its course. Releasing it by choice is gentler than having it taken.","Power struggles may surface. Know what you will give and what is not negotiable.","This is a deep passage. Let people support you; strength includes being held."],
      blend: ["A rebirth chapter begins. Be honest about what is ready to transform.","Reclaim the power you once gave away, and use it with care.","Begin small and private. This kind of change grows from the roots up."] },
    node: { pace: "a few months",
      flow: ["People who help you grow appear; say yes.","Follow the unfamiliar path that feels right.","Notice the meaningful coincidences."],
      friction: ["You may feel pulled between old comfort and new growth. Notice which one you choose by default.","Release what is merely familiar to make room for what is calling you forward.","People who challenge you may be showing you the path."],
      blend: ["A turning point about direction. Notice who and what arrives now; it often matters later.","Choose growth over what is merely familiar.","Trust that this chapter is moving you somewhere important."] },
  };

  const SIGNS = [
    { name: "Aries", glyph: G("♈"), el: "Fire", mode: "Cardinal", style: "boldly and directly", gift: "courage and initiative", edge: "patience" },
    { name: "Taurus", glyph: G("♉"), el: "Earth", mode: "Fixed", style: "steadily and sensually", gift: "reliability and staying power", edge: "flexibility" },
    { name: "Gemini", glyph: G("♊"), el: "Air", mode: "Mutable", style: "curiously and quickly", gift: "wit and adaptability", edge: "focus" },
    { name: "Cancer", glyph: G("♋"), el: "Water", mode: "Cardinal", style: "protectively and intuitively", gift: "care and emotional memory", edge: "letting go" },
    { name: "Leo", glyph: G("♌"), el: "Fire", mode: "Fixed", style: "warmly and expressively", gift: "creativity and heart", edge: "needing applause" },
    { name: "Virgo", glyph: G("♍"), el: "Earth", mode: "Mutable", style: "precisely and helpfully", gift: "skill and discernment", edge: "self-criticism" },
    { name: "Libra", glyph: G("♎"), el: "Air", mode: "Cardinal", style: "diplomatically and gracefully", gift: "fairness and partnership", edge: "decisiveness" },
    { name: "Scorpio", glyph: G("♏"), el: "Water", mode: "Fixed", style: "intensely and privately", gift: "depth and resilience", edge: "trust" },
    { name: "Sagittarius", glyph: G("♐"), el: "Fire", mode: "Mutable", style: "freely and optimistically", gift: "vision and honesty", edge: "follow-through" },
    { name: "Capricorn", glyph: G("♑"), el: "Earth", mode: "Cardinal", style: "strategically and patiently", gift: "ambition and endurance", edge: "softness" },
    { name: "Aquarius", glyph: G("♒"), el: "Air", mode: "Fixed", style: "independently and inventively", gift: "originality and fairness to the group", edge: "emotional closeness" },
    { name: "Pisces", glyph: G("♓"), el: "Water", mode: "Mutable", style: "imaginatively and compassionately", gift: "empathy and intuition", edge: "boundaries" },
  ];

  const HOUSES = [
    null,
    { area: "self and approach to life", where: "in how you present yourself and start things" },
    { area: "money, possessions and self-worth", where: "in your finances and sense of worth" },
    { area: "communication, learning and neighbourhood", where: "in your daily conversations, studies and local world" },
    { area: "home, family and roots", where: "at home, with family and in your private foundations" },
    { area: "creativity, romance, play and children", where: "in creative work, romance and play" },
    { area: "daily work, health and routines", where: "in your daily routines, work and health" },
    { area: "partnerships and close relationships", where: "in partnerships and one-on-one relationships" },
    { area: "shared resources, intimacy and transformation", where: "in shared money, intimacy and deep change" },
    { area: "beliefs, higher learning and travel", where: "through travel, study and your philosophy of life" },
    { area: "career, reputation and calling", where: "in your career and public life" },
    { area: "friends, community and future goals", where: "among friends, communities and long-term goals" },
    { area: "rest, solitude and the unconscious", where: "behind the scenes, in solitude and inner work" },
  ];

  const ASPECT_TEXT = {
    conjunction: { natal: "fused: these two work as one, for better and worse", transit: "Conjunction: the energies merge. A new cycle starts in this part of you.", tone: "blend" },
    sextile: { natal: "cooperate easily when you make the first move", transit: "Sextile: an opening. Good things come if you act on them.", tone: "flow" },
    square: { natal: "rub against each other, creating drive through tension", transit: "Square: friction that asks for action. Uncomfortable but often productive.", tone: "friction" },
    trine: { natal: "flow together naturally; a built-in talent", transit: "Trine: things flow. Support arrives with less effort.", tone: "flow" },
    opposition: { natal: "pull in opposite directions until you find balance", transit: "Opposition: awareness through contrast, often through other people. Seek balance.", tone: "friction" },
  };

  const GLOSSARY = [
    ["Planet", "A part of you: your mind (Mercury), your drive (Mars), your values (Venus) and so on."],
    ["Sign", "How that part of you works: its style. Mars in Aries acts boldly; Mars in Libra acts diplomatically."],
    ["House", "Where in life it shows up: relationships, career, home, money. Houses need an exact birth time."],
    ["Aspect", "An angle between two planets. It describes how two parts of you get along."],
    ["Transit", "Where a planet is in the sky now, and the angle it makes to your birth chart. This is your sky weather."],
    ["Retrograde", "When a planet appears to move backward from Earth. A time to review and revise rather than launch."],
    ["Orb", "How close an angle is to exact. Tighter means stronger."],
    ["Ascendant", "The sign rising on the eastern horizon at birth. Your approach to life and the first impression you give."],
  ];

  const signOf = lon => SIGNS[Math.floor(((lon % 360) + 360) % 360 / 30)];
  const deg = lon => { const d = ((lon % 30) + 30) % 30; const w = Math.floor(d); let m = Math.round((d - w) * 60); return m === 60 ? `${w + 1}°00′` : `${w}°${String(m).padStart(2, "0")}′`; };
  const ord = n => n + (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th");

  function placement(key, p, timeKnown) {
    const P = PLANETS[key], S = signOf(p.lon);
    const h = timeKnown && p.house ? HOUSES[p.house] : null;
    let text = `${P.name} is ${P.role}: ${P.detail}. In ${S.name} it works ${S.style}`;
    text += h ? `, and it shows up most ${h.where} (${ord(p.house)} house).` : ".";
    const parts = { text, gift: S.gift, edge: S.edge, question: P.question };
    if (p.retro) parts.retro = `Born with ${P.name} retrograde: this energy turns inward first. You tend to rethink and rework it privately before expressing it, and often find your own way of doing things.`;
    return parts;
  }

  function anglePlacement(key, lon) {
    const P = PLANETS[key], S = signOf(lon);
    return { text: `The ${P.name} is ${P.role}: ${P.detail}. With ${S.name} here, you meet this part of life ${S.style}.`, gift: S.gift, edge: S.edge, question: P.question };
  }

  function natalAspect(a) {
    const A = PLANETS[a.a], B = PLANETS[a.b];
    return `${A.role[0].toUpperCase() + A.role.slice(1)} and ${B.role} ${ASPECT_TEXT[a.key].natal}.`;
  }

  function transitStory(e, c) {
    const T = PLANETS[e.transit], N = PLANETS[e.natal], tone = ASPECT_TEXT[e.key].tone, tp = TRANSIT[e.transit];
    const lines = [];
    lines.push(`${T.name} brings ${T.transit}. It is touching ${N.role}: ${N.detail}.`);
    lines.push(ASPECT_TEXT[e.key].transit);
    if (e.house && c.timeKnown) lines.push(`It is moving through your ${ord(e.house)} house, so look for it ${HOUSES[e.house].where}.`);
    return { lines, prep: tp[tone] || tp.blend, pace: tp.pace, tone };
  }

  return { PLANETS, SIGNS, HOUSES, ASPECT_TEXT, TRANSIT, GLOSSARY, signOf, deg, ord, placement, anglePlacement, natalAspect, transitStory };
})();
if (typeof module !== "undefined") module.exports = LIB;
