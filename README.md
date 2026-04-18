# ◈ ReelComment

ReelComment is a desktop application that takes an Instagram Reel URL, extracts its captions using `yt-dlp`, generates AI-written comments via the Groq API, and sends approved comments to a Telegram channel.

---

## 🚀 Installation & Setup

### 1. Download & Install
Download the latest version for your operating system from the [Releases](https://github.com/your-repo/reelcomment/releases) page.
- **macOS**: Download the `.dmg` or `.app` bundle.
- **Windows**: Download the `.msi` or `.exe` installer.

### 2. Sidecar Dependency (`yt-dlp`)
ReelComment uses `yt-dlp` to extract captions. While the installer might bundle it, if you are running from source or need to update it:
1. Download the standalone binary for your OS from [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases).
2. Place it in `src-tauri/binaries/` and rename it to match your target triple (e.g., `yt-dlp-x86_64-apple-darwin` for Intel Mac or `yt-dlp-x86_64-pc-windows-msvc.exe` for Windows).

---

## ⚡ 1. Getting a Groq API Key

Groq provides incredibly fast AI inference. To get your API key:
1. Go to the [Groq Console](https://console.groq.com/).
2. Sign up or log in.
3. Navigate to the **API Keys** section.
4. Click **Create API Key**, give it a name (e.g., "ReelComment"), and copy the key.
5. In ReelComment, click the **Gear Icon** ⚙ (Settings) and paste it into the Groq API Key field.

---

## ✈️ 2. Setting up Telegram

ReelComment sends comments directly to a Telegram channel of your choice.

### Step A: Create a Telegram Bot
1. Open Telegram and search for [@BotFather](https://t.me/botfather).
2. Send `/newbot` and follow the instructions to name your bot.
3. BotFather will provide an **API Token**. Copy this token.
4. In ReelComment Settings, paste this into the **Bot Token** field.

### Step B: Create a Channel & Add Bot
1. Create a new **Telegram Channel** (Public or Private).
2. Add your new bot to the channel as an **Administrator**.
3. Ensure the bot has permission to **Post Messages**.

### Step C: Get the Channel ID
- **Public Channel**: Your Channel ID is simply `@yourchannelname`.
- **Private Channel**: 
  1. Forward a message from your channel to [@userinfobot](https://t.me/userinfobot).
  2. It will reply with the numerical ID (usually starting with `-100`).
4. In ReelComment Settings, paste this into the **Channel ID** field.

---

## 🛠 Development

If you want to build the project from source:

### Prerequisites
- [Rust](https://rustup.rs/)
- [Node.js 18+](https://nodejs.org/)
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

### Build Steps
```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

---

## 🔒 Security
Your API keys and tokens are **encrypted at rest** using AES-256-GCM. The encryption key is stored securely in your OS keychain (macOS Keychain / Windows Credential Manager). Sensitive data never touches your browser's local storage or any unencrypted files.
