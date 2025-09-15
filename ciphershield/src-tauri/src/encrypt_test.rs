use ring::rand::{SecureRandom, SystemRandom};
use ring::aead::{LessSafeKey, Nonce, UnboundKey, AES_256_GCM, Aad};
use std::fs::File;
use std::io::{Read, Write};
use std::process::{Command, Stdio};

fn encrypt_test_file(input_path: &str, output_path: &str, key_hex: &str) -> Result<(), String> {
    let key_bytes = hex::decode(key_hex).map_err(|e| format!("Invalid key: {}", e))?;
    if key_bytes.len() != 32 {
        return Err("Key must be 32 bytes".to_string());
    }

    let rng = SystemRandom::new();
    let mut nonce_bytes = [0u8; 12];
    rng.fill(&mut nonce_bytes).map_err(|e| e.to_string())?;
    let nonce = Nonce::assume_unique_for_key(nonce_bytes);
    let key = LessSafeKey::new(UnboundKey::new(&AES_256_GCM, &key_bytes).map_err(|e| e.to_string())?);

    let mut file_in = File::open(input_path).map_err(|e| e.to_string())?;
    let mut contents = Vec::new();
    file_in.read_to_end(&mut contents).map_err(|e| e.to_string())?;
    let tag = key.seal_in_place_separate_tag(nonce, Aad::empty(), &mut contents).map_err(|e| e.to_string())?;

    let mut file_out = File::create(output_path).map_err(|e| e.to_string())?;
    file_out.write_all(&nonce_bytes).map_err(|e| e.to_string())?;
    file_out.write_all(&contents).map_err(|e| e.to_string())?;
    file_out.write_all(tag.as_ref()).map_err(|e| e.to_string())?;
    println!("Encrypted {} to {}", input_path, output_path);
    Ok(())
}

fn main() {
    let key_hex = "51da1baa9b9f1f509a2846d9f296c75f73d26413964273aa27dd361ec610fccb";
    let input_path = "../../cipherengine/test.pdf";
    let output_path = "../../cipherengine/test.enc";
    let original_ext = "pdf";

    if let Err(e) = encrypt_test_file(input_path, output_path, key_hex) {
        eprintln!("Error encrypting file: {}", e);
        return;
    }

    // Test engine.py with the encrypted file
    let python_input = serde_json::json!({
        "action": "anonymize",
        "input_path": output_path,
        "output_path": "../../cipherengine/test.out",
        "password": key_hex,
        "chunk_size": 1048576,
        "original_ext": original_ext
    });
    let input_json = serde_json::to_string(&python_input).expect("Failed to serialize input");

    let output = Command::new("../../cipherengine/.venv/bin/python")
        .arg("../../cipherengine/engine.py")
        .arg(input_json)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .expect("Failed to execute Python");

    println!("Python stdout: {}", String::from_utf8_lossy(&output.stdout));
    println!("Python stderr: {}", String::from_utf8_lossy(&output.stderr));
}