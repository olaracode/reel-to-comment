# ReelComment

Instagram Reel Comment Generator built with Tauri, React, Groq, and Telegram.

## Prerequisites

- **Rust**: [rustup.rs](https://rustup.rs/)
- **Node.js**: 18+
- **Tauri CLI**: `npm install -g @tauri-apps/cli` (or use `npm run tauri`)
- **yt-dlp binary**:
  1. Download the standalone binary for your OS from [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases).
  2. Create a folder `src-tauri/binaries/`.
  3. Place the binary in that folder and rename it to include your target triple:
     - macOS (Intel): `yt-dlp-x86_64-apple-darwin`
     - macOS (Apple Silicon): `yt-dlp-aarch64-apple-darwin`
     - Windows: `yt-dlp-x86_64-pc-windows-msvc.exe`
     - Linux: `yt-dlp-x86_64-unknown-linux-gnu`
  4. Make sure it has execution permissions (`chmod +x` on Unix).

## Getting Started

```bash
# Install dependencies
npm install

# Start development
npm run tauri dev

# Build production bundle
npm run tauri build
```

## Setup

1. Open the app.
2. Click the gear icon (Settings).
3. Enter your **Groq API Key**.
4. Enter your **Telegram Bot Token** and **Channel ID**.
5. Save settings (they are encrypted and stored in your OS keychain).
6. Paste a Reel URL and start generating!
