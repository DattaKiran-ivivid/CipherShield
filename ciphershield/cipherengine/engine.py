import sys
import json
import os
import csv
import xml.etree.ElementTree as ET
import pdftotext
import json
from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend

analyzer = AnalyzerEngine()
anonymizer = AnonymizerEngine()

def derive_key(password: bytes) -> bytes:
    salt = b'static_salt_123456'  # In production, use dynamic salt from Rust
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
        backend=default_backend()
    )
    return kdf.derive(password)

def process_text(text: str, action: str, mappings: list = None) -> dict:
    cipher = Fernet(derive_key(b"temp_key"))  # Key passed from Rust
    if action == "anonymize":
        results = analyzer.analyze(text=text, language='en')
        anonymized = anonymizer.anonymize(text=text, analyzer_results=results)
        items = [
            {
                "original": text[item.start:item.end],
                "anonymized": item.text,
                "pii_type": item.entity_type,
                "confidence": item.score
            }
            for item in anonymized.items
        ]
        return {"text": anonymized.text, "items": items}
    elif action == "deanonymize" and mappings:
        result = text
        for item in mappings:
            result = result.replace(item["anonymized"], item["original"])
        return {"text": result, "items": []}
    else:
        raise ValueError("Invalid action or missing mappings")

def process_file(input_path: str, output_path: str, action: str, password: str, mappings: list = None, chunk_size: int = 1024 * 1024) -> dict:
    cipher = Fernet(derive_key(password.encode()))
    items = []
    
    # Determine file type
    ext = os.path.splitext(input_path)[1].lower()
    processed_text = ""

    if ext == ".pdf":
        with open(input_path, "rb") as f:
            pdf = pdftotext.PDF(cipher.decrypt(f.read()))
            text = "\n".join(pdf)
            result = process_text(text, action, mappings)
            processed_text = result["text"]
            items = result["items"]
    elif ext == ".csv":
        with open(input_path, "rb") as f:
            decrypted = cipher.decrypt(f.read()).decode('utf-8')
            reader = csv.reader(decrypted.splitlines())
            processed_rows = []
            for row in reader:
                processed_row = []
                for cell in row:
                    result = process_text(cell, action, mappings)
                    processed_rows.append(result["text"])
                    items.extend(result["items"])
                processed_text += ",".join(processed_row) + "\n"
    elif ext in [".json", ".xml", ".txt"]:
        with open(input_path, "rb") as f:
            decrypted = cipher.decrypt(f.read()).decode('utf-8')
            result = process_text(decrypted, action, mappings)
            processed_text = result["text"]
            items = result["items"]
    else:
        raise ValueError(f"Unsupported file format: {ext}")

    with open(output_path, "wb") as f:
        f.write(cipher.encrypt(processed_text.encode()))

    return {"output_path": output_path, "items": items}

if __name__ == "__main__":
    try:
        input_data = json.loads(sys.argv[1])
        action = input_data["action"]
        input_path = input_data["input_path"]
        output_path = input_data["output_path"]
        password = input_data["password"]
        mappings = input_data.get("mappings", [])
        chunk_size = input_data.get("chunk_size", 1024 * 1024)

        result = process_file(input_path, output_path, action, password, mappings, chunk_size)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))