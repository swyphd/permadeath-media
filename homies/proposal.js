// The proposal the launch meeting argues about: what the quiz says we should
// build. Plain data, rendered by index.html under #/proposal. Rewrite it when the
// crew decides something different; the page shows whatever is here.

export const PROPOSAL = {
  title: 'What game we build',
  asOf: '2026-10-15',
  lead: 'What the four quizzes say we should build, where we agree, and the one thing we still have to argue about. Read before the launch meeting.',
  sections: [
    {
      heading: 'The answer',
      tone: 'gold',
      html: `<p><b>A co-op builder for four friends: real-time, systems-heavy, light in tone but with real loss, 3D, on Steam, shipped small first.</b> Factorio’s systems, Overcooked’s chaos, Valheim’s shared world.</p>
<p>That is where the four quizzes converge. The places we disagree are mostly one disagreement wearing different hats, and a co-op builder dissolves it.</p>`,
    },
    {
      heading: 'Where all four of us agree',
      tone: 'done',
      html: `<p class="dim small">Seven questions came out 4–0.</p>
<ul>
<li>Played together, co-op against the game, not against each other.</li>
<li>Comedy over horror. “Shout, laugh, fail together” was unanimous.</li>
<li>A paid game on Steam, played at a desk with keyboard and mouse.</li>
<li>A game you lose a week to, not a daily puzzle.</li>
<li>A board game night online over a fast abstract duel.</li>
<li>Grounded: every one of us leans toward a world that could almost happen.</li>
</ul>`,
    },
    {
      heading: 'Where three of four lean',
      html: `<p class="dim small">These are 3–1 picks. In each case the holdout’s own other answers make the lean easy to live with.</p>
<ul>
<li>A persistent world you keep building, systems-heavy, with stories that come out of play rather than a script. Builder over survival. Josh is the lone vote for runs you lose.</li>
<li>Real-time rather than turn-based. Josh again.</li>
<li>Real stakes: three picked hardcore over cozy. Jeff is the holdout, and a light tone with real loss is exactly the Valheim and Deep Rock Galactic recipe.</li>
<li>Ship small, then grow in public. Jeff is the holdout here too, which matters because Jeff is the one who would push for the big version.</li>
<li>Fantasy over sci-fi. Eric is the lone sci-fi vote.</li>
<li>3D over 2D. Jeff is the lone 2D vote.</li>
<li>Long sittings over short ones. Josh is the holdout.</li>
</ul>`,
    },
    {
      heading: 'The one real split: era',
      tone: 'hot',
      html: `<p>Josh and Michael went fully “the past” on both era questions. Eric and Jeff went fully “now”. A true 2–2 deadlock, and the first thing to argue at the launch meeting.</p>
<p><b>Tie-break:</b> the mechanics are the expensive part and the setting is the cheap part. Decide the mechanics now, greybox a prototype, and choose the setting at the second check-in when something playable exists.</p>
<p>If we must pick now, low-fantasy past wins on the numbers. It also satisfies the 3–1 fantasy lean and the unanimous grounded lean. Eric gives up the most under that choice (sci-fi and now were his two strongest preferences), so it should be his call to make or veto.</p>`,
    },
    {
      heading: 'The splits that don’t matter',
      tone: 'quiet',
      html: `<p class="dim small">Four questions split the same way: Jeff and Josh on one side, Eric and Michael on the other.</p>
<ul>
<li>Deckbuilding roguelike vs action roguelike</li>
<li>Tactics on a grid vs a shooter</li>
<li>Puzzle game vs action platformer</li>
<li>Metroidvania vs open world</li>
</ul>
<p>That is one disagreement restated four times: thinking versus reflexes. A co-op real-time builder dissolves it. Planning and logistics for Jeff and Josh, time pressure and things on fire for Eric and Michael.</p>
<p>Narrative adventure vs sandbox also split 2–2, but the 3–1 lean toward stories that emerge from play settles it: no script, a world that generates its own anecdotes.</p>`,
    },
    {
      heading: 'A pitch to argue with',
      tone: 'gold',
      html: `<blockquote>A co-op settlement builder for four friends: one shared world, real time, everyone owns a piece of a machine that can genuinely collapse. Light tone, hard stakes. A small version on Steam first, grown in public.</blockquote>
<p class="small">Reference games, from the crew’s shelf: <b>Factorio</b> (13 picks), <b>Overcooked</b> (11), <b>Valheim</b> (10), <b>Deep Rock Galactic</b> (8). Three of the top five are co-op systems games with a comic edge.</p>`,
    },
    {
      heading: 'The first prototype',
      html: `<p>Four players, one map, one resource loop, one threat that can wipe it out, no art. The question it has to answer: <b>is it fun to be the one who screwed up?</b></p>
<p>If yes, we have the game. If no, we learned it in a month, not a year.</p>`,
    },
    {
      heading: 'Where each of us landed',
      tone: 'quiet',
      html: `<p class="dim small">Each cell is a lean from −1 to +1 across every question that touched that axis. Positive leans to the left-hand pole, negative to the right. “Agreed” means everyone is on the same side.</p>
<div class="tbl-wrap"><table class="tbl">
<thead><tr><th>Axis</th><th>Verdict</th><th>Eric</th><th>Jeff</th><th>Josh</th><th>Michael</th></tr></thead>
<tbody>
<tr><td>Grounded vs fantastical</td><td class="ok">Agreed: grounded</td><td>1.0</td><td>1.0</td><td>0.6</td><td>0.6</td></tr>
<tr><td>With others vs alone</td><td class="ok">Agreed: with others</td><td>0.5</td><td>0.2</td><td>0.1</td><td>0.7</td></tr>
<tr><td>Grim vs light</td><td class="ok">Agreed: light</td><td>−0.4</td><td>−0.7</td><td>−0.7</td><td>−0.1</td></tr>
<tr><td>Phone vs desk</td><td>Lean: desk</td><td>−0.5</td><td>−0.5</td><td>0.0</td><td>−1.0</td></tr>
<tr><td>Deep simulation vs tight rules</td><td>Lean: simulation</td><td>0.8</td><td>0.1</td><td>−0.1</td><td>1.0</td></tr>
<tr><td>Sci-fi vs fantasy</td><td>Lean: fantasy</td><td>1.0</td><td>−0.3</td><td>−1.0</td><td>−1.0</td></tr>
<tr><td>Real-time vs turn-based</td><td>Lean: real-time</td><td>0.8</td><td>−0.3</td><td>0.0</td><td>0.7</td></tr>
<tr><td>2D vs 3D</td><td>Lean: 3D</td><td>−0.5</td><td>0.1</td><td>−0.1</td><td>−0.7</td></tr>
<tr><td>Reflexes vs thinking</td><td>Lean: thinking</td><td>0.0</td><td>−0.8</td><td>−0.3</td><td>0.1</td></tr>
<tr><td>Browser vs Steam</td><td>Lean: Steam</td><td>0.0</td><td>−0.5</td><td>0.0</td><td>−0.3</td></tr>
<tr><td>Runs vs a world you keep</td><td class="bad">Split</td><td>−0.4</td><td>−0.3</td><td>0.1</td><td>−0.2</td></tr>
<tr><td>Short vs long sittings</td><td class="bad">Split</td><td>−0.3</td><td>−0.2</td><td>−0.1</td><td>−0.2</td></tr>
<tr><td>Ship small vs go big</td><td class="bad">Split</td><td>−0.3</td><td>0.1</td><td>0.1</td><td>−0.3</td></tr>
<tr><td>Written vs emergent story</td><td class="bad">Split</td><td>−0.1</td><td>0.0</td><td>0.4</td><td>−0.4</td></tr>
<tr><td>The past vs now</td><td class="bad">Split</td><td>−1.0</td><td>−1.0</td><td>1.0</td><td>1.0</td></tr>
<tr><td>Co-op vs versus</td><td class="bad">Split</td><td>0.0</td><td>−0.1</td><td>0.1</td><td>0.0</td></tr>
</tbody></table></div>
<p class="tiny dim">The last row is a false split: the co-op question itself was 4–0 for co-op. The axis only reads even because versus-flavoured sides of other questions (autobattler, fighting game, board game night) also carried a versus tag.</p>`,
    },
  ],
};
