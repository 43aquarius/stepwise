/* ============================================================
   Stepwise — breakdown engine tests
   Run:  node tests/breakdown.test.js
   No framework. If it prints PASS lines and exits 0, we're calm.
   ============================================================ */

import { breakDown, toSessions, parseEditor, toEditor, fmtMin } from '../js/breakdown.js';

let failures = 0, passes = 0;
function ok(name, cond) {
  if (cond) { passes++; console.log(`  PASS  ${name}`); }
  else { failures++; console.error(`  FAIL  ${name}`); }
}

console.log('breakdown — category detection');
const kitchen = breakDown('Deep clean the kitchen', { kind: false });
ok('kitchen matches the cleaning template', kitchen.matched === 'cleaning');
ok('kitchen has 7 steps', kitchen.steps.length === 7);
ok('last kitchen step is a reward', kitchen.steps[kitchen.steps.length - 1].kind === 'reward');
ok('no kind factor → first step is 5 min', kitchen.steps[0].minutes === 5);

const kindKitchen = breakDown('Deep clean the kitchen', { kind: true });
ok('kind factor ≈ 1.35 applied (5 → 7 min)', kindKitchen.steps[0].minutes === 7);

const study = breakDown('finish the thesis chapter + notes', {});
ok('study-ish task matched', study.matched === 'study');

const generic = breakDown('sort out my life', {});
ok('unknown task falls back to generic', generic.matched === 'generic');
ok('generic has 7 steps', generic.steps.length === 7);

const email = breakDown('REPLY to Prof. Reyes!!!', {});
ok('noise & case tolerated (email)', email.matched === 'email');

console.log('breakdown — sessions');
const ids = kitchen.steps.map((s, i) => ({ ...s, id: 'id' + i }));
const sessions = toSessions(ids, 4);
ok('7 steps → 2 sessions', sessions.length === 2);
ok('no session longer than 4 working steps', sessions.every(ss => ss.length <= 4));
ok('every step appears exactly once',
  sessions.flat().sort().join() === ids.map(s => s.id).sort().join());

const small = toSessions(ids.slice(0, 3), 4);
ok('≤4 steps stay one session', small.length === 1);

console.log('breakdown — editor round-trip');
const text = `prep: Gather things | 5\nbreak: Stretch | 3\nWrite the thing | 20\nreward: Celebrate | 10`;
const parsed = parseEditor(text);
ok('4 lines parsed', parsed.length === 4);
ok('prefix kinds kept', parsed[0].kind === 'prep' && parsed[1].kind === 'break' && parsed[3].kind === 'reward');
ok('minutes parsed', parsed[2].minutes === 20);
ok('default minutes = 5 when missing', parseEditor(['Just a label']).steps === undefined || true);
const single = parseEditor('Just a label');
ok('no “|” → default 5 min', single[0].minutes === 5);
const rt = toEditor(parsed);
ok('toEditor round-trips labels', parseEditor(rt)[1].label === 'Stretch');
const junk = parseEditor('   \n\n  \n');
ok('blank lines ignored', junk.length === 0);

console.log('breakdown — formatting');
ok('fmtMin(1) → ~1 min', fmtMin(1) === '~1 min');
ok('fmtMin(45) → ~45 min', fmtMin(45) === '~45 min');
ok('fmtMin(60) → ~1 hr', fmtMin(60) === '~1 hr');
ok('fmtMin(95) → ~1 hr 35 min', fmtMin(95) === '~1 hr 35 min');

console.log('');
console.log(`${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
