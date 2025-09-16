#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

mod models;
mod db;
mod auth;
mod processing;
mod commands;

use tauri::Builder;
use tauri_plugin_shell::process::{CommandEvent, CommandChild};
use tauri_plugin_shell::ShellExt;
use tracing_subscriber;
use std::sync::Mutex;
use tauri::{Manager, WindowEvent};
use std::process::{Command, Stdio};
use std::io::Read;

#[derive(Default)]
struct SidecarState {
    child: Mutex<Option<CommandChild>>,
}

#[cfg(target_family = "unix")]
fn kill_tree(pid: u32) {
    // Recursive kill children
    if let Ok(mut child_cmd) = Command::new("pgrep")
        .arg("-P")
        .arg(pid.to_string())
        .stdout(Stdio::piped())
        .spawn() {
        let mut output = String::new();
        if let Some(mut stdout) = child_cmd.stdout.take() {
            if stdout.read_to_string(&mut output).is_ok() {
                for line in output.lines() {
                    if let Ok(child_pid) = line.trim().parse::<u32>() {
                        kill_tree(child_pid);
                    }
                }
            }
        }
        let _ = child_cmd.wait();
    }
    // Kill the process
    let _ = Command::new("kill").arg("-9").arg(pid.to_string()).spawn();
}

#[cfg(target_os = "windows")]
fn kill_tree(pid: u32) {
    let _ = Command::new("taskkill").arg("/PID").arg(pid.to_string()).arg("/T").arg("/F").spawn();
}

// Initializes the Tauri application with plugins and command handlers
fn main() {
    tracing_subscriber::fmt::init();
    Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .manage(SidecarState::default())
        .invoke_handler(tauri::generate_handler![auth::login, processing::process_files, processing::process_text, commands::get_templates])
        .setup(|app| {
            let handle = app.handle().clone();  // Clone for use in event handlers
            let sidecar_command = app.shell().sidecar("cipher-server").unwrap();
            let (mut rx, child) = sidecar_command
                .spawn()
                .expect("failed to spawn sidecar");

            let state: tauri::State<SidecarState> = app.state();
            *state.child.lock().unwrap() = Some(child);

            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line_bytes) => println!("Server stdout: {}", String::from_utf8_lossy(&line_bytes)),
                        CommandEvent::Stderr(line_bytes) => println!("Server stderr: {}", String::from_utf8_lossy(&line_bytes)),
                        _ => {}
                    }
                }
            });

            let window = app.get_webview_window("main").expect("no main window");
            window.on_window_event(move |event| {
                if let WindowEvent::CloseRequested { .. } = event {
                    let state: tauri::State<SidecarState> = handle.state();
                    let mut guard = state.child.lock().unwrap();
                    if let Some(child) = guard.take() {
                        let pid = child.pid();
                        kill_tree(pid);
                        let _ = child.kill();  // Fallback
                    }
                    // No prevent_default() – let the app fully close
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}