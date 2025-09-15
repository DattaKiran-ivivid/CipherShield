#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

use std::fs::{File, create_dir_all};
use std::io::{Read, Write};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use tauri::{command, AppHandle, Manager};
use ring::pbkdf2;
use ring::rand::{SecureRandom, SystemRandom};
use ring::aead::{LessSafeKey, Nonce, NONCE_LEN, UnboundKey, AES_256_GCM, Aad, Tag};
use serde::{Deserialize, Serialize};
use rusqlite::{params, Connection, OptionalExtension};
use tokio::fs;
use std::num::NonZeroU32;
use chrono::Utc;
use hex;

#[derive(Serialize, Deserialize)]
struct User {
    email: String,
    password_hash: String, // PBKDF2-hashed password
}

#[derive(Deserialize)]
struct LoginInput {
    email: String,
    password: String,
}

#[derive(Serialize)]
struct LoginOutput {
    success: bool,
    error: Option<String>,
}

#[derive(Deserialize)]
struct FileInput {
    files: Vec<PathBuf>,
    action: String, // "anonymize" or "deanonymize"
    template_id: Option<i32>,
}

#[derive(Deserialize)]
struct TextInput {
    text: String,
    action: String,
    save_template: bool,
    template_name: Option<String>,
}

#[derive(Serialize)]
struct ProcessOutput {
    result: String,
    output_paths: Vec<String>,
    template_id: Option<i32>,
    error: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct MappingItem {
    original: String,
    anonymized: String,
    pii_type: String,
    confidence: f64,
}

#[derive(Serialize, Deserialize)]
struct Template {
    id: i32,
    name: String,
    mappings: Vec<MappingItem>,
}

fn hash_password(password: &str, salt: &[u8]) -> String {
    let mut hash = [0u8; 32];
    pbkdf2::derive(
        pbkdf2::PBKDF2_HMAC_SHA256,
        NonZeroU32::new(100000).unwrap(),
        salt,
        password.as_bytes(),
        &mut hash,
    );
    hex::encode(hash)
}

fn verify_password(password: &str, salt: &[u8], stored_hash: &str) -> bool {
    let mut hash = [0u8; 32];
    pbkdf2::derive(
        pbkdf2::PBKDF2_HMAC_SHA256,
        NonZeroU32::new(100000).unwrap(),
        salt,
        password.as_bytes(),
        &mut hash,
    );
    hex::encode(hash) == stored_hash
}

fn get_secure_db(app_handle: &AppHandle) -> Result<Connection, String> {
    let data_dir = app_handle.path().app_local_data_dir().unwrap();
    println!("Data directory: {:?}", data_dir);
    if let Err(e) = create_dir_all(&data_dir) {
        let err_msg = format!("Failed to create data directory: {}", e);
        println!("{}", err_msg);
        return Err(err_msg);
    }
    println!("Data directory created or exists");

    let db_path = data_dir.join("secure.db");
    println!("Attempting to open DB at path: {:?}", db_path);
    let conn = Connection::open(&db_path).map_err(|e| {
        let err_msg = e.to_string();
        println!("Error opening DB: {}", err_msg);
        err_msg
    })?;
    println!("DB connection opened successfully");

    conn.execute(
        "CREATE TABLE IF NOT EXISTS users (
            email TEXT PRIMARY KEY,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL
        );",
        [],
    ).map_err(|e| {
        let err_msg = e.to_string();
        println!("Error creating users table: {}", err_msg);
        err_msg
    })?;
    println!("Users table created or exists");

    conn.execute(
        "CREATE TABLE IF NOT EXISTS templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            mappings TEXT NOT NULL
        );",
        [],
    ).map_err(|e| {
        let err_msg = e.to_string();
        println!("Error creating templates table: {}", err_msg);
        err_msg
    })?;
    println!("Templates table created or exists");

    // Initialize default user if not exists
    let rng = SystemRandom::new();
    let mut salt = [0u8; 16];
    rng.fill(&mut salt).map_err(|e| {
        let err_msg = e.to_string();
        println!("Error generating salt: {}", err_msg);
        err_msg
    })?;
    let default_email = "admin@company.com".to_string();
    let default_password = "SecurePass123!"; // Change in production
    let password_hash = hash_password(&default_password, &salt);
    println!("Attempting to insert default user: {}", default_email);

    conn.execute(
        "INSERT OR IGNORE INTO users (email, password_hash, salt) VALUES (?1, ?2, ?3)",
        params![default_email, password_hash, hex::encode(salt)],
    ).map_err(|e| {
        let err_msg = e.to_string();
        println!("Error inserting default user: {}", err_msg);
        err_msg
    })?;
    println!("Default user inserted or already exists");

    Ok(conn)
}

fn encrypt_file(input_path: &PathBuf, output_path: &PathBuf, key_bytes: &[u8; 32]) -> Result<(), String> {
    println!("Encrypting file: {:?} to {:?}", input_path, output_path);
    let rng = SystemRandom::new();
    let mut nonce_bytes = [0u8; NONCE_LEN];
    rng.fill(&mut nonce_bytes).map_err(|e| e.to_string())?;
    let nonce = Nonce::assume_unique_for_key(nonce_bytes.try_into().map_err(|_| "Nonce error".to_string())?);
    let key = LessSafeKey::new(
        UnboundKey::new(&AES_256_GCM, key_bytes).map_err(|e| e.to_string())?,
    );

    let mut file_in = File::open(input_path).map_err(|e| e.to_string())?;
    let mut contents = Vec::new();
    file_in.read_to_end(&mut contents).map_err(|e| e.to_string())?;
    let tag = key.seal_in_place_separate_tag(nonce, Aad::empty(), &mut contents).map_err(|e| e.to_string())?;
    let mut file_out = File::create(output_path).map_err(|e| e.to_string())?;
    file_out.write_all(&nonce_bytes).map_err(|e| e.to_string())?;
    file_out.write_all(&contents).map_err(|e| e.to_string())?;
    file_out.write_all(tag.as_ref()).map_err(|e| e.to_string())?;
    println!("File encrypted successfully");
    Ok(())
}

fn decrypt_file(input_path: &PathBuf, output_path: &PathBuf, key_bytes: &[u8; 32]) -> Result<(), String> {
    println!("Decrypting file: {:?} to {:?}", input_path, output_path);
    let mut file_in = File::open(input_path).map_err(|e| e.to_string())?;
    let mut contents = Vec::new();
    file_in.read_to_end(&mut contents).map_err(|e| e.to_string())?;
    if contents.len() < NONCE_LEN + AES_256_GCM.tag_len() {
        return Err("Invalid file format".to_string());
    }
    let nonce_bytes = &contents[0..NONCE_LEN];
    let cipher_len = contents.len() - NONCE_LEN - AES_256_GCM.tag_len();
    let mut cipher_text = contents[NONCE_LEN..NONCE_LEN + cipher_len].to_vec();
    let tag_bytes = &contents[NONCE_LEN + cipher_len..];
    let tag: Tag = tag_bytes.try_into().map_err(|_| "Invalid tag".to_string())?;
    let nonce = Nonce::assume_unique_for_key(nonce_bytes.try_into().map_err(|_| "Invalid nonce".to_string())?);
    let key = LessSafeKey::new(
        UnboundKey::new(&AES_256_GCM, key_bytes).map_err(|e| e.to_string())?,
    );
    key.open_in_place_separate_tag(nonce, Aad::empty(), tag, &mut cipher_text, 0..).map_err(|e| e.to_string())?;
    let mut file_out = File::create(output_path).map_err(|e| e.to_string())?;
    file_out.write_all(&cipher_text).map_err(|e| e.to_string())?;
    println!("File decrypted successfully");
    Ok(())
}

#[command]
async fn login(app: AppHandle, input: LoginInput) -> Result<LoginOutput, String> {
    println!("Login attempt for email: {}", input.email);
    let db = get_secure_db(&app)?;
    println!("Fetching salt for user");
    let salt: Option<String> = db
        .query_row(
            "SELECT salt FROM users WHERE email = ?1",
            params![input.email],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| {
            let err_msg = e.to_string();
            println!("Error querying salt: {}", err_msg);
            err_msg
        })?;
    match salt {
        Some(salt) => {
            println!("Salt found, decoding");
            let salt_bytes = hex::decode(salt).map_err(|e| {
                let err_msg = e.to_string();
                println!("Error decoding salt: {}", err_msg);
                err_msg
            })?;
            println!("Fetching stored hash");
            let stored_hash: String = db
                .query_row(
                    "SELECT password_hash FROM users WHERE email = ?1",
                    params![input.email],
                    |row| row.get(0),
                )
                .map_err(|e| {
                    let err_msg = e.to_string();
                    println!("Error querying password_hash: {}", err_msg);
                    err_msg
                })?;
            println!("Verifying password");
            if verify_password(&input.password, &salt_bytes, &stored_hash) {
                println!("Login successful");
                Ok(LoginOutput { success: true, error: None })
            } else {
                println!("Invalid credentials");
                Ok(LoginOutput { success: false, error: Some("Invalid credentials".to_string()) })
            }
        }
        None => {
            println!("User not found");
            Ok(LoginOutput { success: false, error: Some("User not found".to_string()) })
        },
    }
}

#[command]
async fn process_files(app: AppHandle, input: FileInput) -> Result<ProcessOutput, String> {
    println!("Processing files: action={}, template_id={:?}", input.action, input.template_id);
    let rng = SystemRandom::new();
    let mut key = [0u8; 32];
    rng.fill(&mut key).map_err(|e| e.to_string())?;
    
    let python_path = if cfg!(target_os = "windows") {
        "cipherengine\\venv\\Scripts\\python.exe"
    } else {
        "cipherengine/venv/bin/python"
    };
    let script_path = "cipherengine/engine.py";
    let mut output_paths = Vec::new();
    let mut mappings: Vec<MappingItem> = Vec::new();

    for file_path in input.files.iter() {
        println!("Processing file: {:?}", file_path);
        // Encrypt input file
        let encrypted_path = file_path.with_extension("enc");
        encrypt_file(&file_path, &encrypted_path, &key)?;

        // Prepare Python input
        let python_input = serde_json::json!({
            "action": input.action,
            "input_path": encrypted_path.to_string_lossy(),
            "output_path": file_path.with_extension("processed").to_string_lossy(),
            "password": hex::encode(key),
            "template_id": input.template_id,
            "chunk_size": 1024 * 1024 // 1MB chunks
        });
        let input_json = serde_json::to_string(&python_input).map_err(|e| e.to_string())?;

        // Spawn Python
        println!("Executing Python script with input: {}", input_json);
        let output = Command::new(python_path)
            .arg(script_path)
            .arg(input_json)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            let result: serde_json::Value = serde_json::from_slice(&output.stdout).map_err(|e| e.to_string())?;
            output_paths.push(result["output_path"].as_str().unwrap_or_default().to_string());
            if input.action == "anonymize" {
                if let Some(items) = result["items"].as_array() {
                    let new_mappings: Vec<MappingItem> = items
                        .iter()
                        .cloned()
                        .map(serde_json::from_value)
                        .collect::<Result<_, _>>().map_err(|e| e.to_string())?;
                    mappings.extend(new_mappings);
                }
            }
            println!("Python script executed successfully");
        } else {
            let error = String::from_utf8_lossy(&output.stderr).to_string();
            println!("Python script error: {}", error);
            return Ok(ProcessOutput {
                result: "".to_string(),
                output_paths: Vec::new(),
                template_id: None,
                error: Some(error),
            });
        }
    }

    // Save mappings as template if requested
    let template_id = if !mappings.is_empty() && input.template_id.is_none() {
        let db = get_secure_db(&app)?;
        let template_name = format!("template_{}", Utc::now().timestamp());
        let mappings_json = serde_json::to_string(&mappings).map_err(|e| e.to_string())?;
        db.execute(
            "INSERT INTO templates (name, mappings) VALUES (?1, ?2)",
            params![template_name, mappings_json],
        ).map_err(|e| e.to_string())?;
        Some(db.last_insert_rowid() as i32)
    } else {
        input.template_id
    };

    println!("File processing complete");
    Ok(ProcessOutput {
        result: "Processing complete".to_string(),
        output_paths,
        template_id,
        error: None,
    })
}

#[command]
async fn process_text(app: AppHandle, input: TextInput) -> Result<ProcessOutput, String> {
    println!("Processing text: action={}, save_template={}", input.action, input.save_template);
    let rng = SystemRandom::new();
    let mut key = [0u8; 32];
    rng.fill(&mut key).map_err(|e| e.to_string())?;

    // Write text to temp file
    let temp_dir = app.path().app_local_data_dir().unwrap();
    let input_path = temp_dir.join("temp_input.txt");
    let encrypted_path = temp_dir.join("temp_input.enc");
    fs::write(&input_path, input.text).await.map_err(|e| e.to_string())?;
    encrypt_file(&input_path, &encrypted_path, &key)?;

    let python_path = if cfg!(target_os = "windows") {
        "cipherengine\\venv\\Scripts\\python.exe"
    } else {
        "cipherengine/venv/bin/python"
    };
    let script_path = "cipherengine/engine.py";
    let output_path = temp_dir.join("temp_output.txt");
    let python_input = serde_json::json!({
        "action": input.action,
        "input_path": encrypted_path.to_string_lossy(),
        "output_path": output_path.to_string_lossy(),
        "password": hex::encode(key),
        "chunk_size": 1024 * 1024
    });
    let input_json = serde_json::to_string(&python_input).map_err(|e| e.to_string())?;

    println!("Executing Python script for text processing");
    let output = Command::new(python_path)
        .arg(script_path)
        .arg(input_json)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| e.to_string())?;

    let mut template_id = None;
    let result_text;
    if output.status.success() {
        let result: serde_json::Value = serde_json::from_slice(&output.stdout).map_err(|e| e.to_string())?;
        let decrypted_path = temp_dir.join("temp_output.dec");
        decrypt_file(&output_path, &decrypted_path, &key)?;
        result_text = fs::read_to_string(&decrypted_path).await.map_err(|e| e.to_string())?;

        if input.save_template && input.action == "anonymize" {
            if let Some(items) = result["items"].as_array() {
                let mappings: Vec<MappingItem> = items
                    .iter()
                    .cloned()
                    .map(serde_json::from_value)
                    .collect::<Result<_, _>>().map_err(|e| e.to_string())?;
                let db = get_secure_db(&app)?;
                let template_name = input.template_name.unwrap_or(format!("template_{}", Utc::now().timestamp()));
                let mappings_json = serde_json::to_string(&mappings).map_err(|e| e.to_string())?;
                db.execute(
                    "INSERT INTO templates (name, mappings) VALUES (?1, ?2)",
                    params![template_name, mappings_json],
                ).map_err(|e| e.to_string())?;
                template_id = Some(db.last_insert_rowid() as i32);
            }
        }
        println!("Text processing successful");
    } else {
        let error = String::from_utf8_lossy(&output.stderr).to_string();
        println!("Text processing error: {}", error);
        return Ok(ProcessOutput {
            result: "".to_string(),
            output_paths: Vec::new(),
            template_id: None,
            error: Some(error),
        });
    }

    Ok(ProcessOutput {
        result: result_text,
        output_paths: vec![output_path.to_string_lossy().to_string()],
        template_id,
        error: None,
    })
}

#[command]
async fn get_templates(app: AppHandle) -> Result<Vec<Template>, String> {
    println!("Fetching templates");
    let db = get_secure_db(&app)?;
    let mut stmt = db
        .prepare("SELECT id, name, mappings FROM templates")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
    let mut templates = Vec::new();
    while let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let id: i32 = row.get(0).map_err(|e| e.to_string())?;
        let name: String = row.get(1).map_err(|e| e.to_string())?;
        let mappings_json: String = row.get(2).map_err(|e| e.to_string())?;
        let mappings: Vec<MappingItem> = serde_json::from_str(&mappings_json).map_err(|e| e.to_string())?;
        templates.push(Template { id, name, mappings });
    }
    println!("Fetched {} templates", templates.len());
    Ok(templates)
}

fn main() {
    println!("Starting Tauri application");
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![login, process_files, process_text, get_templates])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}