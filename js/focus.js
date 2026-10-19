/* ============================================================
   Stepwise — focus.js
   The focus screen: one step, one ring, no wall.
   Flow:  step → [Done] → celebrate(win) → next step
                      └→ session end → celebrate(session) → next session
                      └→ task end   → celebrate(task done, terminal)
   ============================================================ */

import { FocusTimer, chime } from './timer.js';
import { addHistory } from './storage.js';

const RING_C = 2 * Math.PI * 96; // r=96 in a 220 viewBox

let ctx = { state: null, els: null, route: null, announce: null, save: null };
let current = null;   // {task, sessionIdx}
let timer = null;
let audioCtx = null;
let lastCelebrate = 'win'; // 'win' | 'session' | 'task'

export function initFocus(deps) {
  ctx = deps;
  timer = new FocusTimer({
    onTick(remaining, total) {
      paintRing(remaining / total);
      paintClock(remaining);
    },
    onThreshold(key, text) {
      ctx.els.timerState.textContent = text;
      ctx.announce(text);
      if (key === 'quarter') ctx.els.btnExtend.hidden = false;
    },
    onDone() {
      ctx.els.timerState.textContent = 'Time is up — that’s information, not a verdict.';
      ctx.announce('Time is up for this step. You can keep going or mark it done.');
      ctx.els.btnTimer.textContent = 'Start timer';
      if (ctx.state.settings.sound) audioCtx = chime(audioCtx);
      ctx.els.btnExtend.hidden = true;
    },
  });

  ctx.els.btnTimer.addEventListener('click', () => {
    if (!current) return;
    if (timer.running) {
      timer.pause();
      ctx.els.btnTimer.textContent = 'Resume timer';
      ctx.els.timerState.textContent = 'Paused. Breathing is allowed.';
      return;
    }
    const step = currentStep();
    if (!step) return;
    if (timer.remaining > 0) timer.resume();
    else timer.start(step.minutes);
    ctx.els.btnTimer.textContent = 'Pause';
    ctx.announce(`Timer started: about ${step.minutes} minutes.`);
  });

  ctx.els.btnExtend.addEventListener('click', () => {
    timer.extend(5);
    paintClock(timer.remaining);
    ctx.els.btnExtend.hidden = true;
    ctx.els.timerState.textContent = 'Five kind minutes added.';
    ctx.announce('Five more minutes added. No questions asked.');
  });

  ctx.els.btnDone.addEventListener('click', markDone);
  ctx.els.btnSkip.addEventListener('click', skipStep);
  ctx.els.btnNextStep.addEventListener('click', nextAfterCelebrate);
  ctx.els.btnFinishSession.addEventListener('click', () => {
    if (current) ctx.route(`#task:${current.task.id}`);
  });

  document.addEventListener('keydown', (e) => {
    if (!ctx.els.viewFocus || ctx.els.viewFocus.hidden) return;
    if (e.target.closest('input, textarea')) return;
    if (e.code === 'Space' && !e.target.closest('button, a, [role="button"]')) {
      e.preventDefault();
      ctx.els.btnTimer.click();
    }
  });
}

/* ---------- state helpers ---------- */

function sessionIds() {
  if (!current) return [];
  return current.task.sessions[current.sessionIdx] || [];
}

function currentStep() {
  for (const id of sessionIds()) {
    const st = current.task.steps.find(s => s.id === id);
    if (st && !st.done && !st.skipped) return st;
  }
  return null;
}

function remainingInSession() {
  return sessionIds()
    .map(id => current.task.steps.find(s => s.id === id))
    .filter(s => s && !s.done && !s.skipped);
}

/* ---------- open ---------- */

export function openFocus(taskId, sessionIdx) {
  const task = ctx.state.tasks.find(t => t.id === taskId);
  if (!task || !task.sessions) { ctx.route('#today'); return; }
  sessionIdx = Math.max(0, Math.min(sessionIdx, task.sessions.length - 1));
  current = { task, sessionIdx };

  ctx.els.viewFocus.hidden = false;
  ctx.els.focusBack.setAttribute('href', `#task:${task.id}`);
  ctx.els.focusWhere.textContent = `Session ${sessionIdx + 1} of ${task.sessions.length} · ${task.title}`;
  ctx.els.celebrate.hidden = true;
  ctx.els.focusStage.hidden = false;
  ctx.els.btnNextStep.hidden = false;
  ctx.els.btnExtend.hidden = true;
  timer.stop();
  paintStep();
}

/* ---------- painting ---------- */

function paintStep() {
  const t = current.task;
  const ids = sessionIds();
  const step = currentStep();

  if (!step) { endOfSession(); return; }

  const idx = ids.indexOf(step.id) + 1;
  ctx.els.focusStepNo.textContent =
    `Step ${idx} of ${ids.length}` + (step.kind === 'break' ? ' · a break' : step.kind === 'reward' ? ' · the finish line' : '');
  ctx.els.focusStepLabel.textContent = step.label;
  ctx.els.timerText.textContent = `${step.minutes}:00`;
  ctx.els.timerSub.textContent = `about ${step.minutes} minutes${ctx.state.settings.kind ? ', kind estimate' : ''}`;
  ctx.els.timerState.textContent = '';
  ctx.els.ringFg.classList.remove('low');
  paintRing(1);
  ctx.els.btnTimer.textContent = 'Start timer';
  timer.stop();

  ctx.els.peekList.innerHTML = '';
  const later = ids
    .map(id => t.steps.find(x => x.id === id))
    .filter(s => s && !s.done && !s.skipped && s.id !== step.id);
  for (const s of later) {
    const li = document.createElement('li');
    li.innerHTML = `<span>${s.label}</span><span class="pk-min">~${s.minutes} min</span>`;
    ctx.els.peekList.appendChild(li);
  }
  if (!later.length) {
    const li = document.createElement('li');
    li.textContent = 'This is the last one in this session.';
    ctx.els.peekList.appendChild(li);
  }

  ctx.announce(`Focus mode. ${ctx.els.focusStepNo.textContent}. ${step.label}. About ${step.minutes} minutes.`);
  ctx.els.focusStepLabel.setAttribute('tabindex', '-1');
  ctx.els.focusStepLabel.focus({ preventScroll: true });
}

function paintRing(ratio) {
  const off = RING_C * (1 - Math.max(0, Math.min(1, ratio)));
  ctx.els.ringFg.style.strokeDasharray = String(RING_C);
  ctx.els.ringFg.style.strokeDashoffset = String(off);
  ctx.els.ringFg.classList.toggle('low', ratio <= .25 && ratio > 0);
}

function paintClock(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60), r = s % 60;
  ctx.els.timerText.textContent = `${m}:${String(r).padStart(2, '0')}`;
}

/* ---------- actions ---------- */

function markDone() {
  if (!current) return;
  const t = current.task;
  const step = currentStep();
  if (!step) return;
  step.done = true;
  step.skipped = false;
  step.doneAt = Date.now();
  addHistory(ctx.state, { stepId: step.id, label: step.label, taskTitle: t.title });
  ctx.save();
  timer.stop();

  const rest = remainingInSession(); // after this one
  if (rest.length) showCelebrate('win');
  else endOfSession();
}

function skipStep() {
  if (!current) return;
  const step = currentStep();
  if (!step) return;
  step.skipped = true;
  ctx.save();
  ctx.announce('Step skipped. That’s okay — momentum matters more than perfection.');
  const rest = remainingInSession();
  if (rest.length) paintStep();
  else endOfSession();
}

function nextAfterCelebrate() {
  ctx.els.celebrate.hidden = true;
  ctx.els.focusStage.hidden = false;
  if (lastCelebrate === 'session' && current.sessionIdx + 1 < current.task.sessions.length) {
    current.sessionIdx++;
    ctx.els.focusWhere.textContent =
      `Session ${current.sessionIdx + 1} of ${current.task.sessions.length} · ${current.task.title}`;
  }
  paintStep();
}

/* ---------- endings ---------- */

function endOfSession() {
  const t = current.task;
  const more = current.sessionIdx + 1 < t.sessions.length;
  if (more) {
    showCelebrate('session');
  } else {
    // was everything actually done (vs skipped)?
    const undone = t.steps.filter(s => !s.done && !s.skipped);
    if (undone.length) {
      // sessions exhausted but task has open steps elsewhere — go back to task view
      ctx.route(`#task:${t.id}`);
      return;
    }
    showCelebrate('task');
  }
}

function showCelebrate(kind) {
  timer.stop();
  lastCelebrate = kind;
  ctx.els.focusStage.hidden = true;
  ctx.els.celebrate.hidden = false;
  ctx.els.btnNextStep.hidden = false;

  if (kind === 'win') {
    ctx.els.celebrateTitle.textContent = 'That’s a win. 🌱';
    ctx.els.celebrateSub.textContent = 'Take one breath before the next one. No rush.';
    ctx.els.btnNextStep.textContent = 'Next step →';
    ctx.announce('Step done. That is a win.');
  } else if (kind === 'session') {
    ctx.els.celebrateTitle.textContent = 'Session complete. Genuinely well done. 🌟';
    ctx.els.celebrateSub.textContent = 'Take a real break — stand up, look far away. Your brain files wins while you rest.';
    ctx.els.btnNextStep.textContent = 'Next session →';
    ctx.announce('Session complete. Take a real break.');
  } else {
    ctx.els.celebrateTitle.textContent = 'The whole task is done. All of it. 🏆';
    ctx.els.celebrateSub.textContent = `${current.task.title} — finished by you, one kind step at a time.`;
    ctx.els.btnNextStep.hidden = true;
    ctx.els.btnFinishSession.textContent = 'Back to the task';
    ctx.announce(`Task complete: ${current.task.title}. Every step done.`);
    if (!ctx.state.settings.motion) spawnConfetti(26);
    if (ctx.state.settings.sound) audioCtx = chime(audioCtx);
    ctx.els.btnFinishSession.focus();
    return;
  }
  if (!ctx.state.settings.motion) spawnConfetti();
  if (ctx.state.settings.sound) audioCtx = chime(audioCtx);
  ctx.els.btnNextStep.focus();
}

/* ---------- confetti ---------- */

export function spawnConfetti(n = 16) {
  const host = ctx.els.confettiHost;
  if (!host) return;
  host.innerHTML = '';
  const colors = ['#2D6A4F', '#E9C46A', '#7FB8A4', '#F4A261', '#E3EFE9'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.style.left = `${6 + Math.random() * 88}%`;
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = `${Math.random() * .5}s`;
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    host.appendChild(p);
  }
  setTimeout(() => { host.innerHTML = ''; }, 2400);
}

export function stopFocusTimer() {
  if (timer) timer.stop();
}
