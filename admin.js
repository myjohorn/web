// Admin Control Console for JohorN & Teega Residence
window.onerror = function(message, source, lineno, colno, error) {
    alert("관리자 스크립트 오류 발생:\n메시지: " + message + "\n위치: " + source + " (줄 번호: " + lineno + ")");
    return false;
};
window.addEventListener('unhandledrejection', function(event) {
    alert("관리자 비동기 연동 오류 발생:\n내용: " + event.reason);
});

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // 1. Initial State & Configuration Variables
    // ----------------------------------------------------
    let tokenClient;
    let gcalEventsCache = [];
    let johornRequests = [];
    let currentFilter = 'all';

    // Firebase Configuration
    const firebaseConfig = {
      apiKey: "AIzaSyAgWQBqwEF_qWBLPmvoUsDEqB_gFbRH2xw",
      authDomain: "johorn-booking.firebaseapp.com",
      databaseURL: "https://johorn-booking-default-rtdb.asia-southeast1.firebasedatabase.app/",
      projectId: "johorn-booking",
      storageBucket: "johorn-booking.firebasestorage.app",
      messagingSenderId: "872157980397",
      appId: "1:872157980397:web:f5518fa42bd79835338ee4",
      measurementId: "G-6RJ2YY46S1"
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    // Helper: format Date object to YYYY-MM-DD in local time (timezone-safe)
    function getLocalDateString(date) {
        if (!date) return '';
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    // Helper: parse YYYY-MM-DD string into local midnight Date object (timezone-safe)
    function parseLocalDate(dateStr) {
        if (!dateStr) return null;
        const parts = dateStr.split('-');
        if (parts.length !== 3) return new Date(dateStr); // Fallback
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }

    // Helper to adjust Google Calendar date-only end date to inclusive check-out date
    function adjustGcalEndDate(isStartDateOnly, isEndDateOnly, endStr) {
        const dateStr = endStr.split('T')[0];
        if (isStartDateOnly && isEndDateOnly) {
            const d = parseLocalDate(dateStr);
            d.setDate(d.getDate() - 1);
            return getLocalDateString(d);
        }
        return dateStr;
    }

    // Helper: secure SHA-256 hash in pure JS (no browser Web Crypto API dependencies, works in HTTP & HTTPS)
    function sha256(ascii) {
        function rightRotate(value, amount) {
            return (value >>> amount) | (value << (32 - amount));
        }
        
        var mathPow = Math.pow;
        var maxWord = mathPow(2, 32);
        var lengthProperty = 'length';
        var i, j;
        var result = '';

        var words = [];
        var asciiLength = ascii[lengthProperty] * 8;
        
        var hash = sha256.h = sha256.h || [];
        var k = sha256.k = sha256.k || [];
        var primeCounter = k[lengthProperty];

        var isPrime = function(n) {
            var divisor = 2;
            while (n % divisor) {
                divisor++;
            }
            return n === divisor;
        };

        var candidate = 2;
        while (primeCounter < 64) {
            if (isPrime(candidate)) {
                if (primeCounter < 8) {
                    hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
                }
                k[primeCounter] = (mathPow(candidate, 1/3) * maxWord) | 0;
                primeCounter++;
            }
            candidate++;
        }
        
        ascii += '\x80';
        while (ascii[lengthProperty] % 64 - 56) {
            ascii += '\x00';
        }
        
        for (i = 0; i < ascii[lengthProperty]; i++) {
            j = ascii.charCodeAt(i);
            if (j >> 8) return;
            words[i >> 2] |= j << ((3 - i % 4) * 8);
        }
        words[words[lengthProperty]] = ((asciiLength / maxWord) | 0);
        words[words[lengthProperty]] = (asciiLength | 0);
        
        var workingHash = hash.slice(0);
        for (i = 0; i < words[lengthProperty]; i += 16) {
            var w = words.slice(i, i + 16);
            var oldHash = workingHash.slice(0);
            
            for (j = 0; j < 64; j++) {
                var wj = w[j];
                if (j >= 16) {
                    var s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
                    var s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
                    wj = w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
                }
                
                var ch = (workingHash[4] & workingHash[5]) ^ (~workingHash[4] & workingHash[6]);
                var maj = (workingHash[0] & workingHash[1]) ^ (workingHash[0] & workingHash[2]) ^ (workingHash[1] & workingHash[2]);
                var sigma0 = rightRotate(workingHash[0], 2) ^ rightRotate(workingHash[0], 13) ^ rightRotate(workingHash[0], 22);
                var sigma1 = rightRotate(workingHash[4], 6) ^ rightRotate(workingHash[4], 11) ^ rightRotate(workingHash[4], 25);
                var temp1 = (wj + workingHash[7] + sigma1 + ch + k[j]) | 0;
                var temp2 = (sigma0 + maj) | 0;
                
                workingHash = [(temp1 + temp2) | 0].concat(workingHash);
                workingHash[4] = (workingHash[4] + temp1) | 0;
                workingHash.length = 8;
            }
            
            for (j = 0; j < 8; j++) {
                workingHash[j] = (workingHash[j] + oldHash[j]) | 0;
            }
        }
        
        for (i = 0; i < 8; i++) {
            var word = workingHash[i];
            if (word < 0) {
                word = 4294967296 + word;
            }
            var hex = word.toString(16);
            result += ('00000000' + hex).slice(-8);
        }
        return result;
    }

    // ----------------------------------------------------
    // 2. DOM Selectors
    // ----------------------------------------------------
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    const adminPasswordInput = document.getElementById('adminPassword');
    const adminLoginSection = document.getElementById('adminLogin');
    const adminDashboardSection = document.getElementById('adminDashboard');
    const adminTableBody = document.getElementById('adminTableBody');

    // GCal credentials config inputs
    const gcalClientId = document.getElementById('gcalClientId');
    const gcalApiKey = document.getElementById('gcalApiKey');
    const gcalCalendarId = document.getElementById('gcalCalendarId');
    const gcalConnectBtn = document.getElementById('gcalConnectBtn');
    const gcalDisconnectBtn = document.getElementById('gcalDisconnectBtn');
    const gcalSyncStatusBadge = document.getElementById('gcalSyncStatusBadge');
    const toggleGcalSettings = document.getElementById('toggleGcalSettings');
    const gcalSettingsBody = document.getElementById('gcalSettingsBody');
    const gcalDebugInfo = document.getElementById('gcalDebugInfo');
    const gcalDebugText = document.getElementById('gcalDebugText');
    const gcalAutoScanBtn = document.getElementById('gcalAutoScanBtn');

    // Admin direct booking inputs
    const adminResIdInput = document.getElementById('adminResId');
    const adminResNameInput = document.getElementById('adminResName');
    const adminResContactInput = document.getElementById('adminResContact');
    const adminResCheckinInput = document.getElementById('adminResCheckin');
    const adminResCheckoutInput = document.getElementById('adminResCheckout');
    const adminResMemoInput = document.getElementById('adminResMemo');
    const adminResSaveBtn = document.getElementById('adminResSaveBtn');
    const adminResDeleteBtn = document.getElementById('adminResDeleteBtn');
    const adminResClearBtn = document.getElementById('adminResClearBtn');
    const adminFormTitle = document.getElementById('adminFormTitle');

    // Calendar navigation
    const adminCalendarDates = document.getElementById('adminCalendarDates');
    const adminCalendarMonthYear = document.getElementById('adminCalendarMonthYear');
    const adminPrevMonthBtn = document.getElementById('adminPrevMonthBtn');
    const adminNextMonthBtn = document.getElementById('adminNextMonthBtn');

    // Calendar state
    const today = new Date();
    let adminYear = today.getFullYear();
    let adminMonth = today.getMonth(); // 0-indexed
    let currentYear = adminYear;
    let currentMonth = adminMonth;

    // ----------------------------------------------------
    // 3. Admin Authentication Login Flow
    // ----------------------------------------------------
    let storedPasswordHash = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'; // default: '1234'
    db.ref('settings/admin_password').on('value', (snapshot) => {
        const hash = snapshot.val();
        if (hash) {
            storedPasswordHash = hash;
        }
    });

    // Check if session storage indicates we are logged in
    if (sessionStorage.getItem('admin_logged_in') === 'true') {
        adminLoginSection.classList.add('hidden');
        adminDashboardSection.style.display = 'block';
        initializeDashboard();
    }

    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', handleAdminLogin);
        adminPasswordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleAdminLogin();
        });
    }

    function handleAdminLogin() {
        const password = adminPasswordInput.value;
        const typedHash = sha256(password);
        if (typedHash === storedPasswordHash) {
            sessionStorage.setItem('admin_logged_in', 'true');
            adminLoginSection.classList.add('hidden');
            adminDashboardSection.style.display = 'block';
            initializeDashboard();
        } else {
            alert('비밀번호가 올바르지 않습니다.');
        }
    }

    // ----------------------------------------------------
    // 4. Initialization & Database Listeners
    // ----------------------------------------------------
    function initializeDashboard() {
        // Initialize Mock Data to Firebase if empty
        initializeMockData();

        // 1. Sync GCal settings from Firebase Realtime Database
        db.ref('settings/gcal').on('value', (snapshot) => {
            const val = snapshot.val();
            if (val) {
                localStorage.setItem('gcal_client_id', val.clientId || '');
                localStorage.setItem('gcal_api_key', val.apiKey || '');
                localStorage.setItem('gcal_calendar_id', val.calendarId || 'primary');
                
                if (gcalClientId) gcalClientId.value = val.clientId || '';
                if (gcalApiKey) gcalApiKey.value = val.apiKey || '';
                if (gcalCalendarId) gcalCalendarId.value = val.calendarId || 'primary';
                
                updateGcalUI(isGcalConnected());
                if (isGcalConnected()) {
                    loadGcalEventsForCurrentMonth();
                }
            }
        });

        // 2. Listen for Real-Time Reservation Updates in Firebase requests path
        db.ref('requests').on('value', (snapshot) => {
            const val = snapshot.val();
            johornRequests = [];
            if (val) {
                Object.keys(val).forEach(key => {
                    johornRequests.push({
                        id: key, // Firebase unique push ID
                        ...val[key]
                    });
                });
            }
            
            // Re-render dashboard list and calendar
            renderAdminDashboard();
            renderAdminCalendar();
        });

        // 3. Listen for GCal events cache in Firebase (to display cache if disconnected)
        db.ref('settings/gcal_events_cache').on('value', (snapshot) => {
            if (!isGcalConnected()) {
                gcalEventsCache = snapshot.val() || [];
                renderAdminCalendar();
            }
        });

        // 4. Initialize Google OAuth GIS clients
        initializeGisClient();

        // 5. Initialize password management handlers
        initializePasswordSettings();
    }

    function initializeMockData() {
        db.ref('requests').once('value', (snapshot) => {
            if (!snapshot.exists()) {
                const mockData = {
                    "mock_1": {
                        type: 'consulting',
                        name: '김민준',
                        contact: '010-1234-5678',
                        notes: '[희망분야]: 이주정착 서비스\n[희망학교]: 래플스, 말보로\n[예정시기]: 2026년 9월\n\n[상세내용]:\n초등학교 3학년, 5학년 자녀 학기 맞춰 입학 대행 및 답사 조율 상담 원합니다.',
                        status: 'pending',
                        dateCreated: getLocalDateString(new Date()),
                        checkin: null,
                        checkout: null
                    },
                    "mock_2": {
                        type: 'stay',
                        name: '이서연',
                        contact: 'Kakao: seoyeon_johor',
                        notes: '[투숙인원]: 성인 2명, 아동 1명\n[요청사항]: 답사 일정에 맞춰 3베드룸 렌트 신청합니다.',
                        status: 'approved',
                        dateCreated: getLocalDateString(new Date()),
                        checkin: getLocalDateString(new Date()),
                        checkout: getLocalDateString(new Date())
                    }
                };
                db.ref('requests').set(mockData);
            }
        });
    }

    function initializePasswordSettings() {
        const togglePasswordSettings = document.getElementById('togglePasswordSettings');
        const passwordSettingsBody = document.getElementById('passwordSettingsBody');
        const changePasswordBtn = document.getElementById('changePasswordBtn');

        if (togglePasswordSettings && passwordSettingsBody) {
            togglePasswordSettings.addEventListener('click', () => {
                passwordSettingsBody.classList.toggle('hidden');
            });
        }

        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', async () => {
                const currentPwd = document.getElementById('currentPasswordInput').value;
                const newPwd = document.getElementById('newPasswordInput').value;
                const confirmPwd = document.getElementById('confirmNewPasswordInput').value;

                if (!currentPwd || !newPwd || !confirmPwd) {
                    alert('모든 비밀번호 필드를 입력해 주세요.');
                    return;
                }

                const currentHash = sha256(currentPwd);
                if (currentHash !== storedPasswordHash) {
                    alert('현재 비밀번호가 올바르지 않습니다.');
                    return;
                }

                if (newPwd !== confirmPwd) {
                    alert('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
                    return;
                }

                if (newPwd.length < 4) {
                    alert('비밀번호는 최소 4글자 이상이어야 합니다.');
                    return;
                }

                const newHash = sha256(newPwd);
                
                try {
                    await db.ref('settings/admin_password').set(newHash);
                    alert('비밀번호가 성공적으로 변경되었습니다!');
                    
                    // Reset input fields
                    document.getElementById('currentPasswordInput').value = '';
                    document.getElementById('newPasswordInput').value = '';
                    document.getElementById('confirmNewPasswordInput').value = '';
                    
                    // Collapse settings body
                    if (passwordSettingsBody) {
                        passwordSettingsBody.classList.add('hidden');
                    }
                } catch (err) {
                    alert(`비밀번호 변경 실패: ${err.message}`);
                }
            });
        }
    }

    // ----------------------------------------------------
    // 5. Admin Dashboard rendering (List & Tables)
    // ----------------------------------------------------
    function renderAdminDashboard() {
        const data = johornRequests;
        adminTableBody.innerHTML = '';

        // Reset details panel when dashboard re-renders
        const detailPanel = document.getElementById('adminDetailPanel');
        if (detailPanel) {
            detailPanel.classList.add('hidden');
        }

        // Filter Data
        const filtered = data.filter(item => {
            if (currentFilter === 'all') return true;
            return item.type === currentFilter;
        });

        if (filtered.length === 0) {
            adminTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-secondary);">접수된 신청 내역이 없습니다.</td></tr>`;
            return;
        }

        filtered.forEach((item, index) => {
            const tr = document.createElement('tr');

            // Format category badge
            let typeLabel = '컨설팅 상담';
            if (item.type === 'stay') typeLabel = '숙소 예약';

            // Format dates
            let scheduleStr = item.dateCreated;
            if (item.type === 'stay' && item.checkin && item.checkout) {
                scheduleStr = `${item.checkin} ~ ${item.checkout}`;
            }

            // Create Badge classes
            let badgeClass = 'status-pending';
            if (item.status === 'approved') badgeClass = 'status-approved';
            if (item.status === 'rejected') badgeClass = 'status-rejected';

            let statusLabel = '대기중';
            let selectMarkup = '';

            if (item.type === 'stay') {
                if (item.status === 'pending') statusLabel = '예약접수';
                if (item.status === 'approved') statusLabel = '예약완료';
                if (item.status === 'rejected') statusLabel = '예약반려';

                selectMarkup = `
                    <select class="action-select" data-id="${item.id}">
                        <option value="pending" ${item.status === 'pending' ? 'selected' : ''}>예약접수</option>
                        <option value="approved" ${item.status === 'approved' ? 'selected' : ''}>예약완료</option>
                        <option value="rejected" ${item.status === 'rejected' ? 'selected' : ''}>예약반려</option>
                    </select>
                `;
            } else {
                if (item.status === 'pending') statusLabel = '상담접수';
                if (item.status === 'approved') statusLabel = '상담완료';
                if (item.status === 'rejected') statusLabel = '상담반려';

                selectMarkup = `
                    <select class="action-select" data-id="${item.id}">
                        <option value="pending" ${item.status === 'pending' ? 'selected' : ''}>상담접수</option>
                        <option value="approved" ${item.status === 'approved' ? 'selected' : ''}>상담완료</option>
                        <option value="rejected" ${item.status === 'rejected' ? 'selected' : ''}>상담반려</option>
                    </select>
                `;
            }

            tr.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${typeLabel}</strong></td>
                <td>${item.name}</td>
                <td>${item.contact}</td>
                <td><span style="font-size:13px;">${scheduleStr}</span></td>
                <td><span class="status-badge ${badgeClass}">${statusLabel}</span></td>
                <td>
                    ${selectMarkup}
                </td>
            `;

            // Row Click Listener for detailed view
            tr.addEventListener('click', (e) => {
                if (e.target.classList.contains('action-select') || e.target.tagName === 'OPTION') {
                    return;
                }
                
                document.querySelectorAll('#adminTableBody tr').forEach(row => row.classList.remove('selected-row'));
                tr.classList.add('selected-row');
                showRequestDetails(item);
            });

            adminTableBody.appendChild(tr);
        });

        // Add Change status listener to select tags
        document.querySelectorAll('.action-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const id = e.target.getAttribute('data-id');
                const newStatus = e.target.value;
                updateRequestStatus(id, newStatus);
            });
        });
    }

    function updateRequestStatus(id, newStatus) {
        db.ref(`requests/${id}/status`).set(newStatus);
    }

    function showRequestDetails(item) {
        const detailPanel = document.getElementById('adminDetailPanel');
        const detailContent = document.getElementById('adminDetailContent');
        if (!detailPanel || !detailContent) return;

        let badgeClass = 'status-pending';
        if (item.status === 'approved') badgeClass = 'status-approved';
        if (item.status === 'rejected') badgeClass = 'status-rejected';

        let statusLabel = '대기중';
        if (item.type === 'stay') {
            if (item.status === 'pending') statusLabel = '예약접수';
            if (item.status === 'approved') statusLabel = '예약완료';
            if (item.status === 'rejected') statusLabel = '예약반려';
        } else {
            if (item.status === 'pending') statusLabel = '상담접수';
            if (item.status === 'approved') statusLabel = '상담완료';
            if (item.status === 'rejected') statusLabel = '상담반려';
        }

        let contentMarkup = '';
        if (item.type === 'stay') {
            contentMarkup = `
                <div class="detail-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                    <div>
                        <p style="margin-bottom: 8px;"><strong>구분:</strong> <span style="color: var(--accent-color); font-weight: 600;">숙소 예약 신청</span></p>
                        <p style="margin-bottom: 8px;"><strong>신청자 성함:</strong> ${item.name}</p>
                        <p style="margin-bottom: 8px;"><strong>연락처:</strong> ${item.contact}</p>
                        <p style="margin-bottom: 8px;"><strong>접수일시:</strong> ${item.dateCreated || '-'}</p>
                    </div>
                    <div>
                        <p style="margin-bottom: 8px;"><strong>체크인 날짜:</strong> ${item.checkin}</p>
                        <p style="margin-bottom: 8px;"><strong>체크아웃 날짜:</strong> ${item.checkout}</p>
                        <p style="margin-bottom: 8px;"><strong>현재 상태:</strong> <span class="status-badge ${badgeClass}">${statusLabel}</span></p>
                    </div>
                </div>
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-color);">
                    <strong style="display: block; margin-bottom: 10px; font-size: 14px; color: var(--text-primary);">상세 내역 / 요청 사항:</strong>
                    <pre style="margin: 0; font-family: inherit; white-space: pre-wrap; font-size: 13px; color: var(--text-secondary); background: #fcfbfa; padding: 15px; border: 1px solid var(--border-color); border-radius: 4px; line-height: 1.6; text-align: left;">${item.notes || '없음'}</pre>
                </div>
            `;
        } else {
            contentMarkup = `
                <div class="detail-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                    <div>
                        <p style="margin-bottom: 8px;"><strong>구분:</strong> <span style="color: var(--accent-color); font-weight: 600;">이주정착 & 국제학교 상담 문의</span></p>
                        <p style="margin-bottom: 8px;"><strong>신청자 성함:</strong> ${item.name}</p>
                        <p style="margin-bottom: 8px;"><strong>연락처:</strong> ${item.contact}</p>
                    </div>
                    <div>
                        <p style="margin-bottom: 8px;"><strong>접수일시:</strong> ${item.dateCreated || '-'}</p>
                        <p style="margin-bottom: 8px;"><strong>현재 상태:</strong> <span class="status-badge ${badgeClass}">${statusLabel}</span></p>
                    </div>
                </div>
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-color);">
                    <strong style="display: block; margin-bottom: 10px; font-size: 14px; color: var(--text-primary);">상세 상담 문의 내역:</strong>
                    <pre style="margin: 0; font-family: inherit; white-space: pre-wrap; font-size: 13px; color: var(--text-secondary); background: #fcfbfa; padding: 15px; border: 1px solid var(--border-color); border-radius: 4px; line-height: 1.6; text-align: left;">${item.notes || '없음'}</pre>
                </div>
            `;
        }

        detailContent.innerHTML = contentMarkup;
        detailPanel.classList.remove('hidden');
    }

    // Filter Buttons logic
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.getAttribute('data-filter');
            renderAdminDashboard();
        });
    });

    // ----------------------------------------------------
    // 6. Admin Calendar Rendering & UI Interaction
    // ----------------------------------------------------
    function getLockedDatesMap() {
        const data = johornRequests;
        const map = {};
        
        data.forEach(item => {
            if (item.type === 'stay' && item.status === 'approved' && item.checkin && item.checkout) {
                let start = parseLocalDate(item.checkin);
                let end = parseLocalDate(item.checkout);
                while (start <= end) {
                    const dateStr = getLocalDateString(start);
                    if (!map[dateStr]) {
                        map[dateStr] = [];
                    }
                    map[dateStr].push({
                        id: item.id,
                        name: item.name,
                        contact: item.contact || '',
                        notes: item.notes || '',
                        checkin: item.checkin,
                        checkout: item.checkout
                    });
                    start.setDate(start.getDate() + 1);
                }
            }
        });

        gcalEventsCache.forEach(evt => {
            let start = parseLocalDate(evt.start);
            let end = parseLocalDate(evt.end);
            while (start <= end) {
                const dateStr = getLocalDateString(start);
                const name = evt.summary.replace('\[숙소예약\]', '').trim();
                
                if (!map[dateStr]) {
                    map[dateStr] = [];
                }
                map[dateStr].push({
                    id: evt.id,
                    name: name,
                    contact: '',
                    notes: evt.description || '',
                    checkin: evt.start,
                    checkout: evt.end,
                    isGcal: true
                });
                start.setDate(start.getDate() + 1);
            }
        });
        
        return map;
    }

    function renderAdminCalendar() {
        if (!adminCalendarDates) return;
        adminCalendarDates.innerHTML = '';

        const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
        adminCalendarMonthYear.textContent = `${adminYear}년 ${monthNames[adminMonth]}`;

        const firstDayIndex = new Date(adminYear, adminMonth, 1).getDay();
        const lastDay = new Date(adminYear, adminMonth + 1, 0).getDate();
        const prevLastDay = new Date(adminYear, adminMonth, 0).getDate();

        const lockedDatesMap = getLockedDatesMap();

        // 1. Previous month blank days
        for (let i = firstDayIndex; i > 0; i--) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell prev-month';
            cell.textContent = prevLastDay - i + 1;
            adminCalendarDates.appendChild(cell);
        }

        // 2. Current month dates
        for (let day = 1; day <= lastDay; day++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell';
            
            const thisDate = new Date(adminYear, adminMonth, day);
            const dateStr = getLocalDateString(thisDate);

            if (thisDate.toDateString() === today.toDateString()) {
                cell.classList.add('today');
            }

            const bookingsList = lockedDatesMap[dateStr];
            if (bookingsList && bookingsList.length > 0) {
                cell.classList.add('booked-cell');
                cell.innerHTML = `<span class="date-num">${day}</span>`;
                
                bookingsList.forEach(booking => {
                    const tag = document.createElement('span');
                    tag.className = 'admin-booking-name-tag';
                    tag.textContent = booking.name;
                    tag.style.cursor = 'pointer';
                    tag.addEventListener('click', (e) => {
                        e.stopPropagation();
                        
                        document.querySelectorAll('#adminCalendarDates .calendar-cell').forEach(c => c.classList.remove('active-select'));
                        cell.classList.add('active-select');
                        
                        if (adminResDeleteBtn) {
                            adminResDeleteBtn.classList.remove('hidden');
                            adminResDeleteBtn.innerHTML = booking.isGcal ? '<i class="fa-solid fa-trash"></i> 구글에서 삭제' : '<i class="fa-solid fa-trash"></i> 예약 삭제';
                        }

                        if (booking.isGcal) {
                            adminResIdInput.value = booking.id;
                            adminResNameInput.value = booking.name;
                            adminResContactInput.value = booking.contact || '';
                            adminResCheckinInput.value = booking.checkin;
                            adminResCheckoutInput.value = booking.checkout;
                            adminResMemoInput.value = booking.notes;
                            adminFormTitle.innerHTML = `<i class="fa-solid fa-calendar-check" style="margin-right: 6px;"></i> 구글 캘린더 예약 수정 / 상세`;
                        } else {
                            const data = johornRequests;
                            const fullItem = data.find(item => item.id.toString() === booking.id.toString());
                            if (fullItem) {
                                adminResIdInput.value = fullItem.id;
                                adminResNameInput.value = fullItem.name;
                                adminResContactInput.value = fullItem.contact || '';
                                adminResCheckinInput.value = fullItem.checkin || '';
                                adminResCheckoutInput.value = fullItem.checkout || '';
                                adminResMemoInput.value = fullItem.notes || '';
                                adminFormTitle.innerHTML = `<i class="fa-solid fa-calendar-check" style="margin-right: 6px;"></i> 숙소 예약 수정 / 상세 정보`;
                            }
                        }
                    });
                    cell.appendChild(tag);
                });
                
                cell.addEventListener('click', () => {
                    document.querySelectorAll('#adminCalendarDates .calendar-cell').forEach(c => c.classList.remove('active-select'));
                    cell.classList.add('active-select');
                    if (adminResDeleteBtn) adminResDeleteBtn.classList.add('hidden');
                    
                    const clickedDateStr = getLocalDateString(thisDate);
                    const checkinVal = adminResCheckinInput.value;
                    const checkoutVal = adminResCheckoutInput.value;

                    if (!checkinVal || (checkinVal && checkoutVal)) {
                        adminResCheckinInput.value = clickedDateStr;
                        adminResCheckoutInput.value = '';
                        adminResIdInput.value = '';
                        adminResNameInput.value = '';
                        adminResContactInput.value = '';
                        adminResMemoInput.value = '';
                        adminFormTitle.innerHTML = `<i class="fa-solid fa-calendar-plus" style="margin-right: 6px;"></i> 직접 예약 등록 / 상세 정보`;
                    } else if (checkinVal && !checkoutVal) {
                        if (clickedDateStr < checkinVal) {
                            adminResCheckinInput.value = clickedDateStr;
                        } else {
                            adminResCheckoutInput.value = clickedDateStr;
                        }
                    }
                });
            } else {
                cell.innerHTML = `<span class="date-num">${day}</span>`;
                cell.addEventListener('click', () => {
                    document.querySelectorAll('#adminCalendarDates .calendar-cell').forEach(c => c.classList.remove('active-select'));
                    cell.classList.add('active-select');

                    if (adminResDeleteBtn) adminResDeleteBtn.classList.add('hidden');

                    const clickedDateStr = getLocalDateString(thisDate);
                    const checkinVal = adminResCheckinInput.value;
                    const checkoutVal = adminResCheckoutInput.value;

                    if (!checkinVal || (checkinVal && checkoutVal)) {
                        adminResCheckinInput.value = clickedDateStr;
                        adminResCheckoutInput.value = '';
                        adminResIdInput.value = '';
                        adminResNameInput.value = '';
                        adminResContactInput.value = '';
                        adminResMemoInput.value = '';
                        adminFormTitle.innerHTML = `<i class="fa-solid fa-calendar-plus" style="margin-right: 6px;"></i> 직접 예약 등록 / 상세 정보`;
                    } else if (checkinVal && !checkoutVal) {
                        if (clickedDateStr < checkinVal) {
                            adminResCheckinInput.value = clickedDateStr;
                        } else {
                            adminResCheckoutInput.value = clickedDateStr;
                        }
                    }
                });
            }

            adminCalendarDates.appendChild(cell);
        }

        // 3. Next month blank days
        const totalCells = firstDayIndex + lastDay;
        const nextBlankCount = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
        for (let i = 1; i <= nextBlankCount; i++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell next-month';
            cell.textContent = i;
            adminCalendarDates.appendChild(cell);
        }
    }

    // Month Navigation
    if (adminPrevMonthBtn && adminNextMonthBtn) {
        adminPrevMonthBtn.addEventListener('click', () => {
            adminMonth--;
            if (adminMonth < 0) {
                adminMonth = 11;
                adminYear--;
            }
            currentMonth = adminMonth;
            currentYear = adminYear;
            loadGcalEventsForCurrentMonth();
            renderAdminCalendar();
        });

        adminNextMonthBtn.addEventListener('click', () => {
            adminMonth++;
            if (adminMonth > 11) {
                adminMonth = 0;
                adminYear++;
            }
            currentMonth = adminMonth;
            currentYear = adminYear;
            loadGcalEventsForCurrentMonth();
            renderAdminCalendar();
        });
    }

    // ----------------------------------------------------
    // 7. Save and Delete Reservation Buttons Actions
    // ----------------------------------------------------
    if (adminResSaveBtn) {
        adminResSaveBtn.addEventListener('click', async () => {
            // 1. Enforce Google Calendar connection check to maintain data integrity
            const isGcalConnectedVal = isGcalConnected();
            if (!isGcalConnectedVal) {
                alert('구글 캘린더 연동이 필요합니다. 상단의 [구글 계정 연동하기] 버튼을 눌러 연동을 완료한 후 다시 시도해 주세요.');
                const settingsPanel = document.querySelector('.admin-panel');
                if (settingsPanel) {
                    settingsPanel.scrollIntoView({ behavior: 'smooth' });
                }
                return;
            }

            const idVal = adminResIdInput.value;
            const nameVal = adminResNameInput.value.trim();
            const contactVal = adminResContactInput.value.trim();
            const checkinVal = adminResCheckinInput.value;
            const checkoutVal = adminResCheckoutInput.value;
            const memoVal = adminResMemoInput.value.trim();

            if (!nameVal || !checkinVal || !checkoutVal) {
                alert('예약자명, 체크인 날짜, 체크아웃 날짜는 필수 입력 항목입니다.');
                return;
            }

            if (checkinVal > checkoutVal) {
                alert('체크아웃 날짜는 체크인 날짜보다 빠를 수 없습니다.');
                return;
            }

            const data = johornRequests;
            const bookingObj = {
                id: idVal,
                name: nameVal,
                contact: contactVal,
                checkin: checkinVal,
                checkout: checkoutVal,
                notes: memoVal
            };

            if (idVal) {
                const isLocalRequest = johornRequests.some(item => item.id.toString() === idVal.toString());
                const isGcalOnly = !isLocalRequest;
                
                if (isGcalOnly) {
                    alert('구글 캘린더 예약을 수정 중입니다...');
                    const editObj = { ...bookingObj, isGcal: true };
                    const gcalId = await saveGcalEvent(editObj);
                    if (gcalId) {
                        alert('구글 캘린더 예약이 성공적으로 수정되었습니다.');
                    } else {
                        alert('구글 캘린더 예약 수정에 실패했습니다.');
                        return;
                    }
                } else {
                    const targetId = idVal;
                    const existingItem = data.find(item => item.id.toString() === targetId.toString());
                    
                    alert('구글 캘린더 동기화 중...');
                    bookingObj.gcalEventId = existingItem ? existingItem.gcalEventId : null;
                    const syncedGcalId = await saveGcalEvent(bookingObj);

                    const updateObj = {
                        name: nameVal,
                        contact: contactVal,
                        checkin: checkinVal,
                        checkout: checkoutVal,
                        notes: memoVal
                    };
                    if (syncedGcalId) {
                        updateObj.gcalEventId = syncedGcalId;
                    } else if (existingItem && existingItem.gcalEventId) {
                        updateObj.gcalEventId = existingItem.gcalEventId;
                    }

                    db.ref(`requests/${targetId}`).update(updateObj);
                    alert('예약이 수정되었습니다.');
                }
            } else {
                alert('구글 캘린더 동기화 중...');
                const syncedGcalId = await saveGcalEvent(bookingObj);

                const newRes = {
                    type: 'stay',
                    name: nameVal,
                    contact: contactVal,
                    notes: memoVal,
                    status: 'approved',
                    dateCreated: getLocalDateString(new Date()).replace(/-/g, '/'),
                    checkin: checkinVal,
                    checkout: checkoutVal,
                    gcalEventId: syncedGcalId || null
                };
                
                db.ref('requests').push(newRes);
                
                if (syncedGcalId) {
                    alert('구글 캘린더에 예약이 등록되었습니다.');
                } else {
                    alert('예약이 성공적으로 등록되었습니다.');
                }
            }

            resetAdminResForm();
            renderAdminDashboard();
            await loadGcalEventsForCurrentMonth();
        });
    }

    if (adminResDeleteBtn) {
        adminResDeleteBtn.addEventListener('click', async () => {
            const idVal = adminResIdInput.value;
            if (!idVal) return;

            // 1. Enforce Google Calendar connection check to maintain data integrity
            const isGcalConnectedVal = isGcalConnected();
            if (!isGcalConnectedVal) {
                alert('구글 캘린더 연동이 필요합니다. 상단의 [구글 계정 연동하기] 버튼을 눌러 연동을 완료한 후 다시 시도해 주세요.');
                const settingsPanel = document.querySelector('.admin-panel');
                if (settingsPanel) {
                    settingsPanel.scrollIntoView({ behavior: 'smooth' });
                }
                return;
            }

            const confirmDel = confirm('이 예약을 정말 삭제하시겠습니까?');
            if (!confirmDel) return;

            const isLocalRequest = johornRequests.some(item => item.id.toString() === idVal.toString());
            const isGcalOnly = !isLocalRequest;

            if (isGcalOnly) {
                alert('구글 캘린더에서 예약을 삭제 중입니다...');
                const success = await deleteGcalEvent(idVal);
                if (success) {
                    alert('구글 캘린더 예약이 성공적으로 삭제되었습니다.');
                } else {
                    alert('구글 캘린더 예약 삭제에 실패했습니다.');
                    return;
                }
            } else {
                const targetId = idVal;
                const targetItem = johornRequests.find(item => item.id.toString() === targetId.toString());

                if (targetItem && targetItem.gcalEventId) {
                    alert('구글 캘린더 예약 동기화 삭제 중...');
                    await deleteGcalEvent(targetItem.gcalEventId);
                }

                db.ref(`requests/${targetId}`).remove();
                alert('예약이 삭제되었습니다.');
            }

            resetAdminResForm();
            await loadGcalEventsForCurrentMonth();
        });
    }

    if (adminResClearBtn) {
        adminResClearBtn.addEventListener('click', resetAdminResForm);
    }

    function resetAdminResForm() {
        adminResIdInput.value = '';
        adminResNameInput.value = '';
        adminResContactInput.value = '';
        adminResCheckinInput.value = '';
        adminResCheckoutInput.value = '';
        adminResMemoInput.value = '';
        adminFormTitle.innerHTML = `<i class="fa-solid fa-calendar-plus" style="margin-right: 6px;"></i> 직접 예약 등록 / 상세 정보`;
        if (adminResDeleteBtn) adminResDeleteBtn.classList.add('hidden');
        document.querySelectorAll('#adminCalendarDates .calendar-cell').forEach(cell => cell.classList.remove('active-select'));
    }

    // ----------------------------------------------------
    // 8. Google Calendar Sync Core (REST API Integration)
    // ----------------------------------------------------
    function isGcalConnected() {
        const token = localStorage.getItem('gcal_access_token');
        return !!token;
    }

    function updateGcalUI(connected) {
        if (connected) {
            gcalSyncStatusBadge.textContent = '연동 완료';
            gcalSyncStatusBadge.className = 'status-badge status-approved';
            if (gcalDisconnectBtn) gcalDisconnectBtn.classList.remove('hidden');
            if (gcalConnectBtn) gcalConnectBtn.classList.add('hidden');
            if (gcalDebugInfo) gcalDebugInfo.style.display = 'block';
        } else {
            gcalSyncStatusBadge.textContent = '연동 안됨';
            gcalSyncStatusBadge.className = 'status-badge status-rejected';
            if (gcalDisconnectBtn) gcalDisconnectBtn.classList.add('hidden');
            if (gcalConnectBtn) gcalConnectBtn.classList.remove('hidden');
            if (gcalDebugInfo) gcalDebugInfo.style.display = 'none';
        }
    }

    function showGcalDebug(msg) {
        if (gcalDebugText) {
            gcalDebugText.textContent = msg;
        }
    }

    function initializeGisClient() {
        const client_id = localStorage.getItem('gcal_client_id');
        if (!client_id) return;
        
        try {
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: client_id,
                scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
                callback: async (tokenResponse) => {
                    if (tokenResponse.error !== undefined) {
                        throw tokenResponse;
                    }
                    localStorage.setItem('gcal_access_token', tokenResponse.access_token);
                    updateGcalUI(true);
                    alert('구글 캘린더 계정이 성공적으로 연동되었습니다.');
                    await loadGcalEventsForCurrentMonth();
                },
            });
        } catch (e) {
            console.error("GIS client load error:", e);
        }
    }

    // OAuth Connect button handlers
    if (gcalConnectBtn) {
        gcalConnectBtn.addEventListener('click', () => {
            const clientIdVal = gcalClientId.value.trim();
            const apiKeyVal = gcalApiKey.value.trim();
            const calendarIdVal = gcalCalendarId.value.trim() || 'primary';

            if (!clientIdVal || !apiKeyVal) {
                alert('OAuth Client ID와 API Key를 모두 입력해야 연동을 시작할 수 있습니다.');
                return;
            }

            // Save credentials to Firebase to share across devices
            const syncObj = {
                clientId: clientIdVal,
                apiKey: apiKeyVal,
                calendarId: calendarIdVal
            };
            db.ref('settings/gcal').set(syncObj);

            // Trigger Google login popup
            if (!tokenClient) {
                initializeGisClient();
            }
            if (tokenClient) {
                tokenClient.requestAccessToken({ prompt: 'consent' });
            } else {
                alert('OAuth GIS Client 초기화에 실패했습니다. Client ID 입력을 확인해 주세요.');
            }
        });
    }

    if (gcalDisconnectBtn) {
        gcalDisconnectBtn.addEventListener('click', () => {
            const confirmDis = confirm('정말 구글 연동을 해제하시겠습니까?\n해제 시 이 브라우저에서의 실시간 캘린더 제어 세션이 만료됩니다.');
            if (confirmDis) {
                localStorage.removeItem('gcal_access_token');
                updateGcalUI(false);
                gcalEventsCache = [];
                renderAdminCalendar();
                alert('구글 연동이 해제되었습니다.');
            }
        });
    }

    // Toggle credentials panel
    if (toggleGcalSettings && gcalSettingsBody) {
        toggleGcalSettings.addEventListener('click', () => {
            gcalSettingsBody.classList.toggle('hidden');
        });
    }

    // GCal list auto-scan diagnostics
    if (gcalAutoScanBtn) {
        gcalAutoScanBtn.addEventListener('click', async () => {
            if (!isGcalConnected()) return;
            showGcalDebug('구글 계정 캘린더 목록 전체 스캔 및 자가진단 실행 중...');
            
            try {
                const calendars = await fetchCalendarList();
                const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();
                const endOfYear = new Date(new Date().getFullYear(), 11, 31).toISOString();
                
                const scanSummary = [];
                
                for (const cal of calendars) {
                    const token = localStorage.getItem('gcal_access_token');
                    let url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events`;
                    url += `?timeMin=${encodeURIComponent(startOfYear)}&timeMax=${encodeURIComponent(endOfYear)}&singleEvents=true&maxResults=10`;
                    
                    const response = await fetch(url, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        const evts = data.items || [];
                        if (evts.length > 0) {
                            const details = evts.map(e => `${e.summary}(${(e.start.date || e.start.dateTime || '').split('T')[0]})`).join(', ');
                            scanSummary.push(`▶ [${cal.summary}] ➔ ${evts.length}개 일정 발견: ${details}\n   (캘린더 ID: ${cal.id})`);
                        } else {
                            scanSummary.push(`▷ [${cal.summary}] ➔ 일정 없음`);
                        }
                    } else {
                        scanSummary.push(`❌ [${cal.summary}] ➔ 조회 실패 (HTTP ${response.status})`);
                    }
                }

                showGcalDebug(`[자동 스캔 완료 - 2026년 기준]\n\n` + scanSummary.join('\n\n'));
            } catch (err) {
                showGcalDebug(`자동 스캔 오류 발생: ${err.message}`);
            }
        });
    }

    async function fetchGcalEvents(timeMin, timeMax) {
        if (!isGcalConnected()) return [];
        const token = localStorage.getItem('gcal_access_token');
        const calendarId = localStorage.getItem('gcal_calendar_id') || 'primary';
        
        let url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
        url += `?timeMin=${encodeURIComponent(timeMin)}`;
        url += `&timeMax=${encodeURIComponent(timeMax)}`;
        url += `&singleEvents=true`;
        url += `&maxResults=250`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('gcal_access_token');
                    updateGcalUI(false);
                    console.warn('GCal Access Token expired (HTTP 401). Disconnected.');
                }
                throw new Error(`GCal fetch failed with status ${response.status}`);
            }
            const data = await response.json();
            return data.items || [];
        } catch (err) {
            console.error('Error fetching Google Calendar events:', err);
            return [];
        }
    }

    async function saveGcalEvent(booking) {
        if (!isGcalConnected()) return null;
        const token = localStorage.getItem('gcal_access_token');
        const calendarId = localStorage.getItem('gcal_calendar_id') || 'primary';
        
        const checkoutDate = parseLocalDate(booking.checkout);
        const exclusiveCheckout = new Date(checkoutDate);
        exclusiveCheckout.setDate(exclusiveCheckout.getDate() + 1);
        
        const eventBody = {
            summary: `[숙소예약] ${booking.name}`,
            description: `${booking.notes || ''}\n연락처: ${booking.contact || ''}`,
            start: {
                date: booking.checkin
            },
            end: {
                date: getLocalDateString(exclusiveCheckout)
            }
        };

        const isEdit = !!booking.gcalEventId || (booking.isGcal && booking.id);
        const gcalEventId = booking.gcalEventId || (booking.isGcal ? booking.id : null);

        let url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
        let method = 'POST';

        if (isEdit && gcalEventId) {
            url += `/${gcalEventId}`;
            method = 'PUT';
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventBody)
            });

            if (!response.ok) {
                throw new Error(`Failed to save GCal event: ${response.status}`);
            }

            const result = await response.json();
            return result.id;
        } catch (err) {
            console.error('Error saving Google Calendar event:', err);
            return null;
        }
    }

    async function deleteGcalEvent(gcalEventId) {
        if (!isGcalConnected()) return false;
        const token = localStorage.getItem('gcal_access_token');
        const calendarId = localStorage.getItem('gcal_calendar_id') || 'primary';
        
        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${gcalEventId}`;
        
        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to delete GCal event: ${response.status}`);
            }
            return true;
        } catch (err) {
            console.error('Error deleting Google Calendar event:', err);
            return false;
        }
    }

    async function fetchCalendarList() {
        if (!isGcalConnected()) return [];
        const token = localStorage.getItem('gcal_access_token');
        const url = `https://www.googleapis.com/calendar/v3/users/me/calendarList`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error('Failed to fetch calendar list');
            const data = await response.json();
            return data.items || [];
        } catch (err) {
            console.error('Error fetching calendar list:', err);
            return [];
        }
    }

    async function loadGcalEventsForCurrentMonth() {
        const connected = isGcalConnected();
        if (!connected) return;

        const startOfMonth = new Date(currentYear, currentMonth - 1, 20); // Prev month buffer
        const endOfMonth = new Date(currentYear, currentMonth + 1, 10);  // Next month buffer
        
        const timeMin = startOfMonth.toISOString();
        const timeMax = endOfMonth.toISOString();

        showGcalDebug(`일정 조회 요청 중... 범위: ${timeMin.split('T')[0]} ~ ${timeMax.split('T')[0]}`);

        try {
            const events = await fetchGcalEvents(timeMin, timeMax);
            
            let calDetails = '없음';
            try {
                const calendars = await fetchCalendarList();
                calDetails = calendars.map(c => `[${c.summary} (ID: ${c.id})]`).join(', ');
            } catch (err) {
                console.warn('Calendar list fetch failed:', err);
            }
            
            const rawEventDetails = events.map(e => {
                const sDate = e.start.date || e.start.dateTime || '';
                return `${e.summary || '제목 없음'}(${sDate.split('T')[0]})`;
            }).join(', ');

            gcalEventsCache = events.map(evt => {
                const start = evt.start.date || evt.start.dateTime;
                const end = evt.end.date || evt.end.dateTime;
                return {
                    id: evt.id,
                    summary: evt.summary || '예약 완료',
                    description: evt.description || '',
                    start: start.split('T')[0],
                    end: adjustGcalEndDate(!!evt.start.date, !!evt.end.date, end)
                };
            });

            // Write GCal cache to Firebase so guests can see them!
            db.ref('settings/gcal_events_cache').set(gcalEventsCache);

            const matchNames = gcalEventsCache.map(e => e.summary).join(', ') || '없음';
            showGcalDebug(`동기화 완료: ${gcalEventsCache.length}개 일정 매핑됨 (${matchNames}).\n\n[API 원본 응답]: ${rawEventDetails || '없음'}\n\n내 계정 캘린더 목록: ${calDetails}`);

            renderAdminCalendar();
        } catch (e) {
            showGcalDebug(`오류 발생: ${e.message}`);
        }
    }
});
