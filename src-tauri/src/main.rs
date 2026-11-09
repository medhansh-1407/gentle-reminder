// Gentle Reminder — Tauri 2.0 desktop backend
// Captures the full computer log from start to end and lets the AI decide what to keep.

use anyhow::{Context, Result};
use dirs::cache_dir;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::{fs, thread, time::Duration};
use tauri::{Manager, WindowEvent};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ActivityEvent {
    id: String,
    timestamp: String,
    event_type: String,
    title: String,
    detail: String,
    tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CaptureState {
    is_recording: bool,
    capture_level: String,
    events: Vec<ActivityEvent>,
    recording_active: bool,
    frame_count: u64,
    frames_dir: String,
}

struct AppState {
    capture: Mutex<CaptureState>,
    stop_flag: Arc<AtomicBool>,
    frames_dir: std::path::PathBuf,
}

struct DbState {
    conn: Mutex<rusqlite::Connection>,
}

#[tauri::command]
fn add_event(state: tauri::State<AppState>, event: ActivityEvent) -> CaptureState {
    let mut capture = state.capture.lock().unwrap();
    capture.events.push(event);
    capture.clone()
}

#[tauri::command]
fn set_recording(state: tauri::State<AppState>, recording: bool, level: String) -> CaptureState {
    let mut capture = state.capture.lock().unwrap();
    capture.is_recording = recording;
    capture.capture_level = level;
    capture.clone()
}

#[tauri::command]
fn get_capture_state(state: tauri::State<AppState>) -> CaptureState {
    state.capture.lock().unwrap().clone()
}

#[tauri::command]
fn list_recordings(state: tauri::State<AppState>) -> Vec<String> {
    let capture = state.capture.lock().unwrap();
    match fs::read_dir(&capture.frames_dir) {
        Ok(entries) => {
            let mut files: Vec<String> = entries.filter_map(|e| e.ok()).map(|e| e.path().to_string_lossy().to_string()).collect();
            files.sort();
            files
        }
        Err(_) => vec![],
    }
}

#[tauri::command]
fn clear_events(state: tauri::State<AppState>) -> CaptureState {
    let mut capture = state.capture.lock().unwrap();
    capture.events.clear();
    capture.clone()
}

#[tauri::command]
fn save_knowledge_entry(
    db: tauri::State<DbState>,
    title: String,
    description: String,
    severity: u8,
    user_rating: u8,
    ai_score: u8,
    recurrence_count: u32,
    capture_level: String,
    solution: String,
    prevention: Option<String>,
    events: Vec<ActivityEvent>,
) -> i64 {
    let events_json = serde_json::to_string(&events).unwrap_or_default();
    let created_at = chrono::Utc::now().to_rfc3339();

    let id = uuid::Uuid::new_v4().to_string();
    let prevention_json = prevention.map(|p| serde_json::json!(p).to_string()).unwrap_or_default();

    let conn = db.conn.lock().unwrap();
    conn.execute(
        "INSERT INTO knowledge_entries (id, title, description, severity, user_rating, ai_score, recurrence_count, capture_level, solution, prevention, events, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        rusqlite::params![
            id,
            title,
            description,
            severity,
            user_rating,
            ai_score,
            recurrence_count,
            capture_level,
            solution,
            prevention_json,
            events_json,
            created_at
        ],
    ).expect("Failed to insert knowledge entry");

    conn.last_insert_rowid()
}

#[tauri::command]
fn start_screen_recording() -> Result<String, String> {
    log::info!("Screen recording started");
    Ok("recording".to_string())
}

#[tauri::command]
fn stop_screen_recording(state: tauri::State<AppState>, severity: u8) -> Result<String, String> {
    log::info!("Screen recording stopped with severity: {}", severity);

    // Signal the recording thread to stop
    state.stop_flag.store(true, Ordering::SeqCst);

    let mut capture = state.capture.lock().unwrap();
    capture.is_recording = false;

    let retention_frames = match severity {
        1..=3 => 0,
        4..=5 => 100,
        6..=10 => u64::MAX,
        _ => 0,
    };

    let frames_dir = &capture.frames_dir;

    if retention_frames == 0 {
        if let Err(e) = fs::remove_dir_all(frames_dir) {
            log::warn!("Failed to delete frames directory: {}", e);
        }
        capture.frame_count = 0;
    } else {
        let frame_count = capture.frame_count;
        if retention_frames < frame_count {
            let entries: Vec<_> = fs::read_dir(frames_dir)
                .map(|entries| entries.filter_map(|e| e.ok()).collect())
                .unwrap_or_default();

            let remove_count = (frame_count - retention_frames) as usize;
            for entry in entries.iter().take(remove_count.min(entries.len())) {
                if let Err(e) = fs::remove_file(entry.path()) {
                    log::warn!("Failed to delete frame: {}", e);
                }
            }
            capture.frame_count = retention_frames;
        }
    }

    Ok(format!("stopped:{}", retention_frames))
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Gentle Reminder is ready.", name)
}

fn get_frames_dir() -> Result<std::path::PathBuf> {
    let base = cache_dir()
        .ok_or_else(|| anyhow::anyhow!("Could not determine cache directory"))?;

    let dir = base.join("gentle-reminder").join("frames");
    fs::create_dir_all(&dir).context("Failed to create frames directory")?;
    Ok(dir)
}

fn create_test_frame(frame_num: u64) -> Vec<u8> {
    let width = 1920u32;
    let height = 1080u32;

    let mut img = image::ImageBuffer::<image::Rgba<u8>, Vec<u8>>::new(width, height);

    // Fill with dark gray background
    for pixel in img.pixels_mut() {
        *pixel = image::Rgba([40, 40, 40, 255]);
    }

    // Draw header bar with timestamp
    for x in 0..width {
        for y in 0..80 {
            img.put_pixel(x, y, image::Rgba([70, 130, 180, 255]));
        }
    }

    let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S");

    // Draw status bar at bottom
    for x in 0..width {
        for y in (height - 40)..height {
            img.put_pixel(x, y, image::Rgba([60, 60, 60, 255]));
        }
    }

    let mut buf: Vec<u8> = Vec::new();
    img.write_to(&mut std::io::Cursor::new(&mut buf), image::ImageFormat::Png)
        .expect("PNG encoding failed");

    buf
}

fn try_xcap_capture() -> Option<Vec<u8>> {
    let monitors = xcap::Monitor::all().ok()?;
    let monitor = monitors.first()?;

    let image = monitor.capture_image().ok()?;
    let mut buf: Vec<u8> = Vec::new();

    if image.write_to(&mut std::io::Cursor::new(&mut buf), image::ImageFormat::Png).is_ok()
        && !buf.is_empty()
    {
        return Some(buf);
    }

    None
}

fn continuous_recorder(frames_dir: std::path::PathBuf, stop_flag: Arc<AtomicBool>) {
    let fps = 5u8;
    let interval = Duration::from_millis(1000 / fps as u64);
    let mut frame_count: u64 = 0;

    while !stop_flag.load(Ordering::SeqCst) {
        let buffer = if let Some(b) = try_xcap_capture() {
            b
        } else {
            create_test_frame(frame_count)
        };

        let frame_path = frames_dir.join(format!("frame_{:010}.png", frame_count));
        if let Err(e) = fs::write(&frame_path, buffer) {
            log::warn!("Failed to write frame {}: {}", frame_count, e);
        } else {
            frame_count += 1;
            if frame_count % 25 == 0 {
                log::info!("Captured {} frames", frame_count);
            }
        }

        thread::sleep(interval);
    }

    log::info!("Recorder stopped after {} frames", frame_count);
}

fn init_db() -> Result<rusqlite::Connection> {
    let base = dirs::data_dir()
        .ok_or_else(|| anyhow::anyhow!("Could not determine data directory"))?;

    let db_path = base.join("gentle-reminder").join("gentle_reminder.db");
    fs::create_dir_all(db_path.parent().unwrap_or(&db_path))
        .context("Failed to create data directory")?;

    let conn = rusqlite::Connection::open(&db_path)
        .context("Failed to open database")?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            event_type TEXT NOT NULL,
            title TEXT NOT NULL,
            detail TEXT NOT NULL,
            tags TEXT
        )",
        (),
    ).context("Failed to create events table")?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS knowledge_entries (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            severity INTEGER NOT NULL,
            user_rating INTEGER NOT NULL,
            ai_score INTEGER NOT NULL,
            recurrence_count INTEGER NOT NULL,
            capture_level TEXT NOT NULL,
            solution TEXT NOT NULL,
            prevention TEXT,
            events TEXT NOT NULL,
            created_at TEXT NOT NULL
        )",
        (),
    ).context("Failed to create knowledge_entries table")?;

    Ok(conn)
}

fn main() {
    env_logger::init();

    let frames_dir = get_frames_dir().unwrap_or_else(|_| {
        log::warn!("Using fallback frames directory");
        std::path::PathBuf::from("frames")
    });

    log::info!("Starting Gentle Reminder");
    log::info!("Frames directory: {:?}", frames_dir);

    // Debug: check if directory is writable
    if let Err(e) = fs::write(frames_dir.join("test.txt"), "test") {
        log::warn!("Cannot write to frames dir: {}", e);
    } else {
        log::info!("Frames directory is writable");
        let _ = fs::remove_file(frames_dir.join("test.txt"));
    }

    // Initialize database
    let db = init_db().expect("Failed to initialize database");
    log::info!("Database initialized successfully");

    // Create stop flag - false means KEEP recording, true means STOP
    let stop_flag = Arc::new(AtomicBool::new(false));
    let stop_flag_for_thread = stop_flag.clone();
    let frames_dir_for_thread = frames_dir.clone();

    // Start continuous recording thread
    thread::spawn(move || {
        log::info!("Starting continuous recorder thread");
        continuous_recorder(frames_dir_for_thread, stop_flag_for_thread);
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState {
            capture: Mutex::new(CaptureState {
                is_recording: true,
                capture_level: "full-screen".to_string(),
                events: Vec::new(),
                recording_active: true,
                frame_count: 0,
                frames_dir: frames_dir.to_string_lossy().to_string(),
            }),
            stop_flag,
            frames_dir: frames_dir.clone(),
        })
        .manage(DbState { conn: Mutex::new(db) })
        .setup(|_app| {
            #[cfg(debug_assertions)]
            {
                if let Some(window) = _app.get_webview_window("main") {
                    window.open_devtools();
                }
            }
            Ok(())
        })
        .on_window_event(|_window, event| {
            if let WindowEvent::CloseRequested { .. } = event {
                log::info!("Gentle Reminder window closed - stopping recording");
            }
        })
        .invoke_handler(tauri::generate_handler![
            add_event,
            set_recording,
            get_capture_state,
            list_recordings,
            clear_events,
            save_knowledge_entry,
            start_screen_recording,
            stop_screen_recording,
            greet,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}