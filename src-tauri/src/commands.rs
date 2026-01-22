use std::sync::atomic::{AtomicBool, Ordering};
use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::{image::Image, tray::TrayIconId, AppHandle, Manager};
use chacha20poly1305::{
    aead::{Aead, KeyInit},
    ChaCha20Poly1305, Nonce,
};
use argon2::{Argon2, Algorithm, Params, Version};
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use rand::Rng;

pub const TRAY_ID: &str = "main-tray";

// Salt for key derivation - app-specific
const KEY_SALT: &[u8] = b"everlast-ai-encryption-v1";

// Get the encrypted storage directory
fn get_storage_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let secure_dir = app_data.join("secure");
    fs::create_dir_all(&secure_dir)
        .map_err(|e| format!("Failed to create secure dir: {}", e))?;
    Ok(secure_dir)
}

// Get the file path for a user's encrypted keys
fn get_keys_file(app: &AppHandle, user_id: &Option<String>) -> Result<PathBuf, String> {
    let dir = get_storage_dir(app)?;
    let filename = match user_id {
        Some(id) if !id.is_empty() => format!("keys_{}.enc", id.replace(['@', '.', '/'], "_")),
        _ => "keys_anonymous.enc".to_string(),
    };
    Ok(dir.join(filename))
}

// Derive encryption key using Argon2
fn derive_key(user_id: &Option<String>) -> [u8; 32] {
    let password = match user_id {
        Some(id) if !id.is_empty() => format!("everlast-{}", id),
        _ => "everlast-anonymous".to_string(),
    };

    let params = Params::new(10_000, 10, 4, Some(32))
        .expect("Invalid Argon2 params");

    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

    let mut result = [0u8; 32];
    argon2.hash_password_into(password.as_bytes(), KEY_SALT, &mut result)
        .expect("Failed to derive key");

    result
}

// Encrypt data
fn encrypt_data(data: &[u8], user_id: &Option<String>) -> Result<Vec<u8>, String> {
    let key = derive_key(user_id);
    let cipher = ChaCha20Poly1305::new_from_slice(&key)
        .map_err(|e| format!("Failed to create cipher: {}", e))?;

    // Generate random nonce
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher.encrypt(nonce, data)
        .map_err(|e| format!("Encryption failed: {}", e))?;

    // Prepend nonce to ciphertext
    let mut result = nonce_bytes.to_vec();
    result.extend(ciphertext);
    Ok(result)
}

// Decrypt data
fn decrypt_data(encrypted: &[u8], user_id: &Option<String>) -> Result<Vec<u8>, String> {
    if encrypted.len() < 12 {
        return Err("Invalid encrypted data".to_string());
    }

    let key = derive_key(user_id);
    let cipher = ChaCha20Poly1305::new_from_slice(&key)
        .map_err(|e| format!("Failed to create cipher: {}", e))?;

    let (nonce_bytes, ciphertext) = encrypted.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    cipher.decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption failed: {}", e))
}

// Save encrypted API keys
fn save_encrypted_keys(app: &AppHandle, keys: &ApiKeys, user_id: &Option<String>) -> Result<(), String> {
    let json = serde_json::to_string(keys)
        .map_err(|e| format!("Failed to serialize: {}", e))?;

    let encrypted = encrypt_data(json.as_bytes(), user_id)?;
    let encoded = BASE64.encode(&encrypted);

    let file_path = get_keys_file(app, user_id)?;
    fs::write(&file_path, encoded)
        .map_err(|e| format!("Failed to write keys file: {}", e))?;

    Ok(())
}

// Load encrypted API keys
fn load_encrypted_keys(app: &AppHandle, user_id: &Option<String>) -> Result<ApiKeys, String> {
    let file_path = get_keys_file(app, user_id)?;

    if !file_path.exists() {
        return Ok(ApiKeys::default());
    }

    let encoded = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read keys file: {}", e))?;

    let encrypted = BASE64.decode(encoded.trim())
        .map_err(|e| format!("Failed to decode: {}", e))?;

    let decrypted = decrypt_data(&encrypted, user_id)?;

    let keys: ApiKeys = serde_json::from_slice(&decrypted)
        .map_err(|e| format!("Failed to deserialize: {}", e))?;

    Ok(keys)
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
    let keys = load_encrypted_keys(&app, &user_id)?;

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
    let mut keys = load_encrypted_keys(&app, &user_id)?;

    match key_type.as_str() {
        "deepgram" => keys.deepgram = key,
        "elevenlabs" => keys.elevenlabs = key,
        "openai" => keys.openai = key,
        "anthropic" => keys.anthropic = key,
        _ => return Err(format!("Unknown key type: {}", key_type)),
    };

    save_encrypted_keys(&app, &keys, &user_id)?;
    Ok(())
}

#[tauri::command]
pub async fn delete_api_key(app: AppHandle, key_type: String, user_id: Option<String>) -> Result<(), String> {
    save_api_key(app, key_type, String::new(), user_id).await
}

#[tauri::command]
pub async fn get_api_keys(app: AppHandle, user_id: Option<String>) -> Result<ApiKeys, String> {
    load_encrypted_keys(&app, &user_id)
}

#[tauri::command]
pub async fn save_api_keys(app: AppHandle, keys: ApiKeys, user_id: Option<String>) -> Result<(), String> {
    save_encrypted_keys(&app, &keys, &user_id)
}

// ==================== Session/Transcript Storage ====================

// Get the sessions directory for a user
fn get_sessions_dir(app: &AppHandle, user_id: &Option<String>) -> Result<PathBuf, String> {
    let dir = get_storage_dir(app)?;
    let user_folder = match user_id {
        Some(id) if !id.is_empty() => format!("sessions_{}", id.replace(['@', '.', '/'], "_")),
        _ => "sessions_anonymous".to_string(),
    };
    let sessions_dir = dir.join(user_folder);
    fs::create_dir_all(&sessions_dir)
        .map_err(|e| format!("Failed to create sessions dir: {}", e))?;
    Ok(sessions_dir)
}

// Get session index file path
fn get_session_index_file(app: &AppHandle, user_id: &Option<String>) -> Result<PathBuf, String> {
    let dir = get_sessions_dir(app, user_id)?;
    Ok(dir.join("index.json"))
}

// Get individual session file path
fn get_session_file(app: &AppHandle, user_id: &Option<String>, session_id: &str) -> Result<PathBuf, String> {
    let dir = get_sessions_dir(app, user_id)?;
    Ok(dir.join(format!("{}.enc", session_id)))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionListItem {
    pub id: String,
    pub title: String,
    pub created_at: String,
    pub duration: f64,
    pub speaker_count: u32,
    pub word_count: u32,
    pub preview: String,
    pub tags: Option<Vec<String>>,
    pub starred: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SessionIndex {
    pub sessions: Vec<SessionListItem>,
    pub updated_at: String,
}

// Load session index
fn load_session_index(app: &AppHandle, user_id: &Option<String>) -> Result<SessionIndex, String> {
    let file_path = get_session_index_file(app, user_id)?;

    if !file_path.exists() {
        return Ok(SessionIndex::default());
    }

    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read session index: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse session index: {}", e))
}

// Save session index
fn save_session_index(app: &AppHandle, user_id: &Option<String>, index: &SessionIndex) -> Result<(), String> {
    let file_path = get_session_index_file(app, user_id)?;
    let content = serde_json::to_string_pretty(index)
        .map_err(|e| format!("Failed to serialize session index: {}", e))?;
    fs::write(&file_path, content)
        .map_err(|e| format!("Failed to write session index: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn list_sessions(app: AppHandle, user_id: Option<String>) -> Result<Vec<SessionListItem>, String> {
    let index = load_session_index(&app, &user_id)?;
    Ok(index.sessions)
}

#[tauri::command]
pub async fn save_session(
    app: AppHandle,
    user_id: Option<String>,
    session_id: String,
    session_data: String,  // JSON string of the full session
    list_item: SessionListItem,
) -> Result<(), String> {
    // Encrypt and save the session data
    let encrypted = encrypt_data(session_data.as_bytes(), &user_id)?;
    let encoded = BASE64.encode(&encrypted);

    let file_path = get_session_file(&app, &user_id, &session_id)?;
    fs::write(&file_path, encoded)
        .map_err(|e| format!("Failed to write session file: {}", e))?;

    // Update the index
    let mut index = load_session_index(&app, &user_id)?;

    // Remove existing entry if updating
    index.sessions.retain(|s| s.id != session_id);

    // Add new entry at the beginning (most recent first)
    index.sessions.insert(0, list_item);
    index.updated_at = chrono::Utc::now().to_rfc3339();

    save_session_index(&app, &user_id, &index)?;

    Ok(())
}

#[tauri::command]
pub async fn get_session(
    app: AppHandle,
    user_id: Option<String>,
    session_id: String,
) -> Result<String, String> {
    let file_path = get_session_file(&app, &user_id, &session_id)?;

    if !file_path.exists() {
        return Err("Session not found".to_string());
    }

    let encoded = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read session file: {}", e))?;

    let encrypted = BASE64.decode(encoded.trim())
        .map_err(|e| format!("Failed to decode session: {}", e))?;

    let decrypted = decrypt_data(&encrypted, &user_id)?;

    String::from_utf8(decrypted)
        .map_err(|e| format!("Failed to parse session data: {}", e))
}

#[tauri::command]
pub async fn delete_session(
    app: AppHandle,
    user_id: Option<String>,
    session_id: String,
) -> Result<(), String> {
    // Delete the session file
    let file_path = get_session_file(&app, &user_id, &session_id)?;
    if file_path.exists() {
        fs::remove_file(&file_path)
            .map_err(|e| format!("Failed to delete session file: {}", e))?;
    }

    // Update the index
    let mut index = load_session_index(&app, &user_id)?;
    index.sessions.retain(|s| s.id != session_id);
    index.updated_at = chrono::Utc::now().to_rfc3339();
    save_session_index(&app, &user_id, &index)?;

    Ok(())
}

#[tauri::command]
pub async fn update_session_metadata(
    app: AppHandle,
    user_id: Option<String>,
    session_id: String,
    title: Option<String>,
    tags: Option<Vec<String>>,
    starred: Option<bool>,
) -> Result<(), String> {
    let mut index = load_session_index(&app, &user_id)?;

    if let Some(session) = index.sessions.iter_mut().find(|s| s.id == session_id) {
        if let Some(t) = title {
            session.title = t;
        }
        if let Some(t) = tags {
            session.tags = Some(t);
        }
        if let Some(s) = starred {
            session.starred = Some(s);
        }
        index.updated_at = chrono::Utc::now().to_rfc3339();
        save_session_index(&app, &user_id, &index)?;
    } else {
        return Err("Session not found".to_string());
    }

    Ok(())
}
