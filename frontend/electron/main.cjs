const { app, BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

let djangoProcess;

function startDjango() {
    const userDataPath = path.join(app.getPath("userData"), "backend-data");
    fs.mkdirSync(userDataPath, { recursive: true });

    const backendPath = path.join(
        process.resourcesPath,
        "backend"
    );

    const djangoExe = path.join(
        backendPath,
        "CruxerraBackend.exe"
    );

    djangoProcess = spawn(djangoExe, [], {
        cwd: backendPath,
        windowsHide: true,
        env: {
            ...process.env,
            CRUXERRA_DATA_DIR: userDataPath,
        },
    });

    djangoProcess.stdout.on("data", (data) => {
        console.log(`Django: ${data}`);
    });

    djangoProcess.stderr.on("data", (data) => {
        console.error(`Django: ${data}`);
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

    mainWindow.loadFile(
        path.join(__dirname, "../dist/index.html")
    );

    // You can remove this before giving it to your coach.
    // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    startDjango();
    createWindow();
});

app.on("window-all-closed", () => {
    if (djangoProcess) {
        djangoProcess.kill();
    }

    if (process.platform !== "darwin") {
        app.quit();
    }
});
