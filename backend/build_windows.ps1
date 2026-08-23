$ErrorActionPreference = "Stop"

# Run this script in PowerShell from the backend folder on Windows.
py -m pip install --upgrade pip
py -m pip install -r requirements.txt pyinstaller
py -m PyInstaller --noconfirm --clean --onefile --name CruxerraBackend run_server.py
