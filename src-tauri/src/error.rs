#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("yt-dlp error: {0}")]
    YtDlp(String),
    #[error("No captions found in the reel")]
    NoCaptions,
    #[error("Groq API error: {0}")]
    Groq(String),
    #[error("Transcription error: {0}")]
    Transcription(String),
    #[error("Telegram API error: {0}")]
    Telegram(String),
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Keyring error: {0}")]
    Keyring(#[from] keyring::Error),
    #[error("Other error: {0}")]
    Other(String),
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
