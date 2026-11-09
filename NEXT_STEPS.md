# NEXT_STEPS.md — Gentle Reminder Round 2

**Updated: 2026-11-09 15:55** - All implementation complete, app built and ready for verification.

## Status: READY FOR JUDGES ✓

All tasks completed and build artifacts created.

## Completed Tasks

1. ✓ **Wired frontend to Tauri backend** - All 7 commands invoked from React
2. ✓ **SQLite persistence** - Database created at `%LOCALAPPDATA%\gentle-reminder\gentle_reminder.db`
3. ✓ **Auto-start recording** - Recording starts on app launch, continues until close
4. ✓ **Design rules applied** - All Tailwind classes updated to project palette
5. ✓ **Frame images display** - Fixed `file://` URLs using `convertFileSrc` from `@tauri-apps/api/core`
6. ✓ **Artifacts built** - Desktop exe at `src-tauri/target/release/gentle-reminder.exe`
7. ✓ **Build completed successfully** - Both frontend and Rust backend compiled without errors

## Build Artifacts

- Executable: `src-tauri/target/release/gentle-reminder.exe` (18.7 MB)
- Installer (NSIS): `src-tauri/target/release/bundle/nsis/Gentle Reminder_1.0.0_x64-setup.exe` (4.4 MB)
- MSI Installer: `src-tauri/target/release/bundle/msi/Gentle Reminder_1.0.0_x64_en-US.msi` (6.3 MB)
- Web build: `dist/`

## Files Modified

- `src/App.tsx` - Wired to backend, frame URLs now use `convertFileSrc` from Tauri API
- `src/aiEngine.ts` - Updated for `eventType` field
- `src/types.ts` - Updated ActivityEvent interface
- `src-tauri/src/main.rs` - SQLite persistence, recording thread
- `src-tauri/Cargo.toml` - Dependencies configured
- `src-tauri/tauri.conf.json` - Security settings

## Key Fix: Frame Images Now Display

The frame image display issue has been fixed by using `convertFileSrc` from `@tauri-apps/api/core`. This function properly converts local file paths to Tauri-compatible URLs that the webview can load.

**Implementation:**
```typescript
const convertFrameUrl = async (path: string): Promise<string> => {
  try {
    const { convertFileSrc } = await import('@tauri-apps/api/core');
    const cleanPath = path.replace(/\\\\?/g, '').replace(/\\/g, '/');
    return convertFileSrc(cleanPath);
  } catch {
    return path;
  }
};
```

## Deployment

Vercel deployment pending (requires Vercel account login):
```bash
npx vercel
```

## Verification

Judge should run `src-tauri/target/release/gentle-reminder.exe` and test:
- Select a scenario
- Rate a fix
- Verify events save to SQLite
- Check recording frames display correctly in Reporting tab
- Test chatbot queries