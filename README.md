# Gentle Reminder

**Coders in Pune Hackathon — Round 2 Build**

Capturing how work really gets done, so knowledge never walks out the door.

## What It Does

Gentle Reminder is a desktop agent that passively records the complete computer log — every file opened, terminal command, web page, application switch, AI tool interaction, and team communication — and then uses an AI inference engine to decide what to keep. The user only answers one question per fix: "How hard was this to fix? (1-10)." The AI analyzes the captured activity (failed attempts, terminal usage, file switching, recurrence) and determines the appropriate capture level:

| Severity | Capture Level |
|----------|---------------|
| 1-3 Simple | Notes only, no recording |
| 4-5 Moderate | Terminal + key events |
| 6-7 Hard | Key events + partial screen recording |
| 8-9 Critical | Full screen recording + terminal + files |
| 8-10 Critical/Recurring | Full screen recording + meeting transcripts + prevention guidance |

## How to Run

### Web Demo (no installation required)
Open `index.html` in any browser, or deploy to Vercel/Netlify.

### Desktop App (Tauri 2.0)
```bash
npm install
npx tauri build
```
The built executable is at `src-tauri/target/release/gentle-reminder.exe`.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS 4
- **Backend:** Rust + Tauri 2.0 + SQLite + rusqlite
- **AI:** Local inference engine (pattern classifier, semantic similarity, recurrence tracker)
- **Icons:** Lucide React

## Team

**Milind Desai** — Team Lead / Primary Developer
Open-source contributors for cross-platform testing and plugin extensions.

## License

Open source — all code publicly available on GitHub.