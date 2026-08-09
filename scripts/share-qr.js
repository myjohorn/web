// Instant Mobile APK Downloader via Local Wi-Fi & QR Code
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const qrcode = require('qrcode-terminal');

const apkPath = path.resolve(__dirname, '../JohorN-Admin-v1.0.apk');

if (!fs.existsSync(apkPath)) {
    console.error('APK file not found. Please run "npm run build:apk" first.');
    process.exit(1);
}

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

const PORT = 8090;
const localIp = getLocalIp();
const downloadUrl = `http://${localIp}:${PORT}/JohorN-Admin-v1.0.apk`;

const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/JohorN-Admin-v1.0.apk') {
        const stat = fs.statSync(apkPath);
        res.writeHead(200, {
            'Content-Type': 'application/vnd.android.package-archive',
            'Content-Length': stat.size,
            'Content-Disposition': 'attachment; filename="JohorN-Admin-v1.0.apk"'
        });
        const readStream = fs.createReadStream(apkPath);
        readStream.pipe(res);
        console.log(`[${new Date().toLocaleTimeString()}] 스마트폰에서 APK 다운로드 요청이 수신되어 전송 중...`);
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log('\n======================================================');
    console.log('📱 스마트폰 카메라로 아래 QR 코드를 비추면 즉시 다운로드됩니다:');
    console.log(`🔗 직접 접속 URL: ${downloadUrl}`);
    console.log('======================================================\n');
    qrcode.generate(downloadUrl, { small: true });
    console.log('\n(다운로드가 끝나면 Ctrl+C 로 서버를 종료하실 수 있습니다)\n');
});
