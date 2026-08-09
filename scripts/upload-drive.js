const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const keyFilePath = path.resolve(__dirname, '../data/johorn-calendar-491bcabbd61c.json');
const apkFilePath = path.resolve(__dirname, '../JohorN-Admin-v1.0.apk');

async function main() {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: keyFilePath,
            scopes: ['https://www.googleapis.com/auth/drive']
        });

        const drive = google.drive({ version: 'v3', auth });

        console.log('1. Creating Shared Folder on Google Drive...');
        const folderMetadata = {
            name: 'JohorN Admin App (Android)',
            mimeType: 'application/vnd.google-apps.folder'
        };

        const folder = await drive.files.create({
            resource: folderMetadata,
            fields: 'id, webViewLink'
        });

        const folderId = folder.data.id;
        console.log(`Folder Created. ID: ${folderId}`);

        console.log('2. Setting Public Permission for Folder...');
        await drive.permissions.create({
            fileId: folderId,
            requestBody: {
                role: 'reader',
                type: 'anyone'
            }
        });

        console.log('3. Uploading JohorN-Admin-v1.0.apk into Folder...');
        const fileMetadata = {
            name: 'JohorN-Admin-v1.0.apk',
            parents: [folderId]
        };

        const media = {
            mimeType: 'application/vnd.android.package-archive',
            body: fs.createReadStream(apkFilePath)
        };

        const file = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, name, webViewLink, webContentLink'
        });

        console.log('\n======================================================');
        console.log('🎉 구글 드라이브 업로드 및 공유 링크 생성 완료!');
        console.log(`📁 공유 폴더 링크: https://drive.google.com/drive/folders/${folderId}`);
        console.log(`📥 APK 직접 다운로드/보기 링크: ${file.data.webViewLink}`);
        console.log('======================================================\n');
    } catch (err) {
        console.error('Google Drive API Error:', err.message);
        if (err.errors) console.error(err.errors);
        process.exit(1);
    }
}

main();
