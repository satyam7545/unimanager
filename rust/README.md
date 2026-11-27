# UniManager — Pure Rust Edition (`v2.0.0`)

A 100% Pure Rust rewrite of **UniManager** using a modular Cargo workspace, **SQLx** (MySQL), **Reqwest** (Multi-Provider AI), **Axum** (optional HTTP server), and **Dioxus 0.6 Desktop** (native RSX UI with zero Node.js/Electron overhead).

---

## Workspace Architecture

| Crate | Purpose |
| :--- | :--- |
| `crates/unimanager-db` | SQLx MySQL connection pool, 18 Prisma-compatible models, and async repositories |
| `crates/unimanager-ai` | Multi-provider LLM client (`openai`, `gemini`, `claude`, `deepseek`, `ollama`, `lmstudio`) |
| `crates/unimanager-core` | `bcrypt` + JWT authentication, Dashboard priority engine, `.env` loader, PDF text extraction |
| `crates/unimanager-ui` | Native Dioxus 0.6 Desktop UI with Electric Indigo / Deep Obsidian / Snow theme |
| `crates/unimanager-server` | Optional Axum REST API server (`/api/v1/health`, `/api/v1/auth/login`) |

---

## Prerequisites (Windows)

1. **Rust Toolchain (`rustup`)**:
   - Uses `stable-x86_64-pc-windows-gnu` (includes self-contained MinGW linker) or `stable-x86_64-pc-windows-msvc`.
   - Ensure `%USERPROFILE%\.cargo\bin` is in your `PATH`.
2. **Microsoft Edge WebView2 Runtime**:
   - Pre-installed on Windows 10/11 (used natively by Dioxus Desktop).
3. **Database Configuration (`.env`)**:
   - The app automatically checks `.env`, `../backend/.env`, and `../../backend/.env` for `DATABASE_URL` (MySQL).

---

## Running on Windows

### Option 1: Run from Source (Development)
From the repository root:
```powershell
cargo run --manifest-path rust\Cargo.toml -p unimanager-ui
```
*(If `cargo` is not in your shell `PATH` yet, run `& "$env:USERPROFILE\.cargo\bin\cargo.exe" run --manifest-path rust\Cargo.toml -p unimanager-ui` or restart your terminal.)*

### Option 2: Build & Run Release Executable
```powershell
cargo build --manifest-path rust\Cargo.toml -p unimanager-ui --release
.\rust\target\release\unimanager-ui.exe
```

### Option 3: Optional Axum HTTP Server
```powershell
cargo run --manifest-path rust\Cargo.toml -p unimanager-server
```

---

## Running Tests
```powershell
cargo test --manifest-path rust\Cargo.toml --workspace
```
