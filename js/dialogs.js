/* ============================================================
   Stepwise — dialogs.js
   Accessibility panel, help, confirm, data tools.
   ============================================================ */

import { defaultState, seedDemo, save, clearAll } from './storage.js';

export function initDialogs(deps) {
  const { els, state, applySettings, render, announce, route } = deps;

  /* ---------- generic confirm ---------- */
  let confirmResolve = null;
  const askConfirm = (title, text, okLabel = 'Yes, do it') => new Promise(resolve => {
    els.confirmTitle.textContent = title;
    els.confirmText.textContent = text;
    els.confirmOk.textContent = okLabel;
    els.confirmDialog.showModal();
    confirmResolve = resolve;
  });
  const closeConfirm = val => {
    if (!els.confirmDialog.open) return;
    els.confirmDialog.close(val);
    confirmResolve?.(val === 'ok');
    confirmResolve = null;
  };
  els.confirmCancel.addEventListener('click', () => closeConfirm('cancel'));
  els.confirmOk.addEventListener('click', () => closeConfirm('ok'));

  /* ---------- a11y panel ---------- */
  const syncPanel = () => {
    els.optContrast.checked = state.settings.hc;
    els.optDyslexia.checked = state.settings.dy;
    els.optMotion.checked = state.settings.motion;
    els.optSound.checked = state.settings.sound;
    els.optKind.checked = state.settings.kind;
    const size = state.settings.size || 'M';
    els.a11yPanel.querySelectorAll('input[name="size"]').forEach(r => {
      r.checked = r.value === size;
    });
  };
  els.btnA11y.addEventListener('click', () => { syncPanel(); els.a11yPanel.showModal(); });
  els.a11yPanel.addEventListener('close', () => { els.btnA11y.focus(); });

  els.a11yPanel.addEventListener('input', e => {
    const t = e.target;
    if (t.name === 'size') {
      state.settings.size = t.value;
      applySettings();
      announce(`Text size ${t.value}.`);
      return;
    }
    if (t === els.optContrast) { state.settings.hc = t.checked; }
    if (t === els.optDyslexia) { state.settings.dy = t.checked; }
    if (t === els.optMotion) { state.settings.motion = t.checked; }
    if (t === els.optSound) { state.settings.sound = t.checked; }
    if (t === els.optKind) { state.settings.kind = t.checked; }
    applySettings();
    if (t === els.optContrast) announce(t.checked ? 'High contrast on.' : 'High contrast off.');
    if (t === els.optDyslexia) announce(t.checked ? 'Dyslexia-friendly text on.' : 'Dyslexia-friendly text off.');
  });

  /* ---------- help ---------- */
  els.btnHelp.addEventListener('click', () => els.helpDialog.showModal());
  els.helpDialog.addEventListener('close', () => { els.btnHelp.focus(); });

  /* ---------- data tools ---------- */
  els.btnExport.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `stepwise-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    announce('Backup downloaded. It contains everything, kindly unreadable to anyone but you.');
  });

  els.fileImport.addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data || !Array.isArray(data.tasks)) throw new Error('bad');
      Object.assign(state, {
        tasks: data.tasks,
        history: Array.isArray(data.history) ? data.history : [],
        settings: { ...defaultState().settings, ...(data.settings || {}) },
      });
      save(state);
      applySettings();
      render('all');
      route('#today');
      announce('Backup imported. Welcome back to your old wins.');
    } catch {
      announce('That file didn’t look like a Stepwise backup.');
    }
    e.target.value = '';
  });

  els.btnSeed.addEventListener('click', async () => {
    const ok = await askConfirm('Load sample data?',
      'This replaces what’s on this device with a small demo household: two tasks and a month of gentle wins. Good for seeing how the trail grows.',
      'Load sample');
    if (!ok) return;
    const fresh = seedDemo();
    Object.assign(state, { tasks: fresh.tasks, history: fresh.history });
    save(state);
    render('all');
    route('#wins');
    announce('Sample data loaded. Look at that trail.');
  });

  els.btnErase.addEventListener('click', async () => {
    const ok = await askConfirm('Erase everything?',
      'This removes all tasks and wins from this device. There is no cloud copy — that was the point.',
      'Erase it all');
    if (!ok) return;
    clearAll();
    const fresh = defaultState();
    Object.assign(state, { tasks: fresh.tasks, history: fresh.history, settings: state.settings });
    save(state);
    render('all');
    route('#today');
    announce('Everything erased. A clean page is allowed.');
  });

  return { askConfirm, syncPanel };
}
