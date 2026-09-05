/**
 * Script to fetch and parse school admissions and invoices from Gmail (myjohorn@gmail.com)
 * Uses Google OAuth2 with googleapis library and pushes structured data to Firebase RTDB.
 *
 * Usage:
 *   node scripts/fetch-gmail-admissions.js
 *   node scripts/fetch-gmail-admissions.js --query="from:invictus.edu.my"
 *   node scripts/fetch-gmail-admissions.js --auto-save
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const readline = require('readline');
const { google } = require('googleapis');

const ROOT_DIR = path.resolve(__dirname, '..');
const CREDENTIALS_PATH = path.join(ROOT_DIR, 'oauth-credentials.json');
const TOKEN_PATH = path.join(ROOT_DIR, 'gmail-token.json');
const FIREBASE_BASE_URL = 'https://johorn-booking-default-rtdb.asia-southeast1.firebasedatabase.app';

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// Parse CLI arguments
const args = process.argv.slice(2);
const autoSave = args.includes('--auto-save');
const customQueryArg = args.find(a => a.startsWith('--query='));
const customQuery = customQueryArg ? customQueryArg.split('=')[1] : null;

// Helper: Ask user input in console
function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans.trim());
    }));
}

// 1. Get OAuth2 Client Credentials
async function getOAuth2Client() {
    let clientId = process.env.GMAIL_CLIENT_ID;
    let clientSecret = process.env.GMAIL_CLIENT_SECRET;
    let redirectUri = 'http://localhost:3000/oauth2callback';

    const possibleCredPaths = [
        CREDENTIALS_PATH,
        path.join(ROOT_DIR, 'credentials.json')
    ];

    for (const p of possibleCredPaths) {
        if (fs.existsSync(p)) {
            try {
                const raw = fs.readFileSync(p, 'utf8');
                const parsed = JSON.parse(raw);
                const key = parsed.installed || parsed.web || parsed;
                clientId = key.client_id || clientId;
                clientSecret = key.client_secret || clientSecret;
                if (parsed.installed) {
                    redirectUri = 'http://localhost:3000/oauth2callback';
                } else if (key.redirect_uris && key.redirect_uris.length > 0 && key.redirect_uris[0].startsWith('http://localhost:')) {
                    redirectUri = key.redirect_uris[0];
                }
                break;
            } catch (e) {
                console.warn('[Warning] Failed to parse credentials:', e.message);
            }
        }
    }

    if (!clientId || !clientSecret) {
        console.log('\n============================================================');
        console.log('🔑 Google Cloud OAuth2 인증 설정 안내 (최초 1회)');
        console.log('============================================================');
        console.log('Google Cloud Console(https://console.cloud.google.com)에서');
        console.log('1. [Gmail API] 활성화');
        console.log('2. [OAuth 2.0 클라이언트 ID] (데스크톱 앱 또는 웹 앱) 생성');
        console.log('3. 다운로드한 json을 프로젝트 루트에 "oauth-credentials.json"으로 저장하거나');
        console.log('   아래 프롬프트에 직접 입력해주세요.\n');

        clientId = await askQuestion('Client ID 입력: ');
        clientSecret = await askQuestion('Client Secret 입력: ');

        if (!clientId || !clientSecret) {
            console.error('❌ Client ID와 Secret이 입력되지 않아 종료합니다.');
            process.exit(1);
        }

        // Save for future convenience
        fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify({
            installed: {
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uris: [redirectUri]
            }
        }, null, 2));
        console.log(`✅ ${CREDENTIALS_PATH} 파일에 자격 증명이 저장되었습니다.`);
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    // Check if token exists
    if (fs.existsSync(TOKEN_PATH)) {
        try {
            const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
            oauth2Client.setCredentials(token);
            return oauth2Client;
        } catch (err) {
            console.warn('[Warning] Token parse error, re-authenticating...');
        }
    }

    // Authenticate via local server
    return await authenticateViaBrowser(oauth2Client, redirectUri);
}

// 2. Authenticate via Browser
function authenticateViaBrowser(oauth2Client, redirectUri) {
    return new Promise((resolve, reject) => {
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            prompt: 'consent'
        });

        const server = http.createServer(async (req, res) => {
            try {
                if (req.url.startsWith('/oauth2callback')) {
                    const parsedUrl = url.parse(req.url, true);
                    const code = parsedUrl.query.code;

                    if (code) {
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end('<h1>✅ Google 인증 성공!</h1><p>브라우저를 닫고 터미널로 돌아가세요.</p>');
                        server.close();

                        console.log('⏳ 토큰 교환 중...');
                        const { tokens } = await oauth2Client.getToken(code);
                        oauth2Client.setCredentials(tokens);
                        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
                        console.log(`✅ 인증 완료! 토큰이 ${TOKEN_PATH}에 저장되었습니다.\n`);
                        resolve(oauth2Client);
                    }
                }
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Authentication error: ' + e.message);
                reject(e);
            }
        }).listen(3000, () => {
            console.log('\n============================================================');
            console.log('🌐 Google 계정 (myjohorn@gmail.com) 로그인 인증 안내');
            console.log('============================================================');
            console.log('아래 링크를 웹 브라우저에서 열고 권한을 허용해주세요:\n');
            console.log(authUrl);
            console.log('\n(인증 완료 시 터미널이 자동으로 다음 작업을 진행합니다...)\n');
        });
    });
}

// 3. Extract text content from Gmail message payload
function getBodyFromMessage(message) {
    let body = '';
    const payload = message.payload;
    if (!payload) return '';

    if (payload.body && payload.body.data) {
        body += Buffer.from(payload.body.data, 'base64').toString('utf8');
    }

    if (payload.parts) {
        payload.parts.forEach(part => {
            if (part.body && part.body.data) {
                const text = Buffer.from(part.body.data, 'base64').toString('utf8');
                body += '\n' + text;
            }
            if (part.parts) {
                part.parts.forEach(subPart => {
                    if (subPart.body && subPart.body.data) {
                        body += '\n' + Buffer.from(subPart.body.data, 'base64').toString('utf8');
                    }
                });
            }
        });
    }

    // Strip HTML tags for clean text parsing
    return body.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
}

// 4. Intelligent Info Extraction from Email Body & Subject
function parseEmailForAdmission(subject, from, body, dateStr) {
    const combined = (subject + ' ' + body).replace(/\s+/g, ' ');

    // 1. Identify School Name
    let schoolName = 'Invictus International School (HH)';

    if (/invictus/i.test(from) || /invictus/i.test(combined) || /horizon\s*hills/i.test(combined)) {
        schoolName = 'Invictus International School (HH)';
    } else if (/marlborough/i.test(from) || /marlborough/i.test(combined)) {
        schoolName = 'Marlborough College Malaysia';
    } else if (/raffles/i.test(from) || /raffles/i.test(combined)) {
        schoolName = 'Raffles American School';
    } else if (/sunway/i.test(from) || /sunway/i.test(combined)) {
        schoolName = 'Sunway International School';
    } else if (/crescendo|chis/i.test(from) || /crescendo|chis/i.test(combined)) {
        schoolName = 'Crescendo-HELP International School';
    } else if (/shattuck|ssm/i.test(from) || /shattuck/i.test(combined)) {
        schoolName = "Shattuck-St. Mary's Forest City";
    } else if (/stellar/i.test(from) || /stellar/i.test(combined)) {
        schoolName = 'Stellar International School';
    }

    // 2. Student Name Detection
    let studentNameEn = '';
    let studentNameKo = '';

    // Match patterns like "Student: Minjun Kim", "Name: Kim Min Jun", "Applicant: ..."
    const nameMatch = combined.match(/(?:Student(?:\s*Name)?|Applicant|Candidate|Child|학생(?:\s*성명)?|이름)\s*[:：\-]\s*([A-Za-z\s]+)(?:\(([가-힣]+)\))?/i);
    if (nameMatch) {
        studentNameEn = nameMatch[1].trim();
        studentNameKo = nameMatch[2] ? nameMatch[2].trim() : '';
    }

    // Korean student name match if separate
    if (!studentNameKo) {
        const koMatch = combined.match(/([가-힣]{2,4})\s*(?:학생|어린이|입학)/);
        if (koMatch) studentNameKo = koMatch[1];
    }

    // Fallback search in subject: e.g. "[Invictus] Admission Offer - Minjun Kim"
    if (!studentNameEn) {
        const subjMatch = subject.match(/(?:Admission|Offer|Invoice|Registration|Enrolment|수속|입학)\s*[-–:]\s*([A-Za-z\s]+)/i);
        if (subjMatch && subjMatch[1].length < 30) {
            studentNameEn = subjMatch[1].trim();
        }
    }

    // 3. Grade / Year Group
    let gradeEn = 'Year 7';
    const gradeMatch = combined.match(/(?:Grade|Year|Year Group|Class|Grade Level|학년)\s*[:：\-]?\s*([0-9]{1,2}|Reception|Nursery|EYFS|KG|Kindergarten)/i);
    if (gradeMatch) {
        gradeEn = isNaN(gradeMatch[1]) ? gradeMatch[1] : `Year ${gradeMatch[1]}`;
    }

    // 4. Intake Term / Admission Date
    let termEn = '2026-Term 1 (August Intake)';
    const termMatch = combined.match(/(?:Term\s*[1-4]|Semester\s*[1-2]|August\s*202[5-7]|January\s*202[5-7]|April\s*202[5-7]|202[5-7]\s*Term\s*[1-4])/i);
    if (termMatch) {
        termEn = termMatch[0];
    }

    // 5. Parent Details
    let parentName = '';
    let parentPhone = '';
    let parentEmail = '';
    let parentKakao = '';

    const parentNameMatch = combined.match(/(?:Parent|Guardian|Father|Mother|학부모|보호자)(?:\s*Name)?\s*[:：\-]\s*([A-Za-z가-힣\s]+)/i);
    if (parentNameMatch) parentName = parentNameMatch[1].trim();

    const phoneMatch = combined.match(/(?:\+?60\s*1[0-9]-?[0-9]{3,4}-?[0-9]{4}|01[0-9]-?[0-9]{3,4}-?[0-9]{4})/);
    if (phoneMatch) parentPhone = phoneMatch[0];

    const emailMatch = combined.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch && !emailMatch[1].includes('invictus') && !emailMatch[1].includes('johorn')) {
        parentEmail = emailMatch[1];
    }

    // 6. Tuition Fee & Commission Calculation
    let tuitionFee = 35000;
    const tuitionMatch = combined.match(/(?:Tuition(?:\s*Fee)?|Amount|Total\s*Fee|학비|등록금)\s*[:：\-]?\s*(?:RM|MYR)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/i);
    if (tuitionMatch) {
        tuitionFee = parseFloat(tuitionMatch[1].replace(/,/g, '')) || 35000;
    }

    const commissionRate = 10;
    const commissionAmount = Math.round(tuitionFee * (commissionRate / 100));

    // Format admission date
    let admissionDate = new Date().toISOString().split('T')[0];
    if (dateStr) {
        try {
            admissionDate = new Date(dateStr).toISOString().split('T')[0];
        } catch (e) {}
    }

    return {
        studentNameEn: studentNameEn || 'New Student',
        studentNameKo: studentNameKo || '',
        studentName: studentNameKo ? `${studentNameKo} (${studentNameEn || 'New Student'})` : (studentNameEn || 'New Student'),
        schoolName,
        gradeEn,
        grade: gradeEn,
        termEn,
        term: termEn,
        parentName,
        parentPhone,
        parentEmail,
        parentKakaoWhatsapp: parentKakao,
        parentKakao: parentKakao,
        parentContact: [parentName, parentPhone, parentKakao, parentEmail].filter(Boolean).join(' / ') || '-',
        admissionDate,
        status: 'applied',
        tuitionFee,
        commissionType: 'percentage',
        commissionRate,
        commissionAmount,
        settlementMode: '1',
        entityName: 'GLOBAL EDU CONSULTING SDN. BHD.',
        memo: `[Gmail 자동수집] 제목: ${subject.slice(0, 50)}`,
        installments: [
            {
                term: 'Full 100%',
                amount: commissionAmount,
                dueDate: admissionDate,
                status: 'pending'
            }
        ],
        sourceEmailSubject: subject,
        sourceEmailDate: dateStr
    };
}

// 5. Main Execution
async function main() {
    console.log('\n🚀 [JohorN] Gmail 수속 메일 및 인보이스 자동 수집기 시작...');

    const auth = await getOAuth2Client();
    const gmail = google.gmail({ version: 'v1', auth });

    // Construct search query
    const searchQuery = customQuery || 'from:invictus OR from:marlborough OR from:raffles OR from:sunway OR from:chis OR from:stellar OR subject:admission OR subject:invoice OR subject:수속 OR subject:입학 OR subject:학생 OR subject:학비';

    console.log(`🔎 Gmail 검색 쿼리 실행 중: "${searchQuery}"`);
    const res = await gmail.users.messages.list({
        userId: 'me',
        q: searchQuery,
        maxResults: 20
    });

    const messages = res.data.messages || [];
    console.log(`📬 발견된 메일 개수: ${messages.length}건\n`);

    if (messages.length === 0) {
        console.log('수집 대상 메일이 없습니다.');
        return;
    }

    const parsedAdmissions = [];

    for (let i = 0; i < messages.length; i++) {
        const msgItem = messages[i];
        const msgRes = await gmail.users.messages.get({
            userId: 'me',
            id: msgItem.id,
            format: 'full'
        });

        const headers = msgRes.data.payload.headers || [];
        const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject');
        const fromHeader = headers.find(h => h.name.toLowerCase() === 'from');
        const dateHeader = headers.find(h => h.name.toLowerCase() === 'date');

        const subject = subjectHeader ? subjectHeader.value : '(제목 없음)';
        const from = fromHeader ? fromHeader.value : '';
        const dateStr = dateHeader ? dateHeader.value : '';

        const body = getBodyFromMessage(msgRes.data);
        const parsed = parseEmailForAdmission(subject, from, body, dateStr);
        parsed.gmailMessageId = msgItem.id;

        parsedAdmissions.push(parsed);
        console.log(`[${i + 1}/${messages.length}] 파싱 완료: [${parsed.schoolName}] ${parsed.studentName} (학년: ${parsed.gradeEn}, 학비: RM ${parsed.tuitionFee.toLocaleString()}, 커미션: RM ${parsed.commissionAmount.toLocaleString()})`);
    }

    console.log('\n============================================================');
    console.log(`📋 총 ${parsedAdmissions.length}건의 학생 입학/커미션 데이터가 추출되었습니다.`);
    console.log('============================================================');

    let shouldSave = autoSave;
    if (!shouldSave) {
        const answer = await askQuestion('\n위 데이터를 Firebase Realtime Database(commission_admissions)에 지금 저장하시겠습니까? (y/n): ');
        shouldSave = (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    }

    if (shouldSave) {
        console.log('\n💾 Firebase에 데이터 등록 중...');
        let savedCount = 0;
        for (const adm of parsedAdmissions) {
            adm.createdAt = new Date().toISOString();
            const postRes = await fetch(`${FIREBASE_BASE_URL}/commission_admissions.json`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(adm)
            });
            if (postRes.ok) {
                savedCount++;
            }
        }
        console.log(`🎉 성공적으로 ${savedCount}건의 학생 데이터가 등록되었습니다!`);
        console.log('관리자 페이지(admin-school.html)에서 새로고침하여 확인해보세요.');
    } else {
        console.log('저장이 취소되었습니다.');
    }
}

main().catch(err => {
    console.error('❌ 오류 발생:', err.message);
});
