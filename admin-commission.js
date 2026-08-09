// Admin Control Console for International School Commission Management (JohorN)

window.onerror = function(message, source, lineno, colno, error) {
    alert("Commission Admin script error:\n" + message + "\nLocation: " + source + " (Line: " + lineno + ")");
    return false;
};

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // 1. Initial State & Variables
    // ----------------------------------------------------
    let admissions = [];
    let invoices = [];
    let payments = [];
    let schools = [];
    let entities = [];

    let activeTab = 'admissions';
    let adminPasswordHash = null;

    // Default target month
    const today = new Date();
    const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const paymentMonthFilter = document.getElementById('paymentMonthFilter');
    if (paymentMonthFilter) paymentMonthFilter.value = currentYearMonth;

    // Mobile Navigation Drawer Toggle
    const navToggle = document.getElementById('navToggle');
    const navLinksContainer = document.getElementById('navLinks');
    if (navToggle && navLinksContainer) {
        navToggle.addEventListener('click', () => {
            navLinksContainer.classList.toggle('active');
            navToggle.classList.toggle('open');
        });
    }

    // ----------------------------------------------------
    // 2. Firebase Configuration & Initialization
    // ----------------------------------------------------
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

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.database();

    // Password Hashing helper (SHA-256)
    async function hashPassword(password) {
        if (!password) return '';
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Currency Formatter (MYR)
    function formatMYR(amount) {
        const num = parseFloat(amount) || 0;
        return 'RM ' + num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }

    // Date Formatter (YYYY-MM-DD)
    function formatDate(dateStr) {
        if (!dateStr) return '-';
        return dateStr.split('T')[0];
    }

    // ----------------------------------------------------
    // 3. Authentication Flow & Session Management
    // ----------------------------------------------------
    const adminLogin = document.getElementById('adminLogin');
    const adminDashboard = document.getElementById('adminDashboard');
    const adminPasswordInput = document.getElementById('adminPassword');
    const adminLoginBtn = document.getElementById('adminLoginBtn');

    db.ref('settings/admin_password').on('value', (snapshot) => {
        adminPasswordHash = snapshot.val() || 'c5ade4700915e1f704bef4a178d76f5e7e9945fefd7f2cdabc6293bc1e78a445'; // default: '10011001'
    });

    function checkAuth() {
        if (sessionStorage.getItem('johorn_admin_auth') === 'true' || sessionStorage.getItem('admin_logged_in') === 'true') {
            sessionStorage.setItem('johorn_admin_auth', 'true');
            sessionStorage.setItem('admin_logged_in', 'true');
            if (adminLogin) adminLogin.style.display = 'none';
            if (adminDashboard) adminDashboard.style.display = 'block';
            initDataListeners();
        } else {
            if (adminLogin) adminLogin.style.display = 'block';
            if (adminDashboard) adminDashboard.style.display = 'none';
        }
    }

    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', async () => {
            const input = adminPasswordInput ? adminPasswordInput.value.trim() : '';
            if (!input) {
                alert('비밀번호를 입력해주세요.');
                return;
            }

            const inputHash = await hashPassword(input);
            const defaultHash = await hashPassword('10011001');

            if (inputHash === adminPasswordHash || inputHash === defaultHash || input === '10011001') {
                sessionStorage.setItem('johorn_admin_auth', 'true');
                sessionStorage.setItem('admin_logged_in', 'true');
                checkAuth();
            } else {
                alert('비밀번호가 올바르지 않습니다.');
            }
        });
    }

    if (adminPasswordInput) {
        adminPasswordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') adminLoginBtn.click();
        });
    }

    checkAuth();

    // ----------------------------------------------------
    // 4. Realtime Database Listeners & Seeding
    // ----------------------------------------------------
    function initDataListeners() {
        // Seed default schools if empty
        db.ref('commission_schools').once('value', (snapshot) => {
            if (!snapshot.exists()) {
                seedInitialSchools();
            }
        });

        // Seed default corporate entity if empty
        db.ref('commission_entities').once('value', (snapshot) => {
            if (!snapshot.exists()) {
                seedInitialEntities();
            }
        });

        // Listen for Partner Schools
        db.ref('commission_schools').on('value', (snapshot) => {
            const val = snapshot.val();
            schools = val ? Object.keys(val).map(k => ({ id: k, ...val[k] })) : [];
            updateSchoolDropdowns();
            renderSchools();
            renderAdmissions();
        });

        // Listen for Corporate Entities
        db.ref('commission_entities').on('value', (snapshot) => {
            const val = snapshot.val();
            entities = val ? Object.keys(val).map(k => ({ id: k, ...val[k] })) : [];
            updateEntityDropdowns();
            renderEntities();
            renderInvoices();
        });

        // Listen for Admissions
        db.ref('commission_admissions').on('value', (snapshot) => {
            const val = snapshot.val();
            if (!val) {
                seedInitialAdmissions();
                return;
            }
            admissions = Object.keys(val).map(k => ({ id: k, ...val[k] }));
            updateDashboardMetrics();
            renderAdmissions();
        });

        // Listen for Invoices
        db.ref('commission_invoices').on('value', (snapshot) => {
            const val = snapshot.val();
            invoices = val ? Object.keys(val).map(k => ({ id: k, ...val[k] })) : [];
            updateDashboardMetrics();
            renderInvoices();
        });

        // Listen for Payments
        db.ref('commission_payments').on('value', (snapshot) => {
            const val = snapshot.val();
            payments = val ? Object.keys(val).map(k => ({ id: k, ...val[k] })) : [];
            updateDashboardMetrics();
            renderPayments();
        });
    }

    // Seed Top Johor Bahru International Schools
    function seedInitialSchools() {
        const initialSchools = [
            {
                nameEn: "Marlborough College Malaysia",
                nameKo: "말보로 컬리지 말레이시아",
                commissionType: "percentage",
                defaultRate: 10,
                defaultSettlement: "2", // 2 terms split
                contactPerson: "Admissions & Accounts Dept",
                email: "admissions@marlboroughcollege.my",
                phone: "+60 7-560 2200",
                location: "Iskandar Puteri, Johor",
                memo: "영국 명문 보딩스쿨, Term 1 시작 30일 내 1차(50%), Term 2 시작 시 2차(50%) 정산"
            },
            {
                nameEn: "Raffles American School",
                nameKo: "래플스 아메리칸 스쿨",
                commissionType: "percentage",
                defaultRate: 15,
                defaultSettlement: "1", // 1-time
                contactPerson: "Finance Team / Ms. Joyce",
                email: "finance@raffles-american-school.edu.my",
                phone: "+60 7-509 8888",
                location: "Iskandar Puteri, Johor",
                memo: "미국식 커리큘럼(AP), 입학 확인 및 학비 납부 후 1회 일괄 정산"
            },
            {
                nameEn: "Sunway International School",
                nameKo: "선웨이 국제학교",
                commissionType: "percentage",
                defaultRate: 10,
                defaultSettlement: "1",
                contactPerson: "Admissions Office",
                email: "infosisj@sunway.edu.my",
                phone: "+60 7-533 8070",
                location: "Sunway City Iskandar Puteri, Johor",
                memo: "캐나다 온타리오 및 IB 커리큘럼"
            },
            {
                nameEn: "Crescendo-HELP International School",
                nameKo: "크레센도-헬프 국제학교",
                commissionType: "percentage",
                defaultRate: 10,
                defaultSettlement: "1",
                contactPerson: "Finance & Accounts",
                email: "accounts@chis.edu.my",
                phone: "+60 7-861 6788",
                location: "Desa Cemerlang, Johor",
                memo: "영국 캠브리지 IGCSE 커리큘럼, 가성비 우수 국제학교"
            },
            {
                nameEn: "Shattuck-St. Mary's Forest City",
                nameKo: "샤턱 세인트 메리스 포레스트 시티",
                commissionType: "percentage",
                defaultRate: 12,
                defaultSettlement: "2",
                contactPerson: "Admissions Dept",
                email: "admissions@ssm-fc.org",
                phone: "+60 7-500 5900",
                location: "Forest City, Johor",
                memo: "미국 본교 직영, 올림피아드 및 골프/테니스 특성화"
            },
            {
                nameEn: "Stellar International School",
                nameKo: "스텔라 국제학교",
                commissionType: "fixed",
                defaultRate: 3500, // Fixed RM 3,500
                defaultSettlement: "1",
                contactPerson: "Admissions Officer",
                email: "info@stellar.edu.my",
                phone: "+60 7-364 3808",
                location: "Puteri Harbour, Johor",
                memo: "푸테리 하버 인근 위치, 학생당 고정 커미션 RM 3,500 정산"
            }
        ];

        initialSchools.forEach(sch => {
            db.ref('commission_schools').push(sch);
        });
    }

    // Seed Default Corporate Entity
    function seedInitialEntities() {
        const defaultEntity = {
            name: "GLOBAL EDU CONSULTING SDN. BHD.",
            regNo: "202401048291 (1567890-V)",
            director: "Director / Authorized Signatory",
            contact: "finance@globaledu.com.my / +60 11-2345-6789",
            address: "Suite 12-05, Menara Teega, Puteri Harbour, 79000 Iskandar Puteri, Johor, Malaysia",
            bankName: "Malayan Banking Berhad (Maybank)",
            accountNo: "5012 8899 4321",
            accountName: "GLOBAL EDU CONSULTING SDN BHD",
            swiftCode: "MBBEMYKL",
            isDefault: true
        };
        db.ref('commission_entities').push(defaultEntity);
    }

    // Seed Sample Admissions
    function seedInitialAdmissions() {
        const todayStr = new Date().toISOString().split('T')[0];
        const sampleAdmissions = [
            {
                studentName: "김민준 (Minjun Kim)",
                grade: "Year 7 (중1)",
                parentContact: "김성훈 / 010-3849-1120",
                parentEmail: "minjun.parent@gmail.com",
                schoolName: "Marlborough College Malaysia",
                term: "2026-Term 1 (8월 입학)",
                admissionDate: todayStr,
                tuitionFee: 46000,
                commissionType: "percentage",
                commissionRate: 10,
                commissionAmount: 4600,
                settlementMode: "2",
                status: "partially_paid",
                entityName: "GLOBAL EDU CONSULTING SDN. BHD.",
                memo: "보딩스쿨 기숙사 신청 완료, Term 1 인보이스 입금 완료됨",
                installments: [
                    { term: "Term 1 (50%)", amount: 2300, dueDate: todayStr, status: "paid", invoiceNo: "INV-JHN-2026-001-T1" },
                    { term: "Term 2 (50%)", amount: 2300, dueDate: "2027-01-15", status: "invoiced", invoiceNo: "INV-JHN-2026-001-T2" }
                ]
            },
            {
                studentName: "이지우 (Jiwoo Lee)",
                grade: "Grade 4 (초4)",
                parentContact: "이진아 / 010-9284-5510",
                parentEmail: "jiwoo.mom@naver.com",
                schoolName: "Raffles American School",
                term: "2026-Term 1 (8월 입학)",
                admissionDate: todayStr,
                tuitionFee: 38000,
                commissionType: "percentage",
                commissionRate: 15,
                commissionAmount: 5700,
                settlementMode: "1",
                status: "invoiced",
                entityName: "GLOBAL EDU CONSULTING SDN. BHD.",
                memo: "입학 시험 합격, 인보이스 학교 재무팀 발송 완료",
                installments: [
                    { term: "Full 100%", amount: 5700, dueDate: todayStr, status: "invoiced", invoiceNo: "INV-JHN-2026-002" }
                ]
            },
            {
                studentName: "박서윤 (Seoyun Park)",
                grade: "Year 9 (중3)",
                parentContact: "박준영 / 010-4491-0029",
                parentEmail: "seoyun.family@daum.net",
                schoolName: "Stellar International School",
                term: "2026-Term 1 (8월 입학)",
                admissionDate: todayStr,
                tuitionFee: 28000,
                commissionType: "fixed",
                commissionRate: 3500,
                commissionAmount: 3500,
                settlementMode: "1",
                status: "paid",
                entityName: "GLOBAL EDU CONSULTING SDN. BHD.",
                memo: "고정 커미션 RM 3,500 전액 입금 완료 확인",
                installments: [
                    { term: "Full 100%", amount: 3500, dueDate: todayStr, status: "paid", invoiceNo: "INV-JHN-2026-003" }
                ]
            }
        ];

        sampleAdmissions.forEach(adm => {
            const newRef = db.ref('commission_admissions').push(adm);
            if (adm.status === 'partially_paid') {
                db.ref('commission_invoices').push({
                    invoiceNo: "INV-JHN-2026-001-T1",
                    admissionId: newRef.key,
                    schoolName: adm.schoolName,
                    studentName: adm.studentName,
                    termName: "Term 1 (50%)",
                    commissionType: adm.commissionType,
                    commissionRate: adm.commissionRate,
                    entityName: adm.entityName,
                    issueDate: todayStr,
                    dueDate: todayStr,
                    amount: 2300,
                    status: "paid"
                });
                db.ref('commission_invoices').push({
                    invoiceNo: "INV-JHN-2026-001-T2",
                    admissionId: newRef.key,
                    schoolName: adm.schoolName,
                    studentName: adm.studentName,
                    termName: "Term 2 (50%)",
                    commissionType: adm.commissionType,
                    commissionRate: adm.commissionRate,
                    entityName: adm.entityName,
                    issueDate: todayStr,
                    dueDate: "2027-01-15",
                    amount: 2300,
                    status: "issued"
                });
                db.ref('commission_payments').push({
                    admissionId: newRef.key,
                    invoiceNo: "INV-JHN-2026-001-T1",
                    schoolName: adm.schoolName,
                    studentName: adm.studentName,
                    termName: "Term 1 (50%)",
                    paymentDate: todayStr,
                    amount: 2300,
                    bank: "Maybank 법인 계좌",
                    refNo: "MB-202608-4910",
                    memo: "Term 1 수수료 수령 확인"
                });
            } else if (adm.status === 'invoiced') {
                db.ref('commission_invoices').push({
                    invoiceNo: "INV-JHN-2026-002",
                    admissionId: newRef.key,
                    schoolName: adm.schoolName,
                    studentName: adm.studentName,
                    termName: "Full 100%",
                    commissionType: adm.commissionType,
                    commissionRate: adm.commissionRate,
                    entityName: adm.entityName,
                    issueDate: todayStr,
                    dueDate: todayStr,
                    amount: 5700,
                    status: "issued"
                });
            } else if (adm.status === 'paid') {
                db.ref('commission_invoices').push({
                    invoiceNo: "INV-JHN-2026-003",
                    admissionId: newRef.key,
                    schoolName: adm.schoolName,
                    studentName: adm.studentName,
                    termName: "Full 100%",
                    commissionType: adm.commissionType,
                    commissionRate: adm.commissionRate,
                    entityName: adm.entityName,
                    issueDate: todayStr,
                    dueDate: todayStr,
                    amount: 3500,
                    status: "paid"
                });
                db.ref('commission_payments').push({
                    admissionId: newRef.key,
                    invoiceNo: "INV-JHN-2026-003",
                    schoolName: adm.schoolName,
                    studentName: adm.studentName,
                    termName: "Full 100%",
                    paymentDate: todayStr,
                    amount: 3500,
                    bank: "Maybank 법인 계좌",
                    refNo: "TT-9842145",
                    memo: "고정 커미션 RM 3,500 입금 확인"
                });
            }
        });
    }

    // ----------------------------------------------------
    // 5. Sub-Tab Navigation
    // ----------------------------------------------------
    const subTabBtns = document.querySelectorAll('.comm-tab-btn');
    const tabContents = {
        admissions: document.getElementById('tabContentAdmissions'),
        invoices: document.getElementById('tabContentInvoices'),
        payments: document.getElementById('tabContentPayments'),
        schools: document.getElementById('tabContentSchools'),
        entities: document.getElementById('tabContentEntities')
    };

    subTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            subTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            activeTab = btn.getAttribute('data-tab');
            Object.keys(tabContents).forEach(k => {
                if (tabContents[k]) {
                    if (k === activeTab) {
                        tabContents[k].classList.remove('hidden');
                    } else {
                        tabContents[k].classList.add('hidden');
                    }
                }
            });

            if (activeTab === 'admissions') renderAdmissions();
            if (activeTab === 'invoices') renderInvoices();
            if (activeTab === 'payments') renderPayments();
            if (activeTab === 'schools') renderSchools();
            if (activeTab === 'entities') renderEntities();
        });
    });

    const refreshBtn = document.getElementById('refreshCommDataBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            updateDashboardMetrics();
            renderAdmissions();
            renderInvoices();
            renderPayments();
            renderSchools();
            renderEntities();
            alert('데이터가 최신 상태로 동기화되었습니다.');
        });
    }

    // ----------------------------------------------------
    // 6. Modal Control Helpers
    // ----------------------------------------------------
    function openModal(modalId) {
        const m = document.getElementById(modalId);
        if (m) m.style.display = 'flex';
    }
    function closeModal(modalId) {
        const m = document.getElementById(modalId);
        if (m) m.style.display = 'none';
    }

    document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-modal');
            if (target) closeModal(target);
        });
    });

    // ----------------------------------------------------
    // 7. Dynamic Dropdowns Updater
    // ----------------------------------------------------
    function updateSchoolDropdowns() {
        const admissionSchoolId = document.getElementById('admissionSchoolId');
        const admissionSchoolFilter = document.getElementById('admissionSchoolFilter');
        const paymentSchoolFilter = document.getElementById('paymentSchoolFilter');

        if (admissionSchoolId) {
            admissionSchoolId.innerHTML = '<option value="">-- 학교 선택 --</option>' +
                schools.map(s => `<option value="${s.id}" data-type="${s.commissionType || 'percentage'}" data-rate="${s.defaultRate || 10}" data-settlement="${s.defaultSettlement || '1'}">${s.nameEn} (${s.nameKo || ''})</option>`).join('');
        }
        if (admissionSchoolFilter) {
            admissionSchoolFilter.innerHTML = '<option value="all">전체 국제학교</option>' +
                schools.map(s => `<option value="${s.nameEn}">${s.nameEn}</option>`).join('');
        }
        if (paymentSchoolFilter) {
            paymentSchoolFilter.innerHTML = '<option value="all">전체 학교</option>' +
                schools.map(s => `<option value="${s.nameEn}">${s.nameEn}</option>`).join('');
        }
    }

    function updateEntityDropdowns() {
        const admissionEntityId = document.getElementById('admissionEntityId');
        const invoiceModalEntitySelect = document.getElementById('invoiceModalEntitySelect');

        const optionsHtml = entities.map(e => `<option value="${e.id}" ${e.isDefault ? 'selected' : ''}>${e.name} (${e.regNo || ''})</option>`).join('');
        if (admissionEntityId) admissionEntityId.innerHTML = optionsHtml;
        if (invoiceModalEntitySelect) invoiceModalEntitySelect.innerHTML = optionsHtml;
    }

    // ----------------------------------------------------
    // 8. Overview Metrics Aggregation
    // ----------------------------------------------------
    function updateDashboardMetrics() {
        const statTotalAdmissions = document.getElementById('statTotalAdmissions');
        const statAdmissionsSub = document.getElementById('statAdmissionsSub');
        const statTotalInvoiced = document.getElementById('statTotalInvoiced');
        const statInvoicedSub = document.getElementById('statInvoicedSub');
        const statTotalPaid = document.getElementById('statTotalPaid');
        const statPendingCommission = document.getElementById('statPendingCommission');

        // Total Admissions
        const activeAdmCount = admissions.filter(a => a.status !== 'cancelled').length;
        const completedAdmCount = admissions.filter(a => a.status === 'paid').length;
        if (statTotalAdmissions) statTotalAdmissions.textContent = `${activeAdmCount}명`;
        if (statAdmissionsSub) statAdmissionsSub.textContent = `진행중 ${activeAdmCount - completedAdmCount}명 / 완료 ${completedAdmCount}명`;

        // Total Invoiced
        const totalInvoicedSum = invoices.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);
        if (statTotalInvoiced) statTotalInvoiced.textContent = formatMYR(totalInvoicedSum);
        if (statInvoicedSub) statInvoicedSub.textContent = `총 ${invoices.length}건 발행`;

        // Total Paid & Pending
        const totalPaidSum = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        if (statTotalPaid) statTotalPaid.textContent = formatMYR(totalPaidSum);

        const totalExpectedSum = admissions.filter(a => a.status !== 'cancelled').reduce((sum, a) => sum + (parseFloat(a.commissionAmount) || 0), 0);
        const pendingSum = Math.max(0, totalExpectedSum - totalPaidSum);
        if (statPendingCommission) statPendingCommission.textContent = formatMYR(pendingSum);
    }

    // ----------------------------------------------------
    // 9. SUB-TAB 1: Student Admissions Management
    // ----------------------------------------------------
    const admissionTableBody = document.getElementById('admissionTableBody');
    const admissionSearchInput = document.getElementById('admissionSearchInput');
    const admissionSchoolFilter = document.getElementById('admissionSchoolFilter');
    const admissionStatusFilter = document.getElementById('admissionStatusFilter');

    function renderAdmissions() {
        if (!admissionTableBody) return;

        const search = (admissionSearchInput ? admissionSearchInput.value.trim().toLowerCase() : '');
        const schoolFilter = (admissionSchoolFilter ? admissionSchoolFilter.value : 'all');
        const statusFilter = (admissionStatusFilter ? admissionStatusFilter.value : 'all');

        const filtered = admissions.filter(adm => {
            if (schoolFilter !== 'all' && adm.schoolName !== schoolFilter) return false;
            if (statusFilter !== 'all' && adm.status !== statusFilter) return false;
            if (search) {
                const combined = `${adm.studentName || ''} ${adm.parentContact || ''} ${adm.schoolName || ''} ${adm.grade || ''}`.toLowerCase();
                if (!combined.includes(search)) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            admissionTableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        <i class="fa-solid fa-graduation-cap" style="font-size: 32px; color: #C5A880; margin-bottom: 10px; display: block;"></i>
                        등록된 학생 입학 수속 내역이 없습니다.
                    </td>
                </tr>
            `;
            return;
        }

        admissionTableBody.innerHTML = filtered.map(adm => {
            const statusBadge = getStatusBadge(adm.status);
            const totalCommission = parseFloat(adm.commissionAmount) || 0;
            
            // Calculate progress for split installments
            const installments = adm.installments || [];
            const paidInstallments = installments.filter(inst => inst.status === 'paid');
            const paidAmount = paidInstallments.reduce((sum, inst) => sum + (parseFloat(inst.amount) || 0), 0);
            const progressPercent = totalCommission > 0 ? Math.min(100, Math.round((paidAmount / totalCommission) * 100)) : 0;

            const installmentModeLabel = adm.settlementMode === '1' ? '1회 일괄' : `${adm.settlementMode || 1}회 분할`;

            // Commission Condition Badge (Rate vs Fixed)
            const isFixed = adm.commissionType === 'fixed';
            const commissionTag = isFixed 
                ? `<span class="installment-tag" style="background: rgba(2, 136, 209, 0.1); color: #0288D1; font-weight: 700;">고정 ${formatMYR(adm.commissionAmount)}</span>`
                : `<span class="installment-tag">${adm.commissionRate || 10}% (비율)</span>`;

            return `
                <tr>
                    <td>
                        <strong style="color: var(--text-primary); font-size: 14px;">${adm.studentName || '-'}</strong>
                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
                            <i class="fa-solid fa-phone" style="font-size: 10px;"></i> ${adm.parentContact || '-'}
                        </div>
                    </td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-primary);">${adm.schoolName || '-'}</div>
                        <div style="font-size: 11px; color: var(--accent-color);">${adm.grade || '-'}</div>
                    </td>
                    <td>
                        <div style="font-size: 13px;">${adm.term || '-'}</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">입학일: ${formatDate(adm.admissionDate)}</div>
                    </td>
                    <td style="font-weight: 600;">${adm.tuitionFee ? formatMYR(adm.tuitionFee) : '-'}</td>
                    <td>${commissionTag}</td>
                    <td>
                        <div style="font-size: 12px; font-weight: 600;">
                            ${installmentModeLabel} (${paidInstallments.length}/${installments.length || 1}회 완납)
                        </div>
                        <div class="comm-progress-bar-container">
                            <div class="comm-progress-bar-fill" style="width: ${progressPercent}%;"></div>
                        </div>
                    </td>
                    <td>
                        <div style="font-weight: 700; color: #2E7D32;">${formatMYR(totalCommission)}</div>
                        <div style="font-size: 11px; color: #8C8782;">수금: ${formatMYR(paidAmount)}</div>
                    </td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="table-action-btns">
                            <button type="button" class="btn btn-primary btn-generate-invoice" data-id="${adm.id}" style="padding: 5px 9px; font-size: 11px;" title="인보이스 발행 / 출력">
                                <i class="fa-solid fa-file-invoice"></i> 인보이스
                            </button>
                            <button type="button" class="btn btn-secondary btn-quick-payment" data-id="${adm.id}" style="padding: 5px 9px; font-size: 11px; color: #2E7D32; border-color: #2E7D32;" title="입금 확인 처리">
                                <i class="fa-solid fa-money-bill-check"></i> 입금
                            </button>
                            <button type="button" class="btn btn-secondary btn-edit-admission" data-id="${adm.id}" style="padding: 5px 8px; font-size: 11px;" title="수정">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Bind Action Buttons
        document.querySelectorAll('.btn-generate-invoice').forEach(btn => {
            btn.addEventListener('click', () => openInvoiceForAdmission(btn.getAttribute('data-id')));
        });
        document.querySelectorAll('.btn-quick-payment').forEach(btn => {
            btn.addEventListener('click', () => openPaymentForAdmission(btn.getAttribute('data-id')));
        });
        document.querySelectorAll('.btn-edit-admission').forEach(btn => {
            btn.addEventListener('click', () => openEditAdmissionModal(btn.getAttribute('data-id')));
        });
    }

    if (admissionSearchInput) admissionSearchInput.addEventListener('input', renderAdmissions);
    if (admissionSchoolFilter) admissionSchoolFilter.addEventListener('change', renderAdmissions);
    if (admissionStatusFilter) admissionStatusFilter.addEventListener('change', renderAdmissions);

    function getStatusBadge(status) {
        switch (status) {
            case 'applied':
                return '<span class="status-badge status-applied"><i class="fa-solid fa-paper-plane"></i> 상담/수속</span>';
            case 'enrolled':
                return '<span class="status-badge status-enrolled"><i class="fa-solid fa-circle-check"></i> 입학확정</span>';
            case 'invoiced':
                return '<span class="status-badge status-invoiced"><i class="fa-solid fa-file-invoice-dollar"></i> 인보이스발행</span>';
            case 'partially_paid':
                return '<span class="status-badge status-partially-paid"><i class="fa-solid fa-clock-rotate-left"></i> 부분입금</span>';
            case 'paid':
                return '<span class="status-badge status-paid"><i class="fa-solid fa-circle-check"></i> 완납(입금완료)</span>';
            case 'cancelled':
                return '<span class="status-badge status-cancelled">취소/환불</span>';
            default:
                return '<span class="status-badge status-applied">접수</span>';
        }
    }

    // ----------------------------------------------------
    // 10. Admission Modal Logic & Dynamic Installment Split
    // ----------------------------------------------------
    const openAddAdmissionBtn = document.getElementById('openAddAdmissionBtn');
    const admissionSchoolId = document.getElementById('admissionSchoolId');
    const admissionCommissionType = document.getElementById('admissionCommissionType');
    const admissionTuitionFee = document.getElementById('admissionTuitionFee');
    const admissionCommissionRate = document.getElementById('admissionCommissionRate');
    const admissionFixedAmount = document.getElementById('admissionFixedAmount');
    const admissionRateWrapper = document.getElementById('admissionRateWrapper');
    const admissionFixedWrapper = document.getElementById('admissionFixedWrapper');
    const admissionCommissionAmount = document.getElementById('admissionCommissionAmount');
    const admissionSettlementMode = document.getElementById('admissionSettlementMode');
    const installmentsList = document.getElementById('installmentsList');
    const saveAdmissionBtn = document.getElementById('saveAdmissionBtn');
    const deleteAdmissionBtn = document.getElementById('deleteAdmissionBtn');

    function toggleCommissionTypeUI(type) {
        if (type === 'fixed') {
            if (admissionRateWrapper) admissionRateWrapper.style.display = 'none';
            if (admissionFixedWrapper) admissionFixedWrapper.style.display = 'block';
        } else {
            if (admissionRateWrapper) admissionRateWrapper.style.display = 'block';
            if (admissionFixedWrapper) admissionFixedWrapper.style.display = 'none';
        }
    }

    // Auto calculate commission amount & split schedules
    function calculateAdmissionFinancials() {
        const type = admissionCommissionType ? admissionCommissionType.value : 'percentage';
        toggleCommissionTypeUI(type);

        let totalCommission = 0;
        if (type === 'percentage') {
            const tuition = parseFloat(admissionTuitionFee ? admissionTuitionFee.value : 0) || 0;
            const rate = parseFloat(admissionCommissionRate ? admissionCommissionRate.value : 10) || 10;
            totalCommission = Math.round(tuition * (rate / 100));
        } else {
            totalCommission = parseFloat(admissionFixedAmount ? admissionFixedAmount.value : 0) || 0;
        }

        if (admissionCommissionAmount) {
            admissionCommissionAmount.value = totalCommission;
        }

        renderInstallmentsScheduleInputs(totalCommission);
    }

    if (admissionCommissionType) admissionCommissionType.addEventListener('change', calculateAdmissionFinancials);
    if (admissionTuitionFee) admissionTuitionFee.addEventListener('input', calculateAdmissionFinancials);
    if (admissionCommissionRate) admissionCommissionRate.addEventListener('input', calculateAdmissionFinancials);
    if (admissionFixedAmount) admissionFixedAmount.addEventListener('input', calculateAdmissionFinancials);
    if (admissionSettlementMode) admissionSettlementMode.addEventListener('change', calculateAdmissionFinancials);

    if (admissionSchoolId) {
        admissionSchoolId.addEventListener('change', () => {
            const selectedOpt = admissionSchoolId.options[admissionSchoolId.selectedIndex];
            if (selectedOpt && selectedOpt.value) {
                const commType = selectedOpt.getAttribute('data-type') || 'percentage';
                const defaultRate = selectedOpt.getAttribute('data-rate');
                const defaultSettlement = selectedOpt.getAttribute('data-settlement');
                
                if (admissionCommissionType) admissionCommissionType.value = commType;
                toggleCommissionTypeUI(commType);

                if (commType === 'fixed') {
                    if (admissionFixedAmount) admissionFixedAmount.value = defaultRate || 3000;
                } else {
                    if (admissionCommissionRate) admissionCommissionRate.value = defaultRate || 10;
                }
                if (defaultSettlement && admissionSettlementMode) admissionSettlementMode.value = defaultSettlement;
                calculateAdmissionFinancials();
            }
        });
    }

    function renderInstallmentsScheduleInputs(totalCommission, existingInstallments = null) {
        if (!installmentsList) return;
        const mode = parseInt(admissionSettlementMode ? admissionSettlementMode.value : 1) || 1;
        const admDate = document.getElementById('admissionDate').value || new Date().toISOString().split('T')[0];

        let items = [];
        if (existingInstallments && existingInstallments.length === mode) {
            items = existingInstallments;
        } else {
            for (let i = 1; i <= mode; i++) {
                const termAmount = mode === 1 ? totalCommission : Math.round(totalCommission / mode);
                const termName = mode === 1 ? 'Full 100%' : `Term ${i} (${Math.round(100 / mode)}%)`;
                
                // Estimate next term due dates
                const d = new Date(admDate);
                if (i > 1) d.setMonth(d.getMonth() + (i - 1) * 4);
                const dueDateStr = d.toISOString().split('T')[0];

                items.push({
                    term: termName,
                    amount: termAmount,
                    dueDate: dueDateStr,
                    status: 'pending',
                    invoiceNo: ''
                });
            }
        }

        installmentsList.innerHTML = items.map((item, idx) => `
            <div class="installment-schedule-row" style="display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr; gap: 8px; align-items: center; margin-bottom: 6px;" data-index="${idx}">
                <input type="text" class="form-control inst-term-input" value="${item.term}" placeholder="회차명 (예: Term ${idx + 1})" style="font-size: 12px; padding: 6px;">
                <input type="number" class="form-control inst-amount-input" value="${item.amount}" placeholder="금액 (MYR)" style="font-size: 12px; padding: 6px; font-weight: 600;">
                <input type="date" class="form-control inst-date-input" value="${item.dueDate || admDate}" style="font-size: 12px; padding: 6px;">
                <select class="form-control inst-status-input" style="font-size: 12px; padding: 6px;">
                    <option value="pending" ${item.status === 'pending' ? 'selected' : ''}>대기</option>
                    <option value="invoiced" ${item.status === 'invoiced' ? 'selected' : ''}>인보이스발행</option>
                    <option value="paid" ${item.status === 'paid' ? 'selected' : ''}>입금완료</option>
                </select>
            </div>
        `).join('');
    }

    if (openAddAdmissionBtn) {
        openAddAdmissionBtn.addEventListener('click', () => {
            document.getElementById('admissionModalTitle').innerHTML = '<i class="fa-solid fa-user-graduate" style="color: var(--accent-color);"></i> 신규 학생 입학 및 커미션 등록';
            document.getElementById('admissionId').value = '';
            document.getElementById('admissionForm').reset();
            document.getElementById('admissionDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('admissionCommissionType').value = 'percentage';
            document.getElementById('admissionCommissionRate').value = '10';
            document.getElementById('admissionSettlementMode').value = '1';
            toggleCommissionTypeUI('percentage');
            if (deleteAdmissionBtn) deleteAdmissionBtn.classList.add('hidden');
            calculateAdmissionFinancials();
            openModal('admissionModal');
        });
    }

    function openEditAdmissionModal(id) {
        const adm = admissions.find(a => a.id === id);
        if (!adm) return;

        document.getElementById('admissionModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square" style="color: var(--accent-color);"></i> 입학 및 커미션 정보 수정';
        document.getElementById('admissionId').value = adm.id;
        
        // Find matching school in select
        const sch = schools.find(s => s.nameEn === adm.schoolName);
        if (sch && admissionSchoolId) admissionSchoolId.value = sch.id;

        const commType = adm.commissionType || 'percentage';
        document.getElementById('admissionCommissionType').value = commType;
        toggleCommissionTypeUI(commType);

        document.getElementById('admissionTerm').value = adm.term || '';
        document.getElementById('admissionDate').value = adm.admissionDate || '';
        document.getElementById('admissionStatus').value = adm.status || 'applied';
        document.getElementById('admissionStudentName').value = adm.studentName || '';
        document.getElementById('admissionGrade').value = adm.grade || '';
        document.getElementById('admissionParentContact').value = adm.parentContact || '';
        document.getElementById('admissionParentEmail').value = adm.parentEmail || '';
        document.getElementById('admissionTuitionFee').value = adm.tuitionFee || '';
        
        if (commType === 'fixed') {
            document.getElementById('admissionFixedAmount').value = adm.commissionAmount || 0;
        } else {
            document.getElementById('admissionCommissionRate').value = adm.commissionRate || 10;
        }

        document.getElementById('admissionCommissionAmount').value = adm.commissionAmount || 0;
        document.getElementById('admissionSettlementMode').value = adm.settlementMode || '1';
        document.getElementById('admissionMemo').value = adm.memo || '';

        const ent = entities.find(e => e.name === adm.entityName);
        if (ent && document.getElementById('admissionEntityId')) {
            document.getElementById('admissionEntityId').value = ent.id;
        }

        renderInstallmentsScheduleInputs(parseFloat(adm.commissionAmount) || 0, adm.installments);

        if (deleteAdmissionBtn) deleteAdmissionBtn.classList.remove('hidden');
        openModal('admissionModal');
    }

    if (saveAdmissionBtn) {
        saveAdmissionBtn.addEventListener('click', () => {
            const id = document.getElementById('admissionId').value;
            const studentName = document.getElementById('admissionStudentName').value.trim();
            const schoolSelect = document.getElementById('admissionSchoolId');
            const schoolName = schoolSelect.options[schoolSelect.selectedIndex] ? schoolSelect.options[schoolSelect.selectedIndex].text.split('(')[0].trim() : '';

            if (!studentName || !schoolName) {
                alert('학생 이름과 대상 학교를 입력해주세요.');
                return;
            }

            const commType = document.getElementById('admissionCommissionType').value;
            const entitySelect = document.getElementById('admissionEntityId');
            const entityName = entitySelect.options[entitySelect.selectedIndex] ? entitySelect.options[entitySelect.selectedIndex].text.split('(')[0].trim() : 'GLOBAL EDU CONSULTING SDN. BHD.';

            // Collect installments
            const installmentRows = document.querySelectorAll('.installment-schedule-row');
            const installments = [];
            installmentRows.forEach(row => {
                const term = row.querySelector('.inst-term-input').value.trim();
                const amount = parseFloat(row.querySelector('.inst-amount-input').value) || 0;
                const dueDate = row.querySelector('.inst-date-input').value;
                const status = row.querySelector('.inst-status-input').value;
                installments.push({ term, amount, dueDate, status });
            });

            const data = {
                studentName,
                schoolName,
                grade: document.getElementById('admissionGrade').value.trim(),
                parentContact: document.getElementById('admissionParentContact').value.trim(),
                parentEmail: document.getElementById('admissionParentEmail').value.trim(),
                term: document.getElementById('admissionTerm').value.trim(),
                admissionDate: document.getElementById('admissionDate').value,
                status: document.getElementById('admissionStatus').value,
                tuitionFee: parseFloat(document.getElementById('admissionTuitionFee').value) || 0,
                commissionType: commType,
                commissionRate: commType === 'percentage' ? (parseFloat(document.getElementById('admissionCommissionRate').value) || 10) : 0,
                commissionAmount: parseFloat(document.getElementById('admissionCommissionAmount').value) || 0,
                settlementMode: document.getElementById('admissionSettlementMode').value,
                entityName,
                memo: document.getElementById('admissionMemo').value.trim(),
                installments,
                updatedAt: new Date().toISOString()
            };

            if (id) {
                db.ref('commission_admissions/' + id).update(data).then(() => {
                    closeModal('admissionModal');
                });
            } else {
                data.createdAt = new Date().toISOString();
                db.ref('commission_admissions').push(data).then(() => {
                    closeModal('admissionModal');
                });
            }
        });
    }

    if (deleteAdmissionBtn) {
        deleteAdmissionBtn.addEventListener('click', () => {
            const id = document.getElementById('admissionId').value;
            if (!id) return;
            if (confirm('해당 학생 입학 건을 정말로 삭제하시겠습니까?')) {
                db.ref('commission_admissions/' + id).remove().then(() => {
                    closeModal('admissionModal');
                });
            }
        });
    }

    // ----------------------------------------------------
    // 11. SUB-TAB 2 & MODAL 2: Official Invoice Management & Print Engine
    // ----------------------------------------------------
    const invoiceTableBody = document.getElementById('invoiceTableBody');
    const invoiceSearchInput = document.getElementById('invoiceSearchInput');
    const invoiceStatusFilter = document.getElementById('invoiceStatusFilter');
    const invoiceSheetContainer = document.getElementById('invoiceSheetContainer');
    const invoiceModalEntitySelect = document.getElementById('invoiceModalEntitySelect');
    const printInvoiceBtn = document.getElementById('printInvoiceBtn');
    const copyInvoiceEmailBtn = document.getElementById('copyInvoiceEmailBtn');
    const markInvoicePaidBtn = document.getElementById('markInvoicePaidBtn');

    let currentViewingInvoice = null;

    function renderInvoices() {
        if (!invoiceTableBody) return;

        const search = (invoiceSearchInput ? invoiceSearchInput.value.trim().toLowerCase() : '');
        const statusFilter = (invoiceStatusFilter ? invoiceStatusFilter.value : 'all');

        const filtered = invoices.filter(inv => {
            if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
            if (search) {
                const combined = `${inv.invoiceNo || ''} ${inv.schoolName || ''} ${inv.studentName || ''}`.toLowerCase();
                if (!combined.includes(search)) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            invoiceTableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        <i class="fa-solid fa-file-invoice" style="font-size: 32px; color: #C5A880; margin-bottom: 10px; display: block;"></i>
                        발행된 인보이스 내역이 없습니다.
                    </td>
                </tr>
            `;
            return;
        }

        invoiceTableBody.innerHTML = filtered.map(inv => {
            let statusBadge = '<span class="status-badge status-invoiced">발행됨</span>';
            if (inv.status === 'paid') statusBadge = '<span class="status-badge status-paid">입금 완료</span>';
            if (inv.status === 'overdue') statusBadge = '<span class="status-badge status-overdue">기한 초과</span>';

            return `
                <tr>
                    <td>
                        <strong style="color: var(--accent-color); font-family: monospace; font-size: 13px;">${inv.invoiceNo}</strong>
                    </td>
                    <td style="font-weight: 600;">${inv.schoolName || '-'}</td>
                    <td>
                        <div>${inv.studentName || '-'}</div>
                        <span class="installment-tag" style="font-size: 10px;">${inv.termName || 'Full 100%'}</span>
                    </td>
                    <td style="font-size: 12px; color: var(--text-secondary);">${inv.entityName || 'GLOBAL EDU'}</td>
                    <td>
                        <div style="font-size: 12px;">발행: ${formatDate(inv.issueDate)}</div>
                        <div style="font-size: 11px; color: #C62828;">기한: ${formatDate(inv.dueDate)}</div>
                    </td>
                    <td style="font-weight: 700; color: #2E7D32;">${formatMYR(inv.amount)}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="table-action-btns">
                            <button type="button" class="btn btn-primary btn-view-invoice" data-id="${inv.id}" style="padding: 5px 9px; font-size: 11px;">
                                <i class="fa-solid fa-eye"></i> 열람/인쇄
                            </button>
                            ${inv.status !== 'paid' ? `
                                <button type="button" class="btn btn-secondary btn-pay-invoice" data-id="${inv.id}" style="padding: 5px 9px; font-size: 11px; color: #2E7D32; border-color: #2E7D32;">
                                    <i class="fa-solid fa-circle-check"></i> 입금
                                </button>
                            ` : ''}
                            <button type="button" class="btn btn-secondary btn-del-invoice" data-id="${inv.id}" style="padding: 5px 8px; font-size: 11px; color: #C62828; border-color: #C62828;">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        document.querySelectorAll('.btn-view-invoice').forEach(btn => {
            btn.addEventListener('click', () => openInvoiceModalById(btn.getAttribute('data-id')));
        });
        document.querySelectorAll('.btn-pay-invoice').forEach(btn => {
            btn.addEventListener('click', () => openPaymentForInvoice(btn.getAttribute('data-id')));
        });
        document.querySelectorAll('.btn-del-invoice').forEach(btn => {
            btn.addEventListener('click', () => deleteInvoiceById(btn.getAttribute('data-id')));
        });
    }

    if (invoiceSearchInput) invoiceSearchInput.addEventListener('input', renderInvoices);
    if (invoiceStatusFilter) invoiceStatusFilter.addEventListener('change', renderInvoices);

    // Open/Generate Invoice for an Admission
    function openInvoiceForAdmission(admissionId) {
        const adm = admissions.find(a => a.id === admissionId);
        if (!adm) return;

        const invoiceNo = `INV-JHN-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`;
        const todayStr = new Date().toISOString().split('T')[0];
        
        const defaultEntity = entities.find(e => e.isDefault) || entities[0] || {
            name: "GLOBAL EDU CONSULTING SDN. BHD.",
            regNo: "202401048291 (1567890-V)",
            address: "Suite 12-05, Menara Teega, Puteri Harbour, 79000 Iskandar Puteri, Johor",
            contact: "finance@globaledu.com.my",
            bankName: "Malayan Banking Berhad (Maybank)",
            accountNo: "5012 8899 4321",
            accountName: "GLOBAL EDU CONSULTING SDN BHD",
            swiftCode: "MBBEMYKL"
        };

        const invoiceData = {
            invoiceNo,
            admissionId: adm.id,
            schoolName: adm.schoolName,
            studentName: adm.studentName,
            grade: adm.grade || '',
            termName: adm.term || 'Term Placement',
            commissionType: adm.commissionType || 'percentage',
            tuitionFee: adm.tuitionFee || 0,
            commissionRate: adm.commissionRate || 10,
            amount: adm.commissionAmount || 0,
            issueDate: todayStr,
            dueDate: todayStr,
            status: "issued",
            entityId: defaultEntity.id || '',
            entityName: defaultEntity.name
        };

        currentViewingInvoice = invoiceData;
        renderInvoiceSheet(invoiceData, defaultEntity, adm);
        openModal('invoiceModal');
    }

    function openInvoiceModalById(invoiceId) {
        const inv = invoices.find(i => i.id === invoiceId);
        if (!inv) return;
        currentViewingInvoice = inv;
        const adm = admissions.find(a => a.id === inv.admissionId);
        const ent = entities.find(e => e.name === inv.entityName || e.id === inv.entityId) || entities[0];
        renderInvoiceSheet(inv, ent, adm);
        openModal('invoiceModal');
    }

    function renderInvoiceSheet(inv, entity, admission) {
        if (!invoiceSheetContainer) return;

        const ent = entity || {
            name: "GLOBAL EDU CONSULTING SDN. BHD.",
            regNo: "202401048291 (1567890-V)",
            address: "Suite 12-05, Menara Teega, Puteri Harbour, 79000 Iskandar Puteri, Johor, Malaysia",
            contact: "finance@globaledu.com.my / +60 11-2345-6789",
            bankName: "Malayan Banking Berhad (Maybank)",
            accountNo: "5012 8899 4321",
            accountName: "GLOBAL EDU CONSULTING SDN BHD",
            swiftCode: "MBBEMYKL"
        };

        const sch = schools.find(s => s.nameEn === inv.schoolName) || {};
        const isFixed = inv.commissionType === 'fixed';
        const rateLabel = isFixed ? 'Fixed Fee' : `${inv.commissionRate || 10}%`;

        invoiceSheetContainer.innerHTML = `
            <div style="padding: 10px 5px;">
                <!-- Letterhead Header -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a1a1a; padding-bottom: 18px; margin-bottom: 20px;">
                    <div>
                        <h2 style="font-size: 22px; font-weight: 800; color: #1a1a1a; margin: 0; letter-spacing: -0.01em;">${ent.name}</h2>
                        <div style="font-size: 11px; color: #666; margin-top: 3px;">Company Reg. No: <strong>${ent.regNo || '-'}</strong></div>
                        <div style="font-size: 11px; color: #666; margin-top: 2px; max-width: 380px; line-height: 1.4;">${ent.address || '-'}</div>
                        <div style="font-size: 11px; color: #666; margin-top: 2px;">Email: ${ent.contact || '-'}</div>
                    </div>
                    <div style="text-align: right;">
                        <h1 style="font-size: 26px; font-weight: 800; color: var(--accent-color); margin: 0; letter-spacing: 0.05em;">INVOICE</h1>
                        <div style="font-size: 13px; font-weight: 700; color: #1a1a1a; margin-top: 5px;"># ${inv.invoiceNo}</div>
                        <div style="font-size: 11px; color: #666; margin-top: 3px;">Date: <strong>${formatDate(inv.issueDate)}</strong></div>
                        <div style="font-size: 11px; color: #C62828; margin-top: 2px;">Due Date: <strong>${formatDate(inv.dueDate)}</strong></div>
                    </div>
                </div>

                <!-- Bill To & Placement Details -->
                <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; margin-bottom: 25px; font-size: 12px;">
                    <div style="background: #FAF9F6; padding: 14px 16px; border-radius: 6px; border: 1px solid var(--border-color);">
                        <strong style="color: var(--accent-color); text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">BILL TO (국제학교 수신처)</strong>
                        <div style="font-size: 14px; font-weight: 700; color: #1a1a1a;">${inv.schoolName}</div>
                        <div style="color: #666; margin-top: 3px;">Attn: ${sch.contactPerson || 'Admissions & Accounts Dept'}</div>
                        <div style="color: #666;">Email: ${sch.email || '-'}</div>
                        <div style="color: #666;">Location: ${sch.location || 'Johor, Malaysia'}</div>
                    </div>
                    <div style="background: #FAF9F6; padding: 14px 16px; border-radius: 6px; border: 1px solid var(--border-color);">
                        <strong style="color: var(--accent-color); text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">STUDENT PLACEMENT DETAILS</strong>
                        <div style="font-size: 13px; font-weight: 700; color: #1a1a1a;">Student: ${inv.studentName}</div>
                        <div style="color: #666; margin-top: 3px;">Year / Grade: ${inv.grade || (admission ? admission.grade : '-')}</div>
                        <div style="color: #666;">Intake Term: ${inv.termName || (admission ? admission.term : '2026 Academic Year')}</div>
                        <div style="color: #666;">Tuition Base: ${inv.tuitionFee ? formatMYR(inv.tuitionFee) : 'Fixed Flat Agreement'}</div>
                    </div>
                </div>

                <!-- Line Items Table -->
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px;">
                    <thead>
                        <tr style="background: #1a1a1a; color: #ffffff;">
                            <th style="padding: 10px 12px; text-align: left; font-weight: 600;">Description (서비스 항목)</th>
                            <th style="padding: 10px 12px; text-align: right; font-weight: 600;">Tuition Fee</th>
                            <th style="padding: 10px 12px; text-align: right; font-weight: 600;">Rate / Terms</th>
                            <th style="padding: 10px 12px; text-align: right; font-weight: 600;">Amount (MYR)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 12px; line-height: 1.4;">
                                <strong>Student Admission & Placement Commission Fee</strong>
                                <div style="font-size: 11px; color: #666;">Student: ${inv.studentName} | ${inv.schoolName} (${inv.termName || 'Term Placement'})</div>
                            </td>
                            <td style="padding: 12px; text-align: right;">${inv.tuitionFee ? formatMYR(inv.tuitionFee) : '-'}</td>
                            <td style="padding: 12px; text-align: right;">${rateLabel}</td>
                            <td style="padding: 12px; text-align: right; font-weight: 700;">${formatMYR(inv.amount)}</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="3" style="padding: 10px 12px; text-align: right; font-weight: 600; color: #666;">Subtotal:</td>
                            <td style="padding: 10px 12px; text-align: right; font-weight: 600;">${formatMYR(inv.amount)}</td>
                        </tr>
                        <tr>
                            <td colspan="3" style="padding: 6px 12px; text-align: right; font-weight: 600; color: #666;">SST / Service Tax (0%):</td>
                            <td style="padding: 6px 12px; text-align: right; font-weight: 600;">RM 0.00</td>
                        </tr>
                        <tr style="border-top: 2px solid #1a1a1a; font-size: 15px;">
                            <td colspan="3" style="padding: 12px; text-align: right; font-weight: 800; color: #1a1a1a;">TOTAL DUE (총 청구금액):</td>
                            <td style="padding: 12px; text-align: right; font-weight: 800; color: #2E7D32; font-size: 16px;">${formatMYR(inv.amount)}</td>
                        </tr>
                    </tfoot>
                </table>

                <!-- Bank Remittance Instructions -->
                <div style="background: #F4F2EE; border: 1px solid var(--border-color); border-radius: 6px; padding: 16px 20px; margin-bottom: 20px; font-size: 12px;">
                    <div style="font-weight: 700; color: var(--accent-color); font-size: 12px; text-transform: uppercase; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-building-columns"></i> REMITTANCE / BANK ACCOUNT DETAILS (수취 계좌 안내)
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; line-height: 1.5;">
                        <div>
                            <div>Bank Name: <strong>${ent.bankName || 'Maybank'}</strong></div>
                            <div>Account Name: <strong>${ent.accountName || ent.name}</strong></div>
                        </div>
                        <div>
                            <div>Account No: <strong style="font-family: monospace; font-size: 13px; color: #1a1a1a;">${ent.accountNo || '-'}</strong></div>
                            <div>SWIFT / BIC Code: <strong style="font-family: monospace;">${ent.swiftCode || '-'}</strong></div>
                        </div>
                    </div>
                    <div style="font-size: 11px; color: #777; margin-top: 8px; border-top: 1px dashed var(--border-color); padding-top: 6px;">
                        * Please quote Invoice No. <strong>${inv.invoiceNo}</strong> as payment reference.
                    </div>
                </div>

                <!-- Signatory Footer -->
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; padding-top: 15px;">
                    <div style="font-size: 11px; color: #888; line-height: 1.4;">
                        Thank you for your partnership.<br>
                        JohorN Edu Consulting & Settlement Care Services
                    </div>
                    <div style="text-align: center; border-top: 1px solid #aaa; padding-top: 8px; width: 180px;">
                        <div style="font-size: 12px; font-weight: 700; color: #1a1a1a;">${ent.director || 'Authorized Signatory'}</div>
                        <div style="font-size: 10px; color: #777;">${ent.name}</div>
                    </div>
                </div>
            </div>
        `;
    }

    if (printInvoiceBtn) {
        printInvoiceBtn.addEventListener('click', () => {
            window.print();
        });
    }

    if (copyInvoiceEmailBtn) {
        copyInvoiceEmailBtn.addEventListener('click', () => {
            if (!currentViewingInvoice) return;
            const inv = currentViewingInvoice;
            const ent = entities.find(e => e.name === inv.entityName) || entities[0] || {};
            const text = `
[INVOICE: ${inv.invoiceNo}] Student Commission Fee Billing

Dear ${inv.schoolName} Finance / Admissions Team,

Greetings from ${ent.name || 'JohorN Edu Consulting'}.

Please find the commission invoice details for student placement below:

- Invoice No: ${inv.invoiceNo}
- Student Name: ${inv.studentName}
- Target School: ${inv.schoolName}
- Intake / Term: ${inv.termName || 'Term Placement'}
- Commission Due: ${formatMYR(inv.amount)}
- Due Date: ${formatDate(inv.dueDate)}

[Remittance Bank Details]
- Bank Name: ${ent.bankName || 'Maybank'}
- Account Name: ${ent.accountName || ent.name}
- Account No: ${ent.accountNo || ''}
- SWIFT Code: ${ent.swiftCode || ''}
- Payment Reference: ${inv.invoiceNo}

Please let us know once the remittance is processed. Thank you!

Best regards,
${ent.name || 'JohorN'}
            `.trim();

            navigator.clipboard.writeText(text).then(() => {
                alert('인보이스 이메일 발송용 텍스트가 클립보드에 복사되었습니다.');
            }).catch(() => {
                prompt('아래 텍스트를 복사하세요:', text);
            });
        });
    }

    if (markInvoicePaidBtn) {
        markInvoicePaidBtn.addEventListener('click', () => {
            if (!currentViewingInvoice) return;
            closeModal('invoiceModal');
            openPaymentForInvoice(currentViewingInvoice.id);
        });
    }

    function deleteInvoiceById(id) {
        if (!id) return;
        if (confirm('해당 인보이스 내역을 삭제하시겠습니까?')) {
            db.ref('commission_invoices/' + id).remove().then(() => {
                renderInvoices();
            });
        }
    }

    // ----------------------------------------------------
    // 12. SUB-TAB 3 & MODAL 3: Payments & Settlement Confirmation
    // ----------------------------------------------------
    const paymentTableBody = document.getElementById('paymentTableBody');
    const paymentSchoolFilter = document.getElementById('paymentSchoolFilter');
    const filteredPaymentTotal = document.getElementById('filteredPaymentTotal');
    const confirmPaymentSaveBtn = document.getElementById('confirmPaymentSaveBtn');

    function renderPayments() {
        if (!paymentTableBody) return;

        const targetMonth = (paymentMonthFilter ? paymentMonthFilter.value : '');
        const schoolFilter = (paymentSchoolFilter ? paymentSchoolFilter.value : 'all');

        const filtered = payments.filter(p => {
            if (targetMonth && (!p.paymentDate || !p.paymentDate.startsWith(targetMonth))) return false;
            if (schoolFilter !== 'all' && p.schoolName !== schoolFilter) return false;
            return true;
        });

        const totalSum = filtered.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        if (filteredPaymentTotal) filteredPaymentTotal.textContent = formatMYR(totalSum);

        if (filtered.length === 0) {
            paymentTableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        <i class="fa-solid fa-receipt" style="font-size: 32px; color: #C5A880; margin-bottom: 10px; display: block;"></i>
                        선택한 기간에 등록된 커미션 입금 내역이 없습니다.
                    </td>
                </tr>
            `;
            return;
        }

        paymentTableBody.innerHTML = filtered.map(p => `
            <tr>
                <td style="font-weight: 600;">${formatDate(p.paymentDate)}</td>
                <td style="font-weight: 600; color: var(--text-primary);">${p.schoolName || '-'}</td>
                <td>
                    <div>${p.studentName || '-'}</div>
                    <span class="installment-tag" style="font-size: 10px;">${p.termName || '전액'}</span>
                </td>
                <td style="font-family: monospace; font-size: 12px; color: var(--accent-color);">${p.invoiceNo || '-'}</td>
                <td style="font-weight: 700; color: #2E7D32; font-size: 14px;">${formatMYR(p.amount)}</td>
                <td style="font-size: 12px;">${p.bank || 'Maybank'}</td>
                <td style="font-family: monospace; font-size: 11px;">${p.refNo || '-'}</td>
                <td style="font-size: 12px; color: var(--text-secondary);">${p.memo || '-'}</td>
                <td>
                    <button type="button" class="btn btn-secondary btn-del-payment" data-id="${p.id}" style="padding: 5px 8px; font-size: 11px; color: #C62828; border-color: #C62828;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('.btn-del-payment').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                if (confirm('해당 입금 내역을 삭제하시겠습니까?')) {
                    db.ref('commission_payments/' + id).remove();
                }
            });
        });
    }

    if (paymentMonthFilter) paymentMonthFilter.addEventListener('change', renderPayments);
    if (paymentSchoolFilter) paymentSchoolFilter.addEventListener('change', renderPayments);

    function openPaymentForAdmission(admissionId) {
        const adm = admissions.find(a => a.id === admissionId);
        if (!adm) return;

        document.getElementById('paymentAdmissionId').value = adm.id;
        document.getElementById('paymentInvoiceId').value = '';
        document.getElementById('paymentDateInput').value = new Date().toISOString().split('T')[0];
        document.getElementById('paymentAmountInput').value = adm.commissionAmount || 0;
        document.getElementById('paymentBankInput').value = 'Maybank 법인 계좌';
        document.getElementById('paymentRefInput').value = '';
        document.getElementById('paymentMemoInput').value = `${adm.schoolName} 입금 확인`;

        document.getElementById('paymentTargetSummaryBox').innerHTML = `
            <strong>대상 학생:</strong> ${adm.studentName} (${adm.schoolName})<br>
            <strong>총 커미션:</strong> ${formatMYR(adm.commissionAmount)} | <strong>정산:</strong> ${adm.settlementMode || 1}회 정산
        `;

        openModal('paymentModal');
    }

    function openPaymentForInvoice(invoiceId) {
        const inv = invoices.find(i => i.id === invoiceId);
        if (!inv) return;

        document.getElementById('paymentAdmissionId').value = inv.admissionId || '';
        document.getElementById('paymentInvoiceId').value = inv.id;
        document.getElementById('paymentDateInput').value = new Date().toISOString().split('T')[0];
        document.getElementById('paymentAmountInput').value = inv.amount || 0;
        document.getElementById('paymentBankInput').value = 'Maybank 법인 계좌';
        document.getElementById('paymentRefInput').value = '';
        document.getElementById('paymentMemoInput').value = `인보이스 ${inv.invoiceNo} 입금 확인`;

        document.getElementById('paymentTargetSummaryBox').innerHTML = `
            <strong>인보이스:</strong> ${inv.invoiceNo} (${inv.schoolName})<br>
            <strong>학생명:</strong> ${inv.studentName} | <strong>청구액:</strong> ${formatMYR(inv.amount)}
        `;

        openModal('paymentModal');
    }

    if (confirmPaymentSaveBtn) {
        confirmPaymentSaveBtn.addEventListener('click', () => {
            const admissionId = document.getElementById('paymentAdmissionId').value;
            const invoiceId = document.getElementById('paymentInvoiceId').value;
            const paymentDate = document.getElementById('paymentDateInput').value;
            const amount = parseFloat(document.getElementById('paymentAmountInput').value) || 0;
            const bank = document.getElementById('paymentBankInput').value.trim();
            const refNo = document.getElementById('paymentRefInput').value.trim();
            const memo = document.getElementById('paymentMemoInput').value.trim();

            if (!paymentDate || amount <= 0) {
                alert('입금일자와 올바른 입금액을 입력해주세요.');
                return;
            }

            const adm = admissions.find(a => a.id === admissionId);
            const inv = invoices.find(i => i.id === invoiceId);

            const paymentRecord = {
                admissionId: admissionId || '',
                invoiceId: invoiceId || '',
                invoiceNo: inv ? inv.invoiceNo : (adm ? `INV-${adm.studentName}` : ''),
                schoolName: inv ? inv.schoolName : (adm ? adm.schoolName : ''),
                studentName: inv ? inv.studentName : (adm ? adm.studentName : ''),
                termName: inv ? inv.termName : (adm ? adm.term : ''),
                paymentDate,
                amount,
                bank,
                refNo,
                memo,
                createdAt: new Date().toISOString()
            };

            // Save payment record
            db.ref('commission_payments').push(paymentRecord).then(() => {
                // Update Invoice status to paid
                if (invoiceId) {
                    db.ref('commission_invoices/' + invoiceId).update({ status: 'paid' });
                }

                // Update Admission status to paid or partially_paid
                if (admissionId && adm) {
                    db.ref('commission_admissions/' + admissionId).update({ status: 'paid' });
                }

                closeModal('paymentModal');
                alert('입금 확인 및 정산 완료 처리가 저장되었습니다.');
            });
        });
    }

    // ----------------------------------------------------
    // 13. SUB-TAB 4 & MODAL 4: Partner International Schools
    // ----------------------------------------------------
    const schoolsListGrid = document.getElementById('schoolsListGrid');
    const openAddSchoolBtn = document.getElementById('openAddSchoolBtn');
    const schoolCommissionType = document.getElementById('schoolCommissionType');
    const schoolValueLabel = document.getElementById('schoolValueLabel');
    const schoolDefaultRate = document.getElementById('schoolDefaultRate');
    const saveSchoolBtn = document.getElementById('saveSchoolBtn');
    const deleteSchoolBtn = document.getElementById('deleteSchoolBtn');

    if (schoolCommissionType) {
        schoolCommissionType.addEventListener('change', () => {
            if (schoolCommissionType.value === 'fixed') {
                if (schoolValueLabel) schoolValueLabel.innerHTML = '기본 고정 금액 (MYR) <span style="color: #C62828;">*</span>';
                if (schoolDefaultRate) schoolDefaultRate.placeholder = '예: 3000';
            } else {
                if (schoolValueLabel) schoolValueLabel.innerHTML = '기본 요율 (%) <span style="color: #C62828;">*</span>';
                if (schoolDefaultRate) schoolDefaultRate.placeholder = '10';
            }
        });
    }

    function renderSchools() {
        if (!schoolsListGrid) return;

        if (schools.length === 0) {
            schoolsListGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary); background: var(--white); border-radius: 8px; border: 1px solid var(--border-color);">
                    등록된 협력 국제학교가 없습니다.
                </div>
            `;
            return;
        }

        schoolsListGrid.innerHTML = schools.map(sch => {
            const schoolAdmissions = admissions.filter(a => a.schoolName === sch.nameEn);
            const totalCount = schoolAdmissions.length;
            const totalCommission = schoolAdmissions.reduce((sum, a) => sum + (parseFloat(a.commissionAmount) || 0), 0);

            const rateTag = sch.commissionType === 'fixed'
                ? `<span class="installment-tag" style="background: rgba(2, 136, 209, 0.1); color: #0288D1; font-weight: 700;">고정 ${formatMYR(sch.defaultRate || 0)}</span>`
                : `<span class="installment-tag" style="background: rgba(46, 125, 50, 0.1); color: #2E7D32; font-weight: 700;">${sch.defaultRate || 10}%</span>`;

            return `
                <div class="school-card">
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                            <h4 style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0; line-height: 1.3;">${sch.nameEn}</h4>
                            ${rateTag}
                        </div>
                        <div style="font-size: 12px; color: var(--accent-color); font-weight: 500; margin-bottom: 12px;">${sch.nameKo || ''}</div>
                        
                        <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 15px;">
                            <div><i class="fa-solid fa-user-tie" style="width: 16px; color: #8C8782;"></i> ${sch.contactPerson || '입학/재무팀'}</div>
                            <div><i class="fa-solid fa-envelope" style="width: 16px; color: #8C8782;"></i> ${sch.email || '-'}</div>
                            <div><i class="fa-solid fa-phone" style="width: 16px; color: #8C8782;"></i> ${sch.phone || '-'}</div>
                            <div><i class="fa-solid fa-location-dot" style="width: 16px; color: #8C8782;"></i> ${sch.location || '-'}</div>
                        </div>
                    </div>

                    <div style="border-top: 1px solid var(--border-color); padding-top: 12px; display: flex; justify-content: space-between; align-items: center;">
                        <div style="font-size: 11px; color: var(--text-secondary);">
                            수속 <strong>${totalCount}명</strong> | 커미션 <strong style="color: #2E7D32;">${formatMYR(totalCommission)}</strong>
                        </div>
                        <button type="button" class="btn btn-secondary btn-edit-school" data-id="${sch.id}" style="padding: 4px 10px; font-size: 11px;">
                            <i class="fa-solid fa-pen"></i> 수정
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        document.querySelectorAll('.btn-edit-school').forEach(btn => {
            btn.addEventListener('click', () => openEditSchoolModal(btn.getAttribute('data-id')));
        });
    }

    if (openAddSchoolBtn) {
        openAddSchoolBtn.addEventListener('click', () => {
            document.getElementById('schoolModalTitle').innerHTML = '<i class="fa-solid fa-school" style="color: var(--accent-color);"></i> 협력 국제학교 추가';
            document.getElementById('schoolId').value = '';
            document.getElementById('schoolForm').reset();
            document.getElementById('schoolCommissionType').value = 'percentage';
            if (schoolValueLabel) schoolValueLabel.innerHTML = '기본 요율 (%) <span style="color: #C62828;">*</span>';
            document.getElementById('schoolDefaultRate').value = '10';
            document.getElementById('schoolDefaultSettlement').value = '1';
            if (deleteSchoolBtn) deleteSchoolBtn.classList.add('hidden');
            openModal('schoolModal');
        });
    }

    function openEditSchoolModal(id) {
        const sch = schools.find(s => s.id === id);
        if (!sch) return;

        document.getElementById('schoolModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square" style="color: var(--accent-color);"></i> 협력 국제학교 정보 수정';
        document.getElementById('schoolId').value = sch.id;
        document.getElementById('schoolNameEn').value = sch.nameEn || '';
        document.getElementById('schoolNameKo').value = sch.nameKo || '';
        
        const commType = sch.commissionType || 'percentage';
        document.getElementById('schoolCommissionType').value = commType;
        if (commType === 'fixed') {
            if (schoolValueLabel) schoolValueLabel.innerHTML = '기본 고정 금액 (MYR) <span style="color: #C62828;">*</span>';
            document.getElementById('schoolDefaultRate').value = sch.defaultRate || 3000;
        } else {
            if (schoolValueLabel) schoolValueLabel.innerHTML = '기본 요율 (%) <span style="color: #C62828;">*</span>';
            document.getElementById('schoolDefaultRate').value = sch.defaultRate || 10;
        }

        document.getElementById('schoolDefaultSettlement').value = sch.defaultSettlement || '1';
        document.getElementById('schoolContactPerson').value = sch.contactPerson || '';
        document.getElementById('schoolEmail').value = sch.email || '';
        document.getElementById('schoolPhone').value = sch.phone || '';
        document.getElementById('schoolLocation').value = sch.location || '';
        document.getElementById('schoolMemo').value = sch.memo || '';

        if (deleteSchoolBtn) deleteSchoolBtn.classList.remove('hidden');
        openModal('schoolModal');
    }

    if (saveSchoolBtn) {
        saveSchoolBtn.addEventListener('click', () => {
            const id = document.getElementById('schoolId').value;
            const nameEn = document.getElementById('schoolNameEn').value.trim();
            const email = document.getElementById('schoolEmail').value.trim();

            if (!nameEn || !email) {
                alert('학교 영문명과 이메일을 입력해주세요.');
                return;
            }

            const commType = document.getElementById('schoolCommissionType').value;

            const data = {
                nameEn,
                nameKo: document.getElementById('schoolNameKo').value.trim(),
                commissionType: commType,
                defaultRate: parseFloat(document.getElementById('schoolDefaultRate').value) || 10,
                defaultSettlement: document.getElementById('schoolDefaultSettlement').value,
                contactPerson: document.getElementById('schoolContactPerson').value.trim(),
                email,
                phone: document.getElementById('schoolPhone').value.trim(),
                location: document.getElementById('schoolLocation').value.trim(),
                memo: document.getElementById('schoolMemo').value.trim()
            };

            if (id) {
                db.ref('commission_schools/' + id).update(data).then(() => {
                    closeModal('schoolModal');
                });
            } else {
                db.ref('commission_schools').push(data).then(() => {
                    closeModal('schoolModal');
                });
            }
        });
    }

    if (deleteSchoolBtn) {
        deleteSchoolBtn.addEventListener('click', () => {
            const id = document.getElementById('schoolId').value;
            if (!id) return;
            if (confirm('해당 국제학교 정보를 삭제하시겠습니까?')) {
                db.ref('commission_schools/' + id).remove().then(() => {
                    closeModal('schoolModal');
                });
            }
        });
    }

    // ----------------------------------------------------
    // 14. SUB-TAB 5 & MODAL 5: Corporate Issuer Entity Profiles
    // ----------------------------------------------------
    const entitiesListGrid = document.getElementById('entitiesListGrid');
    const openAddEntityBtn = document.getElementById('openAddEntityBtn');
    const saveEntityBtn = document.getElementById('saveEntityBtn');
    const deleteEntityBtn = document.getElementById('deleteEntityBtn');

    function renderEntities() {
        if (!entitiesListGrid) return;

        if (entities.length === 0) {
            entitiesListGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary); background: var(--white); border-radius: 8px; border: 1px solid var(--border-color);">
                    등록된 발행 법인이 없습니다.
                </div>
            `;
            return;
        }

        entitiesListGrid.innerHTML = entities.map(ent => `
            <div class="entity-card ${ent.isDefault ? 'default-entity' : ''}">
                ${ent.isDefault ? '<div style="position: absolute; top: 12px; right: 15px; font-size: 11px; background: var(--accent-color); color: white; padding: 2px 8px; border-radius: 10px; font-weight: 600;">기본 발행 법인</div>' : ''}
                
                <h4 style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0; padding-right: 80px;">${ent.name}</h4>
                <div style="font-size: 11px; color: var(--accent-color); font-weight: 600; margin-bottom: 12px;">SSM Reg. No: ${ent.regNo || '-'}</div>

                <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 14px;">
                    <div><i class="fa-solid fa-user-check" style="width: 16px;"></i> 대표자: ${ent.director || '-'}</div>
                    <div><i class="fa-solid fa-envelope" style="width: 16px;"></i> ${ent.contact || '-'}</div>
                    <div><i class="fa-solid fa-map-pin" style="width: 16px;"></i> ${ent.address || '-'}</div>
                </div>

                <div style="background: #F4F2EE; padding: 10px 12px; border-radius: 6px; font-size: 11px; margin-bottom: 15px;">
                    <div style="font-weight: 700; color: #2E7D32; margin-bottom: 4px;"><i class="fa-solid fa-building-columns"></i> 수취 은행: ${ent.bankName || 'Maybank'}</div>
                    <div>계좌번호: <strong style="font-family: monospace;">${ent.accountNo || '-'}</strong></div>
                    <div>예금주: ${ent.accountName || ent.name}</div>
                    ${ent.swiftCode ? `<div>SWIFT: ${ent.swiftCode}</div>` : ''}
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                    <button type="button" class="btn btn-secondary btn-edit-entity" data-id="${ent.id}" style="padding: 5px 12px; font-size: 12px;">
                        <i class="fa-solid fa-pen"></i> 법인 정보 수정
                    </button>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.btn-edit-entity').forEach(btn => {
            btn.addEventListener('click', () => openEditEntityModal(btn.getAttribute('data-id')));
        });
    }

    if (openAddEntityBtn) {
        openAddEntityBtn.addEventListener('click', () => {
            document.getElementById('entityModalTitle').innerHTML = '<i class="fa-solid fa-building-columns" style="color: var(--accent-color);"></i> 신규 발행 법인 프로필 등록';
            document.getElementById('entityId').value = '';
            document.getElementById('entityForm').reset();
            if (deleteEntityBtn) deleteEntityBtn.classList.add('hidden');
            openModal('entityModal');
        });
    }

    function openEditEntityModal(id) {
        const ent = entities.find(e => e.id === id);
        if (!ent) return;

        document.getElementById('entityModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square" style="color: var(--accent-color);"></i> 발행 법인 프로필 수정';
        document.getElementById('entityId').value = ent.id;
        document.getElementById('entityName').value = ent.name || '';
        document.getElementById('entityRegNo').value = ent.regNo || '';
        document.getElementById('entityDirector').value = ent.director || '';
        document.getElementById('entityContact').value = ent.contact || '';
        document.getElementById('entityAddress').value = ent.address || '';
        document.getElementById('entityBankName').value = ent.bankName || '';
        document.getElementById('entityAccountNo').value = ent.accountNo || '';
        document.getElementById('entityAccountName').value = ent.accountName || '';
        document.getElementById('entitySwiftCode').value = ent.swiftCode || '';
        document.getElementById('entityIsDefault').checked = !!ent.isDefault;

        if (deleteEntityBtn) deleteEntityBtn.classList.remove('hidden');
        openModal('entityModal');
    }

    if (saveEntityBtn) {
        saveEntityBtn.addEventListener('click', () => {
            const id = document.getElementById('entityId').value;
            const name = document.getElementById('entityName').value.trim();
            const regNo = document.getElementById('entityRegNo').value.trim();
            const bankName = document.getElementById('entityBankName').value.trim();
            const accountNo = document.getElementById('entityAccountNo').value.trim();

            if (!name || !regNo || !bankName || !accountNo) {
                alert('법인명, 사업자등록번호, 은행명, 계좌번호를 모두 입력해주세요.');
                return;
            }

            const isDefault = document.getElementById('entityIsDefault').checked;

            const data = {
                name,
                regNo,
                director: document.getElementById('entityDirector').value.trim(),
                contact: document.getElementById('entityContact').value.trim(),
                address: document.getElementById('entityAddress').value.trim(),
                bankName,
                accountNo,
                accountName: document.getElementById('entityAccountName').value.trim() || name,
                swiftCode: document.getElementById('entitySwiftCode').value.trim(),
                isDefault
            };

            if (isDefault) {
                entities.forEach(e => {
                    if (e.id !== id && e.isDefault) {
                        db.ref('commission_entities/' + e.id).update({ isDefault: false });
                    }
                });
            }

            if (id) {
                db.ref('commission_entities/' + id).update(data).then(() => {
                    closeModal('entityModal');
                });
            } else {
                db.ref('commission_entities').push(data).then(() => {
                    closeModal('entityModal');
                });
            }
        });
    }

    if (deleteEntityBtn) {
        deleteEntityBtn.addEventListener('click', () => {
            const id = document.getElementById('entityId').value;
            if (!id) return;
            if (entities.length <= 1) {
                alert('최소 1개의 발행 법인 프로필이 등록되어 있어야 합니다.');
                return;
            }
            if (confirm('해당 법인 프로필을 삭제하시겠습니까?')) {
                db.ref('commission_entities/' + id).remove().then(() => {
                    closeModal('entityModal');
                });
            }
        });
    }
});
