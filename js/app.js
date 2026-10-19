/* ============================================================
   Stepwise — app.js
   Router, Today view, Task view, settings, shortcuts.
   ============================================================ */

import { load, save, uid, removeHistoryByStep, addHistory } from './storage.js';
import { breakDown, toSessions, parseEditor, toEditor, fmtMin } from './breakdown.js';
import { renderWins } from './wins.js';
import { initFocus, openFocus, stopFocusTimer } from './focus.js';
import { initDialogs } from './dialogs.js';

const $ = id => document.getElementById(id);

const els = {
  // global
  announcer: $('announcer'),
  // today
  viewToday: $('view-today'),
  todayH: $('today-h'),
  taskList: $('taskList'),
  todayEmpty: $('todayEmpty'),
  addForm: $('addForm'),
  taskInput: $('taskInput'),
  btnShowAll: $('btnShowAll'),
  // task
  viewTask: $('view-task'),
  taskH: $('task-h'),
  taskEyebrow: $('taskEyebrow'),
  taskMeta: $('taskMeta'),
  breakdownCta: $('breakdownCta'),
  btnBreakdown: $('btnBreakdown'),
  kindToggle: $('kindToggle'),
  sessionsWrap: $('sessionsWrap'),
  sessionList: $('sessionList'),
  btnEditSteps: $('btnEditSteps'),
  editWrap: $('editWrap'),
  stepsEditor: $('stepsEditor'),
  btnSaveSteps: $('btnSaveSteps'),
  btnCancelEdit: $('btnCancelEdit'),
  btnRedo: $('btnRedo'),
  btnDelete: $('btnDelete'),
  // focus
  viewFocus: $('view-focus'),
  focusH: $('focus-h'),
  focusWhere: $('focusWhere'),
  focusBack: $('focusBack'),
  focusStepNo: $('focusStepNo'),
  focusStepLabel: $('focus-h'),
  timerText: $('timerText'),
  timerSub: $('timerSub'),
  timerState: $('timerState'),
  ringFg: $('ringFg'),
  btnDone: $('btnDone'),
  btnTimer: $('btnTimer'),
  btnExtend: $('btnExtend'),
  btnSkip: $('btnSkip'),
  btnNextStep: $('btnNextStep'),
  btnFinishSession: $('btnFinishSession'),
  peekList: $('peekList'),
  celebrate: $('celebrate'),
  celebrateTitle: $('celebrateTitle'),
  celebrateSub: $('celebrateSub'),
  focusStage: $('focusStageEl') || document.querySelector('.focus-stage'),
  confettiHost: $('confettiHost'),
  // wins
  viewWins: $('view-wins'),
  statToday: $('statToday'),
  statWeek: $('statWeek'),
  statStreak: $('statStreak'),
  trailSvg: $('trailSvg'),
  trailNote: $('trailNote'),
  recentList: $('recentList'),
  recentEmpty: $('recentEmpty'),
  btnExport: $('btnExport'),
  fileImport: $('fileImport'),
  btnSeed: $('btnSeed'),
  btnErase: $('btnErase'),
  // chaos
  viewChaos: $('view-chaos'),
  // dialogs
  btnA11y: $('btnA11y'),
  btnHelp: $('btnHelp'),
  a11yPanel: $('a11yPanel'),
  helpDialog: $('helpDialog'),
  confirmDialog: $('confirmDialog'),
  confirmTitle: $('confirmTitle'),
  confirmText: $('confirmText'),
  confirmOk: $('confirmOk'),
  confirmCancel: $('confirmCancel'),
  optContrast: $('optContrast'),
  optDyslexia: $('optDyslexia'),
  optMotion: $('optMotion'),
  optSound: $('optSound'),
  optKind: $('optKind'),
};

const state = load();
let showAllTasks = false;
let dialogsApi = null;

/* ---------------- announcer ---------------- */
let announceT = null;
function announce(text) {
  els.announcer.textContent = '';
  clearTimeout(announceT);
  announceT = setTimeout(() => { els.announcer.textContent = text; }, 60);
}

/* ---------------- settings ---------------- */
function applySettings() {
  const s = state.settings;
  document.documentElement.className = '';
  document.documentElement.classList.add(`sz-${s.size || 'M'}`);
  if (s.motion) document.documentElement.classList.add('less-motion');
  document.body.classList.toggle('hc', !!s.hc);
  document.body.classList.toggle('dy', !!s.dy);
  if (els.kindToggle) els.kindToggle.checked = !!s.kind;
  save(state);
}
function systemReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ---------------- routing ---------------- */
function parseHash() {
  const h = (location.hash || '#today').slice(1);
  const [head, arg] = h.split(':');
  return { head: head || 'today', arg };
}
function route(hash) {
  if (location.hash === hash) { handleRoute(); }
  else location.hash = hash;
}
function handleRoute() {
  const { head, arg } = parseHash();
  const views = {
    today: els.viewToday, task: els.viewTask, focus: els.viewFocus,
    wins: els.viewWins, chaos: els.viewChaos,
  };
  for (const k in views) views[k].hidden = (k !== head);
  if (!views[head]) { location.hash = '#today'; return; }

  document.querySelectorAll('.main-nav a').forEach(a => {
    const target = a.getAttribute('href').slice(1);
    if (target === head) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  window.scrollTo({ top: 0 });

  if (head === 'today') renderToday();
  if (head === 'task' && arg) openTask(arg);
  if (head === 'focus' && arg) {
    const [taskId, sessionIdx] = arg.split('.');
    openFocus(taskId, parseInt(sessionIdx || '0', 10));
  }
  if (head === 'wins') renderWins(state, els);
}

/* ---------------- TODAY ---------------- */
function nextUndoneSession(task) {
  if (!task.sessions) return null;
  for (let i = 0; i < task.sessions.length; i++) {
    for (const id of task.sessions[i]) {
      const st = (task.steps || []).find(s => s.id === id);
      if (st && !st.done && !st.skipped) return i;
    }
  }
  return null;
}

function renderToday() {
  const tasks = state.tasks;
  const active = tasks.filter(t => (t.steps || []).some(s => !s.done && !s.skipped) || !t.sessions);
  const sorted = [...active].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  els.todayEmpty.hidden = sorted.length > 0;
  els.taskList.innerHTML = '';

  const limit = showAllTasks ? sorted.length : Math.min(3, sorted.length);
  for (const t of sorted.slice(0, limit)) {
    const li = document.createElement('li');
    li.className = 'task-card';
    const total = (t.steps || []).length;
    const done = (t.steps || []).filter(s => s.done).length;
    const est = (t.steps || []).reduce((a, s) => a + (s.minutes || 0), 0);
    const next = nextUndoneSession(t);

    const main = document.createElement('div');
    main.className = 'task-main';
    const title = document.createElement('p');
    title.className = 'task-title';
    title.textContent = t.title;
    const flags = document.createElement('ul');
    flags.className = 'task-flags';
    if (t.sessions) {
      const liDone = document.createElement('li');
      liDone.className = 'flag-done';
      liDone.textContent = `${done}/${total} steps done`;
      const liEst = document.createElement('li');
      liEst.textContent = fmtMin(est);
      const liNext = document.createElement('li');
      liNext.className = 'flag-next';
      liNext.textContent = next === null ? 'all done ✓' : `next: session ${next + 1}`;
      flags.append(liDone, liEst, liNext);
    } else {
      const liNew = document.createElement('li');
      liNew.innerHTML = '<span class="chip">new — not broken down yet</span>';
      flags.appendChild(liNew);
    }
    main.append(title, flags);

    const open = document.createElement('a');
    open.className = 'btn btn-ghost task-open';
    open.href = `#task:${t.id}`;
    open.textContent = 'Open →';
    li.append(main, open);
    els.taskList.appendChild(li);
  }

  const more = sorted.length - Math.min(3, sorted.length);
  els.btnShowAll.hidden = !(more > 0 && !showAllTasks);
  els.btnShowAll.textContent = `Show all ${sorted.length} tasks`;
  els.btnShowAll.onclick = () => { showAllTasks = true; renderToday(); };
}

els.addForm.addEventListener('submit', e => {
  e.preventDefault();
  const title = els.taskInput.value.trim();
  if (!title) { els.taskInput.focus(); return; }
  const task = { id: uid(), title, createdAt: Date.now(), steps: [], sessions: null };
  state.tasks.push(task);
  save(state);
  els.taskInput.value = '';
  announce('Task added. Now let’s make it small.');
  route(`#task:${task.id}`);
});

/* ---------------- TASK ---------------- */
let currentTaskId = null;

function openTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) { route('#today'); return; }
  currentTaskId = id;
  els.taskH.textContent = task.title;
  els.taskEyebrow.textContent = 'Task';
  const created = task.createdAt ? new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
  const hasSteps = (task.steps || []).length > 0;

  els.breakdownCta.hidden = hasSteps;
  els.sessionsWrap.hidden = !hasSteps;
  if (!hasSteps) {
    els.kindToggle.checked = !!state.settings.kind;
    return;
  }
  const total = task.steps.length;
  const done = task.steps.filter(s => s.done).length;
  const est = task.steps.reduce((a, s) => a + (s.minutes || 0), 0);
  els.taskMeta.textContent = `added ${created} · ${done}/${total} steps done · about ${fmtMin(est)} in total`;
  renderSessions(task);
}

els.kindToggle.addEventListener('change', () => {
  state.settings.kind = els.kindToggle.checked;
  save(state);
});

els.btnBreakdown.addEventListener('click', () => {
  const task = state.tasks.find(t => t.id === currentTaskId);
  if (!task) return;
  const { steps } = breakDown(task.title, { kind: state.settings.kind });
  steps.forEach(s => { s.id = uid(); });
  task.steps = steps;
  task.sessions = toSessions(steps, 4);
  save(state);
  announce(`Broken down into ${steps.length} kind steps.`);
  openTask(task.id);
});

els.btnRedo.addEventListener('click', () => {
  const task = state.tasks.find(t => t.id === currentTaskId);
  if (!task) return;
  dialogsApi.askConfirm('Break it down again?',
    'This re-runs the breakdown and clears the current steps and checkmarks for this task.',
    'Do it').then(ok => {
    if (!ok) return;
    const { steps } = breakDown(task.title, { kind: state.settings.kind });
    steps.forEach(s => { s.id = uid(); });
    task.steps = steps;
    task.sessions = toSessions(steps, 4);
    task.steps.filter(s => s.done).forEach(s => removeHistoryByStep(state, s.id));
    save(state);
    announce('Broken down again.');
    openTask(task.id);
  });
});

els.btnDelete.addEventListener('click', () => {
  const task = state.tasks.find(t => t.id === currentTaskId);
  if (!task) return;
  dialogsApi.askConfirm('Delete this task?',
    `“${task.title}” and its steps will be removed from this device. Its finished steps keep their place in your wins trail.`,
    'Delete task').then(ok => {
    if (!ok) return;
    state.tasks = state.tasks.filter(t => t.id !== task.id);
    save(state);
    announce('Task deleted. Onwards.');
    route('#today');
  });
});

els.btnEditSteps.addEventListener('click', () => {
  const open = els.editWrap.hidden;
  els.editWrap.hidden = !open;
  els.btnEditSteps.setAttribute('aria-expanded', String(open));
  if (open) {
    const task = state.tasks.find(t => t.id === currentTaskId);
    els.stepsEditor.value = toEditor(task.steps);
    els.stepsEditor.focus();
  }
});
els.btnCancelEdit.addEventListener('click', () => {
  els.editWrap.hidden = true;
  els.btnEditSteps.setAttribute('aria-expanded', 'false');
});
els.btnSaveSteps.addEventListener('click', () => {
  const task = state.tasks.find(t => t.id === currentTaskId);
  if (!task) return;
  const oldDone = new Set(task.steps.filter(s => s.done).map(s => s.id));
  const steps = parseEditor(els.stepsEditor.value);
  if (!steps.length) { announce('No readable steps in there — nothing changed.'); return; }
  steps.forEach(s => { s.id = uid(); });
  // try to carry over "done" state by position for the first oldDone.size steps
  let carry = 0;
  for (const s of steps) {
    if (carry < oldDone.size) { s.done = true; s.doneAt = Date.now(); carry++; }
    else break;
  }
  task.steps = steps;
  task.sessions = toSessions(steps, 4);
  save(state);
  els.editWrap.hidden = true;
  els.btnEditSteps.setAttribute('aria-expanded', 'false');
  announce('Steps saved.');
  openTask(task.id);
});

function renderSessions(task) {
  els.sessionList.innerHTML = '';
  if (!task.sessions) return;
  task.sessions.forEach((ids, i) => {
    const steps = ids.map(id => task.steps.find(s => s.id === id)).filter(Boolean);
    const doneCount = steps.filter(s => s.done).length;
    const allDone = doneCount === steps.length && steps.length > 0;
    const est = steps.reduce((a, s) => a + (s.minutes || 0), 0);
    const hasOpen = steps.some(s => !s.done && !s.skipped);

    const card = document.createElement('div');
    card.className = 'session-card';
    const head = document.createElement('div');
    head.className = 'session-head';
    head.innerHTML = `<span class="session-name">Session ${i + 1}</span>
      <span class="session-meta">${steps.length} steps · ${fmtMin(est)}</span>
      ${allDone ? '<span class="chip progress">done ✓</span>' : ''}`;
    card.appendChild(head);

    const ol = document.createElement('ul');
    ol.className = 'step-list';
    for (const s of steps) {
      const li = document.createElement('li');
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'step-row' + (s.kind === 'break' ? ' is-break' : '');
      row.setAttribute('aria-pressed', s.done ? 'true' : 'false');
      row.dataset.stepId = s.id;
      const check = document.createElement('span');
      check.className = 'step-check';
      check.textContent = '✓';
      check.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.className = 'step-label';
      label.textContent = s.label;
      const min = document.createElement('span');
      min.className = 'step-min';
      min.textContent = s.kind === 'break' ? `break · ${fmtMin(s.minutes)}` : fmtMin(s.minutes);
      row.append(check, label, min);
      row.addEventListener('click', () => {
        const st = task.steps.find(x => x.id === s.id);
        if (st.done) {
          st.done = false; st.doneAt = null;
          removeHistoryByStep(state, st.id);
          announce(`Unchecked: ${st.label}`);
        } else {
          st.done = true; st.doneAt = Date.now(); st.skipped = false;
          addHistory(state, { stepId: st.id, label: st.label, taskTitle: task.title });
          announce(`Done: ${st.label}. That’s a win.`);
        }
        save(state);
        renderSessions(task);
        // refresh meta line
        const total = task.steps.length;
        const done = task.steps.filter(x => x.done).length;
        const est2 = task.steps.reduce((a, x) => a + (x.minutes || 0), 0);
        els.taskMeta.textContent = `${done}/${total} steps done · about ${fmtMin(est2)} in total`;
      });
      li.appendChild(row);
      ol.appendChild(li);
    }
    card.appendChild(ol);

    if (allDone) {
      const note = document.createElement('p');
      note.className = 'session-done-note';
      note.textContent = 'Session complete. Look at you. 🌿';
      card.appendChild(note);
    } else if (hasOpen) {
      const start = document.createElement('a');
      start.className = 'btn btn-primary session-start';
      start.href = `#focus:${task.id}.${i}`;
      start.textContent = `Start session ${i + 1} →`;
      card.appendChild(start);
    }
    els.sessionList.appendChild(card);
  });
}

/* ---------------- global shortcuts ---------------- */
document.addEventListener('keydown', e => {
  if (e.target.closest('input, textarea, select')) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === '?') { els.helpDialog.showModal(); return; }
  if (e.key === 'Escape') {
    if (location.hash.startsWith('#focus')) { route(`#task:${(parseHash().arg || '').split('.')[0]}`); return; }
  }
  const k = e.key.toLowerCase();
  if (k === 'n') { e.preventDefault(); route('#today'); setTimeout(() => els.taskInput.focus(), 80); }
  if (k === 't') route('#today');
  if (k === 'w') route('#wins');
});

/* ---------------- boot ---------------- */
function renderAll() {
  renderToday();
}

dialogsApi = initDialogs({
  els, state, applySettings, render: renderAll, announce, route,
});
initFocus({
  state, els: { ...els, focusStage: document.querySelector('.focus-stage') },
  route, announce, save: () => save(state),
});

applySettings();
window.addEventListener('hashchange', handleRoute);
handleRoute();

/* service worker: offline kindness */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

/* expose a tiny API for tests / power users */
window.stepwise = { state, save, route };
