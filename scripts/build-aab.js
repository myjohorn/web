// Script to build signed Google Play App Bundle (AAB) for JohorN
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const androidDir = path.join(rootDir, 'android');
const jdkPath = 'C:\\Users\\croh\\.jdks\\jdk21';
const androidSdkPath = path.join(process.env.LOCALAPPDATA || 'C:\\Users\\croh\\AppData\\Local', 'Android', 'Sdk');

console.log('--- Step 1: Building Web Assets ---');
require('./build-app');

console.log('\n--- Step 2: Syncing Capacitor Android ---');
const capSync = spawnSync('npx.cmd', ['cap', 'sync', 'android'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true
});

if (capSync.status !== 0) {
    console.error('Capacitor sync failed.');
    process.exit(1);
}

// Ensure custom launcher icons are applied
const logoPath = path.join(rootDir, 'temp', 'JohorN_logo.jpg');
if (fs.existsSync(logoPath)) {
    spawnSync('powershell', ['-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'generate-icons.ps1')], {
        cwd: rootDir,
        stdio: 'ignore'
    });
}

console.log('\n--- Step 3: Building Signed Release AAB (App Bundle) ---');
const env = {
    ...process.env,
    JAVA_HOME: fs.existsSync(jdkPath) ? jdkPath : process.env.JAVA_HOME,
    ANDROID_HOME: androidSdkPath
};

const gradlewCmd = process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew';
const gradleBuild = spawnSync(gradlewCmd, ['bundleRelease'], {
    cwd: androidDir,
    env: env,
    stdio: 'inherit',
    shell: true
});

if (gradleBuild.status !== 0) {
    console.error('Gradle bundleRelease failed.');
    process.exit(1);
}

const aabPath = path.join(androidDir, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
const releaseAabPath = path.join(rootDir, 'JohorN-release.aab');

if (fs.existsSync(aabPath)) {
    fs.copyFileSync(aabPath, releaseAabPath);
    const stats = fs.statSync(releaseAabPath);
    console.log('\n======================================================');
    console.log('🎉 구글 플레이스토어 업로드용 AAB (App Bundle) 빌드 완료!');
    console.log(`📂 생성된 AAB 파일: ${releaseAabPath}`);
    console.log(`📦 파일 크기: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
    console.log('======================================================\n');
} else {
    console.log('\n[알림] Gradle 빌드는 완료되었으나 AAB 경로를 확인해주세요:', aabPath);
}
