use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose, Engine as _};
use keyring::Entry;
use serde::{Deserialize, Serialize};
use std::fs;
use tauri::AppHandle;

use crate::error::AppError;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SecureSettings {
    pub groq_api_key: String,
    pub groq_model: String,
    pub telegram_bot_token: String,
    pub telegram_channel_id: String,
}

#[derive(Serialize, Deserialize)]
struct StoredSettings {
    pub groq_api_key_enc: String,
    pub groq_model: String,
    pub telegram_bot_token_enc: String,
    pub telegram_channel_id_enc: String,
}

const KEYRING_SERVICE: &str = "reel-comment";
const KEYRING_USER: &str = "encryption-key";
const SETTINGS_FILE: &str = "settings.json";

fn get_encryption_key() -> Result<Vec<u8>, AppError> {
    let entry = Entry::new(KEYRING_SERVICE, KEYRING_USER)?;
    match entry.get_password() {
        Ok(pw) => Ok(general_purpose::STANDARD.decode(pw).map_err(|e| AppError::Other(e.to_string()))?),
        Err(_) => {
            let mut key = [0u8; 32];
            getrandom::getrandom(&mut key).map_err(|e| AppError::Other(e.to_string()))?;
            let encoded = general_purpose::STANDARD.encode(key);
            entry.set_password(&encoded)?;
            Ok(key.to_vec())
        }
    }
}

fn encrypt(key: &[u8], plaintext: &str) -> Result<String, AppError> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| AppError::Other(e.to_string()))?;
    let mut nonce_bytes = [0u8; 12];
    getrandom::getrandom(&mut nonce_bytes).map_err(|e| AppError::Other(e.to_string()))?;
    let nonce = Nonce::from_slice(&nonce_bytes);
    
    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| AppError::Other(e.to_string()))?;
    
    let mut combined = nonce_bytes.to_vec();
    combined.extend_from_slice(&ciphertext);
    Ok(general_purpose::STANDARD.encode(combined))
}

fn decrypt(key: &[u8], encoded: &str) -> Result<String, AppError> {
    let combined = general_purpose::STANDARD
        .decode(encoded)
        .map_err(|e| AppError::Other(e.to_string()))?;
    
    if combined.len() < 12 {
        return Err(AppError::Other("Invalid ciphertext".to_string()));
    }
    
    let (nonce_bytes, ciphertext) = combined.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| AppError::Other(e.to_string()))?;
    
    let decrypted = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| AppError::Other(e.to_string()))?;
    
    String::from_utf8(decrypted).map_err(|e| AppError::Other(e.to_string()))
}

pub fn load_settings(app: AppHandle) -> Result<SecureSettings, AppError> {
    let config_dir = app.path_resolver().app_config_dir().ok_or_else(|| AppError::Other("Could not find app config dir".to_string()))?;
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir)?;
    }
    
    let file_path = config_dir.join(SETTINGS_FILE);
    if !file_path.exists() {
        return Ok(SecureSettings {
            groq_api_key: "".to_string(),
            groq_model: "llama-3.3-70b-versatile".to_string(),
            telegram_bot_token: "".to_string(),
            telegram_channel_id: "".to_string(),
        });
    }
    
    let content = fs::read_to_string(file_path)?;
    let stored: StoredSettings = serde_json::from_str(&content).map_err(|e| AppError::Other(e.to_string()))?;
    
    let key = get_encryption_key()?;
    
    Ok(SecureSettings {
        groq_api_key: if stored.groq_api_key_enc.is_empty() { "".to_string() } else { decrypt(&key, &stored.groq_api_key_enc)? },
        groq_model: stored.groq_model,
        telegram_bot_token: if stored.telegram_bot_token_enc.is_empty() { "".to_string() } else { decrypt(&key, &stored.telegram_bot_token_enc)? },
        telegram_channel_id: if stored.telegram_channel_id_enc.is_empty() { "".to_string() } else { decrypt(&key, &stored.telegram_channel_id_enc)? },
    })
}

pub fn save_settings(app: AppHandle, settings: SecureSettings) -> Result<(), AppError> {
    let config_dir = app.path_resolver().app_config_dir().ok_or_else(|| AppError::Other("Could not find app config dir".to_string()))?;
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir)?;
    }
    
    let key = get_encryption_key()?;
    
    let stored = StoredSettings {
        groq_api_key_enc: encrypt(&key, &settings.groq_api_key)?,
        groq_model: settings.groq_model,
        telegram_bot_token_enc: encrypt(&key, &settings.telegram_bot_token)?,
        telegram_channel_id_enc: encrypt(&key, &settings.telegram_channel_id)?,
    };
    
    let file_path = config_dir.join(SETTINGS_FILE);
    let content = serde_json::to_string_pretty(&stored).map_err(|e| AppError::Other(e.to_string()))?;
    fs::write(file_path, content)?;
    
    Ok(())
}
