# ReelComment — Master Build Prompt

You are an expert Rust + React developer. Build a complete, production-ready **Tauri v1** desktop application called **ReelComment**.

---

## What the app does

ReelComment takes an Instagram Reel URL, extracts its captions using `yt-dlp`, generates a batch of AI-written comments via the Groq API, shows them as a preview with a regeneration loop, and finally sends the approved comments to a Telegram channel via a bot.

---

## Full User Flow

```
1. User pastes an Instagram Reel URL into the input field
2. User selects a mood (Hype / Curious / Funny / Sincere / Spicy)
3. User picks how many comments to generate (1–20, default 5)
4. User clicks "Generate"
   → App calls yt-dlp sidecar: fetches auto-captions, strips VTT markup
   → App calls Groq API with captions + mood → receives N comments
   → Comments render as a preview list, one card per comment
5. REGENERATION LOOP (optional):
   → User reads the comments and may type optional feedback
     e.g. "make them shorter" / "more aggressive tone"
   → User clicks "Regenerate" → Groq is called again with the feedback appended
   → New comments replace the old ones
   → This loop can repeat as many times as the user wants
6. When satisfied, user clicks "Send to Telegram"
   → All comments are sent one by one to the configured Telegram channel
   → A success banner shows how many were sent
```

---

## Settings (persisted encrypted)

There is a **Settings modal** (gear icon in the header). It has two sections:

### ⚡ Groq
- API Key (masked input with show/hide toggle) — **encrypted at rest**
- Model selector: Llama 3.3 70B / Llama 3 8B / Qwen 32B / Mixtral 8x7B

### ✈️ Telegram
- Bot Token (masked input with show/hide toggle) — **encrypted at rest**
- Channel ID (plain text, e.g. `@mychannel` or `-100123456789`) — **encrypted at rest**

**Encryption strategy:**
- On first run, generate a random 256-bit AES-GCM key and store it in the **OS keychain** using the `keyring` crate (macOS Keychain / Windows Credential Manager / Linux SecretService).
- All three sensitive fields (Groq API key, Telegram bot token, Telegram channel ID) are encrypted with AES-GCM (nonce prepended) and stored as base64 in a JSON file inside Tauri's `app_config_dir()`.
- The non-sensitive field (model name) is stored in plain text in the same JSON file.
- On app startup, load and decrypt the settings automatically, populating the UI. The UI never stores secrets in localStorage or any browser storage.

If settings are incomplete on first launch, auto-open the Settings modal with a warning banner: "Setup required before generating comments."

---

## Tech Stack

### Frontend
- **React 18** + **TypeScript**
- **Zustand** for state (no `persist` middleware — secrets must never touch browser storage)
- **Vite** as dev server / bundler
- `@tauri-apps/api` for all backend communication via `invoke()`
- Fonts: load from Google Fonts — use **Syne** (display/headings, weight 700–800) + **DM Mono** (body/code)
- No external UI component libraries — hand-craft all components

### Backend (Rust)
- **Tauri v1.6**
- **tokio** (async runtime)
- **reqwest** with rustls for HTTP (Groq + Telegram API calls)
- **serde / serde_json** for JSON
- **tempfile** for temp VTT file handling
- **regex** for VTT parsing
- **aes-gcm 0.10** for AES-256-GCM encryption
- **base64 0.22** for encoding
- **keyring 2** for OS keychain access
- **which 6** for binary resolution
- **thiserror** for typed errors

---

## Rust Modules

### `main.rs`
Registers five Tauri commands:
- `load_settings(app: AppHandle) -> SecureSettings`
- `save_settings(app: AppHandle, settings: SecureSettings) -> ()`
- `fetch_captions(url: String) -> CaptionsResult { captions, title }`
- `generate_comments(captions, mood, count, feedback, groq_api_key, model) -> CommentsResult { comments }`
- `send_to_telegram(comments, bot_token, channel_id) -> TelegramResult { sent }`

### `secure_storage.rs`
- `SecureSettings` struct: `groq_api_key`, `groq_model`, `telegram_bot_token`, `telegram_channel_id`
- `StoredSettings` struct (on-disk): sensitive fields stored as `*_enc` base64 strings
- `load_or_create_key()` — get AES key from OS keychain or generate + store a new one
- `encrypt(key, plaintext) -> base64(nonce || ciphertext)`
- `decrypt(key, encoded) -> plaintext`
- `load_settings(app) -> SecureSettings` — reads JSON, decrypts fields
- `save_settings(app, settings)` — encrypts fields, writes JSON

### `captions.rs`
- Resolves `yt-dlp` binary path (check `PATH` first, then next to exe)
- Runs: `yt-dlp --write-auto-subs --sub-format vtt --sub-langs en.* --skip-download --no-playlist -o <tmpdir/reel> <url>`
- Finds the `.vtt` file written in the temp dir
- `parse_vtt(raw)`: strip WEBVTT header, timestamp lines, inline tags (`<c>`, `<00:00:01.500>`), deduplicate consecutive identical lines, join into a single string
- Returns `CaptionsResult { captions: String, title: String }`
- Errors: `NoCaptions` if VTT is empty after parsing; `YtDlp(stderr)` if exit code != 0

### `comments.rs`
- Mood instructions:
  - `hype`: extremely enthusiastic, short punchy sentences, energy
  - `curious`: thoughtful genuine questions, show real interest
  - `funny`: witty, playful, clever observations
  - `sincere`: warm, heartfelt, authentic
  - `controversial`: mildly provocative, contrarian angle, sparks conversation
- Prompt template:
  ```
  REEL TRANSCRIPT:
  {captions}

  TASK: Generate exactly {count} Instagram comments.
  MOOD: {mood_instruction}
  FEEDBACK (if any): {feedback}

  RULES:
  - One comment per line, no numbering or bullets
  - 1–3 sentences each, natural and human-sounding
  - Vary length and structure
  - No hashtags unless very natural
  - Output ONLY the comments
  ```
- Calls `https://api.groq.com/openai/v1/chat/completions`
- Temperature: 0.9, max_tokens: 1000
- Parses response: split by newline, trim, filter empty, take N

### `telegram.rs`
- Calls `https://api.telegram.org/bot{token}/sendMessage` for each comment
- `parse_mode: "HTML"`
- 150ms delay between messages (avoid Telegram rate limits)
- Returns `TelegramResult { sent: u32 }`
- On any failure, returns error with count of successfully sent messages

### `error.rs`
```rust
pub enum AppError {
    YtDlp(String),
    NoCaptions,
    Groq(String),
    Telegram(String),
    Http(reqwest::Error),
    Io(std::io::Error),
    Other(String),
}
```

---

## Tauri Config (`tauri.conf.json`)

```json
{
  "allowlist": {
    "shell": { "sidecar": true, "scope": [{ "name": "yt-dlp", "sidecar": true, "args": true }] },
    "http": { "all": true, "scope": ["https://api.groq.com/**", "https://api.telegram.org/**"] }
  },
  "bundle": {
    "externalBin": ["binaries/yt-dlp"]
  },
  "windows": [{ "width": 720, "height": 720, "minWidth": 560, "minHeight": 500, "resizable": true }]
}
```

---

## Frontend Components

### `App.tsx`
- On mount: call `load_settings()` → populate Zustand store → if incomplete, open Settings modal
- Renders: Header, URL input, Mood pills, Count stepper, Generate button, StatusBar, CaptionsPreview (collapsed), CommentsList with FeedbackBar, SendButton

### `SettingsModal.tsx`
- Two sections: Groq and Telegram
- Masked inputs with show/hide toggle for secrets
- On Save: call `save_settings()` → update Zustand → close modal
- Show inline error if save fails
- Show `🔒 Encrypted` badge next to the section headers

### `CommentCard.tsx`
- Shows comment index, text, copy-to-clipboard button
- Slide-in animation with staggered `animation-delay`

### `FeedbackBar.tsx`
- Shown below the comment list once comments exist
- A text input: placeholder "Optional feedback for regeneration..."
- "Regenerate" button (calls `generate_comments` again with feedback appended)
- "Send to Telegram" button (primary CTA) — calls `send_to_telegram`

### `StatusBar.tsx`
- Shows spinner + label for: `fetching_captions`, `generating`, `sending`
- Shows green checkmark for `done`
- Shows red error text for `error`

### `useAppStore.ts` (Zustand)
State shape:
```ts
settings: { groqApiKey, groqModel, telegramBotToken, telegramChannelId }
settingsLoaded: boolean
reelUrl: string
mood: Mood  // 'hype' | 'curious' | 'funny' | 'sincere' | 'controversial'
commentCount: number  // 1–20
feedback: string  // optional regeneration feedback
captions: string
comments: Comment[]  // { id, text, mood }
status: AppStatus  // 'idle' | 'fetching_captions' | 'generating' | 'sending' | 'done' | 'error'
errorMessage: string
settingsOpen: boolean
```
**Important:** No `persist` middleware. Settings are never stored in browser storage.

### `useTauri.ts`
Typed wrappers for all five `invoke()` calls:
- `loadSettings() -> SecureSettings`
- `saveSettings(settings) -> void`
- `fetchCaptions(url) -> { captions, title }`
- `generateComments(captions, mood, count, feedback, groqApiKey, model) -> { comments }`
- `sendToTelegram(comments, botToken, channelId) -> { sent }`

---

## Design System

**Aesthetic:** Dark industrial terminal — feels like a professional tool, not a toy.

**CSS variables:**
```css
--bg: #0d0d0f
--surface: #141416
--surface2: #1c1c1f
--border: #2a2a2e
--border-bright: #3a3a3f
--text: #e8e8ec
--text-muted: #6b6b75
--text-dim: #3d3d44
--accent: #c8f135       /* electric yellow-green */
--accent-dim: rgba(200, 241, 53, 0.12)
--accent-border: rgba(200, 241, 53, 0.3)
--red: #ff5c5c
--green: #4ade80
--radius: 8px
--radius-lg: 14px
font-family: 'DM Mono', monospace  /* body */
font-family: 'Syne', sans-serif    /* headings/buttons */
```

**Key UI rules:**
- Header: logo left (`◈ ReelComment`), gear icon right
- Gear icon shows `⚠ Setup required` in amber if settings are incomplete
- Mood selector: pill buttons, active state uses `--accent` color
- Count stepper: `−` / number / `+` in a bordered inline control
- Generate button: full-width, `--accent` background, Syne bold font
- Comment cards: surface background, slide-in animation staggered by 80ms per card
- Each card has: index number, comment text, copy icon
- FeedbackBar appears below comments with a textarea + two action buttons
- Spinner: CSS border animation using `--accent` top-border
- All modals: backdrop blur, slide-up animation

---

## File Structure

```
reelcomment/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── store/
│   │   └── useAppStore.ts
│   ├── hooks/
│   │   └── useTauri.ts
│   └── components/
│       ├── SettingsModal.tsx
│       ├── CommentCard.tsx
│       ├── FeedbackBar.tsx
│       └── StatusBar.tsx
└── src-tauri/
    ├── tauri.conf.json
    ├── Cargo.toml
    ├── build.rs
    └── src/
        ├── main.rs
        ├── error.rs
        ├── secure_storage.rs
        ├── captions.rs
        ├── comments.rs
        └── telegram.rs
```

---

## Getting Started (include in README.md)

```bash
# Prerequisites
# - Rust (rustup.rs)
# - Node.js 18+
# - Tauri CLI: cargo install tauri-cli
# - Download yt-dlp binary for your OS from github.com/yt-dlp/yt-dlp/releases
#   and place it at: src-tauri/binaries/yt-dlp  (no extension on mac/linux)

npm install
cargo tauri dev        # development
cargo tauri build      # production bundle
```

---

## Important Implementation Notes

1. **yt-dlp is bundled as a sidecar binary** — no Python required. Users download the standalone `yt-dlp` executable and place it in `src-tauri/binaries/`. Tauri packages it with the app via `externalBin`.

2. **Groq free tier limits:** 1,000 requests/day, 6,000 tokens/minute. Each generation call consumes ~600–800 tokens. This is generous for personal use.

3. **Telegram rate limits:** 30 messages/second max for bots. Add 150ms delay between sends.

4. **Settings are never in browser storage.** The Zustand store has no `persist` middleware. Secrets live only in memory (Zustand) and on disk encrypted (Rust). The keychain key never touches the frontend at all.

5. **Regeneration feedback** is appended to the prompt as: `"FEEDBACK FROM USER: {feedback}"` — keep it simple. Empty feedback string means no feedback section is added to the prompt.

6. **Error handling:** All Tauri commands return `Result<T, String>`. The frontend catches errors and sets `status: 'error'` + `errorMessage` in the store. The StatusBar renders these.

7. **VTT deduplication:** Instagram auto-captions repeat the same line multiple times as words are added. Deduplicate consecutive identical lines after stripping tags.
