use tauri::{command, AppHandle};
use crate::db;
use crate::models::Template;

// Retrieves all templates from the database
#[command]
pub async fn get_templates(app: AppHandle) -> Result<Vec<Template>, String> {
    let conn = db::get_secure_db(&app).map_err(|e| e.to_string())?;
    db::get_templates(&conn).map_err(|e| e.to_string())
}