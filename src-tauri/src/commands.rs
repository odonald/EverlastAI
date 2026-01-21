use std::sync::atomic::{AtomicBool, Ordering};
use serde::{Deserialize, Serialize};
use tauri::{image::Image, tray::TrayIconId, AppHandle};
use tauri_plugin_store::StoreExt;

const STORE_FILE: &str = "settings.json";
pub const TRAY_ID: &str = "main-tray";

// Generate a user-specific storage key for API keys
fn get_api_keys_key(user_id: &Option<String>) -> String {
    match user_id {
        Some(id) if !id.is_empty() => format!("api_keys_{}", id.replace(['@', '.'], "_")),
        _ => "api_keys_anonymous".to_string(),
    }
}

// Global recording state
static IS_RECORDING: AtomicBool = AtomicBool::new(false);

// Embedded icons
const ICON_NORMAL: &[u8] = include_bytes!("../icons/32x32.png");
const ICON_RECORDING: &[u8] = include_bytes!("../icons/recording.png");

pub fn update_tray_for_recording(app: &AppHandle, is_recording: bool) {
    println!("Updating tray state: recording={}", is_recording);

    let tray_id: TrayIconId = TRAY_ID.into();
    if let Some(tray) = app.tray_by_id(&tray_id) {
        println!("Found tray, updating icon and tooltip...");
        if is_recording {
            if let Err(e) = tray.set_tooltip(Some("EverlastAI - Recording...")) {
                println!("Failed to set tooltip: {:?}", e);
            }
            // Set recording icon
            match Image::from_bytes(ICON_RECORDING) {
                Ok(icon) => {
                    if let Err(e) = tray.set_icon(Some(icon)) {
                        println!("Failed to set recording icon: {:?}", e);
                    } else {
                        println!("Recording icon set successfully");
                    }
                }
                Err(e) => println!("Failed to load recording icon: {:?}", e),
            }
        } else {
            if let Err(e) = tray.set_tooltip(Some("EverlastAI - Voice to Text")) {
                println!("Failed to set tooltip: {:?}", e);
            }
            // Restore normal icon
            match Image::from_bytes(ICON_NORMAL) {
                Ok(icon) => {
                    if let Err(e) = tray.set_icon(Some(icon)) {
                        println!("Failed to set normal icon: {:?}", e);
                    } else {
                        println!("Normal icon set successfully");
                    }
                }
                Err(e) => println!("Failed to load normal icon: {:?}", e),
            }
        }
    } else {
        println!("Could not find tray with id: {}", TRAY_ID);
        // List all available trays for debugging
        println!("Note: Make sure the tray was created with the same ID");
    }
}

#[tauri::command]
pub fn set_recording_state(app: AppHandle, recording: bool) {
    println!("set_recording_state called: {}", recording);
    IS_RECORDING.store(recording, Ordering::SeqCst);
    update_tray_for_recording(&app, recording);
}

#[tauri::command]
pub fn get_recording_state() -> bool {
    IS_RECORDING.load(Ordering::SeqCst)
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ApiKeys {
    #[serde(default)]
    pub deepgram: String,
    #[serde(default)]
    pub elevenlabs: String,
    #[serde(default)]
    pub openai: String,
    #[serde(default)]
    pub anthropic: String,
}

#[tauri::command]
pub async fn get_api_key(app: AppHandle, key_type: String, user_id: Option<String>) -> Result<Option<String>, String> {
    let store = app
        .store(STORE_FILE)
        .map_err(|e| format!("Failed to open store: {}", e))?;

    let storage_key = get_api_keys_key(&user_id);
    let keys: ApiKeys = store
        .get(&storage_key)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    let value = match key_type.as_str() {
        "deepgram" => &keys.deepgram,
        "elevenlabs" => &keys.elevenlabs,
        "openai" => &keys.openai,
        "anthropic" => &keys.anthropic,
        _ => return Ok(None),
    };

    if value.is_empty() {
        Ok(None)
    } else {
        Ok(Some(value.clone()))
    }
}

#[tauri::command]
pub async fn save_api_key(app: AppHandle, key_type: String, key: String, user_id: Option<String>) -> Result<(), String> {
    let store = app
        .store(STORE_FILE)
        .map_err(|e| format!("Failed to open store: {}", e))?;

    let storage_key = get_api_keys_key(&user_id);
    let mut keys: ApiKeys = store
        .get(&storage_key)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    match key_type.as_str() {
        "deepgram" => keys.deepgram = key,
        "elevenlabs" => keys.elevenlabs = key,
        "openai" => keys.openai = key,
        "anthropic" => keys.anthropic = key,
        _ => return Err(format!("Unknown key type: {}", key_type)),
    };

    store.set(
        &storage_key,
        serde_json::to_value(&keys).map_err(|e| format!("Failed to serialize: {}", e))?,
    );

    store
        .save()
        .map_err(|e| format!("Failed to save store: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_api_key(app: AppHandle, key_type: String, user_id: Option<String>) -> Result<(), String> {
    save_api_key(app, key_type, String::new(), user_id).await
}

#[tauri::command]
pub async fn get_api_keys(app: AppHandle, user_id: Option<String>) -> Result<ApiKeys, String> {
    let store = app
        .store(STORE_FILE)
        .map_err(|e| format!("Failed to open store: {}", e))?;

    let storage_key = get_api_keys_key(&user_id);
    let keys: ApiKeys = store
        .get(&storage_key)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    Ok(keys)
}

#[tauri::command]
pub async fn save_api_keys(app: AppHandle, keys: ApiKeys, user_id: Option<String>) -> Result<(), String> {
    let store = app
        .store(STORE_FILE)
        .map_err(|e| format!("Failed to open store: {}", e))?;

    let storage_key = get_api_keys_key(&user_id);
    store.set(
        &storage_key,
        serde_json::to_value(&keys).map_err(|e| format!("Failed to serialize: {}", e))?,
    );

    store
        .save()
        .map_err(|e| format!("Failed to save store: {}", e))?;

    Ok(())
}
