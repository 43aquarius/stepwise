/* ============================================================
   Stepwise — wins.js
   The trail of wins: one stone per finished step.
   ============================================================ */

import { computeStats, timeAgo } from './storage.js';

const NS = 'http://www.w3.org/2000/svg';

/** 40 slots along a gentle S-curve in an 820x240 box. */
export function trailSlots(n = 40) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = 40 + t * 740;
    // two soft hills
    const y = 160 - Math.sin(t * Math.PI * 1.15) * 70 - Math.sin(t * Math.PI * 2.2) * 18 * Math.sin(t * Math.PI);
    pts.push([x, y + (i % 2 === 0 ? 6 : -6)]);
  }
  return pts;
}

export function renderWins(state, els) {
  const stats = computeStats(state.history);
  els.statToday.textContent = String(stats.today);
  els.statWeek.textContent = String(stats.week);
  els.statStreak.textContent = String(stats.streak);
  if (els.statStreak.textContent === '0' && state.history.length) {
    els.statStreak.textContent = '1';
  }

  // ---- trail ----
  const svg = els.trailSvg;
  svg.innerHTML = '';
  const slots = trailSlots(40);
  const doneCount = state.history.length;

  // defs: lantern glow
  const defs = document.createElementNS(NS, 'defs');
  defs.innerHTML = `
    <radialGradient id="lanternGlow">
      <stop offset="0%" stop-color="#E9C46A" stop-opacity=".95"/>
      <stop offset="45%" stop-color="#E9C46A" stop-opacity=".45"/>
      <stop offset="100%" stop-color="#E9C46A" stop-opacity="0"/>
    </radialGradient>`;
  svg.appendChild(defs);

  // base path through slots
  const d = slots.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', d);
  path.setAttribute('class', 'trail-path');
  path.setAttribute('aria-hidden', 'true');
  svg.appendChild(path);

  const stonesToShow = Math.min(doneCount, 40);
  const startIdx = Math.max(0, doneCount - 40); // latest wins are nearest the end
  for (let i = 0; i < stonesToShow; i++) {
    const h = state.history[startIdx + i];
    const slot = slots[Math.floor((i / Math.max(1, stonesToShow - 0.0001)) * 39) % 40];
    const isMilestone = (startIdx + i + 1) % 5 === 0;
    const g = document.createElementNS(NS, 'g');
    if (isMilestone) {
      const glow = document.createElementNS(NS, 'circle');
      glow.setAttribute('cx', slot[0]); glow.setAttribute('cy', slot[1]);
      glow.setAttribute('r', 26);
      glow.setAttribute('class', 'trail-lantern-glow');
      glow.setAttribute('aria-hidden', 'true');
      g.appendChild(glow);
    }
    const stone = document.createElementNS(NS, 'circle');
    stone.setAttribute('cx', slot[0]); stone.setAttribute('cy', slot[1]);
    stone.setAttribute('r', isMilestone ? 12 : 8);
    stone.setAttribute('class', 'trail-stone');
    if (!isMilestone) stone.setAttribute('fill-opacity', '.9');
    stone.setAttribute('tabindex', '0');
    stone.setAttribute('role', 'img');
    const nameAttr = document.createElementNS(NS, 'title');
    nameAttr.textContent = `Win #${startIdx + i + 1}: ${h.label} — ${h.taskTitle} (${timeAgo(h.at)})`;
    stone.appendChild(nameAttr);
    stone.setAttribute('aria-label', `Win number ${startIdx + i + 1}: ${h.label}, in ${h.taskTitle}, ${timeAgo(h.at)}`);
    if (i === stonesToShow - 1) stone.classList.add('stone-new');
    g.appendChild(stone);
    svg.appendChild(g);
  }

  if (!doneCount) {
    svg.innerHTML = `<path d="${d}" class="trail-path" aria-hidden="true"/>`;
  }

  els.trailNote.textContent = doneCount
    ? `${doneCount} finished step${doneCount > 1 ? 's' : ''} — each stone is one. Lanterns mark every 5th.`
    : 'The trail is waiting for its first stone.';

  // ---- recent wins ----
  const recent = [...state.history].sort((a, b) => b.at - a.at).slice(0, 8);
  els.recentList.innerHTML = '';
  els.recentEmpty.hidden = recent.length > 0;
  for (const h of recent) {
    const li = document.createElement('li');
    const what = document.createElement('span');
    what.className = 'recent-what'; what.textContent = h.label;
    const when = document.createElement('span');
    when.className = 'recent-when'; when.textContent = timeAgo(h.at);
    const task = document.createElement('span');
    task.className = 'recent-task'; task.textContent = `in “${h.taskTitle}”`;
    li.append(what, when, task);
    els.recentList.appendChild(li);
  }
}
