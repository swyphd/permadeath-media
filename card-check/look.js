// Card Check's visual language: one icon and one colour per resource, the icons
// on worker and Issue cards, and the words behind every tooltip. The page draws
// with these; the tests check that every Small Win names the resources it moves.
//
// Icons are from Lucide (lucide.dev, ISC licence), inlined as SVG paths.

export const ICONS = {
  action: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  win: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  signed: '<path d="m21 17-2.156-1.868A.5.5 0 0 0 18 15.5v.5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1c0-2.545-3.991-3.97-8.5-4a1 1 0 0 0 0 5c4.153 0 4.745-11.295 5.708-13.5a2.5 2.5 0 1 1 3.31 3.284"/><path d="M3 21h18"/>',
  steward: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  absorbSpent: '<path d="m2 2 20 20"/><path d="M5 5a1 1 0 0 0-1 1v7c0 5 3.5 7.5 7.67 8.94a1 1 0 0 0 .67.01c2.35-.82 4.48-1.97 5.9-3.71"/><path d="M9.309 3.652A12.252 12.252 0 0 0 11.24 2.28a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1v7a9.784 9.784 0 0 1-.08 1.264"/>',
  leader: '<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  unlock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
  reorg: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  decert: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  plant: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" x2="22" y1="8" y2="13"/><line x1="22" x2="17" y1="8" y2="13"/>',
  contract: '<path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>',
  Crunch: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  Layoffs: '<circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>',
  Credit: '<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/>',
  Harassment: '<path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
  any: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  mgmt: '<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
  orgs: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  deck: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  up: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  draw: '<line x1="15" x2="15" y1="12" y2="18"/><line x1="12" x2="18" y1="15" y2="15"/><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  fear: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  burnout: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  trait: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
  Pay: '<line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
};

// The resources the players manage. `color` is a CSS custom property the page defines.
export const RESOURCES = {
  fear:    { n: 'Fear', icon: 'fear', color: '--fear',
             tip: 'Fear: how scared the studio is. Management cards raise it; Reassure and Small Wins lower it. At 7, One-on-Ones cost 2 and every organizer takes Burnout at round end. At 8, Small Wins cost 2. At 10 at round end, the drive collapses.' },
  action:  { n: 'Actions', icon: 'action', color: '--act',
             tip: 'Actions: what an organizer spends each turn. 3 per round, 2 at Burnout 2, 1 at Burnout 3. Unspent actions are lost when you end your turn.' },
  burnout: { n: 'Burnout', icon: 'burnout', color: '--burn',
             tip: 'Burnout: 0 to 3 per organizer. At 2 you get 2 actions; at 3, 1 action and no ability. Overwork and Fear 7+ add it; Reset removes it. If every organizer reaches 3, the drive is over.' },
  win:     { n: 'Small Wins', icon: 'win', color: '--win',
             tip: 'Small Wins: three per game. Each one moves every worker with its icon up a step, lowers Fear and changes a rule for the rest of the game. Management draws an extra card the next round.' },
  signed:  { n: 'Signed', icon: 'signed', color: '--sign',
             tip: 'Signed: workers who have signed a union card. Signed and Stewards count at the vote.' },
  steward: { n: 'Stewards', icon: 'steward', color: '--sign',
             tip: 'Stewards: Signed Leaders made into Stewards by Build Committee. Each gives a free One-on-One in their department every round, brings one worker up at the start of each round, and can absorb one management card per game. They count at the vote.' },
};

// The five things workers care about, each with its own icon, matched on worker
// cards and on the Issue it wins.
export const ISSUE_ICONS = {
  Crunch: 'Crunch: wants an end to crunch.',
  Pay: 'Pay: wants pay transparency.',
  Layoffs: 'Layoffs: worried about layoffs and contracts.',
  Credit: 'Credit: wants fair game credits.',
  Harassment: 'Harassment: wants a real harassment procedure.',
};

// What each Small Win moves, by resource, in the order the Issue card shows them.
// Every win also costs an action, lowers Fear and moves its icon's workers up;
// `effects` here is the lasting rule, which is what sets the card's colour.
export const ISSUE_EFFECTS = {
  crunch:  [{ r: 'burnout', t: 'Overwork costs no Burnout' }, { r: 'signed', t: 'Crunch holdouts can sign' }],
  pay:     [{ r: 'signed', t: 'Pay workers can’t be moved down' }, { r: 'signed', t: 'Pay holdouts can sign' }],
  layoffs: [{ r: 'action', t: 'Map costs 1 action anywhere' }, { r: 'signed', t: 'Contract workers can’t be removed' }],
  credit:  [{ r: 'signed', t: 'Leaders’ influence becomes 3' }],
  harass:  [{ r: 'fear', t: 'Small Wins lower Fear by 2' }, { r: 'burnout', t: 'No Burnout from Fear 7–9' }],
  wild:    [{ r: 'burnout', t: 'Every organizer −1 Burnout' }, { r: 'signed', t: 'All holdouts unlock; nobody can be removed' }],
};

// The resources an Issue touches, its own lasting rule first: the card's accent
// colour comes from the first.
export function issueResources(id) {
  const out = [];
  for (const e of ISSUE_EFFECTS[id] || []) if (!out.includes(e.r)) out.push(e.r);
  for (const r of ['fear', 'signed']) if (!out.includes(r)) out.push(r);
  return out;
}

// Tooltips for the symbols on the board.
export const SYMBOLS = {
  leader: 'Leader. Only a Signed Leader can become a Steward. A Hostile Leader drags one worker in their department down a step every round.',
  trait: 'Special rule: this worker changes the game by where they sit. Hover the card for it.',
  lock: 'Holdout: stops at Leaning until their Issue is won.',
  unlock: 'Former holdout: their Issue is won, so they can sign.',
  steward: 'Steward. Free One-on-One here once a round, brings a worker up each round, and can absorb one management card.',
  absorbSpent: 'Steward whose absorb is spent this game.',
  plant: 'Plant: management fills the desk of any removed worker with one. Hostile, immovable, and every One-on-One in this department costs +1.',
  contract: 'Contract worker: Contract Ends can remove them from the board.',
  reorg: 'Reorganized this round: no Steward or Influence here.',
  decert: 'Decertified: this department’s workers don’t count at the vote unless two are Stewards.',
  deck: 'Face-down workers. Map turns over the top card.',
  mgmt: 'Management: turns over its cards at the start of every round, before you act, and more as you grow and after each Small Win.',
};

export function influenceTip(n, credit) {
  return `Influence ${n}${credit ? ' (Credit Policy)' : ''}: when this worker signs, move up to ${n} colleague${n === 1 ? '' : 's'} in their department up a step.`;
}
