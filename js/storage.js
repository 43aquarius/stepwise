/* ============================================================
   Stepwise — storage.js
   localStorage persistence. Your steps live on your device only.
   ============================================================ */

const KEY = 'stepwise.v1';
let counter = 0;

export function uid() {
  counter += 1;
  return `s${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export const DEFAULT_SETTINGS = {
  size: 'M',            // S M L XL XXL
  hc: false,            // high contrast
  dy: false,            // dyslexia-friendly
  motion: false,        // reduce motion
  sound: true,          // gentle chime
  kind: true,           // kind time estimates
};

export function defaultState() {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    tasks: [],
    history: [], // {id, stepId, label, taskTitle, at}
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const data = JSON.parse(raw);
    const state = defaultState();
    if (data && typeof data === 'object') {
      state.settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
      state.tasks = Array.isArray(data.tasks) ? data.tasks : [];
      state.history = Array.isArray(data.history) ? data.history : [];
      // ensure ids exist on steps
      for (const t of state.tasks) {
        (t.steps || []).forEach(s => { if (!s.id) s.id = uid(); });
      }
    }
    return state;
  } catch {
    return defaultState();
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearAll() {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}

/* ---------- history helpers ---------- */

export function addHistory(state, { stepId, label, taskTitle }) {
  state.history.push({ id: uid(), stepId, label, taskTitle, at: Date.now() });
}

export function removeHistoryByStep(state, stepId) {
  state.history = state.history.filter(h => h.stepId !== stepId);
}

/* ---------- stats ---------- */

function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function computeStats(history) {
  const now = new Date();
  const todayKey = dayKey(now.getTime());
  const weekAgo = now.getTime() - 6 * 86400000;
  let today = 0, week = 0;
  for (const h of history) {
    if (dayKey(h.at) === todayKey) today++;
    if (h.at >= weekAgo) week++;
  }
  // streak: consecutive days with at least one win, ending today or yesterday
  const days = new Set(history.map(h => dayKey(h.at)));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1); // allow "yesterday streak"
  while (days.has(dayKey(cursor.getTime()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { today, week, streak };
}

export function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d > 1 ? 's' : ''} ago`;
  const w = Math.floor(d / 7);
  return `${w} week${w > 1 ? 's' : ''} ago`;
}

/* ---------- demo data ---------- */

export function seedDemo() {
  const now = Date.now();
  const H = 3600000, D = 86400000;
  const mk = (label, taskTitle, ago) => ({ id: uid(), stepId: uid(), label, taskTitle, at: now - ago });
  const history = [
    mk('Set a 5-minute timer and put on music you like', 'Deep clean the kitchen', 9 * D + 3 * H),
    mk('Clear the surfaces: collect anything that doesn’t belong into one basket', 'Deep clean the kitchen', 9 * D + 2.5 * H),
    mk('Wash or load the dishes', 'Deep clean the kitchen', 9 * D + 2 * H),
    mk('Take a photo of your clean space — then enjoy it', 'Deep clean the kitchen', 9 * D + 1 * H),
    mk('Open only the one thread that matters most', 'Reply to Prof. Reyes about the thesis draft', 7 * D),
    mk('Draft a rough reply — two or three sentences is enough', 'Reply to Prof. Reyes about the thesis draft', 7 * D - 10 * 60000),
    mk('Send it. Done is better than perfect', 'Reply to Prof. Reyes about the thesis draft', 7 * D - 20 * 60000),
    mk('Put on clothes you can move in', '30 minutes of movement', 6 * D),
    mk('The main thing — at whatever intensity is honest today', '30 minutes of movement', 6 * D - 25 * 60000),
    mk('Note how you feel in one word', '30 minutes of movement', 6 * D - 30 * 60000),
    mk('Name the ONE errand that would feel best done', 'Buy a birthday gift for Mom', 5 * D),
    mk('Do the errand itself', 'Buy a birthday gift for Mom', 5 * D - 35 * 60000),
    mk('Gather what you need in one pile: notes, laptop, water', 'Read 40 pages and take notes', 4 * D),
    mk('Set a 25-minute timer and start badly on purpose', 'Read 40 pages and take notes', 4 * D - 30 * 60000),
    mk('Second 25-minute pass: revise or continue', 'Read 40 pages and take notes', 4 * D - 60 * 60000),
    mk('Write the one question you’re answering, in a single sentence', 'Term paper outline', 3 * D),
    mk('Set a 25-minute timer and start badly on purpose', 'Term paper outline', 3 * D - 27 * 60000),
    mk('Stand up, stretch, get water', 'Term paper outline', 3 * D - 40 * 60000),
    mk('Gather everything you need into one place', 'Print the handout for Friday’s meeting', 2 * D),
    mk('Do the first ten minutes — badly on purpose', 'Print the handout for Friday’s meeting', 2 * D - 12 * 60000),
    mk('Put things away and write down where you stopped', 'Print the handout for Friday’s meeting', 2 * D - 18 * 60000),
    mk('Put on clothes you can move in', '30 minutes of movement', 1 * D),
    mk('Warm up gently', '30 minutes of movement', 1 * D - 6 * 60000),
    mk('The main thing — at whatever intensity is honest today', '30 minutes of movement', 1 * D - 30 * 60000),
    mk('Cool down and drink water', '30 minutes of movement', 1 * D - 36 * 60000),
    mk('Take everything out on the counter first', 'Cook a proper dinner', 1 * D - 2 * H),
    mk('Prep: wash, chop, measure', 'Cook a proper dinner', 1 * D - 1.8 * H),
    mk('Sit down and actually enjoy it — you made this', 'Cook a proper dinner', 1 * D - 1 * H),
    mk('Phone on silent — in another room if you can', 'Study for the stats midterm', 3 * 3600000),
    mk('Set a 25-minute timer and start badly on purpose', 'Study for the stats midterm', 3 * 3600000 - 26 * 60000),
    mk('Stand up, stretch, get water', 'Study for the stats midterm', 3 * 3600000 - 40 * 60000),
  ];

  const taskDone = (title, stepsArr) => ({
    id: uid(), title, createdAt: now - 10 * D,
    steps: stepsArr.map(([label, minutes, kind], i) => ({
      id: uid(), label, minutes, kind: kind || 'do', done: true, skipped: false, doneAt: now - 9 * D + i * 600000,
    })),
  });

  const kitchen = taskDone('Deep clean the kitchen', [
    ['Set a 5-minute timer and put on music you like', 7, 'prep'],
    ['Clear the surfaces: collect anything that doesn’t belong into one basket', 14],
    ['Wash or load the dishes', 20],
    ['Wipe the surfaces (counters, table)', 14],
    ['Handle the basket: put each thing where it lives', 14],
    ['Sweep or vacuum the floor', 14],
    ['Take a photo of your clean space — then enjoy it', 4, 'reward'],
  ]);

  const active = {
    id: uid(), title: 'Prepare the presentation for Friday', createdAt: now - 2 * D,
    steps: [
      { id: uid(), label: 'Pick the three points you want people to remember', minutes: 8, kind: 'prep', done: true, skipped: false, doneAt: now - 2 * D + 3600000 },
      { id: uid(), label: 'Sketch one slide per point — ugly is fine', minutes: 20, kind: 'do', done: true, skipped: false, doneAt: now - 2 * D },
      { id: uid(), label: 'break: Stretch, get water, look out a window', minutes: 7, kind: 'break', done: false, skipped: false, doneAt: null },
      { id: uid(), label: 'Build the three key slides properly', minutes: 34, kind: 'do', done: false, skipped: false, doneAt: null },
      { id: uid(), label: 'Say it out loud once, to the wall', minutes: 14, kind: 'do', done: false, skipped: false, doneAt: null },
      { id: uid(), label: 'Note where you’ll pick up tomorrow, then close the laptop', minutes: 4, kind: 'do', done: false, skipped: false, doneAt: null },
      { id: uid(), label: 'Do something kind for yourself', minutes: 10, kind: 'reward', done: false, skipped: false, doneAt: null },
    ],
  };

  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    tasks: [kitchen, active],
    history,
  };
}
