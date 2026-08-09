// Script to build JohorN Admin Android APK
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

console.log('\n--- Step 3: Building Android APK with Gradle ---');
const env = {
    ...process.env,
    JAVA_HOME: fs.existsSync(jdkPath) ? jdkPath : process.env.JAVA_HOME,
    ANDROID_HOME: androidSdkPath
};

const gradlewCmd = process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew';
const gradleBuild = spawnSync(gradlewCmd, ['assembleDebug'], {
    cwd: androidDir,
    env: env,
    stdio: 'inherit',
    shell: true
});

if (gradleBuild.status !== 0) {
    console.error('Gradle assembleDebug failed.');
    process.exit(1);
}

const apkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const releaseApkPath = path.join(rootDir, 'JohorN-Admin-v1.0.apk');

if (fs.existsSync(apkPath)) {
    fs.copyFileSync(apkPath, releaseApkPath);
    const stats = fs.statSync(releaseApkPath);
    console.log('\n========================================');
    console.log('🎉 JohorN Admin 안드로이드 APK 빌드 완료!');
    console.log(`📂 복사된 APK 파일: ${releaseApkPath}`);
    console.log(`📦 파일 크기: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
    console.log('========================================\n');
} else {
    console.log('\n[알림] Gradle 빌드는 완료되었으나 APK 경로를 확인해주세요:', apkPath);
}
