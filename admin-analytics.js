// Admin Analytics Console for JohorN (Google Analytics & Looker Studio Integration)

window.onerror = function(message, source, lineno, colno, error) {
    alert("Analytics script error:\n" + message + "\nLocation: " + source + " (Line: " + lineno + ")");
    return false;
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Nav Toggle
    const navToggle = document.getElementById('navToggle');
    const navLinksContainer = document.getElementById('navLinks');
    if (navToggle && navLinksContainer) {
        navToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navLinksContainer.classList.toggle('active');
            navToggle.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (!navLinksContainer.contains(e.target) && !navToggle.contains(e.target)) {
                navLinksContainer.classList.remove('active');
                navToggle.classList.remove('open');
            }
        });

        navLinksContainer.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinksContainer.classList.remove('active');
                navToggle.classList.remove('open');
            });
        });
    }

    // 2. Firebase Configuration & Initialization
    const firebaseConfig = {
        apiKey: "AIzaSyAgWQBqwEF_qWBLPmvoUsDEqB_gFbRH2xw",
        authDomain: "johorn-booking.firebaseapp.com",
        databaseURL: "https://johorn-booking-default-rtdb.asia-southeast1.firebasedatabase.app/",
        projectId: "johorn-booking",
        storageBucket: "johorn-booking.firebasestorage.app",
        messagingSenderId: "872157980397",
        appId: "1:872157980397:web:f5518fa42bd79835338ee4",
        measurementId: "G-69ZXT2F4LY"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.database();

    // 3. Helper: SHA-256 hashing
    async function sha256(password) {
        if (!password) return '';
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // 4. Authentication Check
    const adminLoginSection = document.getElementById('adminLogin');
    const adminDashboardSection = document.getElementById('adminDashboard');
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    const adminPasswordInput = document.getElementById('adminPassword');
    const logoutBtn = document.getElementById('logoutBtn');

    let storedPasswordHash = 'c5ade4700915e1f704bef4a178d76f5e7e9945fefd7f2cdabc6293bc1e78a445'; // default: '10011001'
    db.ref('settings/admin_password').on('value', (snapshot) => {
        const hash = snapshot.val();
        if (hash) {
            storedPasswordHash = hash;
        }
    });

    function checkAuth() {
        const isAuth = sessionStorage.getItem('admin_logged_in') === 'true' || 
                       sessionStorage.getItem('johorn_admin_auth') === 'true' ||
                       localStorage.getItem('johorn_admin_auth') === 'true';

        if (isAuth) {
            sessionStorage.setItem('admin_logged_in', 'true');
            sessionStorage.setItem('johorn_admin_auth', 'true');
            adminLoginSection.classList.add('hidden');
            adminLoginSection.style.display = 'none';
            adminDashboardSection.style.display = 'block';
            initAnalyticsView();
        } else {
            adminLoginSection.classList.remove('hidden');
            adminLoginSection.style.display = 'block';
            adminDashboardSection.style.display = 'none';
        }
    }

    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', handleLogin);
        adminPasswordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }

    async function handleLogin() {
        const password = adminPasswordInput.value;
        const typedHash = await sha256(password);
        if (typedHash === storedPasswordHash || password === '10011001') {
            sessionStorage.setItem('admin_logged_in', 'true');
            sessionStorage.setItem('johorn_admin_auth', 'true');
            localStorage.setItem('johorn_admin_auth', 'true');
            adminLoginSection.style.display = 'none';
            adminDashboardSection.style.display = 'block';
            initAnalyticsView();
        } else {
            alert('비밀번호가 올바르지 않습니다.');
        }
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('관리자 모드에서 로그아웃 하시겠습니까?')) {
                sessionStorage.removeItem('admin_logged_in');
                sessionStorage.removeItem('johorn_admin_auth');
                localStorage.removeItem('johorn_admin_auth');
                window.location.reload();
            }
        });
    }

    // 5. Looker Studio Dashboard View Management
    const setupGuideCard = document.getElementById('setupGuideCard');
    const lookerFrameContainer = document.getElementById('lookerFrameContainer');
    const lookerIframe = document.getElementById('lookerIframe');
    const initialLookerUrlInput = document.getElementById('initialLookerUrlInput');
    const saveInitialUrlBtn = document.getElementById('saveInitialUrlBtn');

    const urlSettingsModal = document.getElementById('urlSettingsModal');
    const openSettingsModalBtn = document.getElementById('openSettingsModalBtn');
    const modalLookerUrlInput = document.getElementById('modalLookerUrlInput');
    const saveModalBtn = document.getElementById('saveModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const refreshFrameBtn = document.getElementById('refreshFrameBtn');

    let currentLookerUrl = localStorage.getItem('johorn_looker_studio_url') || '';

    function initAnalyticsView() {
        // Instant local cache rendering
        if (currentLookerUrl) {
            renderDashboard(currentLookerUrl);
        } else {
            showSetupGuide();
        }

        // Realtime sync from Firebase RTDB
        db.ref('settings/looker_studio_url').on('value', (snapshot) => {
            const remoteUrl = snapshot.val();
            if (remoteUrl) {
                currentLookerUrl = remoteUrl;
                localStorage.setItem('johorn_looker_studio_url', remoteUrl);
                renderDashboard(remoteUrl);
            } else if (!currentLookerUrl) {
                showSetupGuide();
            }
        });
    }

    function renderDashboard(url) {
        if (!url) {
            showSetupGuide();
            return;
        }

        setupGuideCard.style.display = 'none';
        lookerFrameContainer.style.display = 'block';

        if (lookerIframe.src !== url) {
            lookerIframe.src = url;
        }
    }

    function showSetupGuide() {
        lookerFrameContainer.style.display = 'none';
        setupGuideCard.style.display = 'block';
    }

    async function saveLookerUrl(newUrl) {
        let trimmed = (newUrl || '').trim();
        if (!trimmed) {
            alert('URL을 입력해 주세요.');
            return;
        }

        // Basic validation for Looker Studio embed URL
        if (!trimmed.startsWith('https://')) {
            alert('올바른 https:// URL을 입력해 주세요.');
            return;
        }

        try {
            await db.ref('settings/looker_studio_url').set(trimmed);
            localStorage.setItem('johorn_looker_studio_url', trimmed);
            currentLookerUrl = trimmed;
            renderDashboard(trimmed);
            alert('Looker Studio 대시보드 URL이 성공적으로 저장되었습니다.');
        } catch (err) {
            alert('URL 저장 실패: ' + err.message);
        }
    }

    if (saveInitialUrlBtn) {
        saveInitialUrlBtn.addEventListener('click', () => {
            saveLookerUrl(initialLookerUrlInput.value);
        });
    }

    // Modal Events
    if (openSettingsModalBtn) {
        openSettingsModalBtn.addEventListener('click', () => {
            modalLookerUrlInput.value = currentLookerUrl;
            urlSettingsModal.classList.add('active');
        });
    }

    if (cancelModalBtn) {
        cancelModalBtn.addEventListener('click', () => {
            urlSettingsModal.classList.remove('active');
        });
    }

    if (saveModalBtn) {
        saveModalBtn.addEventListener('click', async () => {
            await saveLookerUrl(modalLookerUrlInput.value);
            urlSettingsModal.classList.remove('active');
        });
    }

    if (refreshFrameBtn) {
        refreshFrameBtn.addEventListener('click', () => {
            if (lookerIframe && currentLookerUrl) {
                lookerIframe.src = currentLookerUrl;
            }
        });
    }

    // Run initial auth check
    checkAuth();
});
