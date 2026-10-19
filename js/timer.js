/* ============================================================
   Stepwise — timer.js
   A quiet visual timer + a soft chime.
   The ring is decoration; the truth is always in text as well.
   ============================================================ */

export class FocusTimer {
  /**
   * @param {object} opts
   * @param {(remaining:number, total:number)=>void} opts.onTick   called ~4x/sec
   * @param {(key:string, text:string)=>void}        opts.onThreshold
   * @param {()=>void}                               opts.onDone
   */
  constructor(opts = {}) {
    this.onTick = opts.onTick || (() => {});
    this.onThreshold = opts.onThreshold || (() => {});
    this.onDone = opts.onDone || (() => {});
    this.running = false;
    this._raf = null;
    this._fired = new Set();
  }

  start(totalMinutes) {
    this.stop();
    this.total = totalMinutes * 60000;
    this.remaining = this.total;
    this.endAt = performance.now() + this.remaining;
    this.running = true;
    this._fired = new Set();
    this._loop();
  }

  extend(minutes) {
    if (!this.running) return;
    this.total += minutes * 60000;
    this.endAt += minutes * 60000;
    this._fired.clear(); // thresholds re-evaluated generously
    this._announce();
  }

  pause() {
    if (!this.running) return;
    this.remaining = Math.max(0, this.endAt - performance.now());
    this.running = false;
    cancelAnimationFrame(this._raf);
  }

  resume() {
    if (this.running) return;
    this.endAt = performance.now() + this.remaining;
    this.running = true;
    this._loop();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  _loop() {
    if (!this.running) return;
    this._announce();
    if (this.remaining <= 0) {
      this.running = false;
      this.remaining = 0;
      this.onTick(0, this.total);
      this.onDone();
      return;
    }
    this.onTick(this.remaining, this.total);
    this._raf = requestAnimationFrame(() => this._loop());
  }

  _announce() {
    this.remaining = Math.max(0, this.endAt - performance.now());
    const ratio = this.total ? this.remaining / this.total : 0;
    const minLeft = this.remaining / 60000;
    const fire = (key, text) => {
      if (!this._fired.has(key)) {
        this._fired.add(key);
        this.onThreshold(key, text);
      }
    };
    if (ratio <= .001) return;
    if (minLeft >= 1 && ratio <= .25) fire('quarter', 'About a quarter of the time is left');
    else if (ratio <= .5) fire('half', 'About half the time is left');
    if (Math.ceil(minLeft) === 1) fire('onemin', 'One minute left');
  }
}

/** Soft two-tone chime, created live with the Web Audio API. No files. */
export function chime(ctx = null) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const audio = ctx || new AC();
    if (audio.state === 'suspended') audio.resume();
    const now = audio.currentTime;
    const master = audio.createGain();
    master.gain.value = 0.0001;
    master.connect(audio.destination);
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.22, now + 0.04);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
    const tone = (freq, start, dur) => {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, now + start);
      g.gain.exponentialRampToValueAtTime(0.5, now + start + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      o.connect(g).connect(master);
      o.start(now + start);
      o.stop(now + start + dur + 0.1);
    };
    tone(523.25, 0, 0.9);   // C5
    tone(783.99, 0.18, 1.2); // G5
    return audio;
  } catch {
    /* audio is a kindness, not a requirement */
  }
}
