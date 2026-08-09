const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const keyFilePath = path.resolve(__dirname, '../data/johorn-calendar-491bcabbd61c.json');
const apkFilePath = path.resolve(__dirname, '../JohorN-Admin-v1.0.apk');
const TARGET_FOLDER_ID = '1I7HJbPjXTDpxEShlmUKgHwYfoF8NAazf';

async function uploadToDrive() {
    if (!fs.existsSync(apkFilePath)) {
        console.error(`[Error] APK file not found at: ${apkFilePath}`);
        process.exit(1);
    }

    if (!fs.existsSync(keyFilePath)) {
        console.error(`[Error] Service account key file not found at: ${keyFilePath}`);
        process.exit(1);
    }

    try {
        console.log('🔄 Google Drive 인증 및 연결 중...');
        const auth = new google.auth.GoogleAuth({
            keyFile: keyFilePath,
            scopes: ['https://www.googleapis.com/auth/drive']
        });

        const drive = google.drive({ version: 'v3', auth });

        console.log(`📂 대상 구글 드라이브 폴더 확인 중... (Folder ID: ${TARGET_FOLDER_ID})`);

        // Check if file already exists in folder
        const existingFiles = await drive.files.list({
            q: `'${TARGET_FOLDER_ID}' in parents and name = 'JohorN-Admin-v1.0.apk' and trashed = false`,
            fields: 'files(id, name, webViewLink, webContentLink)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true
        });

        const media = {
            mimeType: 'application/vnd.android.package-archive',
            body: fs.createReadStream(apkFilePath)
        };

        const stats = fs.statSync(apkFilePath);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`⬆️ APK 업로드 시작 (크기: ${fileSizeMB} MB)...`);

        let file;
        if (existingFiles.data.files && existingFiles.data.files.length > 0) {
            const existingFileId = existingFiles.data.files[0].id;
            console.log(`기존 파일 발견 (ID: ${existingFileId}). 최신 버전으로 덮어쓰기 업데이트합니다.`);

            file = await drive.files.update({
                fileId: existingFileId,
                media: media,
                fields: 'id, name, webViewLink, webContentLink',
                supportsAllDrives: true
            });
        } else {
            console.log('폴더에 신규 파일로 업로드합니다.');
            const fileMetadata = {
                name: 'JohorN-Admin-v1.0.apk',
                parents: [TARGET_FOLDER_ID]
            };

            file = await drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id, name, webViewLink, webContentLink',
                supportsAllDrives: true
            });
        }

        // Set permission to anyone with link can view/download
        try {
            await drive.permissions.create({
                fileId: file.data.id,
                requestBody: {
                    role: 'reader',
                    type: 'anyone'
                },
                supportsAllDrives: true
            });
        } catch (permErr) {
            // Permission may already be inherited from parent folder
        }

        console.log('\n======================================================');
        console.log('🎉 구글 드라이브 APK 자동 업로드 성공!');
        console.log(`📁 대상 폴더: https://drive.google.com/drive/folders/${TARGET_FOLDER_ID}`);
        console.log(`📥 APK 파일 링크: ${file.data.webViewLink}`);
        console.log('======================================================\n');
        return file.data;
    } catch (err) {
        console.error('\n❌ Google Drive API 오류:', err.message);
        if (err.errors) console.error(err.errors);
        console.error('\n[안내] 만약 권한 오류가 발생한다면:');
        console.error('1. Google Cloud Console에서 Drive API 활성화 여부를 확인하세요:');
        console.error('   https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=602247063209');
        console.error('2. 구글 드라이브 폴더에 서비스 계정이 [편집자]로 공유되었는지 확인하세요:');
        console.error('   gcal-sync-agent@johorn-calendar.iam.gserviceaccount.com\n');
        throw err;
    }
}

if (require.main === module) {
    uploadToDrive().catch(() => process.exit(1));
}

module.exports = uploadToDrive;
