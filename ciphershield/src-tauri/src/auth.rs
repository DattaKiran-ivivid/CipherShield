use rusqlite::{params, Connection, Result as SqlResult, OptionalExtension};
use std::fs::create_dir_all;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, command};
use tracing::info;
use ring::pbkdf2;
use hex;
use std::num::NonZeroU32;
use crate::models::{Template, MappingItem, CustomRecognizer, ProcessedFile};

// Opens and initializes a secure SQLite database in the app's local data directory
pub fn get_secure_db(app_handle: &AppHandle) -> SqlResult<Connection> {
    let data_dir = app_handle.path().app_local_data_dir().unwrap_or(PathBuf::from("."));
    info!("Data directory: {:?}", data_dir);
    create_dir_all(&data_dir).map_err(|_| rusqlite::Error::ExecuteReturnedResults)?;
    let db_path = data_dir.join("secure.db");
    info!("Opening DB at: {:?}", db_path);
    let conn = Connection::open(&db_path)?;
    init_schema(&conn)?;
    info!("DB initialized");
    Ok(conn)
}

// Creates the database schema with users, templates, and processed_files tables
fn init_schema(conn: &Connection) -> SqlResult<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS users (
            email TEXT PRIMARY KEY,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL
        );",
        [],
    )?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            mappings TEXT NOT NULL,
            custom_recognizers TEXT NOT NULL DEFAULT '[]'
        );",
        [],
    )?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS processed_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            path TEXT NOT NULL,
            timestamp TEXT NOT NULL
        );",
        [],
    )?;
    Ok(())
}

// Inserts a new user into the users table with email, hashed password, and salt
pub fn insert_user(conn: &Connection, email: &str, hash: &str, salt: &str) -> SqlResult<()> {
    conn.execute(
        "INSERT OR IGNORE INTO users (email, password_hash, salt) VALUES (?1, ?2, ?3)",
        params![email, hash, salt],
    )?;
    Ok(())
}

// Retrieves the password hash and salt for a user by email, if they exist
pub fn get_user_hash_salt(conn: &Connection, email: &str) -> SqlResult<Option<(String, String)>> {
    conn.query_row(
        "SELECT password_hash, salt FROM users WHERE email = ?1",
        params![email],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )
    .optional()
}

// Inserts a new template into the templates table with name, mappings, and custom recognizers
pub fn insert_template(conn: &Connection, name: &str, mappings_json: &str, custom_recognizers_json: &str) -> SqlResult<i32> {
    conn.execute(
        "INSERT INTO templates (name, mappings, custom_recognizers) VALUES (?1, ?2, ?3)",
        params![name, mappings_json, custom_recognizers_json],
    )?;
    Ok(conn.last_insert_rowid() as i32)
}

// Retrieves all templates from the templates table
pub fn get_templates(conn: &Connection) -> SqlResult<Vec<Template>> {
    let mut stmt = conn.prepare("SELECT id, name, mappings, custom_recognizers FROM templates")?;
    let templates = stmt.query_map([], |row| {
        let id: i32 = row.get(0)?;
        let name: String = row.get(1)?;
        let mappings_json: String = row.get(2)?;
        let custom_recognizers_json: String = row.get(3)?;
        let mappings: Vec<MappingItem> = serde_json::from_str(&mappings_json).unwrap_or_default();
        let custom_recognizers: Vec<CustomRecognizer> = serde_json::from_str(&custom_recognizers_json).unwrap_or_default();
        Ok(Template { id, name, mappings, custom_recognizers })
    })?
    .collect::<Result<_, _>>()?;
    Ok(templates)
}

// Inserts a processed file record into the processed_files table
pub fn insert_processed_file(conn: &Connection, name: &str, path: &str, timestamp: &str) -> SqlResult<()> {
    conn.execute(
        "INSERT INTO processed_files (name, path, timestamp) VALUES (?1, ?2, ?3)",
        params![name, path, timestamp],
    )?;
    Ok(())
}

// Retrieves all processed files from the processed_files table
pub fn get_processed_files(conn: &Connection) -> SqlResult<Vec<ProcessedFile>> {
    let mut stmt = conn.prepare("SELECT id, name, path, timestamp FROM processed_files")?;
    let files = stmt.query_map([], |row| {
        Ok(ProcessedFile {
            id: row.get(0)?,
            name: row.get(1)?,
            path: row.get(2)?,
            timestamp: row.get(3)?,
        })
    })?
    .collect::<Result<_, _>>()?;
    Ok(files)
}

// Renames a processed file record in the processed_files table
pub fn rename_processed_file(conn: &Connection, id: i32, new_name: &str) -> SqlResult<()> {
    conn.execute(
        "UPDATE processed_files SET name = ?1 WHERE id = ?2",
        params![new_name, id],
    )?;
    Ok(())
}

// Authenticates a user by verifying their password against the stored hash
#[command]
pub async fn login(app: AppHandle, input: crate::models::LoginInput) -> Result<crate::models::LoginOutput, String> {
    let db = get_secure_db(&app).map_err(|e| e.to_string())?;
    let salt: Option<String> = db
        .query_row(
            "SELECT salt FROM users WHERE email = ?1",
            params![input.email],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    match salt {
        Some(salt) => {
            let salt_bytes = hex::decode(salt).map_err(|e| e.to_string())?;
            let stored_hash: String = db
                .query_row(
                    "SELECT password_hash FROM users WHERE email = ?1",
                    params![input.email],
                    |row| row.get(0),
                )
                .map_err(|e| e.to_string())?;
            let mut hash = [0u8; 32];
            pbkdf2::derive(
                pbkdf2::PBKDF2_HMAC_SHA256,
                NonZeroU32::new(100000).unwrap(),
                &salt_bytes,
                input.password.as_bytes(),
                &mut hash,
            );
            if hex::encode(hash) == stored_hash {
                Ok(crate::models::LoginOutput { success: true, error: None })
            } else {
                Ok(crate::models::LoginOutput { success: false, error: Some("Invalid credentials".to_string()) })
            }
        }
        None => Ok(crate::models::LoginOutput { success: false, error: Some("User not found".to_string()) }),
    }
}