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

    // Contract Status Evaluation Helper
    function getContractStatus(startDate, endDate) {
        if (!startDate || !endDate) {
            return { status: 'none', label: '기간 미지정', cssClass: 'expiring', text: '계약기간 미지정' };
        }
        const today = new Date();
        today.setHours(0,0,0,0);
        const end = new Date(endDate);
        end.setHours(0,0,0,0);
        const start = new Date(startDate);
        start.setHours(0,0,0,0);

        const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
        if (today < start) {
            return { status: 'upcoming', label: '계약 대기', cssClass: 'expiring', text: `${startDate} 시작 예정` };
        } else if (diffDays < 0) {
            return { status: 'expired', label: '계약 만료', cssClass: 'expired', text: `${Math.abs(diffDays)}일 전 만료` };
        } else if (diffDays <= 60) {
            return { status: 'expiring', label: `만료 임박 (D-${diffDays})`, cssClass: 'expiring', text: `만료 D-${diffDays}` };
        } else {
            return { status: 'active', label: '계약중 (유효)', cssClass: 'active', text: '계약 유효' };
        }
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
                contractStartDate: "2025-01-01",
                contractEndDate: "2027-12-31",
                commissionType: "percentage",
                defaultRate: 10,
                defaultSettlement: "2", // 2 terms split
                adminContactName: "Admissions Office / Mr. James",
                adminContactEmail: "admissions@marlboroughcollege.my",
                adminContactPhone: "+60 7-560 2200",
                financeContactName: "Finance & Accounts / Ms. Sarah Lee",
                financeContactEmail: "finance@marlboroughcollege.my",
                financeContactPhone: "+60 7-560 2288",
                location: "Iskandar Puteri, Johor",
                memo: "영국 명문 보딩스쿨, Term 1 시작 30일 내 1차(50%), Term 2 시작 시 2차(50%) 정산"
            },
            {
                nameEn: "Raffles American School",
                nameKo: "래플스 아메리칸 스쿨",
                contractStartDate: "2025-01-01",
                contractEndDate: "2026-12-31",
                commissionType: "percentage",
                defaultRate: 15,
                defaultSettlement: "1", // 1-time
                adminContactName: "Admissions / Mr. David",
                adminContactEmail: "admissions@raffles-american-school.edu.my",
                adminContactPhone: "+60 7-509 8888",
                financeContactName: "Finance Department / Ms. Joyce Tan",
                financeContactEmail: "finance@raffles-american-school.edu.my",
                financeContactPhone: "+60 7-509 8890",
                location: "Iskandar Puteri, Johor",
                memo: "미국식 커리큘럼(AP), 입학 확인 및 학비 납부 후 1회 일괄 정산"
            },
            {
                nameEn: "Sunway International School",
                nameKo: "선웨이 국제학교",
                contractStartDate: "2025-01-01",
                contractEndDate: "2026-12-31",
                commissionType: "percentage",
                defaultRate: 10,
                defaultSettlement: "1",
                adminContactName: "Admissions Office",
                adminContactEmail: "infosisj@sunway.edu.my",
                adminContactPhone: "+60 7-533 8070",
                financeContactName: "Accounts Division",
                financeContactEmail: "accounts.sisj@sunway.edu.my",
                financeContactPhone: "+60 7-533 8075",
                location: "Sunway City Iskandar Puteri, Johor",
                memo: "캐나다 온타리오 및 IB 커리큘럼"
            },
            {
                nameEn: "Crescendo-HELP International School",
                nameKo: "크레센도-헬프 국제학교",
                contractStartDate: "2025-01-01",
                contractEndDate: "2026-12-31",
                commissionType: "percentage",
                defaultRate: 10,
                defaultSettlement: "1",
                adminContactName: "Marketing & Admissions",
                adminContactEmail: "admissions@chis.edu.my",
                adminContactPhone: "+60 7-861 6788",
                financeContactName: "Finance & Accounts Dept",
                financeContactEmail: "accounts@chis.edu.my",
                financeContactPhone: "+60 7-861 6790",
                location: "Desa Cemerlang, Johor",
                memo: "영국 캠브리지 IGCSE 커리큘럼, 가성비 우수 국제학교"
            },
            {
                nameEn: "Shattuck-St. Mary's Forest City",
                nameKo: "샤턱 세인트 메리스 포레스트 시티",
                contractStartDate: "2025-01-01",
                contractEndDate: "2026-12-31",
                commissionType: "percentage",
                defaultRate: 12,
                defaultSettlement: "2",
                adminContactName: "Admissions Department",
                adminContactEmail: "admissions@ssm-fc.org",
                adminContactPhone: "+60 7-500 5900",
                financeContactName: "Bursar & Finance Office",
                financeContactEmail: "finance@ssm-fc.org",
                financeContactPhone: "+60 7-500 5910",
                location: "Forest City, Johor",
                memo: "미국 본교 직영, 올림피아드 및 골프/테니스 특성화"
            },
            {
                nameEn: "Stellar International School",
                nameKo: "스텔라 국제학교",
                contractStartDate: "2025-01-01",
                contractEndDate: "2026-12-31",
                commissionType: "fixed",
                defaultRate: 3500, // Fixed RM 3,500
                defaultSettlement: "1",
                adminContactName: "Admissions Officer",
                adminContactEmail: "info@stellar.edu.my",
                adminContactPhone: "+60 7-364 3808",
                financeContactName: "Accounts Officer",
                financeContactEmail: "finance@stellar.edu.my",
                financeContactPhone: "+60 7-364 3810",
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
                studentNameEn: "Minjun Kim",
                studentNameKo: "김민준",
                studentName: "Minjun Kim",
                gradeEn: "Year 7 (Grade 7)",
                gradeKo: "중학 1학년",
                grade: "Year 7 (Grade 7)",
                parentContact: "김성훈 / 010-3849-1120",
                parentEmail: "minjun.parent@gmail.com",
                schoolName: "Marlborough College Malaysia",
                termEn: "2026-Term 1 (August Intake)",
                termKo: "2026년 1학기 (8월 입학)",
                term: "2026-Term 1 (August Intake)",
                admissionDate: todayStr,
                tuitionFee: 46000,
                commissionType: "percentage",
                commissionRate: 10,
                commissionAmount: 4600,
                settlementMode: "2",
                status: "partially_paid",
                entityName: "GLOBAL EDU CONSULTING SDN. BHD.",
                memo: "Boarding school application complete, Term 1 invoice paid",
                installments: [
                    { term: "Term 1 (50%)", amount: 2300, dueDate: todayStr, status: "paid", invoiceNo: "INV-MCM-202608-01" },
                    { term: "Term 2 (50%)", amount: 2300, dueDate: "2027-01-15", status: "invoiced", invoiceNo: "INV-MCM-202608-02" }
                ]
            },
            {
                studentNameEn: "Jiwoo Lee",
                studentNameKo: "이지우",
                studentName: "Jiwoo Lee",
                gradeEn: "Grade 4 (Primary 4)",
                gradeKo: "초등 4학년",
                grade: "Grade 4 (Primary 4)",
                parentContact: "이진아 / 010-9284-5510",
                parentEmail: "jiwoo.mom@naver.com",
                schoolName: "Raffles American School",
                termEn: "2026-Term 1 (August Intake)",
                termKo: "2026년 1학기 (8월 입학)",
                term: "2026-Term 1 (August Intake)",
                admissionDate: todayStr,
                tuitionFee: 38000,
                commissionType: "percentage",
                commissionRate: 15,
                commissionAmount: 5700,
                settlementMode: "1",
                status: "invoiced",
                entityName: "GLOBAL EDU CONSULTING SDN. BHD.",
                memo: "Admissions test passed, invoice sent to finance team",
                installments: [
                    { term: "Full 100%", amount: 5700, dueDate: todayStr, status: "invoiced", invoiceNo: "INV-RAS-202608-01" }
                ]
            },
            {
                studentNameEn: "Seoyun Park",
                studentNameKo: "박서윤",
                studentName: "Seoyun Park",
                gradeEn: "Year 9 (Grade 9)",
                gradeKo: "중학 3학년",
                grade: "Year 9 (Grade 9)",
                parentContact: "박준영 / 010-4491-0029",
                parentEmail: "seoyun.family@daum.net",
                schoolName: "Stellar International School",
                termEn: "2026-Term 1 (August Intake)",
                termKo: "2026년 1학기 (8월 입학)",
                term: "2026-Term 1 (August Intake)",
                admissionDate: todayStr,
                tuitionFee: 28000,
                commissionType: "fixed",
                commissionRate: 3500,
                commissionAmount: 3500,
                settlementMode: "1",
                status: "paid",
                entityName: "GLOBAL EDU CONSULTING SDN. BHD.",
                memo: "Fixed commission RM 3,500 received in full",
                installments: [
                    { term: "Full 100%", amount: 3500, dueDate: todayStr, status: "paid", invoiceNo: "INV-SIS-202608-01" }
                ]
            }
        ];

        sampleAdmissions.forEach(adm => {
            const newRef = db.ref('commission_admissions').push(adm);
            if (adm.status === 'partially_paid') {
                db.ref('commission_invoices').push({
                    invoiceNo: "INV-MCM-202608-01",
                    schoolName: adm.schoolName,
                    billingMonth: "2026-08",
                    entityName: adm.entityName,
                    issueDate: todayStr,
                    dueDate: todayStr,
                    amount: 2300,
                    status: "paid",
                    items: [
                        {
                            studentId: newRef.key,
                            studentNameEn: adm.studentNameEn,
                            studentNameKo: adm.studentNameKo,
                            gradeEn: adm.gradeEn,
                            termEn: adm.termEn,
                            admissionDate: adm.admissionDate,
                            tuitionFee: adm.tuitionFee,
                            rate: "10% (Term 1)",
                            amount: 2300,
                            installmentTerm: "Term 1 (50%)"
                        }
                    ]
                });
                db.ref('commission_payments').push({
                    admissionId: newRef.key,
                    invoiceNo: "INV-MCM-202608-01",
                    schoolName: adm.schoolName,
                    studentName: adm.studentName,
                    termName: "Term 1 (50%)",
                    paymentDate: todayStr,
                    amount: 2300,
                    bank: "Maybank Corporate Account",
                    refNo: "MB-202608-4910",
                    memo: "Term 1 Commission Remittance"
                });
            } else if (adm.status === 'invoiced') {
                db.ref('commission_invoices').push({
                    invoiceNo: "INV-RAS-202608-01",
                    schoolName: adm.schoolName,
                    billingMonth: "2026-08",
                    entityName: adm.entityName,
                    issueDate: todayStr,
                    dueDate: todayStr,
                    amount: 5700,
                    status: "issued",
                    items: [
                        {
                            studentId: newRef.key,
                            studentNameEn: adm.studentNameEn,
                            studentNameKo: adm.studentNameKo,
                            gradeEn: adm.gradeEn,
                            termEn: adm.termEn,
                            admissionDate: adm.admissionDate,
                            tuitionFee: adm.tuitionFee,
                            rate: "15% (Full)",
                            amount: 5700,
                            installmentTerm: "Full 100%"
                        }
                    ]
                });
            } else if (adm.status === 'paid') {
                db.ref('commission_invoices').push({
                    invoiceNo: "INV-SIS-202608-01",
                    schoolName: adm.schoolName,
                    billingMonth: "2026-08",
                    entityName: adm.entityName,
                    issueDate: todayStr,
                    dueDate: todayStr,
                    amount: 3500,
                    status: "paid",
                    items: [
                        {
                            studentId: newRef.key,
                            studentNameEn: adm.studentNameEn,
                            studentNameKo: adm.studentNameKo,
                            gradeEn: adm.gradeEn,
                            termEn: adm.termEn,
                            admissionDate: adm.admissionDate,
                            tuitionFee: adm.tuitionFee,
                            rate: "Fixed RM 3,500",
                            amount: 3500,
                            installmentTerm: "Full 100%"
                        }
                    ]
                });
                db.ref('commission_payments').push({
                    admissionId: newRef.key,
                    invoiceNo: "INV-SIS-202608-01",
                    schoolName: adm.schoolName,
                    studentName: adm.studentName,
                    termName: "Full 100%",
                    paymentDate: todayStr,
                    amount: 3500,
                    bank: "Maybank Corporate Account",
                    refNo: "TT-9842145",
                    memo: "Fixed Commission RM 3,500 Settled"
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

    document.querySelectorAll('.admin-modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.admin-modal').forEach(m => {
                if (m.style.display === 'flex' || m.style.display === 'block') {
                    m.style.display = 'none';
                }
            });
        }
    });

    // ----------------------------------------------------
    // 7. Dynamic Dropdowns Updater
    // ----------------------------------------------------
    // ----------------------------------------------------
    // 7. Dynamic Dropdowns Updater
    // ----------------------------------------------------
    function updateSchoolDropdowns() {
        const admissionSchoolId = document.getElementById('admissionSchoolId');
        const admissionSchoolFilter = document.getElementById('admissionSchoolFilter');
        const paymentSchoolFilter = document.getElementById('paymentSchoolFilter');
        const invoiceSchoolFilter = document.getElementById('invoiceSchoolFilter');
        const monthlyInvoiceSchoolSelect = document.getElementById('monthlyInvoiceSchoolSelect');

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
        if (invoiceSchoolFilter) {
            invoiceSchoolFilter.innerHTML = '<option value="all">전체 학교</option>' +
                schools.map(s => `<option value="${s.nameEn}">${s.nameEn}</option>`).join('');
        }
        if (monthlyInvoiceSchoolSelect) {
            monthlyInvoiceSchoolSelect.innerHTML = '<option value="">-- 대상 국제학교 선택 --</option>' +
                schools.map(s => `<option value="${s.id}">${s.nameEn} (${s.nameKo || ''})</option>`).join('');
        }
    }

    function updateEntityDropdowns() {
        const admissionEntityId = document.getElementById('admissionEntityId');
        const invoiceModalEntitySelect = document.getElementById('invoiceModalEntitySelect');
        const monthlyInvoiceEntitySelect = document.getElementById('monthlyInvoiceEntitySelect');

        const optionsHtml = entities.map(e => `<option value="${e.id}" ${e.isDefault ? 'selected' : ''}>${e.name} (${e.regNo || ''})</option>`).join('');
        if (admissionEntityId) admissionEntityId.innerHTML = optionsHtml;
        if (monthlyInvoiceEntitySelect) monthlyInvoiceEntitySelect.innerHTML = optionsHtml;
        if (invoiceModalEntitySelect) {
            invoiceModalEntitySelect.innerHTML = optionsHtml;
            invoiceModalEntitySelect.addEventListener('change', () => {
                if (currentViewingInvoice) {
                    const selEnt = entities.find(e => e.id === invoiceModalEntitySelect.value);
                    if (selEnt) {
                        currentViewingInvoice.entityName = selEnt.name;
                        currentViewingInvoice.entityId = selEnt.id;
                        const sch = schools.find(s => s.nameEn === currentViewingInvoice.schoolName || s.id === currentViewingInvoice.schoolId);
                        renderInvoiceSheet(currentViewingInvoice, selEnt, sch);
                    }
                }
            });
        }
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
                const combined = `${adm.studentNameEn || ''} ${adm.studentNameKo || ''} ${adm.studentName || ''} ${adm.parentContact || ''} ${adm.schoolName || ''} ${adm.gradeEn || ''} ${adm.gradeKo || ''}`.toLowerCase();
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

            const studentNameDisplay = adm.studentNameEn 
                ? `<strong style="color: var(--text-primary); font-size: 14px;">${adm.studentNameEn}</strong> <span style="font-size: 11px; color: #888;">(${adm.studentNameKo || ''})</span>`
                : `<strong style="color: var(--text-primary); font-size: 14px;">${adm.studentName || '-'}</strong>`;

            const gradeDisplay = adm.gradeEn 
                ? `<span>${adm.gradeEn}</span> <span style="font-size: 10px; color: #888;">(${adm.gradeKo || ''})</span>`
                : (adm.grade || '-');

            const termDisplay = adm.termEn 
                ? `<span>${adm.termEn}</span>`
                : (adm.term || '-');

            return `
                <tr>
                    <td>
                        <div>${studentNameDisplay}</div>
                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
                            <i class="fa-solid fa-phone" style="font-size: 10px;"></i> ${adm.parentContact || '-'}
                        </div>
                    </td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-primary);">${adm.schoolName || '-'}</div>
                        <div style="font-size: 11px; color: var(--accent-color);">${gradeDisplay}</div>
                    </td>
                    <td>
                        <div style="font-size: 12px; font-weight: 500;">${termDisplay}</div>
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
    const schoolAutoTermsNotice = document.getElementById('schoolAutoTermsNotice');
    const schoolAutoTermsText = document.getElementById('schoolAutoTermsText');
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

    // AUTOMATIC APPLICATION OF SCHOOL TERMS WHEN SELECTING SCHOOL
    if (admissionSchoolId) {
        admissionSchoolId.addEventListener('change', () => {
            const schoolId = admissionSchoolId.value;
            const school = schools.find(s => s.id === schoolId);

            if (school) {
                const commType = school.commissionType || 'percentage';
                const defaultRate = school.defaultRate || (commType === 'fixed' ? 3500 : 10);
                const defaultSettlement = school.defaultSettlement || '1';

                // 1. Reflect Commission Type
                if (admissionCommissionType) admissionCommissionType.value = commType;
                toggleCommissionTypeUI(commType);

                // 2. Reflect Default Rate / Fixed Amount
                if (commType === 'fixed') {
                    if (admissionFixedAmount) admissionFixedAmount.value = defaultRate;
                } else {
                    if (admissionCommissionRate) admissionCommissionRate.value = defaultRate;
                }

                // 3. Reflect Default Settlement Mode (Installments Count)
                if (admissionSettlementMode) admissionSettlementMode.value = defaultSettlement;

                // 4. Show Auto Terms Notice with Contract Period
                if (schoolAutoTermsNotice && schoolAutoTermsText) {
                    const settlementLabel = defaultSettlement === '1' ? '1회 일괄 정산' : `${defaultSettlement}회 분할 정산 (Term별)`;
                    const termsDesc = commType === 'fixed' 
                        ? `고정 금액 RM ${parseFloat(defaultRate).toLocaleString()} / ${settlementLabel}` 
                        : `학비의 ${defaultRate}% / ${settlementLabel}`;
                    
                    const contractInfo = school.contractStartDate && school.contractEndDate 
                        ? ` | 계약기간: ${school.contractStartDate} ~ ${school.contractEndDate}`
                        : '';

                    schoolAutoTermsText.textContent = `[${school.nameEn}] 학교 계약 요율 자동 반영: ${termsDesc}${contractInfo}`;
                    schoolAutoTermsNotice.style.display = 'block';
                }

                // 5. Recalculate & Rebuild Installment Schedule Rows
                calculateAdmissionFinancials();
            } else {
                if (schoolAutoTermsNotice) schoolAutoTermsNotice.style.display = 'none';
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
            if (schoolAutoTermsNotice) schoolAutoTermsNotice.style.display = 'none';
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
        const sch = schools.find(s => s.nameEn === adm.schoolName || s.nameKo === adm.schoolName || s.id === adm.schoolId);
        if (sch && admissionSchoolId) admissionSchoolId.value = sch.id;

        const commType = adm.commissionType || 'percentage';
        document.getElementById('admissionCommissionType').value = commType;
        toggleCommissionTypeUI(commType);

        if (document.getElementById('admissionStudentNameEn')) {
            document.getElementById('admissionStudentNameEn').value = adm.studentNameEn || adm.studentName || '';
        }
        if (document.getElementById('admissionStudentNameKo')) {
            document.getElementById('admissionStudentNameKo').value = adm.studentNameKo || '';
        }
        if (document.getElementById('admissionGradeEn')) {
            document.getElementById('admissionGradeEn').value = adm.gradeEn || adm.grade || '';
        }
        if (document.getElementById('admissionGradeKo')) {
            document.getElementById('admissionGradeKo').value = adm.gradeKo || '';
        }
        if (document.getElementById('admissionTermEn')) {
            document.getElementById('admissionTermEn').value = adm.termEn || adm.term || '';
        }
        if (document.getElementById('admissionTermKo')) {
            document.getElementById('admissionTermKo').value = adm.termKo || '';
        }

        document.getElementById('admissionDate').value = adm.admissionDate || '';
        document.getElementById('admissionStatus').value = adm.status || 'applied';
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

        if (sch && schoolAutoTermsNotice && schoolAutoTermsText) {
            const settlementLabel = adm.settlementMode === '1' ? '1회 일괄 정산' : `${adm.settlementMode}회 분할 정산`;
            const termsDesc = commType === 'fixed' 
                ? `고정 금액 RM ${parseFloat(adm.commissionAmount).toLocaleString()} / ${settlementLabel}` 
                : `학비의 ${adm.commissionRate}% / ${settlementLabel}`;
            schoolAutoTermsText.textContent = `[${sch.nameEn}] 등록된 계약 조건: ${termsDesc}`;
            schoolAutoTermsNotice.style.display = 'block';
        } else if (schoolAutoTermsNotice) {
            schoolAutoTermsNotice.style.display = 'none';
        }

        renderInstallmentsScheduleInputs(parseFloat(adm.commissionAmount) || 0, adm.installments);

        if (deleteAdmissionBtn) deleteAdmissionBtn.classList.remove('hidden');
        openModal('admissionModal');
    }

    if (saveAdmissionBtn) {
        saveAdmissionBtn.addEventListener('click', () => {
            const id = document.getElementById('admissionId').value;
            const studentNameEn = document.getElementById('admissionStudentNameEn') ? document.getElementById('admissionStudentNameEn').value.trim() : '';
            const studentNameKo = document.getElementById('admissionStudentNameKo') ? document.getElementById('admissionStudentNameKo').value.trim() : '';
            const schoolSelect = document.getElementById('admissionSchoolId');
            const schoolName = schoolSelect.options[schoolSelect.selectedIndex] ? schoolSelect.options[schoolSelect.selectedIndex].text.split('(')[0].trim() : '';
            const schoolId = schoolSelect.value;

            if (!studentNameEn || !schoolName) {
                alert('학생 영문 이름과 대상 국제학교를 입력해주세요.');
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

            const gradeEn = document.getElementById('admissionGradeEn') ? document.getElementById('admissionGradeEn').value.trim() : '';
            const gradeKo = document.getElementById('admissionGradeKo') ? document.getElementById('admissionGradeKo').value.trim() : '';
            const termEn = document.getElementById('admissionTermEn') ? document.getElementById('admissionTermEn').value.trim() : '';
            const termKo = document.getElementById('admissionTermKo') ? document.getElementById('admissionTermKo').value.trim() : '';

            const data = {
                studentNameEn,
                studentNameKo,
                studentName: studentNameKo ? `${studentNameKo} (${studentNameEn})` : studentNameEn,
                schoolId,
                schoolName,
                gradeEn,
                gradeKo,
                grade: gradeEn,
                termEn,
                termKo,
                term: termEn,
                parentContact: document.getElementById('admissionParentContact').value.trim(),
                parentEmail: document.getElementById('admissionParentEmail').value.trim(),
                admissionDate: document.getElementById('admissionDate').value,
                status: document.getElementById('admissionStatus').value,
                tuitionFee: parseFloat(document.getElementById('admissionTuitionFee').value) || 0,
                commissionType: commType,
                commissionRate: commType === 'percentage' ? (parseFloat(document.getElementById('admissionCommissionRate').value) || 10) : 0,
                commissionAmount: parseFloat(document.getElementById('admissionCommissionAmount').value) || 0,
                settlementMode: document.getElementById('admissionSettlementMode').value,
                entityName,
                entityId: entitySelect.value,
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
    // 11. SUB-TAB 2 & MODAL 2 & 7: 100% English Invoice & Consolidated Monthly Invoicing Engine
    // ----------------------------------------------------
    const invoiceTableBody = document.getElementById('invoiceTableBody');
    const invoiceSearchInput = document.getElementById('invoiceSearchInput');
    const invoiceSchoolFilter = document.getElementById('invoiceSchoolFilter');
    const invoiceStatusFilter = document.getElementById('invoiceStatusFilter');
    const invoiceSheetContainer = document.getElementById('invoiceSheetContainer');
    const invoiceModalEntitySelect = document.getElementById('invoiceModalEntitySelect');
    const printInvoiceBtn = document.getElementById('printInvoiceBtn');
    const copyInvoiceEmailBtn = document.getElementById('copyInvoiceEmailBtn');
    const openMailClientBtn = document.getElementById('openMailClientBtn');
    const markInvoicePaidBtn = document.getElementById('markInvoicePaidBtn');
    const emailRecipientInput = document.getElementById('emailRecipientInput');
    const emailSubjectInput = document.getElementById('emailSubjectInput');
    const emailBodyTextarea = document.getElementById('emailBodyTextarea');

    // Monthly Consolidated Invoice Creation Modal Elements
    const openCreateMonthlyInvoiceBtn = document.getElementById('openCreateMonthlyInvoiceBtn');
    const monthlyInvoiceSchoolSelect = document.getElementById('monthlyInvoiceSchoolSelect');
    const monthlyInvoiceMonthInput = document.getElementById('monthlyInvoiceMonthInput');
    const monthlyInvoiceNoInput = document.getElementById('monthlyInvoiceNoInput');
    const monthlyInvoiceEntitySelect = document.getElementById('monthlyInvoiceEntitySelect');
    const monthlyInvoiceIssueDateInput = document.getElementById('monthlyInvoiceIssueDateInput');
    const monthlyInvoiceDueDateInput = document.getElementById('monthlyInvoiceDueDateInput');
    const monthlyInvoiceFinanceContact = document.getElementById('monthlyInvoiceFinanceContact');
    const monthlyInvoiceStudentsTableBody = document.getElementById('monthlyInvoiceStudentsTableBody');
    const selectAllInvoiceStudents = document.getElementById('selectAllInvoiceStudents');
    const eligibleStudentCount = document.getElementById('eligibleStudentCount');
    const selectedInvoiceStudentCount = document.getElementById('selectedInvoiceStudentCount');
    const monthlyInvoiceTotalClaimAmount = document.getElementById('monthlyInvoiceTotalClaimAmount');
    const generateConsolidatedInvoiceBtn = document.getElementById('generateConsolidatedInvoiceBtn');

    let currentViewingInvoice = null;

    function renderInvoices() {
        if (!invoiceTableBody) return;

        const search = (invoiceSearchInput ? invoiceSearchInput.value.trim().toLowerCase() : '');
        const schoolFilter = (invoiceSchoolFilter ? invoiceSchoolFilter.value : 'all');
        const statusFilter = (invoiceStatusFilter ? invoiceStatusFilter.value : 'all');

        const filtered = invoices.filter(inv => {
            if (schoolFilter !== 'all' && inv.schoolName !== schoolFilter) return false;
            if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
            if (search) {
                const combined = `${inv.invoiceNo || ''} ${inv.schoolName || ''} ${inv.studentName || ''} ${inv.billingMonth || ''}`.toLowerCase();
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
            if (inv.status === 'paid') statusBadge = '<span class="status-badge status-paid"><i class="fa-solid fa-circle-check"></i> 입금 완료</span>';
            if (inv.status === 'overdue') statusBadge = '<span class="status-badge status-overdue"><i class="fa-solid fa-triangle-exclamation"></i> 기한 초과</span>';

            let studentTargetDisplay = '';
            if (inv.items && inv.items.length > 0) {
                const names = inv.items.map(i => i.studentNameEn || i.studentName).filter(Boolean);
                const displayNames = names.slice(0, 2).join(', ') + (names.length > 2 ? ` 외 ${names.length - 2}명` : '');
                studentTargetDisplay = `
                    <div style="font-weight: 600; color: var(--text-primary);"><i class="fa-solid fa-users" style="color: var(--accent-color);"></i> 총 ${inv.items.length}명 통합 청구</div>
                    <div style="font-size: 11px; color: var(--text-secondary);">${displayNames}</div>
                `;
            } else {
                studentTargetDisplay = `
                    <div>${inv.studentName || '-'}</div>
                    <span class="installment-tag" style="font-size: 10px;">${inv.termName || 'Full 100%'}</span>
                `;
            }

            const monthDisplay = inv.billingMonth ? `<span style="font-size: 11px; color: var(--accent-color); font-weight: 600; display: block;">[${inv.billingMonth}월분]</span>` : '';

            return `
                <tr>
                    <td>
                        <strong style="color: var(--accent-color); font-family: monospace; font-size: 13px;">${inv.invoiceNo}</strong>
                        ${monthDisplay}
                    </td>
                    <td style="font-weight: 600;">${inv.schoolName || '-'}</td>
                    <td>${studentTargetDisplay}</td>
                    <td style="font-size: 12px; color: var(--text-secondary);">${inv.entityName || 'GLOBAL EDU'}</td>
                    <td>
                        <div style="font-size: 12px;">발행: ${formatDate(inv.issueDate)}</div>
                        <div style="font-size: 11px; color: #C62828;">기한: ${formatDate(inv.dueDate)}</div>
                    </td>
                    <td style="font-weight: 700; color: #2E7D32; font-size: 14px;">${formatMYR(inv.amount)}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="table-action-btns">
                            <button type="button" class="btn btn-primary btn-view-invoice" data-id="${inv.id}" style="padding: 5px 9px; font-size: 11px;" title="공식 영문 인보이스 열람 및 인쇄">
                                <i class="fa-solid fa-file-pdf"></i> 열람/PDF
                            </button>
                            ${inv.status !== 'paid' ? `
                                <button type="button" class="btn btn-secondary btn-pay-invoice" data-id="${inv.id}" style="padding: 5px 9px; font-size: 11px; color: #2E7D32; border-color: #2E7D32;" title="입금 확인 처리">
                                    <i class="fa-solid fa-circle-check"></i> 입금
                                </button>
                            ` : ''}
                            <button type="button" class="btn btn-secondary btn-del-invoice" data-id="${inv.id}" style="padding: 5px 8px; font-size: 11px; color: #C62828; border-color: #C62828;" title="인보이스 삭제">
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
    if (invoiceSchoolFilter) invoiceSchoolFilter.addEventListener('change', renderInvoices);
    if (invoiceStatusFilter) invoiceStatusFilter.addEventListener('change', renderInvoices);

    // Open/Generate Legacy Single-Student Invoice for an Admission
    function openInvoiceForAdmission(admissionId) {
        const adm = admissions.find(a => a.id === admissionId);
        if (!adm) return;

        const schCode = (adm.schoolName || 'SCH').split(' ').map(w => w[0]).join('').substring(0, 4).toUpperCase();
        const yyyymm = new Date().toISOString().substring(0, 7).replace('-', '');
        const invoiceNo = `INV-${schCode}-${yyyymm}-${String(invoices.length + 1).padStart(2, '0')}`;
        const todayStr = new Date().toISOString().split('T')[0];
        
        const defaultEntity = entities.find(e => e.isDefault) || entities[0] || {
            name: "GLOBAL EDU CONSULTING SDN. BHD.",
            regNo: "202401048291 (1567890-V)",
            address: "Suite 12-05, Menara Teega, Puteri Harbour, 79000 Iskandar Puteri, Johor, Malaysia",
            contact: "finance@globaledu.com.my",
            bankName: "Malayan Banking Berhad (Maybank)",
            accountNo: "5012 8899 4321",
            accountName: "GLOBAL EDU CONSULTING SDN BHD",
            swiftCode: "MBBEMYKL"
        };

        const sch = schools.find(s => s.nameEn === adm.schoolName || s.nameKo === adm.schoolName || s.id === adm.schoolId) || {};

        const schoolNameEn = sch.nameEn || toPureEnglish(adm.schoolName, 'International School');
        const studentNameEn = toPureEnglish(adm.studentNameEn || adm.studentName, 'Student Placement');
        const gradeEn = toPureEnglish(adm.gradeEn || adm.grade, 'General Grade');
        const termEn = toPureEnglish(adm.termEn || adm.term, 'Academic Term Placement');

        const invoiceData = {
            invoiceNo,
            admissionId: adm.id,
            schoolId: sch.id || '',
            schoolName: schoolNameEn,
            studentNameEn: studentNameEn,
            studentName: studentNameEn,
            gradeEn: gradeEn,
            termEn: termEn,
            commissionType: adm.commissionType || 'percentage',
            tuitionFee: adm.tuitionFee || 0,
            commissionRate: adm.commissionRate || 10,
            amount: adm.commissionAmount || 0,
            billingMonth: new Date().toISOString().substring(0, 7),
            issueDate: todayStr,
            dueDate: todayStr,
            status: "issued",
            entityId: defaultEntity.id || '',
            entityName: defaultEntity.name,
            items: [
                {
                    studentId: adm.id,
                    studentNameEn: studentNameEn,
                    gradeEn: gradeEn,
                    termEn: termEn,
                    admissionDate: adm.admissionDate,
                    tuitionFee: adm.tuitionFee || 0,
                    rate: adm.commissionType === 'fixed' ? 'Fixed Fee' : `${adm.commissionRate || 10}%`,
                    amount: adm.commissionAmount || 0,
                    installmentTerm: 'Placement Commission'
                }
            ]
        };

        currentViewingInvoice = invoiceData;
        renderInvoiceSheet(invoiceData, defaultEntity, sch);
        openModal('invoiceModal');
    }

    function openInvoiceModalById(invoiceId) {
        const inv = invoices.find(i => i.id === invoiceId);
        if (!inv) return;
        currentViewingInvoice = inv;
        const sch = schools.find(s => s.nameEn === inv.schoolName || s.nameKo === inv.schoolName || s.id === inv.schoolId) || {};
        const ent = entities.find(e => e.name === inv.entityName || e.id === inv.entityId) || entities[0];
        renderInvoiceSheet(inv, ent, sch);
        openModal('invoiceModal');
    }

    // ----------------------------------------------------
    // MONTHLY CONSOLIDATED INVOICE GENERATION LOGIC
    // ----------------------------------------------------
    let eligibleStudentRows = [];

    if (openCreateMonthlyInvoiceBtn) {
        openCreateMonthlyInvoiceBtn.addEventListener('click', () => {
            const today = new Date();
            const currentMonthStr = today.toISOString().substring(0, 7); // YYYY-MM
            const todayStr = today.toISOString().split('T')[0];
            
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30);
            const dueDateStr = dueDate.toISOString().split('T')[0];

            if (monthlyInvoiceMonthInput) monthlyInvoiceMonthInput.value = currentMonthStr;
            if (monthlyInvoiceIssueDateInput) monthlyInvoiceIssueDateInput.value = todayStr;
            if (monthlyInvoiceDueDateInput) monthlyInvoiceDueDateInput.value = dueDateStr;
            if (monthlyInvoiceSchoolSelect) monthlyInvoiceSchoolSelect.value = schools.length > 0 ? schools[0].id : '';

            loadEligibleStudentsForMonthlyInvoice();
            openModal('monthlyInvoiceCreateModal');
        });
    }

    if (monthlyInvoiceSchoolSelect) {
        monthlyInvoiceSchoolSelect.addEventListener('change', loadEligibleStudentsForMonthlyInvoice);
    }
    if (monthlyInvoiceMonthInput) {
        monthlyInvoiceMonthInput.addEventListener('change', loadEligibleStudentsForMonthlyInvoice);
    }

    function loadEligibleStudentsForMonthlyInvoice() {
        const schoolId = monthlyInvoiceSchoolSelect ? monthlyInvoiceSchoolSelect.value : '';
        const targetMonth = monthlyInvoiceMonthInput ? monthlyInvoiceMonthInput.value : '';
        const sch = schools.find(s => s.id === schoolId);

        if (!sch) {
            if (monthlyInvoiceStudentsTableBody) {
                monthlyInvoiceStudentsTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #999;">학교를 먼저 선택해주세요.</td></tr>';
            }
            if (monthlyInvoiceFinanceContact) monthlyInvoiceFinanceContact.textContent = '-';
            return;
        }

        // Show School Accounting Recipient Contact
        const financeContactEmail = sch.financeContactEmail || sch.email || '미등록';
        const financeContactName = sch.financeContactName || sch.contactPerson || '회계 담당자';
        const financeContactPhone = sch.financeContactPhone || sch.phone || '';
        if (monthlyInvoiceFinanceContact) {
            monthlyInvoiceFinanceContact.innerHTML = `<strong>${financeContactName}</strong> (${financeContactEmail} / ${financeContactPhone})`;
        }

        // Generate Invoice Number Format
        const schCode = (sch.nameEn || 'SCH').split(' ').map(w => w[0]).join('').substring(0, 4).toUpperCase();
        const yyyymm = (targetMonth || '2026-08').replace('-', '');
        const autoInvNo = `INV-${schCode}-${yyyymm}-01`;
        if (monthlyInvoiceNoInput) monthlyInvoiceNoInput.value = autoInvNo;

        // Filter all student admissions for this school that have unsettled installments
        const schoolAdmissions = admissions.filter(a => a.schoolId === sch.id || a.schoolName === sch.nameEn || a.schoolName === sch.nameKo);
        
        eligibleStudentRows = [];
        schoolAdmissions.forEach(adm => {
            const installments = adm.installments || [
                { term: 'Full 100%', amount: adm.commissionAmount, dueDate: adm.admissionDate, status: adm.status === 'paid' ? 'paid' : 'pending' }
            ];

            installments.forEach((inst, instIdx) => {
                // Exclude already paid/settled installments!
                if (inst.status !== 'paid' && inst.status !== 'settled') {
                    eligibleStudentRows.push({
                        admissionId: adm.id,
                        studentNameEn: adm.studentNameEn || adm.studentName,
                        studentNameKo: adm.studentNameKo || '',
                        gradeEn: adm.gradeEn || adm.grade || '-',
                        gradeKo: adm.gradeKo || '',
                        termEn: adm.termEn || adm.term || '-',
                        admissionDate: adm.admissionDate,
                        tuitionFee: parseFloat(adm.tuitionFee) || 0,
                        commissionType: adm.commissionType || 'percentage',
                        commissionRate: adm.commissionRate || 10,
                        installmentIndex: instIdx,
                        installmentTerm: inst.term || `Term ${instIdx + 1}`,
                        amount: parseFloat(inst.amount) || 0,
                        status: inst.status || 'pending'
                    });
                }
            });
        });

        if (eligibleStudentCount) eligibleStudentCount.textContent = `${eligibleStudentRows.length}명/건`;

        if (eligibleStudentRows.length === 0) {
            if (monthlyInvoiceStudentsTableBody) {
                monthlyInvoiceStudentsTableBody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 30px; color: #888;">
                            <i class="fa-solid fa-circle-check" style="color: #2E7D32; font-size: 24px; margin-bottom: 8px; display: block;"></i>
                            해당 학교의 모든 학생 커미션이 이미 정산 완료되었거나 미정산 수속 건이 없습니다.
                        </td>
                    </tr>
                `;
            }
            if (monthlyInvoiceTotalClaimAmount) monthlyInvoiceTotalClaimAmount.textContent = formatMYR(0);
            if (selectedInvoiceStudentCount) selectedInvoiceStudentCount.textContent = '0명';
            return;
        }

        if (monthlyInvoiceStudentsTableBody) {
            monthlyInvoiceStudentsTableBody.innerHTML = eligibleStudentRows.map((row, idx) => `
                <tr>
                    <td style="text-align: center;">
                        <input type="checkbox" class="invoice-student-checkbox" data-index="${idx}" checked style="transform: scale(1.2); cursor: pointer;">
                    </td>
                    <td>
                        <strong style="color: var(--text-primary); font-size: 13px;">${row.studentNameEn}</strong>
                        ${row.studentNameKo ? `<span style="font-size: 11px; color: #888;"> (${row.studentNameKo})</span>` : ''}
                    </td>
                    <td>
                        <div style="font-size: 12px;">${row.gradeEn}</div>
                    </td>
                    <td>
                        <div style="font-size: 12px;">${row.termEn}</div>
                        <div style="font-size: 10px; color: #888;">${formatDate(row.admissionDate)}</div>
                    </td>
                    <td style="font-weight: 600; font-size: 12px;">${row.tuitionFee > 0 ? formatMYR(row.tuitionFee) : '-'}</td>
                    <td>
                        <span class="installment-tag" style="font-size: 11px;">${row.installmentTerm}</span>
                    </td>
                    <td style="text-align: right; font-weight: 700; color: #2E7D32; font-size: 13px;">
                        ${formatMYR(row.amount)}
                    </td>
                </tr>
            `).join('');

            // Bind checkbox listeners
            document.querySelectorAll('.invoice-student-checkbox').forEach(cb => {
                cb.addEventListener('change', updateMonthlyInvoiceTotals);
            });
        }

        updateMonthlyInvoiceTotals();
    }

    if (selectAllInvoiceStudents) {
        selectAllInvoiceStudents.addEventListener('change', () => {
            const checked = selectAllInvoiceStudents.checked;
            document.querySelectorAll('.invoice-student-checkbox').forEach(cb => {
                cb.checked = checked;
            });
            updateMonthlyInvoiceTotals();
        });
    }

    const selectAllStudentsForInvoiceBtn = document.getElementById('selectAllStudentsForInvoiceBtn');
    if (selectAllStudentsForInvoiceBtn) {
        selectAllStudentsForInvoiceBtn.addEventListener('click', () => {
            if (!selectAllInvoiceStudents) return;
            selectAllInvoiceStudents.checked = !selectAllInvoiceStudents.checked;
            const checked = selectAllInvoiceStudents.checked;
            document.querySelectorAll('.invoice-student-checkbox').forEach(cb => {
                cb.checked = checked;
            });
            updateMonthlyInvoiceTotals();
        });
    }

    function updateMonthlyInvoiceTotals() {
        const checkboxes = document.querySelectorAll('.invoice-student-checkbox:checked');
        let total = 0;
        checkboxes.forEach(cb => {
            const idx = parseInt(cb.getAttribute('data-index'), 10);
            if (eligibleStudentRows[idx]) {
                total += eligibleStudentRows[idx].amount;
            }
        });

        if (selectedInvoiceStudentCount) selectedInvoiceStudentCount.textContent = `${checkboxes.length}명`;
        if (monthlyInvoiceTotalClaimAmount) monthlyInvoiceTotalClaimAmount.textContent = formatMYR(total);
    }

    if (generateConsolidatedInvoiceBtn) {
        generateConsolidatedInvoiceBtn.addEventListener('click', () => {
            const schoolId = monthlyInvoiceSchoolSelect.value;
            const sch = schools.find(s => s.id === schoolId);
            const invoiceNo = monthlyInvoiceNoInput.value.trim();
            const billingMonth = monthlyInvoiceMonthInput.value;
            const issueDate = monthlyInvoiceIssueDateInput.value;
            const dueDate = monthlyInvoiceDueDateInput.value;
            const entityId = monthlyInvoiceEntitySelect.value;
            const ent = entities.find(e => e.id === entityId) || entities[0];

            if (!sch || !invoiceNo) {
                alert('학교와 인보이스 번호를 확인해주세요.');
                return;
            }

            const checkedBoxes = document.querySelectorAll('.invoice-student-checkbox:checked');
            if (checkedBoxes.length === 0) {
                alert('인보이스에 포함할 학생을 최소 1명 이상 선택해주세요.');
                return;
            }

            const selectedItems = [];
            let totalAmount = 0;

            checkedBoxes.forEach(cb => {
                const idx = parseInt(cb.getAttribute('data-index'), 10);
                const r = eligibleStudentRows[idx];
                if (r) {
                    selectedItems.push({
                        admissionId: r.admissionId,
                        studentNameEn: r.studentNameEn,
                        studentNameKo: r.studentNameKo,
                        gradeEn: r.gradeEn,
                        termEn: r.termEn,
                        admissionDate: r.admissionDate,
                        tuitionFee: r.tuitionFee,
                        rate: r.commissionType === 'fixed' ? 'Fixed Fee' : `${r.commissionRate}%`,
                        installmentIndex: r.installmentIndex,
                        installmentTerm: r.installmentTerm,
                        amount: r.amount
                    });
                    totalAmount += r.amount;
                }
            });

            const newInvoice = {
                invoiceNo,
                schoolId: sch.id,
                schoolName: sch.nameEn,
                billingMonth,
                issueDate,
                dueDate,
                amount: totalAmount,
                entityId: ent.id,
                entityName: ent.name,
                status: 'issued',
                items: selectedItems,
                createdAt: new Date().toISOString()
            };

            // Save new consolidated invoice
            db.ref('commission_invoices').push(newInvoice).then((res) => {
                // Update all included admissions' installments status to invoiced
                selectedItems.forEach(item => {
                    const adm = admissions.find(a => a.id === item.admissionId);
                    if (adm && adm.installments && adm.installments[item.installmentIndex]) {
                        adm.installments[item.installmentIndex].status = 'invoiced';
                        adm.installments[item.installmentIndex].invoiceNo = invoiceNo;
                        adm.installments[item.installmentIndex].invoiceId = res.key;
                        
                        db.ref(`commission_admissions/${item.admissionId}/installments`).set(adm.installments);
                        db.ref(`commission_admissions/${item.admissionId}/status`).set('invoiced');
                    }
                });

                closeModal('monthlyInvoiceCreateModal');
                alert(`학교별 월별 통합 인보이스 (${invoiceNo} / ${selectedItems.length}명 청구) 가 성공적으로 생성되었습니다.`);
                openInvoiceModalById(res.key);
            });
        });
    }

    // ----------------------------------------------------
    // PURE ENGLISH SANITIZER FOR INVOICES & EMAILS
    // ----------------------------------------------------
    function toPureEnglish(str, fallback = '') {
        if (!str || typeof str !== 'string') return fallback;
        let s = str.trim();

        // 1. If format is '한글 (English)' -> extract English inside parentheses
        const parenEnMatch = s.match(/\(([A-Za-z0-9\s.,'-]+)\)/);
        if (parenEnMatch && parenEnMatch[1] && /[A-Za-z]/.test(parenEnMatch[1])) {
            const outsideParen = s.replace(/\([^\)]*\)/g, '').trim();
            if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(outsideParen) && !/[A-Za-z]/.test(outsideParen)) {
                s = parenEnMatch[1].trim();
            }
        }

        // 2. Remove any parentheses/brackets that contain Korean (e.g. '(초4)', '(8월 입학)', '(중1)')
        s = s.replace(/\([^\)]*[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]+[^\)]*\)/g, '');
        s = s.replace(/\[[^\]]*[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]+[^\]]*\]/g, '');

        // 3. Remove all remaining Korean characters
        let cleaned = s.replace(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]+/g, '');

        // 4. Clean leftover brackets, dangling dashes, slashes, extra spaces
        cleaned = cleaned.replace(/\(\s*\)/g, '')
                         .replace(/\[\s*\]/g, '')
                         .replace(/\s*-\s*$/g, '')
                         .replace(/^\s*-\s*/g, '')
                         .replace(/\s*\/\s*$/g, '')
                         .replace(/^\s*\/\s*/g, '')
                         .replace(/\s+/g, ' ')
                         .trim();

        if (!cleaned || !/[A-Za-z0-9]/.test(cleaned)) {
            return fallback;
        }
        return cleaned;
    }

    // ----------------------------------------------------
    // 100% ENGLISH INVOICE SHEET RENDERER (CONSOLIDATED & SINGLE)
    // ----------------------------------------------------
    function renderInvoiceSheet(inv, entity, school) {
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

        const sch = school || schools.find(s => s.nameEn === inv.schoolName || s.nameKo === inv.schoolName || s.id === inv.schoolId) || {};
        const schoolNameEn = sch.nameEn || toPureEnglish(inv.schoolName, 'Partner International School');
        const financeContact = toPureEnglish(sch.financeContactName || sch.adminContactName || sch.contactPerson, 'Finance & Accounts Department');
        const financeEmail = sch.financeContactEmail || sch.email || '-';

        // Prepare line items (100% English, guaranteed no Korean)
        const rawItems = (inv.items && inv.items.length > 0) ? inv.items : [
            {
                studentNameEn: inv.studentNameEn || inv.studentName,
                gradeEn: inv.gradeEn || inv.grade,
                termEn: inv.termEn || inv.termName,
                admissionDate: inv.issueDate,
                tuitionFee: inv.tuitionFee || 0,
                rate: inv.commissionType === 'fixed' ? 'Fixed Fee' : `${inv.commissionRate || 10}%`,
                installmentTerm: inv.termName || 'Placement Commission',
                amount: inv.amount || 0
            }
        ];

        const items = rawItems.map(item => ({
            studentNameEn: toPureEnglish(item.studentNameEn || item.studentName, 'Student Placement'),
            gradeEn: toPureEnglish(item.gradeEn || item.grade, 'General Grade'),
            termEn: toPureEnglish(item.termEn || item.term, 'Academic Term'),
            admissionDate: item.admissionDate,
            tuitionFee: item.tuitionFee || 0,
            rate: toPureEnglish(item.rate || (item.commissionType === 'fixed' ? 'Fixed Fee' : `${item.commissionRate || 10}%`), 'Standard'),
            installmentTerm: toPureEnglish(item.installmentTerm || item.term || 'Placement Commission', 'Placement Commission'),
            amount: item.amount || 0
        }));

        const rowsHtml = items.map((item, idx) => `
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 10px 8px; text-align: center; color: #666;">${idx + 1}</td>
                <td style="padding: 10px 10px; font-weight: 700; color: #1a1a1a;">
                    ${item.studentNameEn}
                </td>
                <td style="padding: 10px 10px; color: #444;">${item.gradeEn || '-'}</td>
                <td style="padding: 10px 10px; color: #444;">${item.termEn || '-'}</td>
                <td style="padding: 10px 10px; text-align: right; color: #444;">
                    ${item.tuitionFee > 0 ? formatMYR(item.tuitionFee) : 'Agreement Base'}
                </td>
                <td style="padding: 10px 10px; text-align: center;">
                    <span style="font-size: 11px; background: #F0EAE1; padding: 2px 6px; border-radius: 3px; font-weight: 600;">
                        ${item.installmentTerm || item.rate || 'Standard'}
                    </span>
                </td>
                <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #1a1a1a;">
                    ${formatMYR(item.amount)}
                </td>
            </tr>
        `).join('');

        invoiceSheetContainer.innerHTML = `
            <div style="padding: 10px 5px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111;">
                <!-- Letterhead Header -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a1a1a; padding-bottom: 18px; margin-bottom: 20px;">
                    <div>
                        <h2 style="font-size: 21px; font-weight: 800; color: #1a1a1a; margin: 0; letter-spacing: -0.01em;">${ent.name}</h2>
                        <div style="font-size: 11px; color: #555; margin-top: 4px;">Company Reg. No: <strong>${ent.regNo || '-'}</strong></div>
                        <div style="font-size: 11px; color: #555; margin-top: 2px; max-width: 420px; line-height: 1.4;">${ent.address || '-'}</div>
                        <div style="font-size: 11px; color: #555; margin-top: 2px;">Email: ${ent.contact || '-'}</div>
                    </div>
                    <div style="text-align: right;">
                        <h1 style="font-size: 26px; font-weight: 800; color: var(--accent-color); margin: 0; letter-spacing: 0.05em;">INVOICE</h1>
                        <div style="font-size: 13px; font-weight: 700; color: #1a1a1a; margin-top: 5px;"># ${inv.invoiceNo}</div>
                        ${inv.billingMonth ? `<div style="font-size: 11px; color: var(--accent-color); font-weight: 600; margin-top: 2px;">Billing Period: <strong>${inv.billingMonth}</strong></div>` : ''}
                        <div style="font-size: 11px; color: #555; margin-top: 3px;">Date of Issue: <strong>${formatDate(inv.issueDate)}</strong></div>
                        <div style="font-size: 11px; color: #C62828; margin-top: 2px;">Payment Due: <strong>${formatDate(inv.dueDate)}</strong></div>
                    </div>
                </div>

                <!-- Bill To Box (Strictly English & Addressed to Finance Contact) -->
                <div style="background: #FAF9F6; padding: 16px 18px; border-radius: 6px; border: 1px solid var(--border-color); margin-bottom: 22px; font-size: 12px;">
                    <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px;">
                        <div>
                            <strong style="color: var(--accent-color); text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">BILL TO (INSTITUTION)</strong>
                            <div style="font-size: 15px; font-weight: 800; color: #1a1a1a;">${schoolNameEn}</div>
                            <div style="color: #555; margin-top: 4px;">Attn: <strong>${financeContact}</strong></div>
                            <div style="color: #555;">Email: ${financeEmail}</div>
                            <div style="color: #555;">Location: ${sch.location || 'Johor, Malaysia'}</div>
                        </div>
                        <div style="border-left: 1px solid #E5E0D8; padding-left: 18px;">
                            <strong style="color: var(--accent-color); text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">BILLING SUMMARY</strong>
                            <div style="color: #555;">Total Placements Invoiced: <strong>${items.length} Student(s)</strong></div>
                            <div style="color: #555; margin-top: 2px;">Service: Student Recruitment & Placement Services</div>
                            <div style="color: #555; margin-top: 2px;">Currency: <strong>Malaysian Ringgit (MYR)</strong></div>
                        </div>
                    </div>
                </div>

                <!-- Multi-Student Table (100% English) -->
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 22px; font-size: 12px;">
                    <thead>
                        <tr style="background: #1a1a1a; color: #ffffff;">
                            <th style="padding: 10px 8px; text-align: center; font-weight: 600; width: 35px;">No.</th>
                            <th style="padding: 10px 10px; text-align: left; font-weight: 600;">Student Name (EN)</th>
                            <th style="padding: 10px 10px; text-align: left; font-weight: 600;">Grade / Year</th>
                            <th style="padding: 10px 10px; text-align: left; font-weight: 600;">Intake Term</th>
                            <th style="padding: 10px 10px; text-align: right; font-weight: 600;">Tuition Fee</th>
                            <th style="padding: 10px 10px; text-align: center; font-weight: 600;">Terms / Installment</th>
                            <th style="padding: 10px 12px; text-align: right; font-weight: 600;">Claim Amount (MYR)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="6" style="padding: 10px 12px; text-align: right; font-weight: 600; color: #666;">Subtotal:</td>
                            <td style="padding: 10px 12px; text-align: right; font-weight: 600;">${formatMYR(inv.amount)}</td>
                        </tr>
                        <tr>
                            <td colspan="6" style="padding: 4px 12px; text-align: right; font-weight: 600; color: #666;">Service Tax / SST (0% Exempt):</td>
                            <td style="padding: 4px 12px; text-align: right; font-weight: 600;">RM 0.00</td>
                        </tr>
                        <tr style="border-top: 2px solid #1a1a1a; font-size: 14px;">
                            <td colspan="6" style="padding: 12px; text-align: right; font-weight: 800; color: #1a1a1a;">TOTAL AMOUNT DUE:</td>
                            <td style="padding: 12px; text-align: right; font-weight: 800; color: #2E7D32; font-size: 16px;">${formatMYR(inv.amount)}</td>
                        </tr>
                    </tfoot>
                </table>

                <!-- Bank Remittance Instructions (100% English) -->
                <div style="background: #F4F2EE; border: 1px solid var(--border-color); border-radius: 6px; padding: 16px 20px; margin-bottom: 20px; font-size: 12px;">
                    <div style="font-weight: 700; color: var(--accent-color); font-size: 12px; text-transform: uppercase; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-building-columns"></i> REMITTANCE & BANK ACCOUNT DETAILS
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; line-height: 1.5;">
                        <div>
                            <div>Beneficiary / Account Name: <strong>${ent.accountName || ent.name}</strong></div>
                            <div>Bank Name: <strong>${ent.bankName || 'Maybank'}</strong></div>
                        </div>
                        <div>
                            <div>Account Number: <strong style="font-family: monospace; font-size: 13px; color: #1a1a1a;">${ent.accountNo || '-'}</strong></div>
                            <div>SWIFT / BIC Code: <strong style="font-family: monospace;">${ent.swiftCode || '-'}</strong></div>
                        </div>
                    </div>
                    <div style="font-size: 11px; color: #777; margin-top: 8px; border-top: 1px dashed var(--border-color); padding-top: 6px;">
                        * Please quote Invoice No. <strong>${inv.invoiceNo}</strong> as remittance reference.
                    </div>
                </div>

                <!-- Signatory Footer (100% English) -->
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 25px; padding-top: 15px;">
                    <div style="font-size: 11px; color: #888; line-height: 1.4;">
                        Thank you for your valued partnership with JohorN Education Consulting.<br>
                        Authorized Agent & Official Education Placement Partner
                    </div>
                    <div style="text-align: center; border-top: 1px solid #aaa; padding-top: 8px; width: 220px;">
                        <div style="font-size: 12px; font-weight: 700; color: #1a1a1a;">${ent.director || 'Authorized Signatory'}</div>
                        <div style="font-size: 10px; color: #777;">${ent.name}</div>
                    </div>
                </div>
            </div>
        `;

        // Update Email Composer Box targeting school's finance contact email!
        updateEmailComposer(inv, ent, sch, items, schoolNameEn, financeContact);
    }

    // AUTOMATIC EMAIL GENERATOR FUNCTION (Targets Finance Contact, 100% Pure English)
    function updateEmailComposer(inv, ent, sch, itemsList, schoolNameEn, financeContactName) {
        const recipient = sch.financeContactEmail || sch.email || 'accounts@school.edu.my';
        const targetSchoolName = schoolNameEn || sch.nameEn || toPureEnglish(inv.schoolName, 'Partner School');
        const financeContact = financeContactName || toPureEnglish(sch.financeContactName || sch.contactPerson, 'Finance & Accounts Department');
        const monthLabel = inv.billingMonth ? ` (${inv.billingMonth})` : '';
        const subject = `[COMMISSION INVOICE: ${inv.invoiceNo}] Student Placement Commission - ${targetSchoolName}${monthLabel}`;
        
        const items = itemsList || inv.items || [];
        const studentListText = items.length > 0 
            ? items.map((i, idx) => `  ${idx + 1}. ${toPureEnglish(i.studentNameEn, 'Student')} (Grade: ${toPureEnglish(i.gradeEn, '-')}, Term: ${toPureEnglish(i.termEn, '-')}) -> ${formatMYR(i.amount)}`).join('\n')
            : `  1. ${toPureEnglish(inv.studentNameEn || inv.studentName, 'Student')} (Grade: ${toPureEnglish(inv.gradeEn, '-')}) -> ${formatMYR(inv.amount)}`;

        const body = `Dear ${financeContact},

Greetings from ${ent.name}.

Please find attached our official commission invoice #${inv.invoiceNo} for student recruitment & placement services for ${targetSchoolName}.

[INVOICE SUMMARY]
• Invoice Number: ${inv.invoiceNo}
• Target Institution: ${targetSchoolName}
• Invoiced Students: ${items.length || 1} student(s)
${studentListText}
• Total Claim Amount Due: ${formatMYR(inv.amount)}
• Payment Due Date: ${formatDate(inv.dueDate)}

[REMITTANCE BANK DETAILS]
• Beneficiary Name: ${ent.accountName || ent.name}
• Bank Name: ${ent.bankName || 'Maybank'}
• Account Number: ${ent.accountNo || '-'}
• SWIFT / BIC Code: ${ent.swiftCode || '-'}
• Payment Reference: ${inv.invoiceNo}

The official PDF invoice is attached for your accounting and remittance records.
Kindly acknowledge receipt and notify us once payment is remitted.

Thank you very much for your valued partnership.

Best regards,

${ent.director || 'Finance & Accounts Division'}
${ent.name}
Company Reg. No: ${ent.regNo || '-'}
Address: ${ent.address || '-'}
Email / Contact: ${ent.contact || '-'}`.trim();

        if (emailRecipientInput) emailRecipientInput.value = recipient;
        if (emailSubjectInput) emailSubjectInput.value = subject;
        if (emailBodyTextarea) emailBodyTextarea.value = body;

        if (openMailClientBtn) {
            openMailClientBtn.href = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        }
    }

    if (printInvoiceBtn) {
        printInvoiceBtn.addEventListener('click', () => {
            window.print();
        });
    }

    if (copyInvoiceEmailBtn) {
        copyInvoiceEmailBtn.addEventListener('click', () => {
            const body = emailBodyTextarea ? emailBodyTextarea.value : '';
            if (!body) return;

            navigator.clipboard.writeText(body).then(() => {
                alert('학교 회계 담당자 발송용 영문 이메일 본문 전체가 클립보드에 복사되었습니다!\n\n인보이스 PDF 파일을 첨부하여 회계팀에 이메일을 발송하세요.');
            }).catch(() => {
                prompt('아래 텍스트를 복사하세요:', body);
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
    // 12. SUB-TAB 3 & MODAL 3 & 8: Payments & Settlement Confirmation & Rich Details Modal
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
                        선택한 조건에 등록된 커미션 입금 내역이 없습니다.
                    </td>
                </tr>
            `;
            return;
        }

        paymentTableBody.innerHTML = filtered.map(p => `
            <tr class="payment-row-clickable" data-id="${p.id}" title="클릭하여 상세 입금/정산 정보 보기">
                <td style="font-weight: 600;">${formatDate(p.paymentDate)}</td>
                <td style="font-weight: 600; color: var(--text-primary);">${p.schoolName || '-'}</td>
                <td>
                    <div>${p.studentName || (p.studentListSummary || '-')}</div>
                    <span class="installment-tag" style="font-size: 10px;">${p.termName || '정산완료'}</span>
                </td>
                <td style="font-family: monospace; font-size: 12px; color: var(--accent-color);">${p.invoiceNo || '-'}</td>
                <td style="font-weight: 700; color: #2E7D32; font-size: 14px;">${formatMYR(p.amount)}</td>
                <td style="font-size: 12px;">${p.bank || 'Maybank'}</td>
                <td style="font-family: monospace; font-size: 11px;">${p.refNo || '-'}</td>
                <td style="font-size: 12px; color: var(--text-secondary);">${p.memo || '-'}</td>
                <td>
                    <div class="table-action-btns" onclick="event.stopPropagation();">
                        <button type="button" class="btn btn-secondary btn-detail-payment" data-id="${p.id}" style="padding: 5px 8px; font-size: 11px; color: var(--accent-color);" title="상세보기">
                            <i class="fa-solid fa-circle-info"></i> 상세
                        </button>
                        <button type="button" class="btn btn-primary btn-view-payment-inv" data-invoice-no="${p.invoiceNo || ''}" data-invoice-id="${p.invoiceId || ''}" data-admission-id="${p.admissionId || ''}" style="padding: 5px 8px; font-size: 11px;" title="인보이스 PDF 열람">
                            <i class="fa-solid fa-file-pdf"></i>
                        </button>
                        <button type="button" class="btn btn-secondary btn-del-payment" data-id="${p.id}" style="padding: 5px 8px; font-size: 11px; color: #C62828; border-color: #C62828;" title="입금 내역 삭제">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Bind Payment Row Click to Details Modal
        document.querySelectorAll('.payment-row-clickable').forEach(row => {
            row.addEventListener('click', () => {
                const id = row.getAttribute('data-id');
                if (id) openPaymentDetailModal(id);
            });
        });

        document.querySelectorAll('.btn-detail-payment').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                if (id) openPaymentDetailModal(id);
            });
        });

        document.querySelectorAll('.btn-view-payment-inv').forEach(btn => {
            btn.addEventListener('click', () => {
                const invId = btn.getAttribute('data-invoice-id');
                const invNo = btn.getAttribute('data-invoice-no');
                const admId = btn.getAttribute('data-admission-id');

                let matchedInv = null;
                if (invId) matchedInv = invoices.find(i => i.id === invId);
                if (!matchedInv && invNo) matchedInv = invoices.find(i => i.invoiceNo === invNo);

                if (matchedInv) {
                    openInvoiceModalById(matchedInv.id);
                } else if (admId) {
                    openInvoiceForAdmission(admId);
                } else {
                    alert('연결된 인보이스 정보를 찾을 수 없습니다.');
                }
            });
        });

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

    // ----------------------------------------------------
    // PAYMENT DETAILS MODAL (Request 4)
    // ----------------------------------------------------
    function openPaymentDetailModal(paymentId) {
        const p = payments.find(pay => pay.id === paymentId);
        if (!p) return;

        const inv = invoices.find(i => i.id === p.invoiceId || i.invoiceNo === p.invoiceNo);
        const sch = schools.find(s => s.nameEn === p.schoolName || (inv && s.nameEn === inv.schoolName)) || {};
        const adm = admissions.find(a => a.id === p.admissionId);

        const container = document.getElementById('paymentDetailContent');
        if (!container) return;

        // Collect student items
        let studentRowsHtml = '';
        if (inv && inv.items && inv.items.length > 0) {
            studentRowsHtml = inv.items.map((item, idx) => `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 8px; text-align: center; color: #888;">${idx + 1}</td>
                    <td style="padding: 8px;"><strong>${item.studentNameEn}</strong> ${item.studentNameKo ? `(${item.studentNameKo})` : ''}</td>
                    <td style="padding: 8px;">${item.gradeEn || '-'}</td>
                    <td style="padding: 8px;">${item.termEn || '-'}</td>
                    <td style="padding: 8px; text-align: right;">${item.tuitionFee > 0 ? formatMYR(item.tuitionFee) : '-'}</td>
                    <td style="padding: 8px; text-align: right; font-weight: 700; color: #2E7D32;">${formatMYR(item.amount)}</td>
                </tr>
            `).join('');
        } else {
            const sName = p.studentName || (adm ? adm.studentName : '-');
            const sGrade = adm ? (adm.gradeEn || adm.grade) : '-';
            const sTerm = p.termName || (adm ? (adm.termEn || adm.term) : '-');
            const sTuition = adm ? adm.tuitionFee : 0;
            studentRowsHtml = `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 8px; text-align: center; color: #888;">1</td>
                    <td style="padding: 8px;"><strong>${sName}</strong></td>
                    <td style="padding: 8px;">${sGrade}</td>
                    <td style="padding: 8px;">${sTerm}</td>
                    <td style="padding: 8px; text-align: right;">${sTuition > 0 ? formatMYR(sTuition) : '-'}</td>
                    <td style="padding: 8px; text-align: right; font-weight: 700; color: #2E7D32;">${formatMYR(p.amount)}</td>
                </tr>
            `;
        }

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                <!-- Card 1: Payment Info -->
                <div style="background: #F9F8F6; border: 1px solid var(--border-color); border-radius: 8px; padding: 18px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <span style="font-size: 12px; font-weight: 700; color: var(--accent-color); text-transform: uppercase;">
                            <i class="fa-solid fa-money-bill-transfer"></i> 입금 및 정산 내역
                        </span>
                        <span class="status-badge status-paid"><i class="fa-solid fa-circle-check"></i> 입금 완료</span>
                    </div>
                    <div style="font-size: 26px; font-weight: 800; color: #2E7D32; margin-bottom: 10px;">
                        ${formatMYR(p.amount)}
                    </div>
                    <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.7;">
                        <div>• <strong>입금 일자:</strong> ${formatDate(p.paymentDate)}</div>
                        <div>• <strong>수취 계좌:</strong> ${p.bank || 'Maybank 법인 계좌'}</div>
                        <div>• <strong>거래 참조번호 (Ref):</strong> <span style="font-family: monospace; font-weight: 600; color: #1a1a1a;">${p.refNo || '-'}</span></div>
                        <div>• <strong>정산 메모:</strong> ${p.memo || '-'}</div>
                    </div>
                </div>

                <!-- Card 2: School & Accounting Info -->
                <div style="background: #FFFDF9; border: 1px solid var(--border-color); border-left: 4px solid var(--accent-color); border-radius: 8px; padding: 18px;">
                    <span style="font-size: 12px; font-weight: 700; color: var(--accent-color); text-transform: uppercase; display: block; margin-bottom: 8px;">
                        <i class="fa-solid fa-school"></i> 대상 국제학교 및 회계 담당자
                    </span>
                    <h4 style="font-size: 16px; font-weight: 700; margin: 0 0 6px 0; color: var(--text-primary);">${p.schoolName || '-'}</h4>
                    <div style="font-size: 12px; color: #888; margin-bottom: 10px;">${sch.location || 'Johor, Malaysia'}</div>
                    
                    <div style="background: #F5F2EB; padding: 10px 12px; border-radius: 6px; font-size: 12px; line-height: 1.6;">
                        <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 2px;">
                            <i class="fa-solid fa-file-invoice-dollar" style="color: var(--accent-color);"></i> 회계 담당자: ${sch.financeContactName || sch.contactPerson || '-'}
                        </div>
                        <div>• 이메일: <strong>${sch.financeContactEmail || sch.email || '-'}</strong></div>
                        <div>• 연락처: ${sch.financeContactPhone || sch.phone || '-'}</div>
                    </div>
                </div>
            </div>

            <!-- Card 3: Invoiced Students Table -->
            <div style="border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <h4 style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin: 0 0 12px 0;">
                    <i class="fa-solid fa-user-graduate" style="color: var(--accent-color);"></i> 본 정산에 포함된 학생 명단 및 커미션 배분
                </h4>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                        <tr style="background: #F4F2EE; color: var(--text-primary);">
                            <th style="padding: 8px; width: 35px; text-align: center;">No.</th>
                            <th style="padding: 8px; text-align: left;">학생 영문명 (한글)</th>
                            <th style="padding: 8px; text-align: left;">학년</th>
                            <th style="padding: 8px; text-align: left;">학기 / 입학일</th>
                            <th style="padding: 8px; text-align: right;">학비 (MYR)</th>
                            <th style="padding: 8px; text-align: right;">정산 입금액 (MYR)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${studentRowsHtml}
                    </tbody>
                </table>
            </div>

            <!-- Card 4: Linked Invoice Details -->
            <div style="background: #FAF9F6; border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-size: 11px; color: var(--accent-color); font-weight: 700; text-transform: uppercase;">연결된 공식 인보이스</div>
                    <div style="font-size: 15px; font-weight: 800; font-family: monospace; color: #1a1a1a; margin-top: 2px;">${p.invoiceNo || '연결 인보이스 없음'}</div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                        발행 법인: ${inv ? inv.entityName : 'GLOBAL EDU CONSULTING'} | 청구월: ${inv ? (inv.billingMonth || '-') : '-'}
                    </div>
                </div>
                ${inv ? `
                    <button type="button" class="btn btn-primary btn-open-linked-inv" data-id="${inv.id}" style="padding: 8px 14px; font-size: 12px;">
                        <i class="fa-solid fa-file-pdf"></i> 공식 인보이스 열람
                    </button>
                ` : ''}
            </div>
        `;

        const openLinkedBtn = container.querySelector('.btn-open-linked-inv');
        if (openLinkedBtn) {
            openLinkedBtn.addEventListener('click', () => {
                closeModal('paymentDetailModal');
                openInvoiceModalById(openLinkedBtn.getAttribute('data-id'));
            });
        }

        const viewInvBtn = document.getElementById('paymentDetailViewInvoiceBtn');
        if (viewInvBtn) {
            if (inv) {
                viewInvBtn.style.display = 'inline-flex';
                viewInvBtn.onclick = () => {
                    closeModal('paymentDetailModal');
                    openInvoiceModalById(inv.id);
                };
            } else {
                viewInvBtn.style.display = 'none';
            }
        }

        const deleteBtn = document.getElementById('paymentDetailDeleteBtn');
        if (deleteBtn) {
            deleteBtn.onclick = () => {
                if (confirm('해당 입금 내역을 삭제하시겠습니까?')) {
                    db.ref('commission_payments/' + p.id).remove().then(() => {
                        closeModal('paymentDetailModal');
                    });
                }
            };
        }

        openModal('paymentDetailModal');
    }

    function openPaymentForAdmission(admissionId) {
        const adm = admissions.find(a => a.id === admissionId);
        if (!adm) return;

        document.getElementById('paymentAdmissionId').value = adm.id;
        document.getElementById('paymentInvoiceId').value = '';
        document.getElementById('paymentDateInput').value = new Date().toISOString().split('T')[0];
        document.getElementById('paymentAmountInput').value = adm.commissionAmount || 0;
        document.getElementById('paymentBankInput').value = 'Maybank 법인 계좌';
        document.getElementById('paymentRefInput').value = '';
        document.getElementById('paymentMemoInput').value = `${adm.schoolName} 커미션 입금 확인`;

        document.getElementById('paymentTargetSummaryBox').innerHTML = `
            <strong>대상 학생:</strong> ${adm.studentNameEn || adm.studentName} (${adm.schoolName})<br>
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
        document.getElementById('paymentMemoInput').value = `인보이스 ${inv.invoiceNo} 정산 입금 확인`;

        const targetSummary = inv.items && inv.items.length > 0 
            ? `<strong>인보이스:</strong> ${inv.invoiceNo} (${inv.schoolName} - ${inv.billingMonth || ''}월분)<br><strong>포함 학생:</strong> 총 ${inv.items.length}명 | <strong>청구액:</strong> ${formatMYR(inv.amount)}`
            : `<strong>인보이스:</strong> ${inv.invoiceNo} (${inv.schoolName})<br><strong>학생명:</strong> ${inv.studentNameEn || inv.studentName} | <strong>청구액:</strong> ${formatMYR(inv.amount)}`;

        document.getElementById('paymentTargetSummaryBox').innerHTML = targetSummary;
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

            let studentSummary = '';
            if (inv && inv.items && inv.items.length > 0) {
                studentSummary = `${inv.items.length}명 (${inv.items.map(i => i.studentNameEn).slice(0, 2).join(', ')}${inv.items.length > 2 ? ' 외' : ''})`;
            } else if (inv) {
                studentSummary = inv.studentNameEn || inv.studentName || '';
            } else if (adm) {
                studentSummary = adm.studentNameEn || adm.studentName || '';
            }

            const paymentRecord = {
                admissionId: admissionId || '',
                invoiceId: invoiceId || '',
                invoiceNo: inv ? inv.invoiceNo : (adm ? `INV-${adm.studentNameEn || adm.studentName}` : ''),
                schoolName: inv ? inv.schoolName : (adm ? adm.schoolName : ''),
                studentName: studentSummary,
                studentListSummary: studentSummary,
                termName: inv ? (inv.billingMonth ? `${inv.billingMonth}월 통합정산` : (inv.termName || '완납')) : (adm ? adm.term : '완납'),
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

                // If invoice had multiple items, mark each student's installments as paid!
                if (inv && inv.items && inv.items.length > 0) {
                    inv.items.forEach(item => {
                        const targetAdm = admissions.find(a => a.id === item.admissionId);
                        if (targetAdm && targetAdm.installments && targetAdm.installments[item.installmentIndex]) {
                            targetAdm.installments[item.installmentIndex].status = 'paid';
                            targetAdm.installments[item.installmentIndex].paymentDate = paymentDate;
                            
                            const allPaid = targetAdm.installments.every(inst => inst.status === 'paid');
                            db.ref(`commission_admissions/${item.admissionId}/installments`).set(targetAdm.installments);
                            if (allPaid) {
                                db.ref(`commission_admissions/${item.admissionId}/status`).set('paid');
                            }
                        }
                    });
                } else if (admissionId && adm) {
                    db.ref('commission_admissions/' + admissionId).update({ status: 'paid' });
                }

                closeModal('paymentModal');
                alert('입금 확인 및 커미션 정산 완료 처리가 저장되었습니다.');
            });
        });
    }

    // ----------------------------------------------------
    // 13. SUB-TAB 4 & MODAL 4 & 6: Partner International Schools & Enrolled Students Modal
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
                if (schoolDefaultRate) schoolDefaultRate.placeholder = '예: 3500';
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
            const schoolAdmissions = admissions.filter(a => a.schoolName === sch.nameEn || a.schoolName === sch.nameKo || a.schoolId === sch.id);
            const totalCount = schoolAdmissions.length;
            const settledCount = schoolAdmissions.filter(a => a.status === 'paid').length;
            const pendingCount = totalCount - settledCount;
            const totalCommission = schoolAdmissions.reduce((sum, a) => sum + (parseFloat(a.commissionAmount) || 0), 0);

            const rateTag = sch.commissionType === 'fixed'
                ? `<span class="installment-tag" style="background: rgba(2, 136, 209, 0.1); color: #0288D1; font-weight: 700;">고정 ${formatMYR(sch.defaultRate || 0)}</span>`
                : `<span class="installment-tag" style="background: rgba(46, 125, 50, 0.1); color: #2E7D32; font-weight: 700;">${sch.defaultRate || 10}%</span>`;

            // Contract Status Badge
            const contractStatus = getContractStatus(sch.contractStartDate, sch.contractEndDate);
            const contractDatesDisplay = (sch.contractStartDate && sch.contractEndDate) 
                ? `${sch.contractStartDate} ~ ${sch.contractEndDate}`
                : '계약기간 미지정';

            return `
                <div class="school-card">
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                            <h4 style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0; line-height: 1.3;">${sch.nameEn}</h4>
                            ${rateTag}
                        </div>
                        <div style="font-size: 12px; color: var(--accent-color); font-weight: 500; margin-bottom: 10px;">${sch.nameKo || ''}</div>
                        
                        <!-- Contract Period Badge -->
                        <div style="background: #FAF8F5; border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 10px; margin-bottom: 12px; font-size: 11px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #666;"><i class="fa-solid fa-file-contract" style="color: var(--accent-color);"></i> 계약기간</span>
                                <span class="contract-badge ${contractStatus.cssClass}">${contractStatus.label}</span>
                            </div>
                            <div style="font-weight: 600; color: #1a1a1a; margin-top: 4px;">${contractDatesDisplay}</div>
                        </div>

                        <!-- Admin Contact -->
                        <div class="school-contact-box">
                            <div style="font-weight: 700; color: #555; margin-bottom: 4px;">
                                <i class="fa-solid fa-user-tie"></i> 어드민 담당자
                            </div>
                            <div>• 성명: <strong>${sch.adminContactName || sch.contactPerson || '-'}</strong></div>
                            <div>• 이메일: ${sch.adminContactEmail || sch.email || '-'}</div>
                            <div>• 연락처: ${sch.adminContactPhone || sch.phone || '-'}</div>
                        </div>

                        <!-- Finance Contact (Invoice Destination) -->
                        <div class="school-contact-box finance-box">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <span style="font-weight: 700; color: var(--accent-color);">
                                    <i class="fa-solid fa-file-invoice-dollar"></i> 회계/정산 담당자
                                </span>
                                <span style="font-size: 10px; background: rgba(197, 168, 128, 0.2); color: var(--accent-color); padding: 1px 6px; border-radius: 3px; font-weight: 600;">인보이스 발송처</span>
                            </div>
                            <div>• 성명: <strong>${sch.financeContactName || sch.contactPerson || '-'}</strong></div>
                            <div>• 이메일: <strong style="color: var(--text-primary);">${sch.financeContactEmail || sch.email || '-'}</strong></div>
                            <div>• 연락처: ${sch.financeContactPhone || sch.phone || '-'}</div>
                        </div>
                    </div>

                    <div style="border-top: 1px solid var(--border-color); padding-top: 12px; margin-top: 10px;">
                        <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 10px;">
                            총 학생 <strong>${totalCount}명</strong> (정산완료 ${settledCount}명 / 진행중 ${pendingCount}명)<br>
                            총 커미션: <strong style="color: #2E7D32;">${formatMYR(totalCommission)}</strong>
                        </div>
                        <div style="display: grid; grid-template-columns: 1.3fr 1fr; gap: 8px;">
                            <button type="button" class="btn btn-primary btn-view-school-students" data-id="${sch.id}" style="padding: 6px 10px; font-size: 11px;">
                                <i class="fa-solid fa-users"></i> 등록 학생 명단 (${totalCount}명)
                            </button>
                            <button type="button" class="btn btn-secondary btn-edit-school" data-id="${sch.id}" style="padding: 6px 10px; font-size: 11px;">
                                <i class="fa-solid fa-pen"></i> 학교/계약 수정
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        document.querySelectorAll('.btn-view-school-students').forEach(btn => {
            btn.addEventListener('click', () => openSchoolStudentsModal(btn.getAttribute('data-id')));
        });
        document.querySelectorAll('.btn-edit-school').forEach(btn => {
            btn.addEventListener('click', () => openEditSchoolModal(btn.getAttribute('data-id')));
        });
    }

    // ----------------------------------------------------
    // SCHOOL ENROLLED STUDENTS FULL VIEW MODAL (Request 3)
    // ----------------------------------------------------
    function openSchoolStudentsModal(schoolId) {
        const sch = schools.find(s => s.id === schoolId);
        if (!sch) return;

        const schoolStudents = admissions.filter(a => a.schoolId === sch.id || a.schoolName === sch.nameEn || a.schoolName === sch.nameKo);
        const totalTuition = schoolStudents.reduce((sum, a) => sum + (parseFloat(a.tuitionFee) || 0), 0);
        const totalCommission = schoolStudents.reduce((sum, a) => sum + (parseFloat(a.commissionAmount) || 0), 0);
        
        let settledAmount = 0;
        schoolStudents.forEach(a => {
            const insts = a.installments || [];
            insts.filter(i => i.status === 'paid').forEach(i => settledAmount += (parseFloat(i.amount) || 0));
        });
        const pendingAmount = Math.max(0, totalCommission - settledAmount);

        // Header Title
        const titleEl = document.getElementById('schoolStudentsModalTitle');
        if (titleEl) {
            titleEl.innerHTML = `<i class="fa-solid fa-school" style="color: var(--accent-color);"></i> ${sch.nameEn} - 등록 학생 전체 명단 (${schoolStudents.length}명)`;
        }

        // Summary Banner
        const bannerEl = document.getElementById('schoolStudentsSummaryBanner');
        const contractStatus = getContractStatus(sch.contractStartDate, sch.contractEndDate);
        if (bannerEl) {
            bannerEl.innerHTML = `
                <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; margin-bottom: 15px;">
                    <div>
                        <h3 style="margin: 0 0 4px 0; font-size: 18px; color: var(--text-primary);">${sch.nameEn} <span style="font-size: 13px; color: var(--accent-color);">(${sch.nameKo || ''})</span></h3>
                        <div style="font-size: 12px; color: #666;"><i class="fa-solid fa-location-dot"></i> ${sch.location || 'Johor, Malaysia'}</div>
                        <div style="font-size: 12px; color: #444; margin-top: 6px;">
                            • 계약기간: <strong>${sch.contractStartDate || '-'} ~ ${sch.contractEndDate || '-'}</strong>
                            <span class="contract-badge ${contractStatus.cssClass}" style="margin-left: 6px;">${contractStatus.label}</span>
                        </div>
                    </div>
                    <div style="background: var(--white); padding: 10px 14px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 12px;">
                        <div style="font-weight: 700; color: var(--accent-color); margin-bottom: 4px;"><i class="fa-solid fa-file-invoice-dollar"></i> 회계/정산 담당자 (인보이스 수신처)</div>
                        <div>• 성명: <strong>${sch.financeContactName || sch.contactPerson || '-'}</strong></div>
                        <div>• 이메일: <strong>${sch.financeContactEmail || sch.email || '-'}</strong> | 전화: ${sch.financeContactPhone || sch.phone || '-'}</div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; border-top: 1px solid var(--border-color); padding-top: 12px; text-align: center;">
                    <div style="background: var(--white); padding: 8px; border-radius: 6px; border: 1px solid var(--border-color);">
                        <div style="font-size: 11px; color: #888;">총 등록 학생</div>
                        <div style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin-top: 2px;">${schoolStudents.length}명</div>
                    </div>
                    <div style="background: var(--white); padding: 8px; border-radius: 6px; border: 1px solid var(--border-color);">
                        <div style="font-size: 11px; color: #888;">총 학비 규모</div>
                        <div style="font-size: 15px; font-weight: 800; color: #1a1a1a; margin-top: 2px;">${formatMYR(totalTuition)}</div>
                    </div>
                    <div style="background: var(--white); padding: 8px; border-radius: 6px; border: 1px solid var(--border-color);">
                        <div style="font-size: 11px; color: #888;">총 예상 커미션</div>
                        <div style="font-size: 15px; font-weight: 800; color: var(--accent-color); margin-top: 2px;">${formatMYR(totalCommission)}</div>
                    </div>
                    <div style="background: var(--white); padding: 8px; border-radius: 6px; border: 1px solid var(--border-color);">
                        <div style="font-size: 11px; color: #888;">정산 완료 입금액</div>
                        <div style="font-size: 15px; font-weight: 800; color: #2E7D32; margin-top: 2px;">${formatMYR(settledAmount)}</div>
                    </div>
                    <div style="background: var(--white); padding: 8px; border-radius: 6px; border: 1px solid var(--border-color);">
                        <div style="font-size: 11px; color: #888;">미정산 잔액</div>
                        <div style="font-size: 15px; font-weight: 800; color: #C62828; margin-top: 2px;">${formatMYR(pendingAmount)}</div>
                    </div>
                </div>
            `;
        }

        // Table Body
        const tableBody = document.getElementById('schoolStudentsTableBody');
        if (tableBody) {
            if (schoolStudents.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="9" style="text-align: center; padding: 30px; color: #888;">
                            이 학교에 등록된 수속 학생이 없습니다.
                        </td>
                    </tr>
                `;
            } else {
                tableBody.innerHTML = schoolStudents.map((adm, idx) => {
                    const statusBadge = getStatusBadge(adm.status);
                    const insts = adm.installments || [];
                    const paidCount = insts.filter(i => i.status === 'paid').length;
                    
                    return `
                        <tr>
                            <td style="text-align: center; color: #888;">${idx + 1}</td>
                            <td>
                                <strong>${adm.studentNameEn || adm.studentName}</strong>
                                ${adm.studentNameKo ? `<span style="font-size: 11px; color: #888;"> (${adm.studentNameKo})</span>` : ''}
                                <div style="font-size: 10px; color: #888;">${adm.parentContact || '-'}</div>
                            </td>
                            <td>
                                <div>${adm.gradeEn || adm.grade || '-'}</div>
                                ${adm.gradeKo ? `<span style="font-size: 10px; color: #888;">${adm.gradeKo}</span>` : ''}
                            </td>
                            <td>
                                <div>${adm.termEn || adm.term || '-'}</div>
                                <div style="font-size: 10px; color: #888;">입학: ${formatDate(adm.admissionDate)}</div>
                            </td>
                            <td style="font-weight: 600;">${adm.tuitionFee > 0 ? formatMYR(adm.tuitionFee) : '-'}</td>
                            <td style="font-weight: 700; color: var(--accent-color);">${formatMYR(adm.commissionAmount)}</td>
                            <td>
                                <span class="installment-tag">${adm.settlementMode === '1' ? '1회' : `${adm.settlementMode}회`} (${paidCount}/${insts.length || 1} 완료)</span>
                            </td>
                            <td>${statusBadge}</td>
                            <td>
                                <button type="button" class="btn btn-secondary btn-edit-from-school-modal" data-id="${adm.id}" style="padding: 4px 8px; font-size: 11px;">
                                    <i class="fa-solid fa-pen"></i> 수정
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('');

                tableBody.querySelectorAll('.btn-edit-from-school-modal').forEach(btn => {
                    btn.addEventListener('click', () => {
                        closeModal('schoolStudentsModal');
                        openEditAdmissionModal(btn.getAttribute('data-id'));
                    });
                });
            }
        }

        // Bind "Add new student for this school" button
        const addStudentBtn = document.getElementById('addNewStudentForThisSchoolBtn');
        if (addStudentBtn) {
            addStudentBtn.onclick = () => {
                closeModal('schoolStudentsModal');
                if (openAddAdmissionBtn) openAddAdmissionBtn.click();
                if (admissionSchoolId) {
                    admissionSchoolId.value = sch.id;
                    admissionSchoolId.dispatchEvent(new Event('change'));
                }
            };
        }

        openModal('schoolStudentsModal');
    }

    if (openAddSchoolBtn) {
        openAddSchoolBtn.addEventListener('click', () => {
            document.getElementById('schoolModalTitle').innerHTML = '<i class="fa-solid fa-school" style="color: var(--accent-color);"></i> 협력 국제학교 및 커미션 계약 정책 등록';
            document.getElementById('schoolId').value = '';
            document.getElementById('schoolForm').reset();
            document.getElementById('schoolCommissionType').value = 'percentage';
            if (schoolValueLabel) schoolValueLabel.innerHTML = '기본 요율 (%) <span style="color: #C62828;">*</span>';
            document.getElementById('schoolDefaultRate').value = '10';
            document.getElementById('schoolDefaultSettlement').value = '1';
            document.getElementById('schoolContractStartDate').value = '2025-01-01';
            document.getElementById('schoolContractEndDate').value = '2026-12-31';
            if (deleteSchoolBtn) deleteSchoolBtn.classList.add('hidden');
            openModal('schoolModal');
        });
    }

    function openEditSchoolModal(id) {
        const sch = schools.find(s => s.id === id);
        if (!sch) return;

        document.getElementById('schoolModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square" style="color: var(--accent-color);"></i> 협력 국제학교 및 계약 정책 수정';
        document.getElementById('schoolId').value = sch.id;
        document.getElementById('schoolNameEn').value = sch.nameEn || '';
        document.getElementById('schoolNameKo').value = sch.nameKo || '';
        document.getElementById('schoolLocation').value = sch.location || '';
        document.getElementById('schoolContractStartDate').value = sch.contractStartDate || '';
        document.getElementById('schoolContractEndDate').value = sch.contractEndDate || '';

        const commType = sch.commissionType || 'percentage';
        document.getElementById('schoolCommissionType').value = commType;
        if (commType === 'fixed') {
            if (schoolValueLabel) schoolValueLabel.innerHTML = '기본 고정 금액 (MYR) <span style="color: #C62828;">*</span>';
            document.getElementById('schoolDefaultRate').value = sch.defaultRate || 3500;
        } else {
            if (schoolValueLabel) schoolValueLabel.innerHTML = '기본 요율 (%) <span style="color: #C62828;">*</span>';
            document.getElementById('schoolDefaultRate').value = sch.defaultRate || 10;
        }

        document.getElementById('schoolDefaultSettlement').value = sch.defaultSettlement || '1';
        
        // Admin Contact
        document.getElementById('schoolAdminContactName').value = sch.adminContactName || sch.contactPerson || '';
        document.getElementById('schoolAdminContactEmail').value = sch.adminContactEmail || sch.email || '';
        document.getElementById('schoolAdminContactPhone').value = sch.adminContactPhone || sch.phone || '';
        
        // Finance Contact
        document.getElementById('schoolFinanceContactName').value = sch.financeContactName || sch.contactPerson || '';
        document.getElementById('schoolFinanceContactEmail').value = sch.financeContactEmail || sch.email || '';
        document.getElementById('schoolFinanceContactPhone').value = sch.financeContactPhone || sch.phone || '';

        document.getElementById('schoolMemo').value = sch.memo || '';

        if (deleteSchoolBtn) deleteSchoolBtn.classList.remove('hidden');
        openModal('schoolModal');
    }

    if (saveSchoolBtn) {
        saveSchoolBtn.addEventListener('click', () => {
            const id = document.getElementById('schoolId').value;
            const nameEn = document.getElementById('schoolNameEn').value.trim();
            const financeEmail = document.getElementById('schoolFinanceContactEmail').value.trim();
            const adminEmail = document.getElementById('schoolAdminContactEmail').value.trim();

            if (!nameEn) {
                alert('국제학교 공식 영문명을 입력해주세요.');
                return;
            }

            const commType = document.getElementById('schoolCommissionType').value;

            const data = {
                nameEn,
                nameKo: document.getElementById('schoolNameKo').value.trim(),
                location: document.getElementById('schoolLocation').value.trim(),
                contractStartDate: document.getElementById('schoolContractStartDate').value,
                contractEndDate: document.getElementById('schoolContractEndDate').value,
                commissionType: commType,
                defaultRate: parseFloat(document.getElementById('schoolDefaultRate').value) || 10,
                defaultSettlement: document.getElementById('schoolDefaultSettlement').value,
                adminContactName: document.getElementById('schoolAdminContactName').value.trim(),
                adminContactEmail: adminEmail,
                adminContactPhone: document.getElementById('schoolAdminContactPhone').value.trim(),
                financeContactName: document.getElementById('schoolFinanceContactName').value.trim(),
                financeContactEmail: financeEmail,
                financeContactPhone: document.getElementById('schoolFinanceContactPhone').value.trim(),
                contactPerson: document.getElementById('schoolAdminContactName').value.trim(),
                email: financeEmail || adminEmail,
                phone: document.getElementById('schoolFinanceContactPhone').value.trim(),
                memo: document.getElementById('schoolMemo').value.trim(),
                updatedAt: new Date().toISOString()
            };

            if (id) {
                db.ref('commission_schools/' + id).update(data).then(() => {
                    closeModal('schoolModal');
                });
            } else {
                data.createdAt = new Date().toISOString();
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
            if (confirm('해당 국제학교 및 커미션 정책 정보를 삭제하시겠습니까?')) {
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
