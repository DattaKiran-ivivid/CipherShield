use std::fs::{File, create_dir_all};
use std::io::{Read, Write};
use std::path::PathBuf;
use ring::aead::{LessSafeKey, Nonce, NONCE_LEN, UnboundKey, AES_256_GCM, Aad, Tag};
use ring::rand::{SecureRandom, SystemRandom};
use tauri::{command, AppHandle, Manager};
use tracing::info;
use tokio::fs;
use chrono::Utc;
use hex;
use rusqlite::params;
use serde_json;
use crate::db::{get_secure_db, insert_template};
use crate::models::{FileInput, TextInput, ProcessOutput, MappingItem};
use reqwest::Client;

async fn get_client() -> Result<Client, String> {
    reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| e.to_string())
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


// Processes multiple files with anonymization or deanonymization
#[command]
pub async fn process_files(app: AppHandle, input: FileInput) -> Result<ProcessOutput, String> {
    info!("Processing files: {:?}", input.files);
    let db = get_secure_db(&app).map_err(|e| e.to_string())?;
    let mut output_paths = Vec::new();
    let mut mappings = if let Some(id) = input.template_id {
        let mappings_json: String = db
            .query_row(
                "SELECT mappings FROM templates WHERE id = ?1",
                params![id],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        serde_json::from_str(&mappings_json).map_err(|e| e.to_string())?
    } else {
        Vec::new()
    };
    let client = get_client().await?;
    for input_path in input.files {
        let rng = SystemRandom::new();
        let mut key = [0u8; 32];
        rng.fill(&mut key).map_err(|e| e.to_string())?;
        let temp_dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?.join("temp");
        create_dir_all(&temp_dir).map_err(|e| e.to_string())?;
        let encrypted_path = temp_dir.join("temp_input.enc");
        encrypt_file(&input_path, &encrypted_path, &key)?;
        let output_path = temp_dir.join("temp_output.enc");
        let original_ext = input_path.extension().and_then(|os| os.to_str()).unwrap_or("").to_string();
        let body = serde_json::json!({
            "action": input.action,
            "input_path": encrypted_path.to_string_lossy().into_owned(),
            "output_path": output_path.to_string_lossy().into_owned(),
            "password": hex::encode(key),
            "mappings": mappings,
            "chunk_size": 1048576,
            "original_ext": original_ext,
            "custom_recognizers": vec![] as Vec<serde_json::Value>
        });
        let response = client
            .post("https://127.0.0.1:8000/process_file")
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if response.status().is_success() {
            let json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
            let dec_path = temp_dir.join("dec.out");
            decrypt_file(&output_path, &dec_path, &key)?;
            output_paths.push(dec_path.to_string_lossy().to_string());
            if input.action == "anonymize" {
                if let Some(new_items) = json["items"].as_array() {
                    let new_mappings: Vec<MappingItem> = new_items
                        .iter()
                        .cloned()
                        .map(serde_json::from_value)
                        .collect::<Result<_, _>>()
                        .map_err(|e| e.to_string())?;
                    mappings.extend(new_mappings);
                }
            }
        } else {
            let err_text = response.text().await.map_err(|e| e.to_string())?;
            return Err(err_text);
        }
    }
    let template_id = if input.save_template && input.action == "anonymize" {
        let name = input.template_name.unwrap_or(format!("template_{}", Utc::now().timestamp()));
        let mappings_json = serde_json::to_string(&mappings).map_err(|e| e.to_string())?;
        let custom_recognizers_json = serde_json::to_string(&Vec::<crate::models::CustomRecognizer>::new()).map_err(|e| e.to_string())?;
        Some(insert_template(&db, &name, &mappings_json, &custom_recognizers_json).map_err(|e| e.to_string())?)
    } else {
        None
    };
    Ok(ProcessOutput { 
        result: "Success".to_string(), 
        output_paths, 
        template_id, 
        error: None, 
        items: mappings 
    })
}

// Processes text input with anonymization or deanonymization
#[command]
pub async fn process_text(app: AppHandle, input: TextInput) -> Result<ProcessOutput, String> {
    info!("Processing text");
    let db = get_secure_db(&app).map_err(|e| e.to_string())?;
    let rng = SystemRandom::new();
    let mut key = [0u8; 32];
    rng.fill(&mut key).map_err(|e| e.to_string())?;
    let temp_dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?.join("temp");
    create_dir_all(&temp_dir).map_err(|e| e.to_string())?;
    let input_path = temp_dir.join("temp_input.txt");
    fs::write(&input_path, input.text.as_bytes()).await.map_err(|e| e.to_string())?;
    let encrypted_path = temp_dir.join("temp_input.enc");
    encrypt_file(&input_path, &encrypted_path, &key)?;
    let output_path = temp_dir.join("temp_output.enc");
    let body = serde_json::json!({
        "action": input.action,
        "input_path": encrypted_path.to_string_lossy().into_owned(),
        "output_path": output_path.to_string_lossy().into_owned(),
        "password": hex::encode(key),
        "mappings": vec![] as Vec<serde_json::Value>,
        "chunk_size": 1048576,
        "original_ext": "txt",
        "custom_recognizers": input.custom_recognizers
    });
    let client = get_client().await?;
    let response = client
        .post("https://127.0.0.1:8000/process_file")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let mut template_id = None;
    let result_text;
    let mut items: Vec<MappingItem> = Vec::new();
    if response.status().is_success() {
        let json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
        let dec_path = temp_dir.join("dec.out");
        decrypt_file(&output_path, &dec_path, &key)?;
        result_text = fs::read_to_string(&dec_path).await.map_err(|e| e.to_string())?;
        if input.save_template && input.action == "anonymize" {
            items = serde_json::from_value(json["items"].clone()).map_err(|e| e.to_string())?;
            let name = input.template_name.unwrap_or(format!("template_{}", Utc::now().timestamp()));
            let mappings_json = serde_json::to_string(&items).map_err(|e| e.to_string())?;
            let custom_recognizers_json = serde_json::to_string(&input.custom_recognizers).map_err(|e| e.to_string())?;
            template_id = Some(insert_template(&db, &name, &mappings_json, &custom_recognizers_json).map_err(|e| e.to_string())?);
        }
    } else {
        let err_text = response.text().await.map_err(|e| e.to_string())?;
        return Err(err_text);
    }
    Ok(ProcessOutput { 
        result: result_text, 
        output_paths: vec![], 
        template_id, 
        error: None, 
        items 
    })
}