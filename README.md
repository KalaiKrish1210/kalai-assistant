# Kalai Assistant

Personal chatbot built with **Angular 22**. Paste a free LLM API key and Kalai stores it on that provider. Switching providers uses the key saved for Gemini, Grok, or Groq:

| Key starts with | Stored on |
| --- | --- |
| `AIza` or `AQ.` | Gemini (Google AI Studio) |
| `xai-` | Grok (xAI) |
| `gsk_` | Groq |
| _(none)_ | Ollama, local — no key |

## Install on this computer

```bash
cd /Users/kalaikanmani/Workbench/kalai-assistant
npm install
npm run dist
```

That builds a desktop app in `release/`:

- **macOS:** `Kalai Assistant.app` and a `.dmg` you can drag into Applications
- **Windows:** an NSIS installer `.exe`
- **Linux:** an AppImage

Open the installed app like any other program. Keys and the authenticator secret are stored in the OS app-data folder, not inside the installed app.

To run the desktop window without making an installer:

```bash
npm run desktop
```

## Run in the browser

```bash
cd /Users/kalaikanmani/Workbench/kalai-assistant
npm install
npm start
```

The app opens at `http://localhost:4200/`. `ng serve` proxies:

- `/llm/gemini` → `https://generativelanguage.googleapis.com`
- `/llm/grok` → `https://api.x.ai`
- `/llm/groq` → `https://api.groq.com`
- `/llm/ollama` → `http://127.0.0.1:11434`

## Google Authenticator

On first launch, scan the QR code in **Google Authenticator** and confirm with the 6-digit code. After that, every full page load asks for a new code before chat opens. Changing the API key in Settings also requires a fresh code.

The authenticator secret is saved as `auth.secret` in `public/kalai.properties`. Do not commit that file.

## Connect a model

1. Unlock the app with Google Authenticator.
2. Open **Settings**. If that provider already has a key, enter another authenticator code to view or change it.
3. Paste the API key. It is saved on Gemini, Grok, or Groq from the key prefix. Switching providers keeps the other keys.
4. Click **Save to properties file**.

Keys are written as `gemini.key`, `grok.key`, and `groq.key`. The desktop app saves them in the OS app-data folder. `npm start` saves `public/kalai.properties`, which is gitignored. You can also copy `public/kalai.properties.example` and fill the keys by hand.
