// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod error;
mod secure_storage;
mod captions;
mod comments;
mod telegram;

use error::AppError;
use secure_storage::{SecureSettings, load_settings as load_secure_settings, save_settings as save_secure_settings};
use captions::{CaptionsResult, fetch_captions as fetch_reel_captions};
use comments::{CommentsResult, generate_comments as generate_ai_comments};
use telegram::{TelegramResult, send_to_telegram as send_all_to_telegram};
use tauri::AppHandle;

#[tauri::command]
fn load_settings(app: AppHandle) -> Result<SecureSettings, AppError> {
    load_secure_settings(app)
}

#[tauri::command]
fn save_settings(app: AppHandle, settings: SecureSettings) -> Result<(), AppError> {
    save_secure_settings(app, settings)
}


#[tauri::command]
async fn fetch_captions(app: AppHandle, url: String, groq_api_key: String) -> Result<CaptionsResult, AppError> {
    fetch_reel_captions(app, url, groq_api_key).await
}

#[tauri::command]
async fn generate_comments(
    captions: String,
    mood: String,
    count: u32,
    language: String,
    feedback: String,
    groq_api_key: String,
    model: String,
) -> Result<CommentsResult, AppError> {
    generate_ai_comments(captions, mood, count, language, feedback, groq_api_key, model).await
}

#[tauri::command]
async fn send_to_telegram(
    comments: Vec<String>,
    bot_token: String,
    channel_id: String,
) -> Result<TelegramResult, AppError> {
    send_all_to_telegram(comments, bot_token, channel_id).await
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            load_settings,
            save_settings,
            fetch_captions,
            generate_comments,
            send_to_telegram
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
