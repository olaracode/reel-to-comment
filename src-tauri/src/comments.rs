use serde::{Deserialize, Serialize};
use reqwest::{Client, multipart};
use std::path::PathBuf;
use crate::error::AppError;

#[derive(Serialize)]
pub struct CommentsResult {
    pub comments: Vec<String>,
}

#[derive(Serialize, Deserialize)]
struct TranscriptionResponse {
    text: String,
}

pub async fn transcribe_audio(
    file_path: PathBuf,
    api_key: String,
) -> Result<String, AppError> {
    let client = Client::new();
    
    let file_name = file_path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("audio.m4a");
    
    let mime_type = match file_path.extension().and_then(|e| e.to_str()) {
        Some("mp4") => "video/mp4",
        Some("m4a") => "audio/mp4",
        Some("mp3") => "audio/mpeg",
        Some("wav") => "audio/wav",
        Some("webm") => "video/webm",
        _ => "application/octet-stream", // Fallback for extension-less files
    };

    let file_bytes = std::fs::read(&file_path)?;
    let file_part = multipart::Part::bytes(file_bytes)
        .file_name(file_name.to_string())
        .mime_str(mime_type)
        .map_err(|e| AppError::Other(e.to_string()))?;

    let form = multipart::Form::new()
        .part("file", file_part)
        .text("model", "whisper-large-v3-turbo")
        .text("response_format", "json");

    let response = client
        .post("https://api.groq.com/openai/v1/audio/transcriptions")
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
        .send()
        .await?;

    if !response.status().is_success() {
        let err_text = response.text().await?;
        return Err(AppError::Transcription(err_text));
    }

    let res: TranscriptionResponse = response.json().await?;
    Ok(res.text)
}

#[derive(Serialize, Deserialize)]
struct GroqResponse {
    choices: Vec<GroqChoice>,
}

#[derive(Serialize, Deserialize)]
struct GroqChoice {
    message: GroqMessage,
}

#[derive(Serialize, Deserialize)]
struct GroqMessage {
    content: String,
}

pub async fn generate_comments(
    captions: String,
    mood: String,
    count: u32,
    language: String,
    feedback: String,
    api_key: String,
    model: String,
) -> Result<CommentsResult, AppError> {
    let mood_instruction = match mood.as_str() {
        "hype" => "extremely enthusiastic, short punchy sentences, energy",
        "curious" => "thoughtful genuine questions, show real interest",
        "funny" => "witty, playful, clever observations",
        "sincere" => "warm, heartfelt, authentic",
        "controversial" => "mildly provocative, contrarian angle, sparks conversation",
        "rage_bait" => "intentionally provocative, slightly annoying, confidently wrong, or gatekeeping to drive maximum replies and 'correction' comments",
        _ => "natural and human-sounding",
    };

    let feedback_section = if feedback.is_empty() {
        "".to_string()
    } else {
        format!("\nFEEDBACK FROM USER: {}", feedback)
    };

    let prompt = format!(
        "REEL TRANSCRIPT:\n{}\n\nTASK: Generate exactly {} Instagram comments.\nMOOD: {}\nLANGUAGE: {}\n{}\n\nRULES:\n- One comment per line, no numbering or bullets\n- 1–3 sentences each, natural and human-sounding\n- Vary length and structure\n- No hashtags unless very natural\n- Output ONLY the comments in the requested LANGUAGE",
        captions, count, mood_instruction, language, feedback_section
    );

    let client = Client::new();
    let response = client
        .post("https://api.groq.com/openai/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&serde_json::json!({
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.9,
            "max_tokens": 1000
        }))
        .send()
        .await?;

    if !response.status().is_success() {
        let err_text = response.text().await?;
        return Err(AppError::Groq(err_text));
    }

    let groq_res: GroqResponse = response.json().await?;
    let content = groq_res.choices.get(0).map(|c| c.message.content.as_str()).unwrap_or("");
    
    let comments: Vec<String> = content
        .lines()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .collect();

    Ok(CommentsResult {
        comments: comments.into_iter().take(count as usize).collect(),
    })
}
