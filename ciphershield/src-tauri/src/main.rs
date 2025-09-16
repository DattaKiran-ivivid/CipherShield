#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

mod models;
mod db;
mod auth;
mod processing;
mod commands;

use tauri::Manager;
use tracing_subscriber;

// Initializes the Tauri application with plugins and command handlers
fn main() {
    tracing_subscriber::fmt::init();
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![auth::login, processing::process_files, processing::process_text, commands::get_templates])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}