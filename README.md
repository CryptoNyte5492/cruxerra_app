# Cruxerra desktop release

Cruxerra is an Electron app that starts a local Django server.  Each installed
copy stores its database and uploaded CSV files in the signed-in Windows user's
application-data folder; no separate server or PostgreSQL installation is
needed for a coach.

## Build a Windows installer

Run these commands on a Windows computer, from a fresh copy of this project.
Install current Python 3 and Node.js first.

```powershell
cd backend
./build_windows.ps1
cd ../frontend
npm ci
npm run build:win
```

Send the generated installer in `frontend/release` to the coach.  It installs
Cruxerra and creates a normal Start-menu application entry.

The generated `backend/dist/CruxerraBackend.exe` must be built on Windows. A
Mac executable cannot run on Windows, and PyInstaller does not cross-compile
it reliably.

## First use

The coach creates an account and uploads CSVs. Sign in uses the email address
entered at registration. The app is completely local, so its users and data
do not sync between computers.
