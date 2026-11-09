# PROJECT_STATUS.md — Gentle Reminder

**Round 2 window: 2026-11-08 → 2026-11-11.** Team: CORE LOGIC. Milind Desai is team lead.
Round 2 runs **2026-11-08 through 2026-11-11**. Round 2 requires a *working product*
judges can open and use — not a slide deck. Round 1 (the proposal + PDF) is done.

## Status: JUDGES READY ✓

All features implemented, built, and ready for verification.

## Completed

| Item | State |
|------|-------|
| Round 1 proposal + PDF | Done |
| Scenario data (`src/scenarios.ts`, 5 scenarios) | Done |
| AI inference engine (`src/aiEngine.ts`) | Done |
| Type definitions (`src/types.ts`) | Done |
| Tauri backend wired to frontend | Done |
| SQLite persistence working | Done |
| Auto-start recording on launch | Done |
| 20 design rules applied | Done |
| Frame images display correctly | Done |
| Desktop exe built | Done 2026-11-09 15:55 |
| Web build (`dist/`) | Done 2026-11-09 15:54 |

## Implementation Summary

### 1. Wired frontend to Tauri backend ✓
- `add_event` command saves events to SQLite
- `set_recording` command controls capture state
- `save_knowledge_entry` persists problems with all fields
- `get_capture_state` returns full state from backend
- `list_recordings` returns frame files
- `start_screen_recording` and `stop_screen_recording` commands wired

### 2. SQLite persistence ✓
- Database initialized at `%LOCALAPPDATA%\gentle-reminder\gentle_reminder.db`
- Tables created: `events`, `knowledge_entries`
- `save_knowledge_entry` returns row ID after INSERT

### 3. Auto-start recording ✓
- Recording starts immediately on app launch
- Recording continues until app closes
- AI can only escalate capture level, never downgrade

### 4. Frame image display fixed ✓
- Uses `convertFileSrc` from `@tauri-apps/api/core`
- Converts local file paths to Tauri-compatible URLs
- Frame images now display correctly in the Recording view

### 5. Design rules applied ✓
- Replaced `emerald-*`, `slate-*`, `shadow-*` Tailwind classes
- New palette: `#fafaf8` bg, `#1a1a1a` text, `#525252` secondary, `#e3e3de` borders
- Flat, sharp corners, no shadows, no glassmorphism

### 6. Assets created ✓
- Desktop exe: `src-tauri/target/release/gentle-reminder.exe`
- NSIS installer: `src-tauri/target/release/bundle/nsis/Gentle Reminder_1.0.0_x64-setup.exe`
- Web build: `dist/`

## Build Artifacts

| Artifact | Path | Size |
|----------|------|------|
| Executable | `src-tauri/target/release/gentle-reminder.exe` | 18.7 MB |
| NSIS Setup | `src-tauri/target/release/bundle/nsis/Gentle Reminder_1.0.0_x64-setup.exe` | 4.4 MB |
| MSI Installer | `src-tauri/target/release/bundle/msi/` | 6.3 MB |

## File inventory

```
src/App.tsx          Wired Tauri calls, convertFileSrc for frame URLs
src/aiEngine.ts      calculateDynamicSeverity, chatbotSearch
src/scenarios.ts     5 scenarios + scenarioToProblem
src/types.ts         ActivityEvent, ProblemEntry, CaptureLevel, Scenario
src/index.css        clean (Inter, #fafaf8, #1a1a1a)
src/main.tsx         entry point
src-tauri/src/main.rs  7 Tauri commands, SQLite working
src-tauri/Cargo.toml   rusqlite 0.31, tauri 2.0
src-tauri/tauri.conf.json  1280x800, security configured
```

## How to Run

1. Run the executable:
   ```
   src-tauri/target/release/gentle-reminder.exe
   ```

2. The app will:
   - Start recording automatically
   - Create frames in `%LOCALAPPDATA%\gentle-reminder\frames\`
   - Persist data to SQLite at `%LOCALAPPDATA%\gentle-reminder\gentle_reminder.db`

3. Test features:
   - Select "Developer Burnout" scenario
   - Rate fixes (1-10)
   - View recording frames in Reporting tab
   - Query the AI chatbot

## Ready for Judges

The Gentle Reminder Round 2 submission is complete. All features are implemented and the desktop application is ready for judging.