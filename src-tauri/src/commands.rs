use keyring::Entry;
use serde::{Deserialize, Serialize};

const SERVICE_NAME: &str = "everlast-ai";

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiKeys {
    pub deepgram: String,
    pub elevenlabs: String,
    pub openai: String,
    pub anthropic: String,
}

impl Default for ApiKeys {
    fn default() -> Self {
        Self {
            deepgram: String::new(),
            elevenlabs: String::new(),
            openai: String::new(),
            anthropic: String::new(),
        }
    }
}

fn get_keyring_entry(key_type: &str) -> Result<Entry, String> {
    Entry::new(SERVICE_NAME, key_type).map_err(|e| format!("Failed to create keyring entry: {}", e))
}

#[tauri::command]
pub async fn get_api_key(key_type: String) -> Result<Option<String>, String> {
    let entry = get_keyring_entry(&key_type)?;

    match entry.get_password() {
        Ok(password) => Ok(Some(password)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Failed to get API key: {}", e)),
    }
}

#[tauri::command]
pub async fn save_api_key(key_type: String, key: String) -> Result<(), String> {
    let entry = get_keyring_entry(&key_type)?;

    if key.is_empty() {
        // Delete key if empty string is provided
        match entry.delete_credential() {
            Ok(_) => Ok(()),
            Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(format!("Failed to delete API key: {}", e)),
        }
    } else {
        entry
            .set_password(&key)
            .map_err(|e| format!("Failed to save API key: {}", e))
    }
}

#[tauri::command]
pub async fn delete_api_key(key_type: String) -> Result<(), String> {
    let entry = get_keyring_entry(&key_type)?;

    match entry.delete_credential() {
        Ok(_) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("Failed to delete API key: {}", e)),
    }
}

#[tauri::command]
pub async fn get_api_keys() -> Result<ApiKeys, String> {
    let deepgram = get_api_key("deepgram".to_string()).await?.unwrap_or_default();
    let elevenlabs = get_api_key("elevenlabs".to_string()).await?.unwrap_or_default();
    let openai = get_api_key("openai".to_string()).await?.unwrap_or_default();
    let anthropic = get_api_key("anthropic".to_string()).await?.unwrap_or_default();

    Ok(ApiKeys {
        deepgram,
        elevenlabs,
        openai,
        anthropic,
    })
}

#[tauri::command]
pub async fn save_api_keys(keys: ApiKeys) -> Result<(), String> {
    save_api_key("deepgram".to_string(), keys.deepgram).await?;
    save_api_key("elevenlabs".to_string(), keys.elevenlabs).await?;
    save_api_key("openai".to_string(), keys.openai).await?;
    save_api_key("anthropic".to_string(), keys.anthropic).await?;
    Ok(())
}
