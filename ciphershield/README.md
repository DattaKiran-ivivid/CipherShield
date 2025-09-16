# CipherShield

CipherShield is a desktop application for anonymizing Personally Identifiable Information (PII) in text and files. It uses Microsoft's Presidio for PII detection and anonymization, with a secure Rust backend powered by Tauri and a React frontend for an intuitive user interface. The app supports custom entity recognition, template saving, and secure processing via encryption.

This README is targeted at developers interested in contributing, extending, or deploying the application. It provides comprehensive documentation on the architecture, setup, running, building, and usage.

## Features

- **PII Detection and Anonymization**: Automatically detect and anonymize sensitive data like emails, phone numbers, SSNs, names, addresses, and credit cards.
- **Custom Recognizers**: Add regex-based custom entity types for specialized PII detection.
- **Template System**: Save and reuse anonymization mappings and custom recognizers as templates stored in a local SQLite database.
- **File and Text Processing**: Handle text input or files (PDF, CSV, JSON, XML, TXT) with chunked processing for large files.
- **Secure Processing**: Data is encrypted before sending to the Python backend for processing, ensuring security.
- **Preview and Review**: Side-by-side original vs. processed views, with PII table for overrides.
- **Export and Save**: Export processed results and save templates for reuse.
- **Cross-Platform**: Built with Tauri, runs on Windows, macOS, and Linux.

## Architecture Overview

- **Frontend**: React with TypeScript, using Shadcn UI components. Handles user input, displays processing pipeline, custom entities, previews, and PII tables. Communicates with backend via Tauri commands.
- **Backend (Rust)**: Tauri app with commands like `process_text` and `process_files`. Uses Ring for AES-256 encryption/decryption, Rusqlite for database, and Reqwest for HTTP calls to the Python server.
- **Processing Engine (Python)**: FastAPI server using Presidio for analysis/anonymization. Handles encrypted data, supports custom recognizers, and processes various file formats (PDF via pdftotext, CSV, etc.).
- **Database**: Local SQLite for storing templates (mappings and custom recognizers).
- **Security**: All data transferred to the Python server is encrypted. The server runs locally with self-signed SSL.

Project Structure:
```
ciphershield/
├── src/                  # Frontend React source
│   ├── components/       # UI components (e.g., ProcessingScreen.tsx)
│   ├── ui/               # Shadcn UI components
│   └── ...
├── src-tauri/            # Rust backend
│   ├── src/              # Rust source
│   │   ├── processing.rs # Core processing logic
│   │   ├── db.rs         # Database operations
│   │   ├── models.rs     # Data models (e.g., MappingItem, CustomRecognizer)
│   │   └── main.rs       # Tauri entrypoint
│   ├── Cargo.toml        # Rust dependencies
│   └── tauri.conf.json   # Tauri config
├── cipherengine/         # Python engine
│   ├── server.py         # FastAPI server
│   ├── .venv/            # Virtual env (generate with requirements)
│   └── requirements.txt  # Python deps (presidio-analyzer, presidio-anonymizer, cryptography, etc.)
├── README.md             # This file
└── package.json          # Node dependencies
```

## Prerequisites

- **Rust**: Install via [rustup](https://rustup.rs/) (stable toolchain).
- **Node.js**: v18+ with npm/yarn.
- **Python**: 3.10+ with pip.
- **Tauri CLI**: Install globally via `cargo install tauri-cli`.
- **OS-Specific Dependencies** (for Tauri):
  - macOS: Xcode Command Line Tools.
  - Windows: Visual Studio Build Tools (C++ workload).
  - Linux: WebKitGTK, libssl-dev, etc. (see [Tauri docs](https://tauri.app/v1/guides/getting-started/prerequisites)).
- **OpenSSL**: For self-signed certs in Python server (generate with `openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout key.pem -out cert.pem`).

## Installation

1. **Clone the Repository**:
   ```
   git clone <your-repo-url>
   cd ciphershield
   ```

2. **Frontend Dependencies**:
   ```
   npm install
   # or yarn install
   ```

3. **Rust Dependencies**:
   ```
   cd src-tauri
   cargo build
   cd ..
   ```

4. **Python Engine Setup**:
   ```
   cd cipherengine
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   # Generate self-signed certs if not present
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout key.pem -out cert.pem
   cd ..
   ```

   requirements.txt example:
   ```
   fastapi
   uvicorn
   presidio-analyzer
   presidio-anonymizer
   cryptography
   pdftotext
   ```

## Running the App (Development Mode)

1. **Start the Python Server**:
   ```
   cd cipherengine
   source .venv/bin/activate
   uvicorn server:app --host 0.0.0.0 --port 8000 --ssl-keyfile key.pem --ssl-certfile cert.pem
   ```
   The server runs on `https://127.0.0.1:8000`. Note: Self-signed certs may require accepting invalid certs in the Rust client (handled via `danger_accept_invalid_certs`).

2. **Run Tauri Dev**:
   In the root directory:
   ```
   npm run tauri dev
   # or yarn tauri dev
   ```
   This starts the React dev server and Tauri backend. The app window will open automatically.

   - Debug Rust: Use `cargo run` in `src-tauri` (but integrate with frontend via dev command).
   - Debug Frontend: Inspect via browser dev tools (Tauri window supports it).
   - Logs: Check console for Rust (`tracing::info`) and Python debug prints.

## Building the App (Production)

1. **Build Frontend**:
   ```
   npm run build
   ```

2. **Build Tauri App**:
   ```
   npm run tauri build
   ```
   This generates installers/bundles in `src-tauri/target/release/bundle/` (e.g., .dmg for macOS, .msi for Windows).

   - Customize build: Edit `tauri.conf.json` for icons, bundle options, etc.
   - Signing: For production, configure code signing in `tauri.conf.json` (requires certificates).

   Note: The Python server must be packaged separately or run manually. For a fully bundled app, consider embedding Python (e.g., via PyOxidizer) or migrating the engine to Rust.

## Usage

### For Users
- Launch the app.
- Navigate to Processing Screen.
- Add custom entities (optional).
- Input text or upload files.
- Click "Process" to anonymize.
- Review PII table, override actions if needed.
- Save template or export results.

### For Developers
- **Extending Processing**:
  - Add new file formats in `server.py` (e.g., add DOCX support via python-docx).
  - Enhance Rust commands in `processing.rs` (e.g., add deanonymize support in UI).
- **Database Schema**:
  - Templates table: id (PK), name, mappings (JSON), custom_recognizers (JSON).
  - Access via `db.rs` functions like `insert_template`.
- **Models**:
  - Rust: `models.rs` defines `FileInput`, `TextInput`, `ProcessOutput`, `MappingItem`, `CustomRecognizer`.
  - TS: Mirror in frontend (e.g., `models.ts`).
- **Testing**:
  - Rust: `cargo test`.
  - Frontend: `npm test` (add Jest if needed).
  - End-to-End: Manually test with sample text/files.
- **Common Issues**:
  - SSL Errors: Ensure certs are generated; Rust client ignores invalid certs.
  - Dependencies: If Rust build fails, check `Cargo.toml` (e.g., reqwest with rustls-tls).
  - Python Path: In dev, ensure virtual env is activated.

## Contributing

1. Fork the repo.
2. Create a feature branch: `git checkout -b feature/new-feature`.
3. Commit changes: `git commit -am 'Add new feature'`.
4. Push: `git push origin feature/new-feature`.
5. Open a Pull Request.

Follow Rust and React best practices. Add tests and update docs.

