/**
 * AgentsHUB Launcher — System Tray + Server Manager
 * Port 3434 → otomatik artış, tarayıcı açma, tray ikonu
 */
import { spawn, exec } from 'child_process';
import { createServer } from 'net';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.join(__dirname, 'app');
const NODE_EXE = path.join(__dirname, 'node', 'node.exe');
const PREFERRED_PORT = 3434;
const PORT_FILE = path.join(__dirname, '.port');
const PID_FILE = path.join(__dirname, '.pid');

let serverProcess = null;

function findPort(startPort) {
    return new Promise((resolve) => {
        const server = createServer();
        server.listen(startPort, () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        server.on('error', () => resolve(findPort(startPort + 1)));
    });
}

async function startServer() {
    const port = await findPort(PREFERRED_PORT);
    fs.writeFileSync(PORT_FILE, String(port));

    const env = {
        ...process.env,
        UI_PORT: String(port),
        NODE_ENV: 'production'
    };

    serverProcess = spawn(NODE_EXE, ['src/gateway/ui_server.js'], {
        cwd: APP_DIR,
        env,
        stdio: ['pipe', 'pipe', 'pipe']
    });

    fs.writeFileSync(PID_FILE, String(serverProcess.pid));
    const url = `http://localhost:${port}`;

    let ready = false;
    serverProcess.stdout.on('data', (data) => {
        const msg = data.toString();
        if (!ready && msg.includes('running on')) {
            ready = true;
            console.log(`[AgentsHUB] Server aktif: ${url}`);
            exec(`start "" "${url}"`);
            startTray(port);
        }
    });

    serverProcess.stderr.on('data', (data) => {
        const logDir = path.join(__dirname, 'logs');
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
        fs.appendFileSync(path.join(logDir, 'error.log'), data.toString());
    });

    serverProcess.on('exit', (code) => {
        console.log(`[AgentsHUB] Server kapandı (code: ${code})`);
        cleanup();
    });

    return port;
}

function stopServer() {
    if (serverProcess) { serverProcess.kill('SIGTERM'); serverProcess = null; }
    cleanup();
}

function cleanup() {
    try { fs.unlinkSync(PORT_FILE); } catch {}
    try { fs.unlinkSync(PID_FILE); } catch {}
}

function startTray(port) {
    const iconPath = path.join(__dirname, 'icon.ico').replace(/\\/g, '\\\\');
    const pidFilePath = PID_FILE.replace(/\\/g, '\\\\');
    const url = `http://localhost:${port}`;

    const ps1 = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Visible = $true
$notify.Text = "AgentsHUB - Port ${port}"
if (Test-Path "${iconPath}") { $notify.Icon = New-Object System.Drawing.Icon("${iconPath}") }
else { $notify.Icon = [System.Drawing.SystemIcons]::Application }
$menu = New-Object System.Windows.Forms.ContextMenuStrip
$header = $menu.Items.Add("AgentsHUB v1.0")
$header.Enabled = $false
$header.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$menu.Items.Add("-")
$openItem = $menu.Items.Add("Dashboard")
$openItem.add_Click({ Start-Process "${url}" })
$menu.Items.Add("-")
$resetItem = $menu.Items.Add("Yeniden Baslat")
$resetItem.add_Click({
    $notify.ShowBalloonTip(2000, "AgentsHUB", "Yeniden baslatiliyor...", [System.Windows.Forms.ToolTipIcon]::Info)
    if (Test-Path "${pidFilePath}") { $p = Get-Content "${pidFilePath}"; Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }
})
$stopItem = $menu.Items.Add("Kapat")
$stopItem.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$stopItem.ForeColor = [System.Drawing.Color]::FromArgb(220, 60, 60)
$stopItem.add_Click({
    if (Test-Path "${pidFilePath}") { $p = Get-Content "${pidFilePath}"; Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }
    $notify.Visible = $false; $notify.Dispose(); [System.Windows.Forms.Application]::Exit()
})
$notify.ContextMenuStrip = $menu
$notify.add_DoubleClick({ Start-Process "${url}" })
$notify.ShowBalloonTip(3000, "AgentsHUB", "Sistem aktif! Port: ${port}", [System.Windows.Forms.ToolTipIcon]::Info)
[System.Windows.Forms.Application]::Run()
`;

    spawn('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-Command', ps1], {
        stdio: 'ignore', detached: true
    }).unref();
}

// MAIN
process.on('SIGTERM', stopServer);
process.on('SIGINT', stopServer);
process.on('exit', cleanup);

if (fs.existsSync(PID_FILE)) {
    const oldPid = fs.readFileSync(PID_FILE, 'utf8').trim();
    try {
        process.kill(parseInt(oldPid), 0);
        const oldPort = fs.existsSync(PORT_FILE) ? fs.readFileSync(PORT_FILE, 'utf8').trim() : '3434';
        console.log(`[AgentsHUB] Zaten çalışıyor (PID: ${oldPid}, Port: ${oldPort})`);
        exec(`start "" "http://localhost:${oldPort}"`);
        process.exit(0);
    } catch { cleanup(); }
}

console.log('[AgentsHUB] Başlatılıyor...');
startServer().then(() => {
    setInterval(() => {
        if (serverProcess && serverProcess.exitCode !== null) {
            console.log('[AgentsHUB] Server kapandı, launcher kapanıyor.');
            cleanup();
            process.exit(0);
        }
    }, 5000);
}).catch(err => {
    console.error('[AgentsHUB] Başlatma hatası:', err.message);
    process.exit(1);
});
