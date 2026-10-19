# Stepwise — Accessibility Notes & WCAG Self-Audit

Stepwise was built for people whom most productivity tools quietly exclude. Accessibility is not a feature here — it is the reason the app exists. This page documents what we did, in the spirit of an accessibility statement, and is honest about limits.

## Principles applied

1. **Calm by default.** No red “overdue” badges, no streak-shaming, no autoplaying motion. Anxiety is an access barrier.
2. **One thing at a time.** The focus screen shows exactly one step. The remaining steps hide behind a “peek” disclosure — available, never pushed.
3. **Never color alone.** Time is always text. Done is strikethrough + check + word, not just a color.
4. **Your device, your settings.** All accessibility preferences persist locally and apply instantly.

## Features

| Feature | How it works |
|---|---|
| Keyboard operable | Every control is a native link/button/input; shortcuts `N` (new task), `T`/`W` (views), `Space` (timer), `Esc` (leave focus), `?` (help) |
| Focus visibility | 3px focus ring with 3px offset, visible in all modes including high contrast |
| Screen-reader announcements | A polite live region announces step changes, timer milestones, mode switches, and wins |
| Timer accessibility | Remaining time shown as text (`4:37`) plus spoken milestones at 50%, 25%, 1-minute |
| High contrast mode | Pure black/white with golden interactive color; 2px borders; tested ≥ 7:1 on text |
| Dyslexia-friendly mode | Verdana stack, +0.08em letter spacing, +0.16em word spacing, 1.9 line height, warm cream background |
| Text sizing | Five steps (S→XXL) applied via root rem scaling — the entire UI scales, not just body copy |
| Reduced motion | Manual toggle *and* OS-level `prefers-reduced-motion`; disables confetti, pulses, and smooth scroll |
| Sound | Off-able; the chime is a synthesized soft two-tone (C5→G5), never an alarm |
| Touch targets | All interactive elements ≥ 44px; step rows ≥ 56px |
| Language | `lang="en"`; plain, warm language; no jargon; error messages never blame the user |
| Landmarks & structure | `header/nav/main/footer`, one `h1` per view, skip link, `caption`/`scope` on tables |
| Dialogs | Native `<dialog>`; focus is trapped and returned to the invoking button on close |
| PWA | Installable; works offline so the tool is there when energy to deal with networks isn’t |

## WCAG 2.1 AA self-audit

| Criterion | Result | Notes |
|---|---|---|
| 1.1.1 Non-text content | Pass | All icons are decorative (`aria-hidden`) or labelled; trail stones have text names |
| 1.3.1 Info & relationships | Pass | Semantic HTML throughout; labels tied to inputs; `aria-pressed` step toggles |
| 1.3.2 Meaningful sequence | Pass | DOM order = reading order; no CSS reordering of content |
| 1.4.1 Use of color | Pass | Time and done-state never color-only |
| 1.4.3 Contrast (minimum) | Pass | Body text ≥ 7:1; interactive deep green on cream ≈ 6.5:1; audited by hand |
| 1.4.4 Resize text | Pass | Text scales to 200%+ via size settings; no loss of content (200% zoom tested) |
| 2.1.1 Keyboard | Pass | No keyboard traps; `Esc` closes dialogs / leaves focus mode |
| 2.1.2 No keyboard trap | Pass | Native dialog focus management |
| 2.2.2 No auto-updating content | Pass | Timer updates text at most each second visually; live announcements are milestone-based, not per-tick |
| 2.3.1 No flashing | Pass | Nothing flashes ≥ 3Hz; confetti is optional and off-able via reduce-motion |
| 2.4.1 Skip mechanisms | Pass | Skip link to `#main` |
| 2.4.3 Focus order | Pass | Order follows visual order |
| 2.4.6 Headings & labels | Pass | Every view has one descriptive `h1` |
| 2.5.3 Label in name | Pass | Icon-only controls have accessible names |
| 3.3.1 Error identification | Pass | Gentle inline messages; no `alert()` |
| 3.3.2 Labels or instructions | Pass | Hints under inputs; editor format documented inline |
| 4.1.2 Name, role, value | Pass | `aria-pressed`, `aria-expanded`, `role="status"` used appropriately |

**Known limits (honest ones):**
- The author tested with keyboard, NVDA-style live-region patterns, and contrast math — but formal testing with real screen-reader users hasn’t happened yet. That’s the first post-hackathon milestone.
- `dialog::backdrop` styling varies by browser; the panel itself is fully styled.
- The chaos illustration (`#chaos`) is intentionally stressful; it is `aria-hidden` with a text summary so screen-reader users don’t have to wade through it.

## Feedback

If Stepwise excludes you, that’s a bug in our eyes. Please open an issue on GitHub.
