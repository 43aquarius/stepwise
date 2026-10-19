/* ============================================================
   Stepwise — breakdown.js
   A human, rule-based task breakdown engine.
   No AI, no network: every rule is readable in this file,
   because a tool that judges you should be a tool you can read.
   ============================================================ */

const KIND_FACTOR = 1.35; // gentle buffer for time blindness

const CATEGORY_TEMPLATES = [
  {
    id: 'cleaning',
    match: ['clean', 'tidy', 'laundry', 'dishes', 'kitchen', 'vacuum', 'sweep',
      'mop', 'dust', 'fridge', 'closet', 'bed', 'room', 'bathroom', 'wash',
      'chores', 'declutter', 'organize', 'organise', 'bedsheets'],
    steps: [
      { t: 'Set a 5-minute timer and put on music you like', m: 5, kind: 'prep' },
      { t: 'Clear the surfaces: collect anything that doesn’t belong into one basket', m: 10 },
      { t: 'Wash or load the dishes', m: 15 },
      { t: 'Wipe the surfaces (counters, table)', m: 10 },
      { t: 'Handle the basket: put each thing where it lives', m: 10 },
      { t: 'Sweep or vacuum the floor', m: 10 },
      { t: 'Take a photo of your clean space — then enjoy it', m: 3, kind: 'reward' },
    ],
  },
  {
    id: 'study',
    match: ['study', 'homework', 'essay', 'assignment', 'exam', 'test', 'read',
      'write', 'thesis', 'paper', 'revise', 'revision', 'notes', 'quiz',
      'learn', 'course', 'lecture', 'class', 'chapter', 'midterm', 'final'],
    steps: [
      { t: 'Gather what you need in one pile: notes, laptop, water', m: 3, kind: 'prep' },
      { t: 'Phone on silent — in another room if you can', m: 2 },
      { t: 'Write the one question you’re answering, in a single sentence', m: 5 },
      { t: 'Set a 25-minute timer and start badly on purpose — rough is allowed', m: 25 },
      { t: 'Stand up, stretch, get water', m: 5, kind: 'break' },
      { t: 'Second 25-minute pass: revise or continue', m: 25 },
      { t: 'Write a note about where you’ll pick up next time', m: 3 },
      { t: 'Close the laptop and do something kind for yourself', m: 10, kind: 'reward' },
    ],
  },
  {
    id: 'email',
    match: ['email', 'reply', 'inbox', 'message', 'respond', 'follow up',
      'contact', 'prof', 'professor', 'advisor', 'dm', 'text back', 'letter'],
    steps: [
      { t: 'Open only the one thread that matters most', m: 1, kind: 'prep' },
      { t: 'Draft a rough reply — two or three sentences is enough', m: 5 },
      { t: 'Read it once; fix only the biggest thing', m: 3 },
      { t: 'Send it. Done is better than perfect', m: 1 },
      { t: 'If you have more in you: pick ONE more, repeat', m: 10 },
      { t: 'Step away from the inbox on purpose', m: 2, kind: 'reward' },
    ],
  },
  {
    id: 'errand',
    match: ['shop', 'buy', 'grocery', 'groceries', 'bank', 'post', 'paperwork',
      'form', 'bills', 'pay', 'appointment', 'renew', 'apply', 'passport',
      'print', 'register', 'document', 'doctor', 'dentist', 'gift'],
    steps: [
      { t: 'Name the ONE errand that would feel best done', m: 2, kind: 'prep' },
      { t: 'Check what you need: documents, payment, bag', m: 3 },
      { t: 'Do the errand itself', m: 30 },
      { t: 'Put things back where they live: receipts, bag, documents', m: 5 },
      { t: 'Thank yourself out loud', m: 2, kind: 'reward' },
    ],
  },
  {
    id: 'exercise',
    match: ['gym', 'run', 'jog', 'walk', 'workout', 'yoga', 'stretch', 'swim',
      'bike', 'ride', 'hike', 'train', 'exercise', 'basketball', 'football'],
    steps: [
      { t: 'Put on clothes you can move in', m: 3, kind: 'prep' },
      { t: 'Decide the smallest version you’ll accept today', m: 1 },
      { t: 'Warm up gently', m: 5 },
      { t: 'The main thing — at whatever intensity is honest today', m: 20 },
      { t: 'Cool down and drink water', m: 5, kind: 'break' },
      { t: 'Note how you feel in one word', m: 2, kind: 'reward' },
    ],
  },
  {
    id: 'cooking',
    match: ['cook', 'meal', 'dinner', 'lunch', 'breakfast', 'recipe', 'bake',
      'food', 'prep', 'pasta', 'soup', 'dinner'],
    steps: [
      { t: 'Pick the recipe and put it where you can see it', m: 3, kind: 'prep' },
      { t: 'Take everything out on the counter first', m: 5 },
      { t: 'Prep: wash, chop, measure', m: 15 },
      { t: 'Cook — set a timer for each stage', m: 25 },
      { t: 'Pack leftovers before you sit, if you can', m: 5 },
      { t: 'Sit down and actually enjoy it — you made this', m: 10, kind: 'reward' },
    ],
  },
  {
    id: 'travel',
    match: ['trip', 'pack', 'packing', 'flight', 'travel', 'suitcase', 'visa',
      'hotel', 'itinerary', 'vacation', 'holiday'],
    steps: [
      { t: 'List the categories: clothes, tech, documents, toiletries', m: 5, kind: 'prep' },
      { t: 'Lay everything on the bed first', m: 15 },
      { t: 'Edit: remove one third — you won’t miss it', m: 10 },
      { t: 'Pack by category, heaviest near the wheels', m: 15 },
      { t: 'Chargers, documents and snacks in the easy pocket', m: 5 },
      { t: 'Zip it and put it by the door', m: 2, kind: 'reward' },
    ],
  },
];

const GENERIC_TEMPLATE = [
  { t: 'Say what “done” looks like, in one sentence', m: 3, kind: 'prep' },
  { t: 'Gather everything you need into one place', m: 5 },
  { t: 'Do the first ten minutes — badly on purpose', m: 10 },
  { t: 'Stretch and breathe', m: 3, kind: 'break' },
  { t: 'Continue: the next twenty minutes', m: 20 },
  { t: 'Put things away and write down where you stopped', m: 3 },
  { t: 'Do something kind for yourself', m: 10, kind: 'reward' },
];

function normalize(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function detectCategory(title) {
  const text = normalize(title);
  if (!text) return null;
  let best = null, bestHits = 0;
  for (const cat of CATEGORY_TEMPLATES) {
    let hits = 0;
    for (const kw of cat.match) {
      if (text === kw || text.includes(kw)) hits++;
    }
    if (hits > bestHits) { best = cat; bestHits = hits; }
  }
  return best;
}

/** Format minutes for humans. */
export function fmtMin(min) {
  min = Math.max(1, Math.round(min));
  if (min < 60) return `~${min} min`;
  const h = Math.floor(min / 60), r = min % 60;
  return r === 0 ? `~${h} hr` : `~${h} hr ${r} min`;
}

/**
 * Break a task title into kind, small steps.
 * @returns {{steps: Array, matched: string|null}}
 */
export function breakDown(title, { kind = true } = {}) {
  const cat = detectCategory(title);
  const template = cat ? cat.steps : GENERIC_TEMPLATE;
  const factor = kind ? KIND_FACTOR : 1;
  const steps = template.map(s => ({
    id: null, // assigned by storage layer
    label: s.t,
    minutes: Math.max(1, Math.round(s.m * factor)),
    base: s.m,
    kind: s.kind || 'do',
    done: false,
    skipped: false,
    doneAt: null,
  }));
  return { steps, matched: cat ? cat.id : 'generic' };
}

/**
 * Split steps into sessions of at most `per` working steps,
 * inserting a visible break step between sessions.
 */
export function toSessions(steps, per = 4) {
  const working = steps.filter(s => s.kind !== 'break');
  if (working.length <= per) return [steps.map(s => s.id)];
  const sessions = [];
  let current = [];
  for (const s of steps) {
    current.push(s.id);
    const workingInCurrent = current.filter(id => {
      const st = steps.find(x => x.id === id);
      return st && st.kind !== 'break';
    }).length;
    if (workingInCurrent >= per) {
      sessions.push(current);
      current = [];
    }
  }
  if (current.length) {
    if (sessions.length && current.length <= 1) {
      sessions[sessions.length - 1].push(...current);
    } else sessions.push(current);
  }
  return sessions;
}

/** Rebuild steps array from the "one per line" editor format. `label | minutes` */
export function parseEditor(text) {
  const out = [];
  for (const raw of String(text).split(/\n+/)) {
    const line = raw.trim();
    if (!line) continue;
    let kind = 'do';
    let body = line;
    if (/^break\s*:/i.test(body)) { kind = 'break'; body = body.replace(/^break\s*:/i, '').trim(); }
    if (/^reward\s*:/i.test(body)) { kind = 'reward'; body = body.replace(/^reward\s*:/i, '').trim(); }
    if (/^prep\s*:/i.test(body)) { kind = 'prep'; body = body.replace(/^prep\s*:/i, '').trim(); }
    let minutes = 5;
    const parts = body.split('|');
    if (parts.length >= 2) {
      body = parts.slice(0, -1).join('|').trim();
      const maybe = parseInt(parts[parts.length - 1].trim(), 10);
      if (Number.isFinite(maybe) && maybe > 0) minutes = Math.min(maybe, 600);
    }
    if (!body) continue;
    out.push({ label: body, minutes, kind, done: false, skipped: false, doneAt: null });
  }
  return out;
}

export function toEditor(steps) {
  return steps.map(s => {
    const prefix = s.kind === 'break' ? 'break: ' : s.kind === 'reward' ? 'reward: ' : s.kind === 'prep' ? 'prep: ' : '';
    return `${prefix}${s.label} | ${s.minutes}`;
  }).join('\n');
}

export const BREAK_STEP = {
  label: 'Break: stretch, get water, look out a window',
  minutes: 5,
  kind: 'break',
};
