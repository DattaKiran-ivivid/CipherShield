use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct User {
    pub email: String,
    pub password_hash: String,
}

#[derive(Deserialize)]
pub struct LoginInput {
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct LoginOutput {
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Deserialize)]
pub struct FileInput {
    pub files: Vec<std::path::PathBuf>,
    pub action: String,
    pub template_id: Option<i32>,
    pub save_template: bool,
    pub template_name: Option<String>,
}

#[derive(Deserialize)]
pub struct TextInput {
    pub text: String,
    pub action: String,
    pub save_template: bool,
    pub template_name: Option<String>,
    pub custom_recognizers: Vec<CustomRecognizer>,
}

#[derive(Serialize, Deserialize)]
pub struct CustomRecognizer {
    pub entity_type: String,
    pub pattern: String,
    pub score: f64,
}

#[derive(Serialize)]
pub struct ProcessOutput {
    pub result: String,
    pub output_paths: Vec<String>,
    pub template_id: Option<i32>,
    pub error: Option<String>,
    pub items: Vec<MappingItem>,
}

#[derive(Serialize, Deserialize)]
pub struct MappingItem {
    pub original: String,
    pub anonymized: String,
    pub pii_type: String,
    pub confidence: f64,
}

#[derive(Serialize, Deserialize)]
pub struct Template {
    pub id: i32,
    pub name: String,
    pub mappings: Vec<MappingItem>,
    pub custom_recognizers: Vec<CustomRecognizer>,
}

#[derive(Serialize)]
pub struct ProcessedFile {
    pub id: i32,
    pub name: String,
    pub path: String,
    pub timestamp: String,
}