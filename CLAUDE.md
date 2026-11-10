# CLAUDE.md — Gentle Reminder

## Project

**Coders in Pune Hackathon — Round 2.** Team: CORE LOGIC. Milind Desai is team lead.
Round 2 runs **2026-11-08 through 2026-11-11**. Round 2 requires a *working product*
judges can open and use — not a slide deck. Round 1 (the proposal + PDF) is done.

## The product

Gentle Reminder is a desktop agent that passively records a developer's full computer
session and uses an AI inference engine to decide what to keep, so knowledge survives
when someone leaves. The user answers one question per fix: "How hard was this to fix?
(1-10)". The AI scores the captured activity (failed attempts, terminal usage, file
switching, recurrence) and picks a capture level.

Capture levels: notes-only → terminal-only → key-events → partial-screen → full-screen →
full-plus-prevention.

## Architecture

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS 4 → `dist/`
- **Backend:** Rust + Tauri 2.0 + SQLite (rusqlite) → `src-tauri/`
- **AI:** local inference engine in `src/aiEngine.ts` (pattern classifier, recurrence tracker, chatbot search)
- **Scenario data:** `src/scenarios.ts` — 5 demo scenarios with events + chatbot Q&A

The desktop exe embeds `dist/`, so `npm run build` then `npx tauri build` produces
`src-tauri/target/release/gentle-reminder.exe`.

## Critical fact — the monitoring system is NOT built yet

`src/App.tsx` makes **zero** calls to the Tauri backend. The Rust commands exist
(`add_event`, `set_recording`, `get_capture_state`, `save_knowledge_entry`,
`start_screen_recording`, `stop_screen_recording`) but the frontend never invokes them.
The "Activity Logger" is a UI demo: "Add Event" inserts a hardcoded fake entry.
Nothing is captured, nothing is persisted. This is the #1 blocker. See NEXT_STEPS.md.

## Build commands

```bash
npm install
npm run build          # web build → dist/
npx tauri build        # desktop exe
```

## Design rules (20 — apply to every UI change)

Do not use: purple-to-blue gradients, glassmorphism (`backdrop-filter: blur()`),
neon glows/colored shadows, generic 3-card feature rows, scroll-fade-ins, cliché words
(elevate, unlock, seamless, next-level, supercharge), tags above headings, excessive
italics, display fonts like Instrument Serif, negative letter-spacing on big type,
fussy UI decoration, excessive dividers, random tones/opacities, thick-bordered
containers, fussy sterile diagrams, wall-of-text repetition, code breadcrumbs,
chapter numbers (01/02/03), all-caps wide eyebrow text, or periods after display titles.

Palette: `#fafaf8` background, `#1a1a1a` text, `#525252` secondary, `#8a8a85` muted,
`#e3e3de` borders. Flat, sharp corners, no shadows, no rounded cards.

## Communication style

The user (Milind) does not want analysis or progress narration. He wants execution.
Do not say "I'm writing the file" or "I'm working on it" — just do it and show the
result. If something cannot be done, explain the exact technical reason briefly.

## Out of scope (user handles these)

GitHub repo creation, PDF regeneration, .xyz domain registration.