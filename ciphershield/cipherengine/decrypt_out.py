import sys
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def decrypt_data(encrypted_data: bytes, key: bytes) -> bytes:
    if len(encrypted_data) < 28:  # 12 nonce + min 16 tag
        raise ValueError("Invalid encrypted data format")
    nonce = encrypted_data[:12]
    ct_tag = encrypted_data[12:]
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ct_tag, None)

def decrypt_file(input_path: str, key_hex: str, output_path: str = None):
    key = bytes.fromhex(key_hex)
    with open(input_path, "rb") as f:
        encrypted = f.read()
    decrypted_bytes = decrypt_data(encrypted, key)
    decrypted_text = decrypted_bytes.decode('utf-8', errors='ignore')  # Decode as text, ignore errors for binary-ish content
    
    if output_path:
        with open(output_path, "w") as f:
            f.write(decrypted_text)
        print(f"Decrypted content saved to {output_path}")
    else:
        print("Decrypted content:")
        print(decrypted_text)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python decrypt_out.py <input_path> <key_hex> [output_path]")
        sys.exit(1)
    
    input_path = sys.argv[1]
    key_hex = sys.argv[2]
    output_path = sys.argv[3] if len(sys.argv) > 3 else None
    
    decrypt_file(input_path, key_hex, output_path)