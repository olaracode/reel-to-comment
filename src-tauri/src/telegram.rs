use serde::Serialize;
use reqwest::Client;
use crate::error::AppError;
use std::time::Duration;
use tokio::time::sleep;

#[derive(Serialize)]
pub struct TelegramResult {
    pub sent: u32,
}

pub async fn send_to_telegram(
    comments: Vec<String>,
    bot_token: String,
    channel_id: String,
) -> Result<TelegramResult, AppError> {
    let client = Client::new();
    let mut sent = 0;

    for comment in comments {
        let response = client
            .post(format!("https://api.telegram.org/bot{}/sendMessage", bot_token))
            .json(&serde_json::json!({
                "chat_id": channel_id,
                "text": comment,
                "parse_mode": "HTML"
            }))
            .send()
            .await;

        match response {
            Ok(res) if res.status().is_success() => {
                sent += 1;
            }
            Ok(res) => {
                let err_text = res.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                return Err(AppError::Telegram(format!("Sent {} messages before error: {}", sent, err_text)));
            }
            Err(e) => {
                return Err(AppError::Telegram(format!("Sent {} messages before error: {}", sent, e)));
            }
        }

        // 150ms delay between messages to avoid rate limits
        sleep(Duration::from_millis(150)).await;
    }

    Ok(TelegramResult { sent })
}
