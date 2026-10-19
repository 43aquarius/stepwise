# Stepwise — one calm step at a time

**An accessibility-first task companion for brains that classic to-do apps forget.**

Stepwise is a calm, offline-friendly web app that turns one overwhelming task into a short list of kind, concrete steps — and then shows you *only the next step*. It was built during the **TaskForge hackathon** (HackathonForEveryone), whose theme it takes personally: *“Build accessible tools that help people focus, organize, and get more done.”*

> Try it live: **https://43aquarius.github.io/stepwise/**
> Watch the captioned demo: **https://43aquarius.github.io/stepwise/demo.html**

---

## The problem, in one sentence

For a person with ADHD, dyslexia, or anxiety, a normal to-do list isn’t a plan — it’s a wall: 30 items, tiny controls, red “overdue” badges, and no next action. Stepwise refuses to show you the wall ([see it here](https://43aquarius.github.io/stepwise/#chaos) — it’s deliberately stressful).

## What Stepwise does differently

| Classic to-do apps | Stepwise |
|---|---|
| Show everything, always | Show **one step**, hide the rest behind a “peek” |
| “Clean the kitchen” = 1 task | Breaks it into 7 tiny steps with kind time estimates |
| Estimates assume a robot | **Kind estimates**: ~35% buffer, because time blindness is real |
| Red = overdue = shame | No red, no shame. Skipping a step is allowed, by design |
| Confetti & streak pressure | A gentle **trail of wins**: one stone per finished step |
| WCAG as an afterthought | Accessibility is the product (see below) |

### The flow

1. **Dump** — type one task. No due dates, no priorities, no guilt.
2. **Break it down** — a readable, rule-based engine (no AI, no network: every rule lives in [`js/breakdown.js`](js/breakdown.js)) splits it into small steps and chunks them into sessions of ≤ 4 steps with visible breaks.
3. **Focus** — one step on screen, an optional quiet ring timer, `Done ✓` / `Skip →` (skipping is fine), and a “peek” accordion if you *want* to see what’s left.
4. **Wins** — every finished step becomes a stone on your trail. Lanterns every 5th win. Stats count steps, not streak-shaming.

### Accessibility is the product

- **WCAG 2.1 AA** targeted and self-audited — see [`docs/ACCESSIBILITY.md`](docs/ACCESSIBILITY.md)
- Full **keyboard** operability (shortcuts: `N`, `T`, `W`, `Space`, `Esc`, `?`)
- **Screen-reader** support: ARIA live announcements for every step change and timer milestone
- **High-contrast mode**, **dyslexia-friendly text mode** (wide spacing, round rhythm), five **text sizes**, **reduce-motion** mode (manual + OS `prefers-reduced-motion`)
- Timer always shows time **as text**, never color-only
- Touch targets ≥ 44px; focus rings visible in every mode

## How to run it

There is **no build step** — that’s the point. Any static file server works:

```bash
git clone https://github.com/43aquarius/stepwise.git
cd stepwise
python3 -m http.server 8080
# open http://localhost:8080
```

Opening `index.html` directly from disk also works (service worker simply skips registering on `file://`).

## Tech choices (and why)

- **Vanilla HTML/CSS/JS, zero dependencies.** Nothing to install, nothing to break, readable by anyone — including the people Stepwise is for. For a hackathon about *access*, we think the code itself should be accessible.
- **PWA** — installable, works fully offline (service worker + cache-first shell).
- **localStorage** — your steps live on your device. No accounts, no cloud, no tracking. Export/import as JSON.
- **Web Audio API** — the soft chime is synthesized at runtime; no audio files, and it only plays if you enabled it.
- **Tests** — the breakdown engine has 24 pure-function tests: `node tests/breakdown.test.js` (no framework; exit code 0 = calm).

## Project structure

```
index.html            the whole app (semantic HTML, one screen per hash route)
css/core.css          design tokens, base layout, Today & Task views
css/modes.css         focus/wins/chaos views + contrast/dyslexia/motion modes
js/app.js             router, Today & Task views, shortcuts
js/breakdown.js       the readable rule-based breakdown engine
js/storage.js         localStorage, stats, sample data
js/timer.js           quiet ring timer + synthesized chime
js/focus.js           the one-step-at-a-time screen
js/wins.js            trail of wins + stats
js/dialogs.js         accessibility panel, help, data tools
sw.js                 service worker (offline shell)
tests/                breakdown engine tests
demo/                 captioned demo video page assets (served at /demo.html)
docs/ACCESSIBILITY.md WCAG self-audit
```

## Honest disclosures (per hackathon rules)

- This project was **created during the hackathon window** (Oct 19–24, 2026). No pre-existing project was reused.
- **AI assistance is disclosed**: the code, copy and design were produced with AI assistance (GLM, by Z.ai), directed and tested by the submitter. The task-breakdown rules, all product decisions, and every judgment call are human-made and documented in this README and in the code.
- No user data leaves the device — there is no backend at all.
- Fonts are system stacks; icons are original SVG. No third-party assets.

## License

MIT — do something kind with it.
