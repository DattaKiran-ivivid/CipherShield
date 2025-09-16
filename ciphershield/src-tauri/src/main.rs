#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

mod models;
mod db;
mod auth;
mod processing;
mod commands;

use tauri::Builder;
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;
use tracing_subscriber;

// Initializes the Tauri application with plugins and command handlers
fn main() {
    tracing_subscriber::fmt::init();
    Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![auth::login, processing::process_files, processing::process_text, commands::get_templates])
        .setup(|app| {
            let sidecar_command = app.shell().sidecar("cipher-server").unwrap();
            let (mut rx, _child) = sidecar_command
                .spawn()
                .expect("failed to spawn sidecar");
            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line_bytes) => println!("Server stdout: {}", String::from_utf8_lossy(&line_bytes)),
                        CommandEvent::Stderr(line_bytes) => println!("Server stderr: {}", String::from_utf8_lossy(&line_bytes)),
                        _ => {}
                    }
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}