import sys
import json
import os
import csv
import xml.etree.ElementTree as ET
import pdftotext
import io
import traceback
from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern
from presidio_analyzer.nlp_engine import SpacyNlpEngine
from presidio_anonymizer import AnonymizerEngine
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
import ssl
import spacy

app = FastAPI()

# Determine base path for bundled resources (handles PyInstaller)
if getattr(sys, 'frozen', False):
    base_path = sys._MEIPASS
else:
    base_path = os.path.dirname(os.path.abspath(__file__))
print(f"[DEBUG] Base path: {base_path}", file=sys.stderr)

# Pre-load the spaCy model
model_name = 'en_core_web_lg'
model_path = os.path.join(base_path, model_name)
print(f"[DEBUG] Attempting to load spaCy model: {model_name} from {model_path}", file=sys.stderr)
try:
    if getattr(sys, 'frozen', False):
        # In bundled mode, find the version-specific subdirectory
        import os
        subdirs = [d for d in os.listdir(model_path) if d.startswith(f"{model_name}-")]
        if not subdirs:
            raise OSError(f"No version directory found in {model_path}")
        version_path = os.path.join(model_path, subdirs[0])
        nlp = spacy.load(version_path, disable=['parser', 'ner'])
        print("[DEBUG] spaCy model loaded successfully from version path", file=sys.stderr)
    else:
        nlp = spacy.load(model_name, disable=['parser', 'ner'])
        print("[DEBUG] spaCy model loaded successfully via model name", file=sys.stderr)
except Exception as e:
    print(f"[ERROR] Failed to load spaCy model: {str(e)}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    raise
# Custom SpacyNlpEngine to use the preloaded model
class LoadedSpacyNlpEngine(SpacyNlpEngine):
    def __init__(self, loaded_spacy_model):
        super().__init__({"en": loaded_spacy_model})
        self.nlp = {"en": loaded_spacy_model}

# Initialize engines with the preloaded model
try:
    loaded_nlp_engine = LoadedSpacyNlpEngine(loaded_spacy_model=nlp)
    print("[DEBUG] LoadedSpacyNlpEngine initialized", file=sys.stderr)
    analyzer = AnalyzerEngine(nlp_engine=loaded_nlp_engine)
    print("[DEBUG] AnalyzerEngine initialized", file=sys.stderr)
    anonymizer = AnonymizerEngine()
    print("[DEBUG] AnonymizerEngine initialized", file=sys.stderr)
except Exception as e:
    print(f"[ERROR] Engine initialization failed: {str(e)}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    raise

class ProcessTextRequest(BaseModel):
    text: str
    action: str
    mappings: list = None
    custom_recognizers: list = None

class ProcessFileRequest(BaseModel):
    input_path: str
    output_path: str
    action: str
    password: str
    mappings: list = None
    chunk_size: int = 1024 * 1024
    original_ext: str = None
    custom_recognizers: list = None

def process_text(text: str, action: str, mappings: list = None, custom_recognizers: list = None) -> dict:
    try:
        print(f"[DEBUG] Processing text with action: {action}", file=sys.stderr)
        analyzer_local = AnalyzerEngine(nlp_engine=loaded_nlp_engine)
        if custom_recognizers:
            for cr in custom_recognizers:
                pattern = Pattern(name=cr['entity_type'], regex=cr['pattern'], score=cr.get('confidence', 0.8))
                recognizer = PatternRecognizer(supported_entity=cr['entity_type'], patterns=[pattern])
                analyzer_local.registry.add_recognizer(recognizer)
        if action == "anonymize":
            results = analyzer_local.analyze(text=text, language='en')
            score_map = { (result.start, result.end): result.score for result in results }
            anonymized = anonymizer.anonymize(text=text, analyzer_results=results)
            items = [
                {
                    "original": text[item.start:item.end],
                    "anonymized": item.text,
                    "pii_type": item.entity_type,
                    "confidence": score_map.get((item.start, item.end), 0.0)
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
    except Exception as e:
        print(f"[ERROR] process_text failed: {str(e)}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        raise

def decrypt_data(encrypted_data: bytes, key: bytes) -> bytes:
    try:
        print(f"[DEBUG] Decrypting data (len={len(encrypted_data)})", file=sys.stderr)
        if len(encrypted_data) < 28:
            raise ValueError("Invalid encrypted data format")
        nonce = encrypted_data[:12]
        ct_tag = encrypted_data[12:]
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(nonce, ct_tag, None)
    except Exception as e:
        print(f"[ERROR] decrypt_data failed: {str(e)}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        raise

def encrypt_data(plaintext: bytes, key: bytes) -> bytes:
    try:
        print(f"[DEBUG] Encrypting data (len={len(plaintext)})", file=sys.stderr)
        nonce = os.urandom(12)
        aesgcm = AESGCM(key)
        ct_tag = aesgcm.encrypt(nonce, plaintext, None)
        return nonce + ct_tag
    except Exception as e:
        print(f"[ERROR] encrypt_data failed: {str(e)}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        raise

def process_file(input_path: str, output_path: str, action: str, password: str, mappings: list = None, chunk_size: int = 1024 * 1024, original_ext: str = None, custom_recognizers: list = None) -> dict:
    try:
        print(f"[DEBUG] Processing file: {input_path} -> {output_path}, action={action}, original_ext={original_ext}", file=sys.stderr)
        key = bytes.fromhex(password)
        print(f"[DEBUG] Key length: {len(key)}", file=sys.stderr)
        with open(input_path, "rb") as f:
            encrypted = f.read()
        print(f"[DEBUG] Read {len(encrypted)} bytes from {input_path}", file=sys.stderr)
        decrypted_bytes = decrypt_data(encrypted, key)
        print(f"[DEBUG] Decrypted {len(decrypted_bytes)} bytes", file=sys.stderr)
        ext = original_ext.lower() if original_ext else os.path.splitext(input_path)[1].lower()
        ext = ext.lstrip('.')
        print(f"[DEBUG] Normalized file extension: {ext}", file=sys.stderr)
        processed_text = ""
        items = []
        if ext == "pdf":
            print(f"[DEBUG] Processing PDF", file=sys.stderr)
            try:
                pdf_file = io.BytesIO(decrypted_bytes)
                pdf = pdftotext.PDF(pdf_file)
                text = "\n".join(pdf)
                print(f"[DEBUG] Extracted text from PDF: {len(text)} chars", file=sys.stderr)
                result = process_text(text, action, mappings, custom_recognizers)
                processed_text = result["text"]
                items = result["items"]
            except Exception as e:
                print(f"[ERROR] PDF processing failed: {str(e)}", file=sys.stderr)
                traceback.print_exc(file=sys.stderr)
                raise
        elif ext == "csv":
            print(f"[DEBUG] Processing CSV", file=sys.stderr)
            decrypted_text = decrypted_bytes.decode('utf-8')
            reader = csv.reader(decrypted_text.splitlines())
            processed_rows = []
            for row in reader:
                processed_row = []
                for cell in row:
                    result = process_text(cell, action, mappings, custom_recognizers)
                    processed_row.append(result["text"])
                    items.extend(result["items"])
                processed_text += ",".join(processed_row) + "\n"
        elif ext in ["json", "xml", "txt"]:
            print(f"[DEBUG] Processing {ext}", file=sys.stderr)
            decrypted_text = decrypted_bytes.decode('utf-8')
            result = process_text(decrypted_text, action, mappings, custom_recognizers)
            processed_text = result["text"]
            items = result["items"]
        else:
            raise ValueError(f"Unsupported file format: {ext}")
        print(f"[DEBUG] Encrypting output (len={len(processed_text)} chars)", file=sys.stderr)
        encrypted_output = encrypt_data(processed_text.encode('utf-8'), key)
        with open(output_path, "wb") as f:
            f.write(encrypted_output)
        print(f"[DEBUG] Wrote encrypted output to {output_path}", file=sys.stderr)
        return {"output_path": output_path, "items": items}
    except Exception as e:
        print(f"[ERROR] process_file failed: {str(e)}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        raise

@app.post("/process_text")
async def process_text_endpoint(request: ProcessTextRequest):
    try:
        result = process_text(request.text, request.action, request.mappings, request.custom_recognizers)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process_file")
async def process_file_endpoint(request: ProcessFileRequest):
    try:
        result = process_file(request.input_path, request.output_path, request.action, request.password, request.mappings, request.chunk_size, request.original_ext, request.custom_recognizers)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print("[DEBUG] Starting Uvicorn server", file=sys.stderr)
    print(f"[DEBUG] SSL files exist: key={os.path.exists(os.path.join(base_path, 'key.pem'))}, cert={os.path.exists(os.path.join(base_path, 'cert.pem'))}", file=sys.stderr)
    uvicorn.run(
        app,  # Use the app object directly
        host="0.0.0.0",
        port=8000,
        ssl_keyfile=os.path.join(base_path, "key.pem"),
        ssl_certfile=os.path.join(base_path, "cert.pem"),
        reload=False,
        log_level="debug"
    )