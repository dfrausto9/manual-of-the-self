/* ===================== FORECAST DEPTH (server only) =====================
 * Extra reading layers for the paid forecast. Kept out of the browser bundle
 * (build.js does not include this file) so the paid text only comes from the server.
 *
 * Each transit reading is assembled from layers that stack:
 *   prepare[tone]   planet + aspect tone  -> "How to prepare"          (3 lines)
 *   point[natal]    planet + natal point  -> "What it's asking of you" (2 lines + a question)
 *   house[n]        planet + house        -> "Keep an eye out for"     (3 situations)
 *   phase           building / peak / easing / repeat passes -> "Right now" (1 line)
 */
/* Voice guide (all planets):
 * - The reader is the author. The sky describes the weather; they choose the response.
 * - Name the challenge honestly, then the strength it builds. Never fear, never fluff.
 * - "Keep an eye out for" names situations that may ask for attention, not fixed events.
 * - Each question invites reflection, not a yes or no.
 */
const DEPTH = {
  pluto: {
    prepare: {
      friction: [
        "Something has run its course. Releasing it by choice is gentler than having it taken.",
        "Power struggles may surface. Know what you will give and what is not negotiable.",
        "This is a deep passage. Let people support you; strength includes being held.",
      ],
      flow: [
        "Deep change moves with you now, not against you. Use it to rebuild on truer ground.",
        "Inner work goes far right now: therapy, research, honest journaling, reinvention.",
        "Quietly take back what you handed over: a habit, a decision, your time.",
      ],
      blend: [
        "A rebirth chapter begins. Be honest about what is ready to transform.",
        "Reclaim the power you once gave away, and use it with care.",
        "Begin small and private. This kind of change grows from the roots up.",
      ],
    },
    point: {
      sun: ["An old version of you is shedding a layer. Let it go without rushing who comes next.",
            "Notice where you shrink to keep the peace, and where you grip to stay in control.",
            "What would I do if I trusted my own strength?"],
      moon: ["Old feelings and family patterns rise so they can be understood and released.",
             "Notice what you do to feel safe, and whether it still keeps you safe.",
             "What do I need now that I could not ask for before?"],
      mercury: ["Your mind goes deeper; surface answers stop satisfying you. Follow that.",
                "Notice thought loops, and the conversations you keep rehearsing but not having.",
                "What truth am I ready to say out loud?"],
      venus: ["What and whom you value is being tested for depth; what is shallow loses its pull.",
              "Notice jealousy, control, or over-giving in the hope of being loved.",
              "What do I value enough to keep, and to protect?"],
      mars: ["Your drive intensifies. Anger and ambition are both fuel; aim them with intention.",
             "Notice where force is standing in for strategy.",
             "What am I truly fighting for?"],
      jupiter: ["Your beliefs and big plans are being refined down to what is real for you.",
                "Notice certainty that leaves no room to learn, or chasing more to avoid changing.",
                "Which belief has served its purpose?"],
      saturn: ["The structures you built are being rebuilt from the foundation, stronger this time.",
               "Notice rigid control or fear of failure dressed up as discipline.",
               "What am I carrying that no longer needs carrying?"],
      asc: ["The way you meet the world is changing; others may sense it before you do.",
            "Notice shifts in your body, presence and energy, and meet them with care.",
            "Who am I when I stop performing?"],
      mc: ["Your career, reputation and sense of calling are in a deep rebuild.",
           "Notice power dynamics with authority figures, and with your own ambition.",
           "What do I want my work to stand for?"],
    },
    house: [
      null,
      ["A strong pull to reinvent your look, style or approach",
       "People responding to your presence more intensely than before",
       "Your body asking for real change rather than a quick fix"],
      ["A money situation inviting you to rethink how you earn or spend",
       "Holding on to things, or a job, mostly out of fear of having less",
       "Your sense of worth getting tangled with what you earn"],
      ["A conversation, message or piece of news that shifts your perspective",
       "Deep talks, or tension, with siblings, neighbours or the people you see daily",
       "A subject calling you to study it all the way down"],
      ["Old family dynamics asking to be seen and understood",
       "Change at home: a move, a renovation, someone arriving or leaving",
       "A need for more privacy and a truer sense of home"],
      ["A romance or creative project that asks for all of you",
       "Shifts with children or the people you mentor",
       "Risks that thrill; weigh what they really cost"],
      ["Power shifts at work: a new lead, a restructure, a role changing shape",
       "Your body signalling burnout; listen early, and see a professional if it persists",
       "A routine ready to be replaced, not just adjusted"],
      ["A partner, client or rival who brings control dynamics to the surface",
       "A relationship that either deepens profoundly or completes",
       "High-stakes agreements; read every line before you sign"],
      ["Debts, taxes, insurance or shared money asking for attention",
       "Trust and intimacy being deepened, or tested, in a close bond",
       "A long-avoided fear that is ready to be faced"],
      ["A belief dissolving, or a new one taking hold strongly",
       "Legal matters, or study that changes how you see the world",
       "A journey or a teacher that leaves you changed"],
      ["A turning point in your career or public role",
       "Meeting authority, or stepping into it yourself",
       "Your reputation in a brighter light; act as if it is on the record"],
      ["Friendships that deepen or complete, with little in between",
       "Group dynamics and power plays in a team or community",
       "Long-term goals that suddenly feel hollow, making room for truer ones"],
      ["Old fears, vivid dreams and hidden patterns rising to be healed",
       "Things unfolding behind the scenes; trust your intuition",
       "A need for more rest and solitude than usual; honour it"],
    ],
    phase: {
      building: "Building: the pressure is gathering. Begin the honest conversation with yourself now, while it is gentle.",
      peak: "At its peak: around the exact date, things tend to come to a head. Keep that week spacious if you can.",
      easing: "Easing: the most intense part has likely passed. Now choose what you carry forward and what you leave behind.",
      repeat: "Pluto crosses this point more than once. The first pass raises it, the middle pass deepens it, the last pass integrates it.",
    },
  },
};

// Build the extra layers for one transit event (forecast event or today's transit).
function depthFor(e, c, phase) {
  const D = DEPTH[e.transit]; if (!D) return null;
  const tone = { conjunction: "blend", sextile: "flow", trine: "flow", square: "friction", opposition: "friction" }[e.key] || "blend";
  const point = D.point[e.natal] || null;
  const house = e.house && c.timeKnown ? D.house[e.house] : null;
  const ph = (e.exacts && e.exacts.length > 1) ? "repeat" : phase;
  return {
    prepare: D.prepare[tone],
    asking: point ? point.slice(0, 2) : [],
    question: point ? point[2] : null,
    watch: house || [],
    now: ph ? D.phase[ph] : null,
  };
}

// The free teaser: one "keep an eye out" line and a count of what the full forecast adds.
function teaserFor(e, c, phase) {
  const d = depthFor(e, c, phase); if (!d) return null;
  const all = [...d.asking, ...(d.question ? [d.question] : []), ...d.watch, ...(d.now ? [d.now] : [])];
  return { line: d.watch[0] || d.asking[0], more: all.length - 1 };
}

module.exports = { DEPTH, depthFor, teaserFor };
