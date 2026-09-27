# Kalai Assistant

Angular 22 personal assistant chatbot. Prefer the conventions below.

- Standalone components only. Do not set `standalone: true`.
- Do not set `ChangeDetectionStrategy.OnPush`; it is the default.
- Use signals, `computed()`, `resource()`, `input()`, `output()`, and `inject()`.
- Use `@Service()` for new singletons instead of `@Injectable({ providedIn: 'root' })`.
- Use native control flow (`@if`, `@for`, `@switch`) and `class` bindings, not `ngClass`.
- Keep LLM providers behind `src/app/core/llm`. Detect cloud providers from API key prefixes in `provider-catalog.ts`.
- Store each provider key and the TOTP secret in `SettingsStore` / `kalai.properties`. The desktop app writes that file under Electron userData; `ng serve` writes `public/kalai.properties`. Do not print full API keys.
- Keep the installable desktop shell in `desktop/`. Do not put Node APIs in Angular components.
- Gate the app with Google Authenticator (`AuthStore`). Require a fresh TOTP code to change the API key.
