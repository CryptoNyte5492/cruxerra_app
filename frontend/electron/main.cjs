const { app, BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const path = require("path");

let djangoProcess;
let viteProcess;

function startDjango() {
    djangoProcess = spawn(
        "python",
        ["manage.py", "runserver"],
        {
            cwd: path.resolve(__dirname, "../../backend"),
            shell: true
        }
    );

    djangoProcess.stdout.on("data", (data) => {
        console.log(`Django: ${data}`);
    });

    djangoProcess.stderr.on("data", (data) => {
        console.error(`Django: ${data}`);
    });
}

function startVite() {
    viteProcess = spawn(
        "npm",
        ["run", "dev"],
        {
            cwd: path.resolve(__dirname, ".."),
            shell: true
        }
    );

    viteProcess.stdout.on("data", (data) => {
        console.log(`Vite: ${data}`);
    });

    viteProcess.stderr.on("data", (data) => {
        console.error(`Vite: ${data}`);
    });
}

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        }
    });

    mainWindow.loadURL("http://localhost:5174");
    mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    startDjango();
    startVite();
    createWindow();
});