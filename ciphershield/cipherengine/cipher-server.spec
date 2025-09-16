from PyInstaller.utils.hooks import collect_data_files, collect_submodules
import os

block_cipher = None
# Hardcode venv_path to avoid __file__ issue
venv_path = '/Users/dattakiran/Documents/Ivivid/New_ideas/CipherShield/ciphershield/cipherengine/.venv/lib/python3.13/site-packages'

a = Analysis(
    ['server.py'],
    pathex=['/Users/dattakiran/Documents/Ivivid/New_ideas/CipherShield/ciphershield/cipherengine'],  # Project directory
    binaries=[('/opt/homebrew/bin/pdftotext', '.')],  # Verify this path
    datas=[
        ('key.pem', '.'),
        ('cert.pem', '.'),
        *collect_data_files('presidio_analyzer', include_py_files=True),  # Include Presidio configs and .py files
        *collect_data_files('en_core_web_sm', include_py_files=True),     # Include spaCy model data
        *collect_data_files('en_core_web_lg', include_py_files=True),     # Include spaCy model data
    ],
    hiddenimports=[
        'presidio_analyzer',
        'presidio_anonymizer',
        'cryptography',
        'pdftotext',
        'spacy',
        'en_core_web_sm',
        'en_core_web_lg',
        'thinc',
        'cymem',
        'preshed',
        'blis',
        'srsly',
        'numpy',
        'fastapi',
        'uvicorn',
        'pydantic',
        'pydantic_core',
        *collect_submodules('spacy'),
        *collect_submodules('presidio_analyzer'),
        *collect_submodules('thinc'),
        *collect_submodules('blis'),
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='cipher-server',
    debug=True,  # Enable debug for verbose output
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,  # Disable UPX to avoid issues
    console=True,
)