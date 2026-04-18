use std::fs;
use tauri::api::process::Command as TauriCommand;
use tauri::AppHandle;
use tempfile::tempdir;
use regex::Regex;
use serde::Serialize;
use crate::error::AppError;

#[derive(Serialize)]
pub struct CaptionsResult {
    pub captions: String,
    pub title: String,
    pub source: String,
}

pub async fn fetch_captions(_app: AppHandle, url: String, groq_api_key: String) -> Result<CaptionsResult, AppError> {
    let tmp_dir = tempdir()?;
    let output_path = tmp_dir.path().join("reel");
    let output_template = output_path.to_str().ok_or_else(|| AppError::Other("Invalid path".to_string()))?;

    // Try fetching CC first
    println!("DEBUG: Fetching CC for URL: {}", url);
    let output = TauriCommand::new_sidecar("yt-dlp")
        .map_err(|e| AppError::Other(e.to_string()))?
        .args([
            "--write-auto-subs",
            "--write-subs",
            "--sub-format", "vtt",
            "--sub-langs", "all",
            "--write-description",
            "--skip-download",
            "--no-playlist",
            "-o", output_template,
            &url
        ])
        .output()
        .map_err(|e| AppError::Other(e.to_string()))?;
    
    println!("DEBUG: yt-dlp CC output success: {}", output.status.success());
    if !output.status.success() {
        println!("DEBUG: yt-dlp CC stderr: {}", output.stderr);
    }
    println!("DEBUG: yt-dlp CC stdout: {}", output.stdout);

    // Find the .vtt file or .description file
    let mut vtt_path = None;
    let mut desc_path = None;
    
    if let Ok(entries) = fs::read_dir(tmp_dir.path()) {
        println!("DEBUG: Files in tmp_dir:");
        for entry in entries.flatten() {
            let path = entry.path();
            println!("  - {:?}", path.file_name().unwrap_or_default());
            let ext = path.extension().and_then(|s| s.to_str());
            if ext == Some("vtt") {
                vtt_path = Some(path);
            } else if ext == Some("description") {
                desc_path = Some(path);
            }
        }
    }

    if let Some(path) = vtt_path {
        println!("DEBUG: Found VTT file, parsing...");
        let raw_vtt = fs::read_to_string(path)?;
        return Ok(CaptionsResult {
            captions: parse_vtt(&raw_vtt)?,
            title: "Instagram Reel".to_string(),
            source: "Closed Captions".to_string(),
        });
    }

    println!("DEBUG: No VTT found. Trying audio download...");
    // If no VTT, try to download audio for transcription.
    // We avoid -x because it requires ffmpeg. We'll just download the best format that has audio.
    let audio_output = TauriCommand::new_sidecar("yt-dlp")
        .map_err(|e| AppError::Other(e.to_string()))?
        .args([
            "-f", "ba[ext=m4a]/ba/b[ext=mp4]/b", // Try best audio (m4a preferred), then best general
            "--no-playlist",
            "-o", output_template,
            &url
        ])
        .output()
        .map_err(|e| AppError::Other(e.to_string()))?;

    println!("DEBUG: yt-dlp audio output success: {}", audio_output.status.success());
    if !audio_output.status.success() {
        println!("DEBUG: yt-dlp audio stderr: {}", audio_output.stderr);
    }
    println!("DEBUG: yt-dlp audio stdout: {}", audio_output.stdout);

    if audio_output.status.success() {
        // Look for the audio file
        let mut audio_path = None;
        if let Ok(entries) = fs::read_dir(tmp_dir.path()) {
            println!("DEBUG: Files in tmp_dir after audio download:");
            for entry in entries.flatten() {
                let path = entry.path();
                let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or_default();
                println!("  - {:?}", file_name);
                let ext = path.extension().and_then(|s| s.to_str());
                
                // If the file is specifically named "reel" (even without extension)
                // or has a known media extension, use it.
                if file_name == "reel" || ext == Some("m4a") || ext == Some("mp3") || ext == Some("wav") || ext == Some("mp4") || ext == Some("webm") {
                    audio_path = Some(path);
                    // Don't break immediately to ensure we get the best file if multiple exist
                }
            }
        }

        if let Some(path) = audio_path {
            let mut final_path = path.clone();
            
            // If the file has no extension, Groq will reject it. 
            // We rename it to .m4a to ensure the API accepts it.
            if path.extension().is_none() {
                let new_path = path.with_extension("m4a");
                if let Ok(_) = fs::rename(&path, &new_path) {
                    final_path = new_path;
                }
            }

            println!("DEBUG: Found audio file: {:?}. Transcribing...", final_path.file_name().unwrap_or_default());
            // Call Groq Whisper API directly since we are already in an async context
            let transcription = crate::comments::transcribe_audio(final_path, groq_api_key).await?;
            
            if !transcription.trim().is_empty() {
                println!("DEBUG: Audio transcription successful.");
                return Ok(CaptionsResult {
                    captions: transcription,
                    title: "Instagram Reel".to_string(),
                    source: "AI Audio Transcription".to_string(),
                });
            } else {
                println!("DEBUG: Audio transcription returned empty string.");
            }
        } else {
            println!("DEBUG: No audio file found after download.");
        }
    }

    // Final fallback to description
    if let Some(path) = desc_path {
        println!("DEBUG: Falling back to Reel Description.");
        return Ok(CaptionsResult {
            captions: fs::read_to_string(path)?,
            title: "Instagram Reel".to_string(),
            source: "Reel Description".to_string(),
        });
    }

    Err(AppError::Other(format!(
        "Could not find captions, audio, or description.\nSTDOUT: {}\nSTDERR: {}", 
        output.stdout,
        output.stderr
    )))
}

fn parse_vtt(raw: &str) -> Result<String, AppError> {
    let re_tags = Regex::new(r"<[^>]*>").unwrap();
    let re_timestamp = Regex::new(r"^\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}.*").unwrap();
    
    let mut lines = Vec::new();
    let mut last_line = String::new();

    for line in raw.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed == "WEBVTT" || trimmed.starts_with("Kind:") || trimmed.starts_with("Language:") {
            continue;
        }
        
        if re_timestamp.is_match(trimmed) {
            continue;
        }

        // Strip HTML-like tags
        let stripped = re_tags.replace_all(trimmed, "").to_string();
        let stripped = stripped.trim().to_string();
        
        if stripped.is_empty() {
            continue;
        }

        // Deduplicate consecutive identical lines
        if stripped != last_line {
            lines.push(stripped.clone());
            last_line = stripped;
        }
    }

    if lines.is_empty() {
        return Err(AppError::NoCaptions);
    }

    Ok(lines.join(" "))
}
