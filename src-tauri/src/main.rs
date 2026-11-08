// Gentle Reminder — Tauri 2.0 desktop backend
// Captures the full computer log from start to end and lets the AI decide what to keep.

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
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
}

struct AppState {
    capture: Mutex<CaptureState>,
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
fn clear_events(state: tauri::State<AppState>) -> CaptureState {
    let mut capture = state.capture.lock().unwrap();
    capture.events.clear();
    capture.clone()
}

#[tauri::command]
fn save_knowledge_entry(
    state: tauri::State<AppState>,
    title: String,
    description: String,
    severity: u8,
    user_rating: u8,
    ai_score: u8,
    recurrence_count: u32,
    capture_level: String,
    solution: String,
    prevention: Option<String>,
) -> String {
    let capture = state.capture.lock().unwrap();
    let events_json = serde_json::to_string(&capture.events).unwrap_or_default();
    let entry = serde_json::json!({
        "id": uuid::Uuid::new_v4().to_string(),
        "title": title,
        "description": description,
        "severity": severity,
        "user_rating": user_rating,
        "ai_score": ai_score,
        "recurrence_count": recurrence_count,
        "capture_level": capture_level,
        "solution": solution,
        "prevention": prevention,
        "events": events_json,
        "created_at": chrono::Utc::now().to_rfc3339(),
    });
    entry.to_string()
}

#[tauri::command]
fn start_screen_recording() -> Result<(), String> {
    log::info!("Screen recording started (native capture pending)");
    Ok(())
}

#[tauri::command]
fn stop_screen_recording() -> Result<(), String> {
    log::info!("Screen recording stopped");
    Ok(())
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Gentle Reminder is ready.", name)
}

fn main() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState {
            capture: Mutex::new(CaptureState {
                is_recording: false,
                capture_level: "notes-only".to_string(),
                events: Vec::new(),
            }),
        })
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            #[cfg(debug_assertions)]
            {
                window.open_devtools();
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { .. } = event {
                log::info!("Gentle Reminder window closed");
            }
        })
        .invoke_handler(tauri::generate_handler![
            add_event,
            set_recording,
            get_capture_state,
            clear_events,
            save_knowledge_entry,
            start_screen_recording,
            stop_screen_recording,
            greet,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}