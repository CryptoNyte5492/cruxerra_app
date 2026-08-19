const { app, BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const path = require("path");

let djangoProcess;

function startDjango() {
    const backendName =
        process.platform === "win32"
            ? "CruxerraBackend.exe"
            : "cruxerra-backend";

    const backendPath = path.join(
        process.resourcesPath,
        "backend",
        backendName
    );

    console.log("Starting Django:", backendPath);

    djangoProcess = spawn(backendPath, [], {
        shell: false
    });

    djangoProcess.stdout.on("data", (data) => {
        console.log(`Django: ${data}`);
    });

    djangoProcess.stderr.on("data", (data) => {
        console.error(`Django: ${data}`);
    });

    djangoProcess.on("error", (error) => {
        console.error("Failed to start Django:", error);
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
        path.join(app.getAppPath(), "dist", "index.html")
    );

    mainWindow.webContents.openDevTools();
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