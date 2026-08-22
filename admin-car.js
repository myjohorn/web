// Admin Control Console for Delegated Car Rental Service (JohorN)

window.onerror = function(message, source, lineno, colno, error) {
    alert("Car Admin script error:\n" + message + "\nLocation: " + source + " (Line: " + lineno + ")");
    return false;
};

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // 1. Initial State & Variables
    // ----------------------------------------------------
    let delegatedCars = [];
    let delegatedRevenues = [];
    let delegatedExpenses = [];
    let delegatedSettlements = [];
    
    let activeTab = 'calendar'; // 'cars' | 'calendar' | 'ledger' | 'settlements'
    let adminPasswordHash = null;
    let userRole = 'admin'; // 'admin' | 'owner'
    let ownerCarId = null;
    let ownerCarPlate = '';
    let ownerName = '';

    // Default target month: current YYYY-MM
    const today = new Date();
    const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    // Set default month inputs
    const ledgerMonthFilter = document.getElementById('ledgerMonthFilter');
    const settlementTargetMonth = document.getElementById('settlementTargetMonth');
    if (ledgerMonthFilter) ledgerMonthFilter.value = currentYearMonth;
    if (settlementTargetMonth) settlementTargetMonth.value = currentYearMonth;

    // Mobile Nav Toggle
    const navToggle = document.getElementById('navToggle');
    const navLinksContainer = document.getElementById('navLinks');
    if (navToggle && navLinksContainer) {
        navToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navLinksContainer.classList.toggle('active');
            navToggle.classList.toggle('open');
        });

        // Close dropdown when tapping anywhere outside
        document.addEventListener('click', (e) => {
            if (!navLinksContainer.contains(e.target) && !navToggle.contains(e.target)) {
                navLinksContainer.classList.remove('active');
                navToggle.classList.remove('open');
            }
        });

        // Close dropdown when clicking any navigation link
        navLinksContainer.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinksContainer.classList.remove('active');
                navToggle.classList.remove('open');
            });
        });
    }

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

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.database();

    // Password Hashing helper (SHA-256)
    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // ----------------------------------------------------
    // 2. Authentication Logic
    // ----------------------------------------------------
    const adminLogin = document.getElementById('adminLogin');
    const adminDashboard = document.getElementById('adminDashboard');
    const adminPasswordInput = document.getElementById('adminPassword');
    const adminLoginBtn = document.getElementById('adminLoginBtn');

    // Dual Login Tab Elements
    const loginTabOwnerBtn = document.getElementById('loginTabOwnerBtn');
    const loginTabAdminBtn = document.getElementById('loginTabAdminBtn');
    const ownerLoginForm = document.getElementById('ownerLoginForm');
    const adminLoginForm = document.getElementById('adminLoginForm');
    const ownerPlateNumberInput = document.getElementById('ownerPlateNumber');
    const ownerContactNumberInput = document.getElementById('ownerContactNumber');
    const ownerLoginBtn = document.getElementById('ownerLoginBtn');

    // Profile & Logout Elements
    const userBadgeText = document.getElementById('userBadgeText');
    const userBadgeIcon = document.getElementById('userBadgeIcon');
    const portalSubTag = document.getElementById('portalSubTag');
    const dashboardMainTitle = document.getElementById('dashboardMainTitle');
    const logoutBtn = document.getElementById('logoutBtn');
    const carCalGuideText = document.getElementById('carCalGuideText');

    // Login Tabs Switching
    if (loginTabOwnerBtn && loginTabAdminBtn && ownerLoginForm && adminLoginForm) {
        loginTabOwnerBtn.addEventListener('click', () => {
            loginTabOwnerBtn.classList.remove('btn-secondary');
            loginTabOwnerBtn.classList.add('btn-primary');
            loginTabAdminBtn.classList.remove('btn-primary');
            loginTabAdminBtn.classList.add('btn-secondary');
            ownerLoginForm.style.display = 'block';
            adminLoginForm.style.display = 'none';
        });
        loginTabAdminBtn.addEventListener('click', () => {
            loginTabAdminBtn.classList.remove('btn-secondary');
            loginTabAdminBtn.classList.add('btn-primary');
            loginTabOwnerBtn.classList.remove('btn-primary');
            loginTabOwnerBtn.classList.add('btn-secondary');
            adminLoginForm.style.display = 'block';
            ownerLoginForm.style.display = 'none';
        });
    }

    db.ref('settings/admin_password').on('value', (snapshot) => {
        adminPasswordHash = snapshot.val() || 'c5ade4700915e1f704bef4a178d76f5e7e9945fefd7f2cdabc6293bc1e78a445'; // default: '10011001'
    });

    function applyRolePermissions() {
        const isOwner = userRole === 'owner';
        const carsTabBtn = document.querySelector('.car-tab-btn[data-tab="cars"]');
        const carsTabHeaderTitle = document.getElementById('carsTabHeaderTitle');

        if (isOwner) {
            // Owner mode UI
            if (userBadgeText) userBadgeText.textContent = `${ownerCarPlate} (${ownerName} 님)`;
            if (userBadgeIcon) userBadgeIcon.className = 'fa-solid fa-car-side';
            if (portalSubTag) portalSubTag.textContent = 'Vehicle Owner Portal';
            if (dashboardMainTitle) dashboardMainTitle.textContent = `${ownerCarPlate} 차량 운행 및 정산 조회`;
            if (carCalGuideText) carCalGuideText.innerHTML = '<i class="fa-solid fa-circle-info"></i> 내 차량의 예약 현황을 달력과 목록으로 확인하실 수 있습니다.';

            // Hide admin-only controls (e.g. [+ 신규 위탁 차량 등록])
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');

            // Show cars tab button (Read-only vehicle info for owner)
            if (carsTabBtn) {
                carsTabBtn.style.display = '';
                carsTabBtn.innerHTML = '<i class="fa-solid fa-car" style="margin-right: 4px;"></i> 차량 관리';
            }
            if (carsTabHeaderTitle) {
                carsTabHeaderTitle.innerHTML = `<i class="fa-solid fa-car-side" style="color: var(--accent-color); margin-right: 8px;"></i> [${ownerCarPlate}] 내 차량 등록 정보`;
            }
        } else {
            // Admin mode UI
            if (userBadgeText) userBadgeText.textContent = '마스터 관리자 모드';
            if (userBadgeIcon) userBadgeIcon.className = 'fa-solid fa-user-shield';
            if (portalSubTag) portalSubTag.textContent = 'Consignment Car Management';
            if (dashboardMainTitle) dashboardMainTitle.textContent = '렌트카 매출/비용 및 수익 배분 관리';
            if (carCalGuideText) carCalGuideText.innerHTML = '<i class="fa-solid fa-circle-info"></i> 날짜를 클릭하면 해당 시작일로 신규 예약을 등록할 수 있습니다.';

            // Show admin-only controls
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');

            if (carsTabBtn) {
                carsTabBtn.style.display = '';
                carsTabBtn.innerHTML = '<i class="fa-solid fa-car" style="margin-right: 4px;"></i> 차량 관리';
            }
            if (carsTabHeaderTitle) {
                carsTabHeaderTitle.innerHTML = '<i class="fa-solid fa-list" style="color: var(--accent-color); margin-right: 8px;"></i> 위탁 관리 차량 리스트';
            }
        }
    }

    function checkAuth() {
        const isAuth = sessionStorage.getItem('johorn_car_portal_auth') === 'true' || 
                       sessionStorage.getItem('johorn_admin_auth') === 'true' || 
                       sessionStorage.getItem('admin_logged_in') === 'true';

        if (isAuth) {
            userRole = sessionStorage.getItem('car_admin_role') || 'admin';
            ownerCarId = sessionStorage.getItem('owner_car_id') || null;
            ownerCarPlate = sessionStorage.getItem('owner_car_plate') || '';
            ownerName = sessionStorage.getItem('owner_name') || '';

            if (adminLogin) adminLogin.style.display = 'none';
            if (adminDashboard) adminDashboard.style.display = 'block';

            applyRolePermissions();
            initDataListeners();
        } else {
            if (adminLogin) adminLogin.style.display = 'block';
            if (adminDashboard) adminDashboard.style.display = 'none';
        }
    }

    // Master Admin Login Handler
    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', async () => {
            const input = adminPasswordInput ? adminPasswordInput.value.trim() : '';
            if (!input) {
                alert('관리자 비밀번호를 입력해주세요.');
                return;
            }

            const inputHash = await hashPassword(input);
            const defaultHash = await hashPassword('10011001');

            if (inputHash === adminPasswordHash || inputHash === defaultHash || input === '10011001') {
                sessionStorage.setItem('johorn_car_portal_auth', 'true');
                sessionStorage.setItem('johorn_admin_auth', 'true');
                sessionStorage.setItem('admin_logged_in', 'true');
                sessionStorage.setItem('car_admin_role', 'admin');
                sessionStorage.removeItem('owner_car_id');
                sessionStorage.removeItem('owner_car_plate');
                sessionStorage.removeItem('owner_name');
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

    // Owner Login Handler (ID = Car Plate, PW = Owner Contact)
    if (ownerLoginBtn) {
        ownerLoginBtn.addEventListener('click', () => {
            const plateInput = ownerPlateNumberInput ? ownerPlateNumberInput.value.trim() : '';
            const contactInput = ownerContactNumberInput ? ownerContactNumberInput.value.trim() : '';

            if (!plateInput || !contactInput) {
                alert('차량 번호(아이디)와 차주 연락처(비밀번호)를 모두 입력해 주세요.');
                return;
            }

            const normPlate = plateInput.replace(/\s+/g, '').toUpperCase();
            const normContact = contactInput.replace(/[^0-9]/g, '');

            db.ref('delegated_cars').once('value').then((snapshot) => {
                const val = snapshot.val();
                if (!val) {
                    alert('등록된 위탁 차량 정보를 찾을 수 없습니다.');
                    return;
                }
                const cars = Object.keys(val).map(k => ({ id: k, ...val[k] }));

                const matched = cars.find(c => {
                    const cPlate = (c.plateNumber || '').replace(/\s+/g, '').toUpperCase();
                    const cContact = (c.ownerContact || '').replace(/[^0-9]/g, '');
                    return cPlate === normPlate && cContact === normContact;
                });

                if (matched) {
                    sessionStorage.setItem('johorn_car_portal_auth', 'true');
                    sessionStorage.setItem('car_admin_role', 'owner');
                    sessionStorage.setItem('owner_car_id', matched.id);
                    sessionStorage.setItem('owner_car_plate', matched.plateNumber || plateInput);
                    sessionStorage.setItem('owner_name', matched.ownerName || '차주');
                    checkAuth();
                } else {
                    alert('일치하는 위탁 차량 또는 차주 연락처 정보를 찾을 수 없습니다.\n등록된 차량 번호와 연락처를 다시 확인해 주세요.');
                }
            }).catch(err => {
                alert('로그인 처리 중 오류가 발생했습니다: ' + err.message);
            });
        });
    }

    if (ownerPlateNumberInput) {
        ownerPlateNumberInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && ownerContactNumberInput) ownerContactNumberInput.focus();
        });
    }
    if (ownerContactNumberInput) {
        ownerContactNumberInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') ownerLoginBtn.click();
        });
    }

    // Logout Handler
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('로그아웃 하시겠습니까?')) {
                sessionStorage.clear();
                location.reload();
            }
        });
    }

    checkAuth();

    // ----------------------------------------------------
    // 3. Realtime Database Listeners
    // ----------------------------------------------------
    function initDataListeners() {
        // Cars
        db.ref('delegated_cars').on('value', (snapshot) => {
            const val = snapshot.val();
            delegatedCars = val ? Object.keys(val).map(k => ({ id: k, ...val[k] })) : [];
            updateCarSelectors();
            renderCars();
            updateDashboardMetrics();
            renderLedger();
            renderSettlements();
            renderCarCalendar();
        });

        // Revenues
        db.ref('delegated_car_revenues').on('value', (snapshot) => {
            const val = snapshot.val();
            delegatedRevenues = val ? Object.keys(val).map(k => ({ id: k, ...val[k] })) : [];
            updateDashboardMetrics();
            renderLedger();
            renderSettlements();
            renderCarCalendar();
        });

        // Expenses
        db.ref('delegated_car_expenses').on('value', (snapshot) => {
            const val = snapshot.val();
            delegatedExpenses = val ? Object.keys(val).map(k => ({ id: k, ...val[k] })) : [];

            // One-time migration: move inline receiptImage to separate path
            if (val) {
                Object.keys(val).forEach(k => {
                    const exp = val[k];
                    if (exp.receiptImage && typeof exp.receiptImage === 'string' && exp.receiptImage.startsWith('data:')) {
                        console.log(`Migrating receipt for expense ${k}...`);
                        db.ref(`delegated_car_expense_receipts/${k}`).set({
                            receiptImage: exp.receiptImage,
                            receiptName: exp.receiptName || null
                        }).then(() => {
                            db.ref(`delegated_car_expenses/${k}`).update({
                                hasReceipt: true,
                                receiptImage: null,
                                receiptName: null
                            });
                        });
                    }
                });
            }

            updateDashboardMetrics();
            renderLedger();
            renderSettlements();
        });

        // Settlements
        db.ref('delegated_car_settlements').on('value', (snapshot) => {
            const val = snapshot.val();
            delegatedSettlements = val ? Object.keys(val).map(k => ({ id: k, ...val[k] })) : [];
            renderSettlements();
        });
    }

    // ----------------------------------------------------
    // 4. Tab Navigation Logic
    // ----------------------------------------------------
    const tabBtns = document.querySelectorAll('.car-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => {
                b.classList.remove('active');
                b.style.borderBottomColor = 'transparent';
                b.style.color = 'var(--text-secondary)';
            });
            btn.classList.add('active');
            btn.style.borderBottomColor = 'var(--accent-color)';
            btn.style.color = 'var(--text-primary)';

            activeTab = btn.getAttribute('data-tab');

            const tabCars = document.getElementById('tabContentCars');
            const tabCalendar = document.getElementById('tabContentCalendar');
            const tabLedger = document.getElementById('tabContentLedger');
            const tabSettlements = document.getElementById('tabContentSettlements');

            if (tabCars) tabCars.classList.add('hidden');
            if (tabCalendar) tabCalendar.classList.add('hidden');
            if (tabLedger) tabLedger.classList.add('hidden');
            if (tabSettlements) tabSettlements.classList.add('hidden');

            if (activeTab === 'cars' && tabCars) {
                tabCars.classList.remove('hidden');
            } else if (activeTab === 'calendar' && tabCalendar) {
                tabCalendar.classList.remove('hidden');
                renderCarCalendar();
            } else if (activeTab === 'ledger' && tabLedger) {
                tabLedger.classList.remove('hidden');
            } else if (activeTab === 'settlements' && tabSettlements) {
                tabSettlements.classList.remove('hidden');
            }
        });
    });

    // Modal Control Helpers
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
    // 5. Cars Management Logic (`#tabCars`) & Documents Handling
    // ----------------------------------------------------
    const carDocFields = [
        { fileId: 'carInsuranceCertFile', dataId: 'carInsuranceCertData', previewId: 'carInsuranceCertPreview', label: '보험 증서' },
        { fileId: 'carRegCertFrontFile', dataId: 'carRegCertFrontData', previewId: 'carRegCertFrontPreview', label: '등록증 앞면' },
        { fileId: 'carRegCertBackFile', dataId: 'carRegCertBackData', previewId: 'carRegCertBackPreview', label: '등록증 뒷면' },
        { fileId: 'carPhotoFrontFile', dataId: 'carPhotoFrontData', previewId: 'carPhotoFrontPreview', label: '차량 전면' },
        { fileId: 'carPhotoBackFile', dataId: 'carPhotoBackData', previewId: 'carPhotoBackPreview', label: '차량 후면' },
        { fileId: 'carPhotoLeftFile', dataId: 'carPhotoLeftData', previewId: 'carPhotoLeftPreview', label: '차량 좌측' },
        { fileId: 'carPhotoRightFile', dataId: 'carPhotoRightData', previewId: 'carPhotoRightPreview', label: '차량 우측' },
        { fileId: 'carRoadTaxStickerFile', dataId: 'carRoadTaxStickerData', previewId: 'carRoadTaxStickerPreview', label: '로드택스 스티커' },
        { fileId: 'carOwnerPassportFile', dataId: 'carOwnerPassportData', previewId: 'carOwnerPassportPreview', label: '차주 여권' }
    ];

    function bindCarDocFileInputs() {
        carDocFields.forEach(field => {
            const input = document.getElementById(field.fileId);
            if (!input) return;
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                readAndCompressImage(file, (dataUrl, fileName) => {
                    const hiddenInput = document.getElementById(field.dataId);
                    const previewBox = document.getElementById(field.previewId);
                    if (hiddenInput) hiddenInput.value = dataUrl;
                    if (previewBox) {
                        if (dataUrl.startsWith('data:image/')) {
                            previewBox.innerHTML = `
                                <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                                    <img src="${dataUrl}" alt="${field.label}" style="width: 36px; height: 36px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color);">
                                    <span style="color: #2E7D32; font-weight: 600;">✓ 등록됨 (${fileName})</span>
                                    <button type="button" class="btn-clear-doc" style="background: none; border: none; color: #E24C4C; font-size: 11px; cursor: pointer;">❌ 삭제</button>
                                </div>
                            `;
                        } else {
                            previewBox.innerHTML = `
                                <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                                    <span style="color: #2E7D32; font-weight: 600;">📄 파일 첨부됨 (${fileName})</span>
                                    <button type="button" class="btn-clear-doc" style="background: none; border: none; color: #E24C4C; font-size: 11px; cursor: pointer;">❌ 삭제</button>
                                </div>
                            `;
                        }
                        previewBox.querySelector('.btn-clear-doc').addEventListener('click', () => {
                            if (hiddenInput) hiddenInput.value = '';
                            input.value = '';
                            previewBox.innerHTML = '';
                        });
                    }
                });
            });
        });
    }

    function readAndCompressImage(file, callback, customMaxDim, customQuality) {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (file.type.startsWith('image/')) {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const maxDim = customMaxDim || 1000;
                    const quality = customQuality || 0.8;
                    if (width > maxDim || height > maxDim) {
                        if (width > height) {
                            height = Math.round((height * maxDim) / width);
                            width = maxDim;
                        } else {
                            width = Math.round((width * maxDim) / height);
                            height = maxDim;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const compressedData = canvas.toDataURL('image/jpeg', quality);
                    callback(compressedData, file.name);
                };
                img.src = e.target.result;
            } else {
                callback(e.target.result, file.name);
            }
        };
        reader.readAsDataURL(file);
    }

    function resetCarFormDocFields() {
        carDocFields.forEach(field => {
            const hiddenInput = document.getElementById(field.dataId);
            const fileInput = document.getElementById(field.fileId);
            const previewBox = document.getElementById(field.previewId);
            if (hiddenInput) hiddenInput.value = '';
            if (fileInput) fileInput.value = '';
            if (previewBox) previewBox.innerHTML = '';
        });
        const periodInput = document.getElementById('carInsurancePeriod');
        if (periodInput) periodInput.value = '';
    }

    function populateCarFormDocFields(car) {
        resetCarFormDocFields();
        if (!car) return;
        const periodInput = document.getElementById('carInsurancePeriod');
        if (periodInput) periodInput.value = car.insurancePeriod || '';

        carDocFields.forEach(field => {
            const val = car[field.dataId];
            if (val) {
                const hiddenInput = document.getElementById(field.dataId);
                const previewBox = document.getElementById(field.previewId);
                if (hiddenInput) hiddenInput.value = val;
                if (previewBox) {
                    if (val.startsWith('data:image/')) {
                        previewBox.innerHTML = `
                            <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                                <img src="${val}" alt="${field.label}" style="width: 36px; height: 36px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color);">
                                <span style="color: #2E7D32; font-weight: 600;">✓ 기존 등록됨</span>
                                <button type="button" class="btn-clear-doc" style="background: none; border: none; color: #E24C4C; font-size: 11px; cursor: pointer;">❌ 삭제</button>
                            </div>
                        `;
                    } else {
                        previewBox.innerHTML = `
                            <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                                <span style="color: #2E7D32; font-weight: 600;">📄 기존 파일 등록됨</span>
                                <button type="button" class="btn-clear-doc" style="background: none; border: none; color: #E24C4C; font-size: 11px; cursor: pointer;">❌ 삭제</button>
                            </div>
                        `;
                    }
                    previewBox.querySelector('.btn-clear-doc').addEventListener('click', () => {
                        if (hiddenInput) hiddenInput.value = '';
                        previewBox.innerHTML = '';
                    });
                }
            }
        });
    }

    bindCarDocFileInputs();

    // Color Picker Event Listeners
    const carColorInput = document.getElementById('carColor');
    const carColorTextInput = document.getElementById('carColorText');
    if (carColorInput && carColorTextInput) {
        carColorInput.addEventListener('input', () => {
            carColorTextInput.value = carColorInput.value;
        });
    }
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
            const selectedColor = swatch.getAttribute('data-color');
            if (carColorInput) carColorInput.value = selectedColor;
            if (carColorTextInput) carColorTextInput.value = selectedColor;
        });
    });

    const openCarModalBtn = document.getElementById('openCarModalBtn');
    if (openCarModalBtn) {
        openCarModalBtn.addEventListener('click', () => {
            document.getElementById('carId').value = '';
            document.getElementById('carForm').reset();
            if (carColorInput) carColorInput.value = '#2E7D32';
            if (carColorTextInput) carColorTextInput.value = '#2E7D32';
            resetCarFormDocFields();
            document.getElementById('carModalTitle').textContent = '신규 위탁 차량 등록';
            openModal('carModal');
        });
    }

    const saveCarBtn = document.getElementById('saveCarBtn');
    if (saveCarBtn) {
        saveCarBtn.addEventListener('click', () => {
            const id = document.getElementById('carId').value;
            const model = document.getElementById('carModel').value.trim();
            const plateNumber = document.getElementById('carPlateNumber').value.trim();
            const ownerName = document.getElementById('carOwnerName').value.trim();
            const ownerContact = document.getElementById('carOwnerContact').value.trim();
            const bankName = document.getElementById('carBankName').value.trim();
            const accountNumber = document.getElementById('carAccountNumber').value.trim();
            const feeRate = parseFloat(document.getElementById('carFeeRate').value) || 20;
            const status = document.getElementById('carStatus').value;
            const memo = document.getElementById('carMemo').value.trim();
            const color = carColorInput ? carColorInput.value : '#2E7D32';

            const insurancePeriod = document.getElementById('carInsurancePeriod') ? document.getElementById('carInsurancePeriod').value.trim() : '';

            if (!model || !plateNumber || !ownerName) {
                alert('차량 모델명, 번호판, 차주 성함은 필수 항목입니다.');
                return;
            }

            const carObj = {
                model,
                plateNumber,
                ownerName,
                ownerContact,
                bankName,
                accountNumber,
                feeRate,
                status,
                memo,
                insurancePeriod,
                color,
                updatedAt: new Date().toISOString()
            };

            // Collect attached files & images
            carDocFields.forEach(field => {
                const input = document.getElementById(field.dataId);
                if (input && input.value) {
                    carObj[field.dataId] = input.value;
                } else {
                    carObj[field.dataId] = '';
                }
            });

            if (id) {
                db.ref(`delegated_cars/${id}`).update(carObj).then(() => {
                    closeModal('carModal');
                });
            } else {
                carObj.createdAt = new Date().toISOString();
                db.ref('delegated_cars').push(carObj).then(() => {
                    closeModal('carModal');
                });
            }
        });
    }

    function renderCars() {
        const container = document.getElementById('carsContainer');
        if (!container) return;

        const carsToRender = (userRole === 'owner' && ownerCarId) 
            ? delegatedCars.filter(c => c.id === ownerCarId) 
            : delegatedCars;

        if (carsToRender.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: var(--white); border: 1px solid var(--border-color); border-radius: 6px;">
                    <i class="fa-solid fa-car-side" style="font-size: 40px; color: #BBB7B2; margin-bottom: 15px;"></i>
                    <p style="color: var(--text-secondary); margin: 0; font-size: 14px;">등록된 위탁 관리 차량이 없습니다.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = carsToRender.map(car => {
            let statusBadge = '<span class="status-badge status-approved">운행 가능</span>';
            if (car.status === 'maintenance') {
                statusBadge = '<span class="status-badge status-pending" style="background: #FFF3E0; color: #E65100;">정비 중</span>';
            } else if (car.status === 'inactive') {
                statusBadge = '<span class="status-badge status-rejected">위탁 종료</span>';
            }

            // Count attached documents & photos
            let docCount = 0;
            carDocFields.forEach(field => {
                if (car[field.dataId]) docCount++;
            });

            const docBadge = docCount > 0 
                ? `<span style="font-size: 11px; background: rgba(46, 125, 50, 0.1); color: #2E7D32; padding: 2px 7px; border-radius: 4px; font-weight: 600;"><i class="fa-solid fa-file-check"></i> 서류/사진 (${docCount}건)</span>`
                : `<span style="font-size: 11px; background: rgba(0,0,0,0.04); color: var(--text-secondary); padding: 2px 7px; border-radius: 4px;"><i class="fa-solid fa-file"></i> 서류 미등록</span>`;

            const actionButtons = (userRole === 'owner') ? `
                <button type="button" class="btn btn-secondary view-car-docs-btn" data-id="${car.id}" style="padding: 6px 10px; font-size: 11px; color: var(--accent-color); border-color: var(--accent-color);">
                    <i class="fa-solid fa-folder-open"></i> 서류/사진 열람
                </button>
            ` : `
                <button type="button" class="btn btn-secondary view-car-docs-btn" data-id="${car.id}" style="padding: 6px 10px; font-size: 11px; color: var(--accent-color); border-color: var(--accent-color);">
                    <i class="fa-solid fa-folder-open"></i> 서류/사진 열람
                </button>
                <button type="button" class="btn btn-secondary edit-car-btn" data-id="${car.id}" style="padding: 6px 10px; font-size: 11px;">
                    <i class="fa-solid fa-pen-to-square"></i> 수정
                </button>
                <button type="button" class="btn btn-secondary delete-car-btn" data-id="${car.id}" style="padding: 6px 10px; font-size: 11px; color: #E24C4C; border-color: #E24C4C;">
                    <i class="fa-solid fa-trash"></i> 삭제
                </button>
            `;

            return `
                <div class="car-card" style="background: var(--white); border: 1px solid var(--border-color); border-radius: 6px; padding: 22px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <span style="width: 12px; height: 12px; background: ${car.color || '#2E7D32'}; border-radius: 50%; display: inline-block; box-shadow: 0 0 0 1px rgba(0,0,0,0.15);" title="식별 색상: ${car.color || '#2E7D32'}"></span>
                                <span style="font-size: 11px; font-weight: 700; color: var(--accent-color); text-transform: uppercase; letter-spacing: 0.05em;">${car.plateNumber}</span>
                            </div>
                            <h4 style="font-size: 16px; font-weight: 700; margin: 2px 0 0 0; color: var(--text-primary);">${car.model}</h4>
                        </div>
                        ${statusBadge}
                    </div>

                    <div style="font-size: 13px; line-height: 1.8; color: var(--text-primary); border-top: 1px solid rgba(0,0,0,0.05); padding-top: 12px; margin-bottom: 15px;">
                        <div><strong>차주:</strong> ${car.ownerName} ${car.ownerContact ? `(${car.ownerContact})` : ''}</div>
                        <div><strong>수수료율:</strong> <span style="color: var(--accent-color); font-weight: 700;">${car.feeRate}%</span></div>
                        <div><strong>정산 계좌:</strong> ${car.bankName || '-'} ${car.accountNumber || ''}</div>
                        ${car.insurancePeriod ? `<div><strong>보험 기간:</strong> <span style="color: #1565C0;">${car.insurancePeriod}</span></div>` : ''}
                        <div style="margin-top: 6px; display: flex; align-items: center; justify-content: space-between;">
                            ${docBadge}
                        </div>
                        ${car.memo ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 6px; background: rgba(0,0,0,0.02); padding: 6px 10px; border-radius: 4px;">${car.memo}</div>` : ''}
                    </div>

                    <div style="display: flex; gap: 6px; justify-content: flex-end; border-top: 1px solid var(--border-color); padding-top: 12px; flex-wrap: wrap;">
                        ${actionButtons}
                    </div>
                </div>
            `;
        }).join('');

        // View Car Documents Event Listeners
        container.querySelectorAll('.view-car-docs-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const carId = btn.getAttribute('data-id');
                const car = delegatedCars.find(c => c.id === carId);
                if (!car) return;

                const docViewerContent = document.getElementById('docViewerContent');
                const docViewerTitle = document.getElementById('docViewerTitle');
                if (docViewerTitle) docViewerTitle.innerHTML = `<i class="fa-solid fa-folder-open" style="color: var(--accent-color);"></i> [${car.model} - ${car.plateNumber}] 첨부 서류 및 사진`;

                let cardsHtml = '';
                if (car.insurancePeriod) {
                    cardsHtml += `
                        <div style="background: #F8FAFC; border: 1px solid var(--border-color); border-radius: 6px; padding: 15px; grid-column: 1 / -1;">
                            <strong style="color: #1565C0; font-size: 13px;"><i class="fa-solid fa-shield-halved"></i> 보험 유효 기간:</strong>
                            <span style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin-left: 8px;">${car.insurancePeriod}</span>
                        </div>
                    `;
                }

                let itemsFound = 0;
                carDocFields.forEach(field => {
                    const dataUrl = car[field.dataId];
                    if (dataUrl) {
                        itemsFound++;
                        const isImg = dataUrl.startsWith('data:image/');
                        cardsHtml += `
                            <div style="background: var(--white); border: 1px solid var(--border-color); border-radius: 6px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between;">
                                <div>
                                    <h5 style="font-size: 13px; font-weight: 700; margin: 0 0 8px 0; color: var(--text-primary);">${field.label}</h5>
                                    ${isImg 
                                        ? `<a href="${dataUrl}" target="_blank" title="클릭하여 원본 크게보기"><img src="${dataUrl}" alt="${field.label}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color); cursor: pointer;"></a>` 
                                        : `<div style="padding: 30px 10px; text-align: center; background: #F1F5F9; border-radius: 4px; color: var(--text-secondary);"><i class="fa-solid fa-file-pdf" style="font-size: 32px; color: #C62828;"></i><br><span style="font-size: 12px; margin-top: 6px; display: inline-block;">PDF / 문서 파일</span></div>`
                                    }
                                </div>
                                <div style="margin-top: 10px; text-align: right;">
                                    <a href="${dataUrl}" download="${car.plateNumber}_${field.label}" class="btn btn-secondary" style="font-size: 11px; padding: 4px 10px; display: inline-block; text-decoration: none;">
                                        <i class="fa-solid fa-download"></i> 다운로드 / 원본 보기
                                    </a>
                                </div>
                            </div>
                        `;
                    }
                });

                if (itemsFound === 0 && !car.insurancePeriod) {
                    cardsHtml = `
                        <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-secondary);">
                            <i class="fa-solid fa-folder-open" style="font-size: 32px; color: #BBB7B2; margin-bottom: 10px;"></i><br>
                            등록된 서류 및 사진이 없습니다. [수정] 버튼을 눌러 서류 사진을 업로드하세요.
                        </div>
                    `;
                }

                if (docViewerContent) docViewerContent.innerHTML = cardsHtml;
                openModal('carDocViewerModal');
            });
        });

        // Edit Car Event Listeners
        container.querySelectorAll('.edit-car-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const carId = btn.getAttribute('data-id');
                const car = delegatedCars.find(c => c.id === carId);
                if (!car) return;

                document.getElementById('carId').value = car.id;
                document.getElementById('carModel').value = car.model || '';
                document.getElementById('carPlateNumber').value = car.plateNumber || '';
                document.getElementById('carOwnerName').value = car.ownerName || '';
                document.getElementById('carOwnerContact').value = car.ownerContact || '';
                document.getElementById('carBankName').value = car.bankName || '';
                document.getElementById('carAccountNumber').value = car.accountNumber || '';
                document.getElementById('carFeeRate').value = car.feeRate || 20;
                document.getElementById('carStatus').value = car.status || 'active';
                document.getElementById('carMemo').value = car.memo || '';
                if (carColorInput) carColorInput.value = car.color || '#2E7D32';
                if (carColorTextInput) carColorTextInput.value = car.color || '#2E7D32';

                populateCarFormDocFields(car);

                document.getElementById('carModalTitle').textContent = '위탁 차량 정보 수정';
                openModal('carModal');
            });
        });

        // Delete Car Event Listeners
        container.querySelectorAll('.delete-car-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const carId = btn.getAttribute('data-id');
                if (confirm('이 차량을 삭제하시겠습니까? 관련 매출 및 비용 데이터가 영향을 받을 수 있습니다.')) {
                    db.ref(`delegated_cars/${carId}`).remove();
                }
            });
        });
    }

    function updateCarSelectors() {
        const carFilter = document.getElementById('ledgerCarFilter');
        const carCalFilter = document.getElementById('carCalFilter');
        const revCarSelect = document.getElementById('revenueCarId');
        const expCarSelect = document.getElementById('expenseCarId');

        const activeCars = delegatedCars.filter(c => c.status !== 'inactive');

        if (userRole === 'owner' && ownerCarId) {
            const myCar = delegatedCars.find(c => c.id === ownerCarId);
            const myCarOption = myCar 
                ? `<option value="${myCar.id}">${myCar.plateNumber} (${myCar.model})</option>` 
                : `<option value="${ownerCarId}">내 차량</option>`;

            if (carFilter) {
                carFilter.innerHTML = myCarOption;
                carFilter.value = ownerCarId;
                carFilter.disabled = true;
            }
            if (carCalFilter) {
                carCalFilter.innerHTML = myCarOption;
                carCalFilter.value = ownerCarId;
                carCalFilter.disabled = true;
            }
        } else {
            if (carFilter) {
                const currentVal = carFilter.value;
                carFilter.disabled = false;
                carFilter.innerHTML = '<option value="all">전체 차량 보기</option>' + 
                    delegatedCars.map(c => `<option value="${c.id}">${c.plateNumber} (${c.model})</option>`).join('');
                carFilter.value = currentVal || 'all';
            }

            if (carCalFilter) {
                const currentCalVal = carCalFilter.value;
                carCalFilter.disabled = false;
                carCalFilter.innerHTML = '<option value="all">전체 위탁 차량 보기</option>' + 
                    delegatedCars.map(c => `<option value="${c.id}">${c.plateNumber} (${c.model})</option>`).join('');
                carCalFilter.value = currentCalVal || 'all';
            }
        }

        const optionsHtml = activeCars.map(c => `<option value="${c.id}">${c.plateNumber} - ${c.model} (${c.ownerName})</option>`).join('');

        if (revCarSelect) revCarSelect.innerHTML = optionsHtml || '<option value="">등록된 차량이 없습니다</option>';
        if (expCarSelect) expCarSelect.innerHTML = optionsHtml || '<option value="">등록된 차량이 없습니다</option>';
    }

    // ----------------------------------------------------
    // 6. Revenues & Expenses Ledger Logic (`#tabLedger`)
    // ----------------------------------------------------
    const openRevenueModalBtn = document.getElementById('openRevenueModalBtn');
    const deleteRevenueBtn = document.getElementById('deleteRevenueBtn');
    const revenueModalTitle = document.getElementById('revenueModalTitle');

    if (openRevenueModalBtn) {
        openRevenueModalBtn.addEventListener('click', () => {
            if (delegatedCars.length === 0) {
                alert('먼저 위탁 차량을 등록해 주세요.');
                return;
            }
            document.getElementById('revenueId').value = '';
            document.getElementById('revenueForm').reset();
            const todayStr = getLocalDateString(new Date());
            document.getElementById('revenueStartDate').value = todayStr;
            document.getElementById('revenueEndDate').value = calculateOneMonthLater(todayStr);
            if (revenueModalTitle) revenueModalTitle.innerHTML = '<i class="fa-solid fa-circle-plus"></i> 렌트 예약 등록';
            if (saveRevenueBtn) saveRevenueBtn.textContent = '예약 등록';
            if (deleteRevenueBtn) deleteRevenueBtn.classList.add('hidden');
            openModal('revenueModal');
        });
    }

    const revStartDateInput = document.getElementById('revenueStartDate');
    if (revStartDateInput) {
        revStartDateInput.addEventListener('change', () => {
            const revId = document.getElementById('revenueId').value;
            if (!revId && revStartDateInput.value) {
                const endDateInput = document.getElementById('revenueEndDate');
                if (endDateInput) {
                    endDateInput.value = calculateOneMonthLater(revStartDateInput.value);
                }
            }
        });
    }

    const saveRevenueBtn = document.getElementById('saveRevenueBtn');
    if (saveRevenueBtn) {
        saveRevenueBtn.addEventListener('click', () => {
            const revId = document.getElementById('revenueId').value;
            const carId = document.getElementById('revenueCarId').value;
            const renterName = document.getElementById('revenueRenterName').value.trim();
            const renterContact = document.getElementById('revenueRenterContact').value.trim();
            const startDate = document.getElementById('revenueStartDate').value;
            const endDate = document.getElementById('revenueEndDate').value;
            const amount = parseFloat(document.getElementById('revenueAmount').value) || 0;
            const paymentStatus = document.getElementById('revenuePaymentStatus').value;
            const memo = document.getElementById('revenueMemo').value.trim();

            if (!carId || !renterName || !startDate || !endDate || amount <= 0) {
                alert('모든 필수 항목(차량 선택, 임차인 이름, 시작일, 종료일, 금액)을 입력해 주세요.');
                return;
            }

            const revMonth = startDate.substring(0, 7);
            const settleId = `settle_${revMonth.replace('-', '_')}_${carId}`;
            const isMonthSettled = delegatedSettlements.some(s => s.id === settleId && s.status === 'completed');

            const revObj = {
                carId,
                renterName,
                renterContact,
                startDate,
                endDate,
                amount,
                paymentStatus,
                memo,
                updatedAt: new Date().toISOString()
            };

            if (revId) {
                db.ref(`delegated_car_revenues/${revId}`).update(revObj).then(() => {
                    closeModal('revenueModal');
                });
            } else {
                revObj.createdAt = new Date().toISOString();
                if (isMonthSettled) {
                    const nextMonth = calculateNextMonth(revMonth);
                    revObj.settledMonth = nextMonth;
                    revObj.isSettled = false;
                    revObj.isRollover = true;
                    revObj.originalMonth = revMonth;
                } else {
                    revObj.settledMonth = revMonth;
                    revObj.isSettled = false;
                    revObj.isRollover = false;
                }

                db.ref('delegated_car_revenues').push(revObj).then(() => {
                    closeModal('revenueModal');
                });
            }
        });
    }

    if (deleteRevenueBtn) {
        deleteRevenueBtn.addEventListener('click', () => {
            const revId = document.getElementById('revenueId').value;
            if (revId && confirm('이 렌트 매출/예약 항목을 정말 삭제하시겠습니까?')) {
                db.ref(`delegated_car_revenues/${revId}`).remove().then(() => {
                    closeModal('revenueModal');
                });
            }
        });
    }

    // ----------------------------------------------------
    // Receipt File Attachment & Preview Logic
    // ----------------------------------------------------
    function bindExpenseReceiptInput() {
        const uploadBtn = document.getElementById('expenseReceiptUploadBtn');
        const fileInput = document.getElementById('expenseReceiptFile');
        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => {
                fileInput.click();
            });
        }
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                readAndCompressImage(file, (dataUrl, fileName) => {
                    populateExpenseReceiptField(dataUrl, fileName);
                }, 1200, 0.82);
            });
        }
    }

    function resetExpenseReceiptField() {
        const fileInput = document.getElementById('expenseReceiptFile');
        const dataInput = document.getElementById('expenseReceiptData');
        const nameInput = document.getElementById('expenseReceiptName');
        const previewBox = document.getElementById('expenseReceiptPreview');
        if (fileInput) fileInput.value = '';
        if (dataInput) dataInput.value = '';
        if (nameInput) nameInput.value = '';
        if (previewBox) previewBox.innerHTML = '';
    }

    function populateExpenseReceiptField(receiptImage, receiptName) {
        resetExpenseReceiptField();
        if (!receiptImage) return;
        const dataInput = document.getElementById('expenseReceiptData');
        const nameInput = document.getElementById('expenseReceiptName');
        const previewBox = document.getElementById('expenseReceiptPreview');
        if (dataInput) dataInput.value = receiptImage;
        if (nameInput) nameInput.value = receiptName || 'receipt.jpg';
        if (previewBox) {
            const isImg = receiptImage.startsWith('data:image/') || receiptImage.startsWith('http');
            previewBox.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; background: white; padding: 8px 12px; border-radius: 4px; border: 1px solid var(--border-color); margin-top: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px; cursor: pointer;" id="previewReceiptClickThumb">
                        ${isImg ? `<img src="${receiptImage}" alt="영수증 미리보기" style="width: 42px; height: 42px; object-fit: cover; border-radius: 4px; border: 1px solid #E2E8F0;">` : `<i class="fa-solid fa-file-pdf" style="font-size: 30px; color: #C62828;"></i>`}
                        <div>
                            <div style="font-size: 12px; font-weight: 600; color: #2E7D32;">✓ 영수증 첨부됨</div>
                            <div style="font-size: 11px; color: var(--text-secondary); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${receiptName || '영수증 파일'} (클릭시 크게보기)</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 6px;">
                        <button type="button" id="btnPreviewReceiptEnlarge" class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px;">
                            <i class="fa-solid fa-expand"></i> 보기
                        </button>
                        <button type="button" id="btnClearReceiptDoc" class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px; color: #E24C4C; border-color: #E24C4C;">
                            <i class="fa-solid fa-trash"></i> 삭제
                        </button>
                    </div>
                </div>
            `;
            const clearBtn = document.getElementById('btnClearReceiptDoc');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    resetExpenseReceiptField();
                });
            }
            const thumbBtn = document.getElementById('previewReceiptClickThumb');
            const viewBtn = document.getElementById('btnPreviewReceiptEnlarge');
            const showPreview = () => {
                showDirectReceiptViewer({
                    image: receiptImage,
                    name: receiptName,
                    title: '영수증 미리보기'
                });
            };
            if (thumbBtn) thumbBtn.addEventListener('click', showPreview);
            if (viewBtn) viewBtn.addEventListener('click', showPreview);
        }
    }

    function showDirectReceiptViewer(data) {
        const modal = document.getElementById('receiptViewerModal');
        const title = document.getElementById('receiptViewerTitle');
        const metaBox = document.getElementById('receiptViewerMeta');
        const imgContainer = document.getElementById('receiptViewerImageContainer');
        const downloadBtn = document.getElementById('receiptDownloadBtn');
        if (!modal) return;

        if (title) title.innerHTML = `<i class="fa-solid fa-receipt" style="color: var(--accent-color);"></i> ${data.title || '영수증 원본 열람'}`;

        if (metaBox) {
            if (data.carPlate || data.date || data.amount) {
                metaBox.style.display = 'grid';
                metaBox.innerHTML = `
                    <div><strong>발생 일자:</strong> ${data.date || '-'}</div>
                    <div><strong>대상 차량:</strong> ${data.carPlate || '-'} ${data.carModel ? `(${data.carModel})` : ''}</div>
                    <div><strong>비용 구분:</strong> ${data.category || '-'}</div>
                    <div><strong>지출 금액:</strong> <span style="font-weight: 700; color: #C62828;">${data.amount || '-'}</span></div>
                    ${data.description ? `<div style="grid-column: 1 / -1;"><strong>상세 메모:</strong> ${data.description}</div>` : ''}
                `;
            } else {
                metaBox.style.display = 'none';
            }
        }

        if (imgContainer) {
            const isPdf = data.image && (data.image.startsWith('data:application/pdf') || (data.name && data.name.endsWith('.pdf')));
            if (isPdf) {
                imgContainer.innerHTML = `
                    <div style="color: white; padding: 40px; text-align: center;">
                        <i class="fa-solid fa-file-pdf" style="font-size: 54px; color: #FF8A80; margin-bottom: 15px;"></i>
                        <p style="font-size: 14px; margin: 0 0 10px 0;">PDF 영수증 문서입니다.</p>
                        <a href="${data.image}" target="_blank" download="${data.name || 'receipt.pdf'}" class="btn btn-secondary" style="font-size: 12px; padding: 8px 16px; background: rgba(255,255,255,0.1); color: white; border-color: rgba(255,255,255,0.3);">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i> 새 창에서 열기 / 다운로드
                        </a>
                    </div>
                `;
            } else if (data.image) {
                imgContainer.innerHTML = `
                    <a href="${data.image}" target="_blank" title="클릭하여 새 창에서 원본 열기">
                        <img src="${data.image}" alt="영수증 원본" style="max-width: 100%; max-height: 50vh; object-fit: contain; border-radius: 4px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); cursor: zoom-in;">
                    </a>
                `;
            } else {
                imgContainer.innerHTML = `<div style="color: #999; padding: 30px;">영수증 이미지가 없습니다.</div>`;
            }
        }

        if (downloadBtn) {
            if (data.image) {
                downloadBtn.href = data.image;
                downloadBtn.download = data.name || `receipt_${data.date || 'file'}.jpg`;
                downloadBtn.style.display = 'inline-flex';
            } else {
                downloadBtn.style.display = 'none';
            }
        }

        openModal('receiptViewerModal');
    }

    function openReceiptViewerModal(expenseId) {
        const exp = delegatedExpenses.find(e => e.id === expenseId);
        if (!exp) {
            alert('비용 내역을 찾을 수 없습니다.');
            return;
        }
        // Check both legacy inline and new hasReceipt flag
        if (!exp.hasReceipt && !exp.receiptImage) {
            alert('등록된 영수증 이미지가 없습니다.');
            return;
        }
        const car = delegatedCars.find(c => c.id === exp.carId);
        const categoryNames = {
            repair: '수리/정비',
            accident: '사고처리',
            insurance: '보험료',
            oil: '소모품/오일',
            wash: '세차',
            other: '기타지출'
        };
        const categoryLabel = categoryNames[exp.category] || exp.category;

        const metaInfo = {
            title: `[${car ? car.plateNumber : '차량'}] 영수증 - ${categoryLabel}`,
            date: exp.expenseDate,
            carPlate: car ? car.plateNumber : '삭제된 차량',
            carModel: car ? car.model : '',
            category: categoryLabel,
            amount: `${exp.amount.toLocaleString()} (차주 공제: ${exp.deductibleFromOwner ? 'O' : 'X'})`,
            description: exp.description || ''
        };

        // Legacy: if receiptImage is still inline in the expense object
        if (exp.receiptImage) {
            showDirectReceiptViewer({
                ...metaInfo,
                image: exp.receiptImage,
                name: exp.receiptName || `receipt_${exp.expenseDate}_${car ? car.plateNumber : ''}.jpg`
            });
            return;
        }

        // On-demand fetch from separate path
        showDirectReceiptViewer({
            ...metaInfo,
            image: null,
            name: exp.receiptName || 'receipt.jpg'
        });
        const imgContainer = document.getElementById('receiptViewerImageContainer');
        if (imgContainer) imgContainer.innerHTML = '<div style="color: #CCC; padding: 30px; font-size: 13px;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>영수증 이미지 로딩 중...</div>';

        db.ref(`delegated_car_expense_receipts/${expenseId}`).once('value').then(snap => {
            const data = snap.val();
            if (data && data.receiptImage) {
                const isImg = data.receiptImage.startsWith('data:image/');
                if (imgContainer) {
                    imgContainer.innerHTML = isImg ? `
                        <a href="${data.receiptImage}" target="_blank" title="클릭하여 새 창에서 원본 열기">
                            <img src="${data.receiptImage}" alt="영수증 원본" style="max-width: 100%; max-height: 50vh; object-fit: contain; border-radius: 4px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); cursor: zoom-in;">
                        </a>
                    ` : `
                        <div style="color: white; padding: 40px; text-align: center;">
                            <i class="fa-solid fa-file-pdf" style="font-size: 54px; color: #FF8A80; margin-bottom: 15px;"></i>
                            <p style="font-size: 14px; margin: 0 0 10px 0;">PDF 영수증 문서입니다.</p>
                            <a href="${data.receiptImage}" target="_blank" download="${data.receiptName || 'receipt.pdf'}" class="btn btn-secondary" style="font-size: 12px; padding: 8px 16px; background: rgba(255,255,255,0.1); color: white; border-color: rgba(255,255,255,0.3);">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i> 새 창에서 열기 / 다운로드
                            </a>
                        </div>
                    `;
                }
                const downloadBtn = document.getElementById('receiptDownloadBtn');
                if (downloadBtn) {
                    downloadBtn.href = data.receiptImage;
                    downloadBtn.download = data.receiptName || `receipt_${exp.expenseDate}.jpg`;
                    downloadBtn.style.display = 'inline-flex';
                }
            } else {
                if (imgContainer) imgContainer.innerHTML = '<div style="color: #999; padding: 30px;">영수증 이미지를 찾을 수 없습니다.</div>';
            }
        }).catch(() => {
            if (imgContainer) imgContainer.innerHTML = '<div style="color: #F88; padding: 30px;">영수증 로딩에 실패했습니다.</div>';
        });
    }

    bindExpenseReceiptInput();

    const openExpenseModalBtn = document.getElementById('openExpenseModalBtn');
    const expenseModalTitle = document.getElementById('expenseModalTitle');
    const deleteExpenseBtn = document.getElementById('deleteExpenseBtn');

    if (openExpenseModalBtn) {
        openExpenseModalBtn.addEventListener('click', () => {
            if (delegatedCars.length === 0) {
                alert('먼저 위탁 차량을 등록해 주세요.');
                return;
            }
            document.getElementById('expenseId').value = '';
            document.getElementById('expenseForm').reset();
            resetExpenseReceiptField();
            document.getElementById('expenseDate').value = getLocalDateString(new Date());
            if (expenseModalTitle) expenseModalTitle.innerHTML = '<i class="fa-solid fa-circle-minus"></i> 정비 및 지출 비용 등록';
            if (deleteExpenseBtn) deleteExpenseBtn.classList.add('hidden');
            openModal('expenseModal');
        });
    }

    const saveExpenseBtn = document.getElementById('saveExpenseBtn');
    if (saveExpenseBtn) {
        saveExpenseBtn.addEventListener('click', () => {
            const id = document.getElementById('expenseId').value;
            const carId = document.getElementById('expenseCarId').value;
            const category = document.getElementById('expenseCategory').value;
            const expenseDate = document.getElementById('expenseDate').value;
            const amount = parseFloat(document.getElementById('expenseAmount').value) || 0;
            const deductibleFromOwner = document.getElementById('expenseDeductible').checked;
            const description = document.getElementById('expenseDescription').value.trim();
            const receiptImage = document.getElementById('expenseReceiptData').value || null;
            const receiptName = document.getElementById('expenseReceiptName').value || null;

            if (!carId || !expenseDate || amount <= 0) {
                alert('차량 선택, 발생 일자 및 지출 금액을 정확히 입력해 주세요.');
                return;
            }

            const expMonth = expenseDate.substring(0, 7);
            const settleId = `settle_${expMonth.replace('-', '_')}_${carId}`;
            const isMonthSettled = delegatedSettlements.some(s => s.id === settleId && s.status === 'completed');

            const expObj = {
                carId,
                category,
                expenseDate,
                amount,
                deductibleFromOwner,
                description,
                hasReceipt: !!receiptImage,
                receiptName: receiptName || null,
                updatedAt: new Date().toISOString()
            };

            const saveReceipt = (expenseKey) => {
                if (receiptImage) {
                    db.ref(`delegated_car_expense_receipts/${expenseKey}`).set({
                        receiptImage,
                        receiptName: receiptName || null
                    });
                } else {
                    db.ref(`delegated_car_expense_receipts/${expenseKey}`).remove();
                }
            };

            if (id) {
                db.ref(`delegated_car_expenses/${id}`).update(expObj).then(() => {
                    saveReceipt(id);
                    closeModal('expenseModal');
                });
            } else {
                expObj.createdAt = new Date().toISOString();
                if (isMonthSettled) {
                    const nextMonth = calculateNextMonth(expMonth);
                    expObj.settledMonth = nextMonth;
                    expObj.isSettled = false;
                    expObj.isRollover = true;
                    expObj.originalExpenseMonth = expMonth;
                    alert(`💡 안내:\n해당 차량의 ${expMonth}월 정산이 이미 완료(마감)되어, 본 비용은 익월(${nextMonth}월) 정산서에 자동으로 이월 반영됩니다.`);
                } else {
                    expObj.settledMonth = expMonth;
                    expObj.isSettled = false;
                    expObj.isRollover = false;
                }

                const newRef = db.ref('delegated_car_expenses').push();
                newRef.set(expObj).then(() => {
                    saveReceipt(newRef.key);
                    closeModal('expenseModal');
                });
            }
        });
    }

    if (deleteExpenseBtn) {
        deleteExpenseBtn.addEventListener('click', () => {
            const id = document.getElementById('expenseId').value;
            if (id && confirm('이 비용 내역을 삭제하시겠습니까?')) {
                db.ref(`delegated_car_expenses/${id}`).remove().then(() => {
                    db.ref(`delegated_car_expense_receipts/${id}`).remove();
                    closeModal('expenseModal');
                });
            }
        });
    }

    // Ledger Filters Event Listeners
    const ledgerCarFilter = document.getElementById('ledgerCarFilter');
    const ledgerTypeFilter = document.getElementById('ledgerTypeFilter');

    if (ledgerCarFilter) ledgerCarFilter.addEventListener('change', renderLedger);
    if (ledgerTypeFilter) ledgerTypeFilter.addEventListener('change', renderLedger);
    if (ledgerMonthFilter) ledgerMonthFilter.addEventListener('change', renderLedger);

    function renderLedger() {
        const tbody = document.getElementById('ledgerTableBody');
        if (!tbody) return;

        let carIdFilter = ledgerCarFilter ? ledgerCarFilter.value : 'all';
        if (userRole === 'owner' && ownerCarId) {
            carIdFilter = ownerCarId;
        }
        const typeFilter = ledgerTypeFilter ? ledgerTypeFilter.value : 'all';
        const monthFilter = ledgerMonthFilter ? ledgerMonthFilter.value : '';

        // Combine revenues and expenses into integrated items
        let items = [];

        if (typeFilter === 'all' || typeFilter === 'revenue') {
            delegatedRevenues.forEach(r => {
                if (carIdFilter !== 'all' && r.carId !== carIdFilter) return;
                if (monthFilter && !r.startDate.startsWith(monthFilter)) return;

                const car = delegatedCars.find(c => c.id === r.carId);
                const displayRenter = (userRole === 'owner') ? maskRenterName(r.renterName) : (r.renterName || '예약자');
                
                let settleBadge = '<div style="font-size: 11px; color: #8C8782; margin-top: 2px;">미정산 (대기)</div>';
                if (r.isSettled) {
                    settleBadge = `<div style="font-size: 11px; color: #2E7D32; font-weight: 600; margin-top: 2px;"><i class="fa-solid fa-check"></i> ${r.settledMonth || ''} 정산완료</div>`;
                } else if (r.settledMonth && r.settledMonth !== r.startDate.substring(0, 7)) {
                    settleBadge = `<div style="font-size: 11px; color: #E65100; font-weight: 600; margin-top: 2px;"><i class="fa-solid fa-arrow-right"></i> ${r.settledMonth} 이월예정</div>`;
                }

                items.push({
                    type: 'revenue',
                    id: r.id,
                    date: r.startDate,
                    carPlate: car ? car.plateNumber : '삭제된 차량',
                    carModel: car ? car.model : '',
                    details: `${displayRenter} (${r.startDate} ~ ${r.endDate})`,
                    amount: r.amount,
                    deductibleStr: `<div>해당 없음</div>${settleBadge}`,
                    statusBadge: r.paymentStatus === 'completed' ? '<span class="status-badge status-approved">결제완료</span>' : '<span class="status-badge status-pending">입금대기</span>',
                    hasReceipt: false,
                    rawDate: r.startDate
                });
            });
        }

        if (typeFilter === 'all' || typeFilter === 'expense') {
            delegatedExpenses.forEach(e => {
                if (carIdFilter !== 'all' && e.carId !== carIdFilter) return;
                if (monthFilter && !e.expenseDate.startsWith(monthFilter)) return;

                const car = delegatedCars.find(c => c.id === e.carId);
                const categoryNames = {
                    repair: '수리/정비',
                    accident: '사고처리',
                    insurance: '보험료',
                    oil: '소모품/오일',
                    wash: '세차',
                    other: '기타지출'
                };
                const categoryLabel = categoryNames[e.category] || e.category;

                let settleBadge = '';
                if (e.deductibleFromOwner) {
                    if (e.isSettled) {
                        settleBadge = `<div style="font-size: 11px; color: #2E7D32; font-weight: 600; margin-top: 2px;"><i class="fa-solid fa-check"></i> ${e.settledMonth || ''} 정산완료</div>`;
                    } else if (e.settledMonth && e.settledMonth !== e.expenseDate.substring(0, 7)) {
                        settleBadge = `<div style="font-size: 11px; color: #E65100; font-weight: 600; margin-top: 2px;"><i class="fa-solid fa-arrow-right"></i> ${e.settledMonth} 이월예정</div>`;
                    } else {
                        settleBadge = '<div style="font-size: 11px; color: #8C8782; margin-top: 2px;">미정산 (대기)</div>';
                    }
                }

                const deductBase = e.deductibleFromOwner 
                    ? '<span style="color: #C62828; font-weight: 600;">차주 공제 [O]</span>' 
                    : '<span style="color: #8C8782;">회사 부담 [X]</span>';

                items.push({
                    type: 'expense',
                    id: e.id,
                    date: e.expenseDate,
                    carPlate: car ? car.plateNumber : '삭제된 차량',
                    carModel: car ? car.model : '',
                    details: `[${categoryLabel}] ${e.description || ''}`,
                    amount: e.amount,
                    deductibleStr: `<div>${deductBase}</div>${settleBadge}`,
                    statusBadge: '<span class="status-badge status-rejected" style="background: #FFEBEE; color: #C62828;">지출 발생</span>',
                    hasReceipt: !!(e.hasReceipt || e.receiptImage),
                    rawDate: e.expenseDate
                });
            });
        }

        // Sort items descending by date
        items.sort((a, b) => b.rawDate.localeCompare(a.rawDate));

        if (items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        조회된 장부 내역이 없습니다.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = items.map(item => {
            const isRev = item.type === 'revenue';
            const typeBadge = isRev ? '<span class="status-badge status-approved" style="background: #E8F5E9; color: #2E7D32;">렌트 매출 (+)</span>' : '<span class="status-badge status-rejected" style="background: #FFEBEE; color: #C62828;">정비 비용 (-)</span>';
            const amountColor = isRev ? '#2E7D32' : '#C62828';
            const amountPrefix = isRev ? '+' : '-';

            const receiptCol = item.hasReceipt ? `
                <button type="button" class="btn btn-secondary view-receipt-btn" data-id="${item.id}" style="padding: 4px 8px; font-size: 11px; color: #1565C0; border-color: #90CAF9; background: #E3F2FD; display: inline-flex; align-items: center; gap: 4px; border-radius: 4px; cursor: pointer;">
                    <i class="fa-solid fa-receipt"></i> 영수증 보기
                </button>
            ` : `<span style="color: #BBB7B2; font-size: 11px;">-</span>`;

            const actionCol = (userRole === 'owner') ? `
                <span style="color: #BBB7B2; font-size: 11px;">-</span>
            ` : `
                <button type="button" class="btn btn-secondary edit-ledger-btn" data-type="${item.type}" data-id="${item.id}" style="padding: 4px 8px; font-size: 11px; margin-right: 4px;">수정</button>
                <button type="button" class="btn btn-secondary delete-ledger-btn" data-type="${item.type}" data-id="${item.id}" style="padding: 4px 8px; font-size: 11px; color: #E24C4C; border-color: #E24C4C;">
                    삭제
                </button>
            `;

            return `
                <tr>
                    <td data-label="날짜" style="font-weight: 500;">${item.date}</td>
                    <td data-label="구분">${typeBadge}</td>
                    <td data-label="차량">${item.carPlate} <span style="font-size: 11px; color: var(--text-secondary);">(${item.carModel})</span></td>
                    <td data-label="상세 내역" style="text-align: left;">${item.details}</td>
                    <td data-label="금액" style="font-weight: 700; color: ${amountColor};">${amountPrefix} ${item.amount.toLocaleString()}</td>
                    <td data-label="공제 여부">${item.deductibleStr}</td>
                    <td data-label="영수증">${receiptCol}</td>
                    <td data-label="관리">
                        ${actionCol}
                    </td>
                </tr>
            `;
        }).join('');

        // View receipt listeners
        tbody.querySelectorAll('.view-receipt-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const expenseId = btn.getAttribute('data-id');
                openReceiptViewerModal(expenseId);
            });
        });

        // Edit item listeners
        tbody.querySelectorAll('.edit-ledger-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const itemType = btn.getAttribute('data-type');
                const itemId = btn.getAttribute('data-id');
                if (itemType === 'revenue') {
                    const rev = delegatedRevenues.find(r => r.id === itemId);
                    if (rev) {
                        document.getElementById('revenueId').value = rev.id;
                        document.getElementById('revenueCarId').value = rev.carId || '';
                        document.getElementById('revenueRenterName').value = rev.renterName || '';
                        document.getElementById('revenueRenterContact').value = rev.renterContact || '';
                        document.getElementById('revenueStartDate').value = rev.startDate || '';
                        document.getElementById('revenueEndDate').value = rev.endDate || '';
                        document.getElementById('revenueAmount').value = rev.amount || 0;
                        document.getElementById('revenuePaymentStatus').value = rev.paymentStatus || 'completed';
                        document.getElementById('revenueMemo').value = rev.memo || '';
                        
                        if (revenueModalTitle) revenueModalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> 렌트 예약 정보 수정';
                        if (saveRevenueBtn) saveRevenueBtn.textContent = '저장하기';
                        if (deleteRevenueBtn) deleteRevenueBtn.classList.remove('hidden');

                        openModal('revenueModal');
                    }
                } else if (itemType === 'expense') {
                    const exp = delegatedExpenses.find(e => e.id === itemId);
                    if (exp) {
                        document.getElementById('expenseId').value = exp.id;
                        document.getElementById('expenseCarId').value = exp.carId || '';
                        document.getElementById('expenseCategory').value = exp.category || 'repair';
                        document.getElementById('expenseDate').value = exp.expenseDate || '';
                        document.getElementById('expenseAmount').value = exp.amount || 0;
                        document.getElementById('expenseDeductible').checked = exp.deductibleFromOwner !== false;
                        document.getElementById('expenseDescription').value = exp.description || '';

                        // Legacy inline receipt or new separate path
                        if (exp.receiptImage) {
                            populateExpenseReceiptField(exp.receiptImage, exp.receiptName);
                        } else if (exp.hasReceipt) {
                            db.ref(`delegated_car_expense_receipts/${exp.id}`).once('value').then(snap => {
                                const data = snap.val();
                                if (data && data.receiptImage) {
                                    populateExpenseReceiptField(data.receiptImage, data.receiptName || exp.receiptName);
                                }
                            });
                        } else {
                            resetExpenseReceiptField();
                        }

                        if (expenseModalTitle) expenseModalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> 정비 및 지출 비용 정보 수정';
                        if (deleteExpenseBtn) deleteExpenseBtn.classList.remove('hidden');

                        openModal('expenseModal');
                    }
                }
            });
        });

        // Delete item listeners
        tbody.querySelectorAll('.delete-ledger-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const itemType = btn.getAttribute('data-type');
                const itemId = btn.getAttribute('data-id');
                if (confirm('이 장부 항목을 삭제하시겠습니까?')) {
                    if (itemType === 'revenue') {
                        db.ref(`delegated_car_revenues/${itemId}`).remove();
                    } else {
                        db.ref(`delegated_car_expenses/${itemId}`).remove();
                    }
                }
            });
        });
    }

    // ----------------------------------------------------
    // 7. Settlement Engine & Profit Sharing (`#tabSettlements`)
    // ----------------------------------------------------
    // Core Business Logic: Determine whether a revenue or expense item belongs to targetMonth
    function isItemAssignedToMonth(item, targetMonth, carId) {
        const car = delegatedCars.find(c => c.id === carId);
        const matchCar = (item.carId === carId) || 
                         (car && car.plateNumber && item.carId === car.plateNumber) || 
                         (car && car.plateNumber && item.carPlate === car.plateNumber);
        if (!matchCar) return false;

        // If explicit settledMonth is stamped
        if (item.settledMonth) {
            return item.settledMonth === targetMonth;
        }

        let rawDate = item.startDate || item.expenseDate || item.date;
        if (!rawDate) return false;
        rawDate = String(rawDate).trim().replace(/[\.\/]/g, '-');
        const itemMonth = rawDate.substring(0, 7);

        // 1. Item occurred in targetMonth
        if (itemMonth === targetMonth) {
            // Check if this month's settlement was ALREADY completed
            const settleId = `settle_${targetMonth.replace('-', '_')}_${carId}`;
            const existingSettlement = delegatedSettlements.find(s => s.id === settleId);
            if (existingSettlement && existingSettlement.status === 'completed' && existingSettlement.settledAt) {
                const settleCutoffDate = getLocalDateString(new Date(existingSettlement.settledAt));
                // If item occurred AFTER settlement completion date, it CANNOT be in this already-settled statement
                if (rawDate > settleCutoffDate) {
                    return false;
                }
            }
            return true;
        }

        // 2. Item occurred in an EARLIER month and rolled over because the earlier month was settled before this item occurred
        if (itemMonth < targetMonth) {
            const pastSettleId = `settle_${itemMonth.replace('-', '_')}_${carId}`;
            const pastSettlement = delegatedSettlements.find(s => s.id === pastSettleId);
            if (pastSettlement && pastSettlement.status === 'completed' && pastSettlement.settledAt) {
                const pastCutoffDate = getLocalDateString(new Date(pastSettlement.settledAt));
                if (rawDate > pastCutoffDate) {
                    const nextMonth = calculateNextMonth(itemMonth);
                    if (nextMonth === targetMonth) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    if (settlementTargetMonth) {
        settlementTargetMonth.addEventListener('change', () => {
            renderSettlements();
            updateDashboardMetrics();
        });
    }

    function renderSettlements() {
        const tbody = document.getElementById('settlementTableBody');
        if (!tbody) return;

        const targetMonth = settlementTargetMonth ? settlementTargetMonth.value : currentYearMonth;
        const displayCars = (userRole === 'owner' && ownerCarId) 
            ? delegatedCars.filter(c => c.id === ownerCarId) 
            : delegatedCars;

        if (displayCars.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        등록된 위탁 차량이 없습니다.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = displayCars.map(car => {
            // Calculate Gross Revenue (assigned to targetMonth)
            const revs = delegatedRevenues.filter(r => {
                const isValidStatus = !r.paymentStatus || r.paymentStatus === 'completed' || r.paymentStatus === 'paid';
                return isValidStatus && isItemAssignedToMonth(r, targetMonth, car.id);
            });
            const grossRevenue = revs.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

            // Management Fee
            const feeRate = parseFloat(car.feeRate) || 20;
            const feeAmount = grossRevenue * (feeRate / 100);

            // Deductible Expenses (assigned to targetMonth including rollovers)
            const exps = delegatedExpenses.filter(e => {
                const isDeductible = e.deductibleFromOwner === true || e.deductibleFromOwner === 'true';
                return isDeductible && isItemAssignedToMonth(e, targetMonth, car.id);
            });
            const totalExpenses = exps.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

            // Net Owner Payout
            const netOwnerPayout = grossRevenue - feeAmount - totalExpenses;

            // Settlement Key: settle_YYYY_MM_carId
            const settleId = `settle_${targetMonth.replace('-', '_')}_${car.id}`;
            const existingSettlement = delegatedSettlements.find(s => s.id === settleId);
            const isCompleted = existingSettlement && existingSettlement.status === 'completed';

            // Calculate Rollover Expenses for this car (occurred after settlement completion date or pending rollover)
            let carRolloverExpenses = 0;
            delegatedExpenses.forEach(e => {
                const matchCar = (e.carId === car.id) || (e.carId === car.plateNumber);
                const isDeductible = e.deductibleFromOwner === true || e.deductibleFromOwner === 'true';
                if (!matchCar || !isDeductible || e.isSettled) return;

                let rawDate = e.expenseDate || e.date;
                if (!rawDate) return;
                rawDate = String(rawDate).trim().replace(/[\.\/]/g, '-');
                const eMonth = rawDate.substring(0, 7);

                const sKey = `settle_${eMonth.replace('-', '_')}_${car.id}`;
                const pSettle = delegatedSettlements.find(s => s.id === sKey);
                if (pSettle && pSettle.status === 'completed' && pSettle.settledAt) {
                    const cutoff = getLocalDateString(new Date(pSettle.settledAt));
                    if (rawDate > cutoff) {
                        carRolloverExpenses += (parseFloat(e.amount) || 0);
                    }
                } else if (e.isRollover) {
                    carRolloverExpenses += (parseFloat(e.amount) || 0);
                }
            });

            // Calculate Cumulative Unsettled Total Payout for this car across ALL historical unsettled months (5월, 6월, 7월 등)
            let carUnsettledTotalPayout = 0;
            const allMonths = new Set();

            delegatedRevenues.forEach(r => {
                const matchCar = (r.carId === car.id) || (r.carId === car.plateNumber);
                if (matchCar) {
                    let d = r.startDate || r.date;
                    if (d) {
                        d = String(d).trim().replace(/[\.\/]/g, '-');
                        if (d.length >= 7) allMonths.add(d.substring(0, 7));
                    }
                    if (r.settledMonth) allMonths.add(r.settledMonth);
                }
            });

            delegatedExpenses.forEach(e => {
                const matchCar = (e.carId === car.id) || (e.carId === car.plateNumber);
                if (matchCar) {
                    let d = e.expenseDate || e.date;
                    if (d) {
                        d = String(d).trim().replace(/[\.\/]/g, '-');
                        if (d.length >= 7) allMonths.add(d.substring(0, 7));
                    }
                    if (e.settledMonth) allMonths.add(e.settledMonth);
                }
            });

            if (targetMonth) allMonths.add(targetMonth);

            allMonths.forEach(m => {
                const sId = `settle_${m.replace('-', '_')}_${car.id}`;
                const sObj = delegatedSettlements.find(s => s.id === sId);
                const isMonthDone = sObj && sObj.status === 'completed';

                if (!isMonthDone) {
                    const mRevs = delegatedRevenues.filter(r => {
                        const isValidStatus = !r.paymentStatus || r.paymentStatus === 'completed' || r.paymentStatus === 'paid';
                        return isValidStatus && isItemAssignedToMonth(r, m, car.id);
                    });
                    const mGross = mRevs.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
                    const mFee = mGross * (feeRate / 100);

                    const mExps = delegatedExpenses.filter(e => {
                        const isDeductible = e.deductibleFromOwner === true || e.deductibleFromOwner === 'true';
                        return isDeductible && isItemAssignedToMonth(e, m, car.id);
                    });
                    const mExpSum = mExps.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

                    carUnsettledTotalPayout += (mGross - mFee - mExpSum);
                }
            });

            let statusBadge = '<span class="status-badge status-pending">미정산 (대기)</span>';
            if (isCompleted) {
                const settledDateFormatted = formatDateTime(existingSettlement.settledAt);
                statusBadge = `
                    <div>
                        <span class="status-badge status-approved"><i class="fa-solid fa-check"></i> 정산 완료</span>
                        ${settledDateFormatted ? `<div style="font-size: 11px; color: #2E7D32; margin-top: 3px; font-weight: 500;">(${settledDateFormatted})</div>` : ''}
                    </div>
                `;
            }

            const payoutColor = netOwnerPayout >= 0 ? '#1565C0' : '#C62828';

            return `
                <tr>
                    <td data-label="차량 정보"><strong>${car.plateNumber}</strong> <span style="font-size: 11px; color: var(--text-secondary);">(${car.model})</span></td>
                    <td data-label="차주명">${car.ownerName}</td>
                    <td data-label="총 렌트 매출" style="font-weight: 600; color: #2E7D32;">${grossRevenue.toLocaleString()}</td>
                    <td data-label="관리 수수료" style="font-size: 12px;">${feeAmount.toLocaleString()} <span style="color: var(--accent-color); font-size: 11px;">(${feeRate}%)</span></td>
                    <td data-label="공제 비용 (이월비용액)" style="font-weight: 600; color: #C62828;">
                        ${totalExpenses.toLocaleString()} <span style="font-size: 11px; color: #E65100; font-weight: 600; margin-left: 2px;">(${carRolloverExpenses.toLocaleString()})</span>
                    </td>
                    <td data-label="당월 배당금 (미정산총액)" style="font-size: 15px; font-weight: 700; color: ${payoutColor};">
                        ${netOwnerPayout.toLocaleString()} <span style="font-size: 11px; color: #E65100; font-weight: 600; margin-left: 2px;">(${carUnsettledTotalPayout.toLocaleString()})</span>
                    </td>
                    <td data-label="정산 상태">${statusBadge}</td>
                    <td data-label="명세서/확정">
                        <div style="display: flex; gap: 6px; justify-content: flex-end;">
                            <button type="button" class="btn btn-secondary view-stmt-btn" data-carid="${car.id}" data-month="${targetMonth}" style="padding: 5px 10px; font-size: 12px;">
                                <i class="fa-solid fa-file-invoice"></i> 명세서
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // View Statement Listeners
        tbody.querySelectorAll('.view-stmt-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const carId = btn.getAttribute('data-carid');
                const month = btn.getAttribute('data-month');
                openSettlementStatementModal(carId, month);
            });
        });
    }

    // ----------------------------------------------------
    // 8. Statement Modal Sheet & Print Handler
    // ----------------------------------------------------
    function openSettlementStatementModal(carId, targetMonth) {
        const car = delegatedCars.find(c => c.id === carId);
        if (!car) return;

        // Gross Revenue assigned to targetMonth
        const revs = delegatedRevenues.filter(r => {
            const isValidStatus = !r.paymentStatus || r.paymentStatus === 'completed' || r.paymentStatus === 'paid';
            return isValidStatus && isItemAssignedToMonth(r, targetMonth, car.id);
        });
        const grossRevenue = revs.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

        const feeRate = parseFloat(car.feeRate) || 20;
        const feeAmount = grossRevenue * (feeRate / 100);

        // Deductible Expenses assigned to targetMonth (including rollovers)
        const exps = delegatedExpenses.filter(e => {
            const isDeductible = e.deductibleFromOwner === true || e.deductibleFromOwner === 'true';
            return isDeductible && isItemAssignedToMonth(e, targetMonth, car.id);
        });
        const totalExpenses = exps.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

        const netOwnerPayout = grossRevenue - feeAmount - totalExpenses;

        const settleId = `settle_${targetMonth.replace('-', '_')}_${car.id}`;
        const existingSettlement = delegatedSettlements.find(s => s.id === settleId);
        const isCompleted = existingSettlement && existingSettlement.status === 'completed';

        const stmtContentSheet = document.getElementById('stmtContentSheet');
        const confirmStmtBtn = document.getElementById('confirmStmtBtn');

        const settledStatusHtml = isCompleted 
            ? `<span style="color: #2E7D32; font-weight: 700;"><i class="fa-solid fa-circle-check"></i> 정산 완료 (${formatDateTime(existingSettlement.settledAt)})</span>` 
            : `<span style="color: #E65100; font-weight: 700;"><i class="fa-solid fa-clock"></i> 정산 대기 (미정산)</span>`;

        if (stmtContentSheet) {
            stmtContentSheet.innerHTML = `
                <div style="background: rgba(197, 168, 128, 0.05); padding: 15px; border-radius: 6px; border: 1px solid var(--border-color); margin-bottom: 20px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div><strong>정산 대상 월:</strong> ${targetMonth}</div>
                        <div><strong>차량 번호 / 모델:</strong> ${car.plateNumber} (${car.model})</div>
                        <div><strong>차주 성함:</strong> ${car.ownerName} ${car.ownerContact ? `(${car.ownerContact})` : ''}</div>
                        <div><strong>정산 계좌:</strong> ${car.bankName || '-'} ${car.accountNumber || ''}</div>
                        <div style="grid-column: 1 / -1; border-top: 1px dashed rgba(0,0,0,0.1); padding-top: 8px;"><strong>정산 상태:</strong> ${settledStatusHtml}</div>
                    </div>
                </div>

                <h4 style="font-size: 14px; font-weight: 700; margin: 15px 0 8px 0; color: #2E7D32;">1. 렌트 매출 수입 내역</h4>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px;">
                    <thead>
                        <tr style="background: #F5F5F5; border-bottom: 1px solid #DDD;">
                            <th style="padding: 6px; text-align: left;">대여 기간</th>
                            <th style="padding: 6px; text-align: left;">임차인</th>
                            <th style="padding: 6px; text-align: right;">금액</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${revs.length > 0 ? revs.map(r => {
                            const isRevRollover = (r.originalMonth && r.originalMonth !== targetMonth) || (!r.settledMonth && !r.startDate.startsWith(targetMonth));
                            const revRolloverBadge = isRevRollover ? `<span style="font-size: 11px; background: #E8F5E9; color: #2E7D32; border: 1px solid #C8E6C9; padding: 1px 5px; border-radius: 3px; font-weight: 600; margin-right: 5px;"><i class="fa-solid fa-arrow-right-arrow-left"></i> 이월 매출</span>` : '';
                            return `
                                <tr style="border-bottom: 1px solid #EEE;">
                                    <td style="padding: 6px;">${revRolloverBadge}${r.startDate} ~ ${r.endDate}</td>
                                    <td style="padding: 6px;">${(userRole === 'owner') ? maskRenterName(r.renterName) : (r.renterName || '-')}</td>
                                    <td style="padding: 6px; text-align: right;">${r.amount.toLocaleString()}</td>
                                </tr>
                            `;
                        }).join('') : '<tr><td colspan="3" style="text-align: center; padding: 10px; color: #888;">당월 렌트 매출 내역 없음</td></tr>'}
                        <tr style="font-weight: 700; background: #E8F5E9;">
                            <td colspan="2" style="padding: 8px;">렌트 총 매출 합계</td>
                            <td style="padding: 8px; text-align: right; color: #2E7D32;">${grossRevenue.toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>

                <h4 style="font-size: 14px; font-weight: 700; margin: 15px 0 8px 0; color: #C62828;">2. 정비 및 공제 비용 내역</h4>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px;">
                    <thead>
                        <tr style="background: #F5F5F5; border-bottom: 1px solid #DDD;">
                            <th style="padding: 6px; text-align: left;">발생 일자</th>
                            <th style="padding: 6px; text-align: left;">비용 구분 / 상세 내용</th>
                            <th style="padding: 6px; text-align: right;">금액</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${exps.length > 0 ? exps.map(e => {
                            const isExpRollover = (e.originalExpenseMonth && e.originalExpenseMonth !== targetMonth) || (!e.settledMonth && !e.expenseDate.startsWith(targetMonth));
                            const expRolloverBadge = isExpRollover ? `<span style="font-size: 11px; background: #FFF3E0; color: #E65100; border: 1px solid #FFE0B2; padding: 1px 5px; border-radius: 3px; font-weight: 600; margin-right: 5px;"><i class="fa-solid fa-arrow-right-arrow-left"></i> 이월 공제</span>` : '';
                            return `
                                <tr style="border-bottom: 1px solid #EEE;">
                                    <td style="padding: 6px;">${e.expenseDate}</td>
                                    <td style="padding: 6px;">
                                        ${expRolloverBadge}${e.description || e.category}
                                        ${(e.hasReceipt || e.receiptImage) ? `
                                            <button type="button" class="stmt-view-receipt-btn" data-id="${e.id}" style="border: 1px solid #90CAF9; background: #E3F2FD; color: #1565C0; font-size: 11px; padding: 2px 6px; border-radius: 4px; cursor: pointer; margin-left: 6px; display: inline-flex; align-items: center; gap: 3px;">
                                                <i class="fa-solid fa-receipt"></i> 영수증
                                            </button>
                                        ` : ''}
                                    </td>
                                    <td style="padding: 6px; text-align: right;">${e.amount.toLocaleString()}</td>
                                </tr>
                            `;
                        }).join('') : '<tr><td colspan="3" style="text-align: center; padding: 10px; color: #888;">당월 차주 공제 비용 내역 없음</td></tr>'}
                        <tr style="font-weight: 700; background: #FFEBEE;">
                            <td colspan="2" style="padding: 8px;">공제 비용 합계</td>
                            <td style="padding: 8px; text-align: right; color: #C62828;">${totalExpenses.toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>

                <h4 style="font-size: 14px; font-weight: 700; margin: 15px 0 8px 0; color: #1565C0;">3. 정산 금액 요약 산출</h4>
                <div style="background: #F8F9FA; padding: 15px; border-radius: 6px; border: 1px solid #E9ECEF;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <span>(+) 총 렌트 매출:</span>
                        <strong>${grossRevenue.toLocaleString()}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: var(--accent-color);">
                        <span>(-) 위탁 관리 수수료 (${feeRate}%):</span>
                        <strong>- ${feeAmount.toLocaleString()}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #C62828;">
                        <span>(-) 차주 정비/공제 비용:</span>
                        <strong>- ${totalExpenses.toLocaleString()}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-top: 2px dashed #CBD5E1; padding-top: 10px; font-size: 16px; font-weight: 700; color: #1565C0;">
                        <span>최종 차주 입금 배당금:</span>
                        <span>${netOwnerPayout.toLocaleString()}</span>
                    </div>
                </div>
            `;

            stmtContentSheet.querySelectorAll('.stmt-view-receipt-btn').forEach(btn => {
                btn.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    const expId = btn.getAttribute('data-id');
                    openReceiptViewerModal(expId);
                });
            });
        }

        if (confirmStmtBtn) {
            if (isCompleted) {
                confirmStmtBtn.innerHTML = '<i class="fa-solid fa-check-double"></i> 이미 정산 완료됨';
                confirmStmtBtn.style.background = '#8C8782';
                confirmStmtBtn.disabled = true;
            } else {
                confirmStmtBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> 정산 완료 처리';
                confirmStmtBtn.style.background = 'var(--accent-color)';
                confirmStmtBtn.disabled = false;

                confirmStmtBtn.onclick = () => {
                    if (confirm(`${car.ownerName} 차주님의 ${targetMonth}월 정산을 완료 처리하시겠습니까?\n\n포함된 매출 및 공제 비용이 ${targetMonth}월 정산 완료 상태로 전환됩니다.`)) {
                        const nowIso = new Date().toISOString();
                        const settlementObj = {
                            id: settleId,
                            yearMonth: targetMonth,
                            carId: car.id,
                            ownerName: car.ownerName,
                            grossRevenue,
                            feeRate,
                            feeAmount,
                            totalExpenses,
                            netOwnerPayout,
                            status: 'completed',
                            settledAt: nowIso
                        };

                        const updates = {};
                        updates[`delegated_car_settlements/${settleId}`] = settlementObj;

                        revs.forEach(r => {
                            if (r.id) {
                                updates[`delegated_car_revenues/${r.id}/isSettled`] = true;
                                updates[`delegated_car_revenues/${r.id}/settledMonth`] = targetMonth;
                                updates[`delegated_car_revenues/${r.id}/settledAt`] = nowIso;
                            }
                        });

                        exps.forEach(e => {
                            if (e.id) {
                                updates[`delegated_car_expenses/${e.id}/isSettled`] = true;
                                updates[`delegated_car_expenses/${e.id}/settledMonth`] = targetMonth;
                                updates[`delegated_car_expenses/${e.id}/settledAt`] = nowIso;
                            }
                        });

                        db.ref().update(updates).then(() => {
                            closeModal('settlementModal');
                        });
                    }
                };
            }
        }

        openModal('settlementModal');
    }

    const printStmtBtn = document.getElementById('printStmtBtn');
    if (printStmtBtn) {
        printStmtBtn.addEventListener('click', () => {
            window.print();
        });
    }

    // ----------------------------------------------------
    // 9. Top Dashboard Metrics Updater
    // ----------------------------------------------------
    function updateDashboardMetrics() {
        const targetMonth = settlementTargetMonth ? settlementTargetMonth.value : currentYearMonth;
        const targetCars = (userRole === 'owner' && ownerCarId) 
            ? delegatedCars.filter(c => c.id === ownerCarId) 
            : delegatedCars;

        const statTotalCars = document.getElementById('statTotalCars');
        if (statTotalCars) {
            statTotalCars.textContent = (userRole === 'owner') ? '1 대 (위탁)' : `${delegatedCars.filter(c => c.status === 'active').length} 대`;
        }

        // Calculate Month Gross Revenue (assigned to targetMonth)
        const monthRevenues = delegatedRevenues.filter(r => {
            if (r.paymentStatus !== 'completed') return false;
            const matchCar = (userRole === 'owner' && ownerCarId) ? r.carId === ownerCarId : true;
            return matchCar && isItemAssignedToMonth(r, targetMonth, r.carId);
        });
        const grossRevenue = monthRevenues.reduce((sum, r) => sum + r.amount, 0);

        // Calculate Month Expenses (assigned to targetMonth)
        const monthExpenses = delegatedExpenses.filter(e => {
            if (!e.deductibleFromOwner) return false;
            const matchCar = (userRole === 'owner' && ownerCarId) ? e.carId === ownerCarId : true;
            return matchCar && isItemAssignedToMonth(e, targetMonth, e.carId);
        });
        const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

        // Calculate Total Company Fee Profit & Net Owner Payouts for targetMonth
        let companyFeeProfit = 0;
        let totalOwnerPayouts = 0;

        targetCars.forEach(car => {
            const carRevs = monthRevenues.filter(r => r.carId === car.id);
            const carGross = carRevs.reduce((sum, r) => sum + r.amount, 0);
            const feeRate = car.feeRate || 20;
            const fee = carGross * (feeRate / 100);

            const carExps = monthExpenses.filter(e => e.carId === car.id);
            const expSum = carExps.reduce((sum, e) => sum + e.amount, 0);

            const ownerPayout = carGross - fee - expSum;

            companyFeeProfit += fee;
            totalOwnerPayouts += ownerPayout;
        });

        // Calculate All Cumulative Unsettled Payouts for Target Cars
        let totalUnsettledPayout = 0;
        const allMonthsSet = new Set();
        delegatedRevenues.forEach(r => {
            const m = r.settledMonth || (r.startDate && r.startDate.substring(0, 7));
            if (m && m.length >= 7) allMonthsSet.add(m);
        });
        delegatedExpenses.forEach(e => {
            const m = e.settledMonth || (e.expenseDate && e.expenseDate.substring(0, 7));
            if (m && m.length >= 7) allMonthsSet.add(m);
        });
        if (targetMonth) allMonthsSet.add(targetMonth);

        allMonthsSet.forEach(m => {
            targetCars.forEach(car => {
                const settleId = `settle_${m.replace('-', '_')}_${car.id}`;
                const existingSettlement = delegatedSettlements.find(s => s.id === settleId);
                const isMonthCompleted = existingSettlement && existingSettlement.status === 'completed';

                // If this month is not settled yet, accumulate to totalUnsettledPayout
                if (!isMonthCompleted) {
                    const carRevs = delegatedRevenues.filter(r => r.paymentStatus === 'completed' && isItemAssignedToMonth(r, m, car.id));
                    const carGross = carRevs.reduce((sum, r) => sum + r.amount, 0);
                    const feeRate = car.feeRate || 20;
                    const fee = carGross * (feeRate / 100);

                    const carExps = delegatedExpenses.filter(e => e.deductibleFromOwner && isItemAssignedToMonth(e, m, car.id));
                    const expSum = carExps.reduce((sum, e) => sum + e.amount, 0);

                    const monthOwnerPayout = carGross - fee - expSum;
                    totalUnsettledPayout += monthOwnerPayout;
                }
            });
        });

        const statGrossRevenue = document.getElementById('statGrossRevenue');
        const statFeeProfit = document.getElementById('statFeeProfit');
        const statTotalExpenses = document.getElementById('statTotalExpenses');
        const statNetPayout = document.getElementById('statNetPayout');
        const statPayoutTitle = document.getElementById('statPayoutTitle');
        const statExpensesSubText = document.getElementById('statExpensesSubText');

        if (statGrossRevenue) statGrossRevenue.textContent = grossRevenue.toLocaleString();

        if (userRole === 'owner') {
            // Owner view: combine management fee with maintenance expenses into total deductible expenses
            const combinedExpenses = totalExpenses + companyFeeProfit;
            if (statTotalExpenses) statTotalExpenses.textContent = combinedExpenses.toLocaleString();
            if (statExpensesSubText) {
                statExpensesSubText.textContent = companyFeeProfit > 0 
                    ? `관리수수료(${companyFeeProfit.toLocaleString()}원) + 정비공제 포함`
                    : '정비, 수리 및 관리수수료 합계';
            }

            // Check settlement confirmation status for the owner's car in targetMonth
            let isSettled = false;
            if (ownerCarId) {
                const settleId = `settle_${targetMonth.replace('-', '_')}_${ownerCarId}`;
                const existingSettlement = delegatedSettlements.find(s => s.id === settleId);
                isSettled = existingSettlement && existingSettlement.status === 'completed';
            }

            if (statPayoutTitle) {
                statPayoutTitle.textContent = '당월 배당 (미정산총액)';
            }
            if (statNetPayout) {
                const formattedCurrent = totalOwnerPayouts.toLocaleString();
                const formattedUnsettled = totalUnsettledPayout.toLocaleString();
                statNetPayout.innerHTML = `${formattedCurrent} <span style="font-size: 16px; font-weight: 600; color: #E65100; margin-left: 4px;">(${formattedUnsettled})</span>`;
            }
            if (statFeeProfit) {
                statFeeProfit.innerHTML = isSettled 
                    ? '<span style="color: #2E7D32;"><i class="fa-solid fa-circle-check"></i> 당월 정산 완료</span>' 
                    : '<span style="color: #E65100;"><i class="fa-solid fa-clock"></i> 당월 미정산(대기)</span>';
            }
        } else {
            // Admin view
            if (statTotalExpenses) statTotalExpenses.textContent = totalExpenses.toLocaleString();
            if (statExpensesSubText) statExpensesSubText.textContent = '정비, 수리 및 사고 처리비';

            if (statPayoutTitle) statPayoutTitle.textContent = '당월 배당 (미정산총액)';
            if (statNetPayout) {
                const formattedCurrent = totalOwnerPayouts.toLocaleString();
                const formattedUnsettled = totalUnsettledPayout.toLocaleString();
                statNetPayout.innerHTML = `${formattedCurrent} <span style="font-size: 16px; font-weight: 600; color: #E65100; margin-left: 4px;">(${formattedUnsettled})</span>`;
            }
            if (statFeeProfit) statFeeProfit.textContent = `수수료 수익: ${companyFeeProfit.toLocaleString()}`;
        }
    }

    // Helper: format Date object to YYYY-MM-DD
    function getLocalDateString(date) {
        if (!date) return '';
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    // Helper: calculate date string exactly 1 month later
    function calculateOneMonthLater(dateInput) {
        if (!dateInput) return '';
        let y, m, d;
        if (typeof dateInput === 'string') {
            const parts = dateInput.split('-');
            if (parts.length === 3) {
                y = parseInt(parts[0], 10);
                m = parseInt(parts[1], 10) - 1;
                d = parseInt(parts[2], 10);
            } else {
                const dt = new Date(dateInput);
                y = dt.getFullYear();
                m = dt.getMonth();
                d = dt.getDate();
            }
        } else if (dateInput instanceof Date) {
            y = dateInput.getFullYear();
            m = dateInput.getMonth();
            d = dateInput.getDate();
        } else {
            return '';
        }
        const target = new Date(y, m + 1, d);
        return getLocalDateString(target);
    }

    // Helper: mask renter name for privacy in owner portal (keep first char, replace rest with *)
    function maskRenterName(name) {
        if (!name) return '예약자';
        const str = String(name).trim();
        if (str.length <= 1) return str + '**';
        return str.charAt(0) + '*'.repeat(str.length - 1);
    }

    // Helper: calculate next month YYYY-MM
    function calculateNextMonth(yearMonthStr) {
        if (!yearMonthStr) return '';
        const parts = yearMonthStr.split('-');
        let y = parseInt(parts[0], 10);
        let m = parseInt(parts[1], 10);
        m++;
        if (m > 12) {
            m = 1;
            y++;
        }
        return `${y}-${String(m).padStart(2, '0')}`;
    }

    // Helper: format ISO timestamp to YYYY-MM-DD HH:mm
    function formatDateTime(isoString) {
        if (!isoString) return '';
        const dt = new Date(isoString);
        if (isNaN(dt.getTime())) return isoString;
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        const hh = String(dt.getHours()).padStart(2, '0');
        const mm = String(dt.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${d} ${hh}:${mm}`;
    }

    // ----------------------------------------------------
    // 9. Vehicle Reservation Calendar Logic (`#tabCalendar`)
    // ----------------------------------------------------
    let carCalYear = today.getFullYear();
    let carCalMonth = today.getMonth(); // 0-11

    const carCalPrevBtn = document.getElementById('carCalPrevBtn');
    const carCalNextBtn = document.getElementById('carCalNextBtn');
    const carCalTodayBtn = document.getElementById('carCalTodayBtn');
    const carCalFilter = document.getElementById('carCalFilter');

    if (carCalPrevBtn) {
        carCalPrevBtn.addEventListener('click', () => {
            carCalMonth--;
            if (carCalMonth < 0) {
                carCalMonth = 11;
                carCalYear--;
            }
            renderCarCalendar();
        });
    }

    if (carCalNextBtn) {
        carCalNextBtn.addEventListener('click', () => {
            carCalMonth++;
            if (carCalMonth > 11) {
                carCalMonth = 0;
                carCalYear++;
            }
            renderCarCalendar();
        });
    }

    if (carCalTodayBtn) {
        carCalTodayBtn.addEventListener('click', () => {
            const now = new Date();
            carCalYear = now.getFullYear();
            carCalMonth = now.getMonth();
            renderCarCalendar();
        });
    }

    if (carCalFilter) {
        carCalFilter.addEventListener('change', renderCarCalendar);
    }

    function renderCarCalendar() {
        const grid = document.getElementById('carCalDatesGrid');
        const monthTitle = document.getElementById('carCalMonthTitle');
        if (!grid || !monthTitle) return;

        monthTitle.textContent = `${carCalYear}년 ${carCalMonth + 1}월`;

        const firstDay = new Date(carCalYear, carCalMonth, 1);
        const lastDay = new Date(carCalYear, carCalMonth + 1, 0);
        const startingDayOfWeek = firstDay.getDay(); // 0 (Sun) to 6 (Sat)
        const totalDays = lastDay.getDate();

        const prevMonthLastDay = new Date(carCalYear, carCalMonth, 0).getDate();

        let cellsHtml = '';

        let selectedCarId = carCalFilter ? carCalFilter.value : 'all';
        if (userRole === 'owner' && ownerCarId) {
            selectedCarId = ownerCarId;
        }

        const filteredRevenues = delegatedRevenues.filter(r => {
            if (selectedCarId !== 'all' && r.carId !== selectedCarId) return false;
            return true;
        });

        // Vibrant distinct colors per car or custom assigned car.color
        const carColorMap = {};
        const colors = ['#2E7D32', '#1565C0', '#D84315', '#6A1B9A', '#00838F', '#8D6E63', '#C62828'];
        delegatedCars.forEach((c, idx) => {
            carColorMap[c.id] = c.color || colors[idx % colors.length];
        });

        // Dynamic Legend Bar update for car colors
        const legendBar = document.querySelector('.car-cal-legend-bar');
        if (legendBar) {
            const legendCars = (userRole === 'owner' && ownerCarId) 
                ? delegatedCars.filter(c => c.id === ownerCarId) 
                : delegatedCars;

            let carLegendItems = legendCars.map(c => {
                const color = c.color || carColorMap[c.id] || '#2E7D32';
                return `<span style="display: flex; align-items: center; gap: 6px; white-space: nowrap;"><span style="width: 10px; height: 10px; background: ${color}; border-radius: 50%; display: inline-block; box-shadow: 0 0 0 1px rgba(0,0,0,0.15);"></span> ${c.plateNumber} (${c.model})</span>`;
            }).join('');

            const guideText = (userRole === 'owner')
                ? '<i class="fa-solid fa-circle-info"></i> 내 차량의 예약 내역을 확인하실 수 있습니다.'
                : '<i class="fa-solid fa-circle-info"></i> 날짜를 클릭하면 해당 시작일로 신규 예약을 등록할 수 있습니다.';

            legendBar.innerHTML = `
                ${carLegendItems}
                <span style="display: flex; align-items: center; gap: 6px; white-space: nowrap; border-left: 1px solid #DDD; padding-left: 10px;"><span style="width: 10px; height: 10px; background: #E65100; border-radius: 50%; display: inline-block;"></span> 입금 대기</span>
                <span id="carCalGuideText" style="margin-left: auto; color: #8C8782;">${guideText}</span>
            `;
        }

        // 1. Previous month trailing days
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const dayNum = prevMonthLastDay - i;
            cellsHtml += `
                <div class="cal-trailing-cell" style="background: #FAF9F8; color: #BBB7B2; font-size: 11px;">
                    <span style="font-weight: 500;">${dayNum}</span>
                </div>
            `;
        }

        // 2. Current month days
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${carCalYear}-${String(carCalMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = (dateStr === todayStr);

            // Find bookings covering this date
            const dayBookings = filteredRevenues.filter(r => {
                if (!r.startDate || !r.endDate) return false;
                return dateStr >= r.startDate && dateStr <= r.endDate;
            });

            let bookingsHtml = '';
            dayBookings.forEach(rev => {
                const car = delegatedCars.find(c => c.id === rev.carId);
                const carModelName = car ? (car.model || car.plateNumber || '차량') : '차량';
                const carColor = (car && car.color) ? car.color : (carColorMap[rev.carId] || '#2E7D32');
                const isPending = rev.paymentStatus === 'pending';
                const bgColor = isPending ? '#E65100' : carColor;
                const statusBadge = isPending ? ' (대기)' : '';
                const pillCursor = (userRole === 'owner') ? 'default' : 'pointer';
                const pillTitle = (userRole === 'owner') 
                    ? `[예약 일정] ${rev.startDate} ~ ${rev.endDate}` 
                    : `${carModelName} (${car ? car.plateNumber : ''}): ${rev.renterName} (${rev.startDate} ~ ${rev.endDate}) - ${rev.amount.toLocaleString()}`;

                const displayRenterName = (userRole === 'owner') ? maskRenterName(rev.renterName) : (rev.renterName || '예약자');

                bookingsHtml += `
                    <div class="cal-booking-pill" data-rev-id="${rev.id}" title="${pillTitle}" style="background: ${bgColor}; color: white; padding: 3px 5px; border-radius: 4px; font-size: 11px; margin-top: 3px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: ${pillCursor}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <span class="pill-car-name">[${carModelName}] </span>${displayRenterName}${statusBadge}
                    </div>
                `;
            });

            const dayStyle = isToday 
                ? 'background: #FFF7ED; font-weight: 700; border: 1.5px solid #F59E0B;' 
                : 'background: var(--white);';

            const cellCursor = (userRole === 'owner') ? 'default' : 'pointer';

            cellsHtml += `
                <div class="cal-date-cell ${isToday ? 'today' : ''}" data-date="${dateStr}" style="${dayStyle} transition: background 0.2s; cursor: ${cellCursor};">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                        <span class="date-num" style="font-size: 12px; font-weight: 700; color: ${isToday ? '#9A3412' : 'var(--text-primary)'};">${d}</span>
                    </div>
                    <div class="cal-events-list">
                        ${bookingsHtml}
                    </div>
                </div>
            `;
        }

        // 3. Next month leading days (fill 35 or 42 grid cells)
        const totalRendered = startingDayOfWeek + totalDays;
        const totalGridCells = totalRendered > 35 ? 42 : 35;
        const nextDays = totalGridCells - totalRendered;

        for (let i = 1; i <= nextDays; i++) {
            cellsHtml += `
                <div class="cal-trailing-cell" style="background: #FAF9F8; color: #BBB7B2; font-size: 11px;">
                    <span style="font-weight: 500;">${i}</span>
                </div>
            `;
        }

        grid.innerHTML = cellsHtml;
        renderCarAgendaList(filteredRevenues);

        // Click Handler on Booking Pills for Edit / View (Admin only)
        grid.querySelectorAll('.cal-booking-pill').forEach(pill => {
            pill.addEventListener('click', (e) => {
                e.stopPropagation();
                if (userRole === 'owner') return; // Owners cannot open booking detail modal

                const revId = pill.getAttribute('data-rev-id');
                const rev = delegatedRevenues.find(r => r.id === revId);
                if (rev) {
                    document.getElementById('revenueId').value = rev.id;
                    document.getElementById('revenueCarId').value = rev.carId || '';
                    document.getElementById('revenueRenterName').value = rev.renterName || '';
                    document.getElementById('revenueRenterContact').value = rev.renterContact || '';
                    document.getElementById('revenueStartDate').value = rev.startDate || '';
                    document.getElementById('revenueEndDate').value = rev.endDate || '';
                    document.getElementById('revenueAmount').value = rev.amount || 0;
                    document.getElementById('revenuePaymentStatus').value = rev.paymentStatus || 'completed';
                    document.getElementById('revenueMemo').value = rev.memo || '';
                    
                    if (revenueModalTitle) revenueModalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> 렌트 예약 정보 수정';
                    if (saveRevenueBtn) {
                        saveRevenueBtn.style.display = '';
                        saveRevenueBtn.textContent = '저장하기';
                    }
                    if (deleteRevenueBtn) deleteRevenueBtn.classList.remove('hidden');

                    openModal('revenueModal');
                }
            });
        });

        // Date Cell Click Handler for Fast Reservation Entry (Admin only)
        grid.querySelectorAll('.cal-date-cell').forEach(cell => {
            cell.addEventListener('click', (e) => {
                if (userRole === 'owner') return; // Owner is read-only
                if (!e.target.closest('.cal-booking-pill')) {
                    const clickDate = cell.getAttribute('data-date');
                    const openRevenueBtn = document.getElementById('openRevenueModalBtn');
                    if (clickDate && openRevenueBtn) {
                        const revCarSelect = document.getElementById('revenueCarId');
                        const startDateInput = document.getElementById('revenueStartDate');
                        const endDateInput = document.getElementById('revenueEndDate');
                        
                        document.getElementById('revenueId').value = '';
                        document.getElementById('revenueForm').reset();

                        if (startDateInput) startDateInput.value = clickDate;
                        if (endDateInput) endDateInput.value = calculateOneMonthLater(clickDate);
                        if (revCarSelect && selectedCarId !== 'all') revCarSelect.value = selectedCarId;
                        
                        if (revenueModalTitle) revenueModalTitle.innerHTML = '<i class="fa-solid fa-circle-plus"></i> 렌트 예약 등록';
                        if (saveRevenueBtn) {
                            saveRevenueBtn.style.display = '';
                            saveRevenueBtn.textContent = '예약 등록';
                        }
                        if (deleteRevenueBtn) deleteRevenueBtn.classList.add('hidden');

                        openModal('revenueModal');
                    }
                }
            });
        });
    }

    function renderCarAgendaList(filteredRevenues) {
        const agendaContainer = document.getElementById('carCalAgendaList');
        if (!agendaContainer) return;

        const monthStr = `${carCalYear}-${String(carCalMonth + 1).padStart(2, '0')}`;
        const monthRevenues = filteredRevenues.filter(r => r.startDate && r.startDate.startsWith(monthStr));
        monthRevenues.sort((a, b) => a.startDate.localeCompare(b.startDate));

        if (monthRevenues.length === 0) {
            agendaContainer.innerHTML = `
                <div style="background: var(--white); padding: 30px; text-align: center; border: 1px dashed var(--border-color); border-radius: 6px; color: var(--text-secondary); font-size: 13px;">
                    <i class="fa-solid fa-calendar-xmark" style="font-size: 28px; color: var(--accent-color); margin-bottom: 8px;"></i>
                    <div>${carCalYear}년 ${carCalMonth + 1}월에 등록된 예약 내역이 없습니다.</div>
                </div>
            `;
            return;
        }

        agendaContainer.innerHTML = monthRevenues.map(rev => {
            const car = delegatedCars.find(c => c.id === rev.carId);
            const carLabel = car ? `${car.plateNumber} (${car.model})` : '차량 정보 없음';
            const isCompleted = rev.paymentStatus === 'completed';
            const statusBadge = isCompleted ? 
                '<span class="status-badge status-approved">결제 완료</span>' : 
                '<span class="status-badge status-pending" style="background: #FFF3E0; color: #E65100;">입금 대기</span>';

            const renterDisplayName = (userRole === 'owner') 
                ? maskRenterName(rev.renterName) 
                : `${rev.renterName || '예약자'} ${rev.renterContact ? `(${rev.renterContact})` : ''}`;

            const actionBtn = (userRole === 'owner') ? '' : `
                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                    <button type="button" class="btn btn-secondary edit-agenda-btn" data-id="${rev.id}" style="padding: 4px 10px; font-size: 12px;">수정</button>
                </div>
            `;

            return `
                <div style="background: var(--white); border: 1px solid var(--border-color); border-radius: 6px; padding: 16px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <div>
                            <span style="font-size: 11px; font-weight: 700; color: var(--accent-color); text-transform: uppercase;">${carLabel}</span>
                            <h4 style="font-size: 15px; font-weight: 700; margin: 2px 0 0 0; color: var(--text-primary);"><i class="fa-solid fa-user" style="margin-right: 4px; font-size: 12px;"></i> ${renterDisplayName}</h4>
                        </div>
                        ${statusBadge}
                    </div>

                    <div style="font-size: 13px; color: var(--text-primary); line-height: 1.6; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 8px; ${userRole === 'owner' ? '' : 'margin-bottom: 10px;'}">
                        <div><i class="fa-solid fa-calendar-days" style="color: var(--text-secondary); width: 16px;"></i> <strong>대여 기간:</strong> ${rev.startDate} ~ ${rev.endDate}</div>
                        <div><i class="fa-solid fa-money-bill-wave" style="color: #2E7D32; width: 16px;"></i> <strong>렌트 금액:</strong> ${rev.amount.toLocaleString()}</div>
                        ${rev.memo ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;"><i class="fa-solid fa-note-sticky" style="width: 16px;"></i> ${rev.memo}</div>` : ''}
                    </div>

                    ${actionBtn}
                </div>
            `;
        }).join('');

        agendaContainer.querySelectorAll('.edit-agenda-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (userRole === 'owner') return; // Owner cannot open detail/edit modal

                const revId = btn.getAttribute('data-id');
                const rev = delegatedRevenues.find(r => r.id === revId);
                if (rev) {
                    document.getElementById('revenueId').value = rev.id;
                    document.getElementById('revenueCarId').value = rev.carId || '';
                    document.getElementById('revenueRenterName').value = rev.renterName || '';
                    document.getElementById('revenueRenterContact').value = rev.renterContact || '';
                    document.getElementById('revenueStartDate').value = rev.startDate || '';
                    document.getElementById('revenueEndDate').value = rev.endDate || '';
                    document.getElementById('revenueAmount').value = rev.amount || 0;
                    document.getElementById('revenuePaymentStatus').value = rev.paymentStatus || 'completed';
                    document.getElementById('revenueMemo').value = rev.memo || '';
                    
                    if (revenueModalTitle) revenueModalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> 렌트 예약 정보 수정';
                    if (saveRevenueBtn) {
                        saveRevenueBtn.style.display = '';
                        saveRevenueBtn.textContent = '저장하기';
                    }
                    if (deleteRevenueBtn) deleteRevenueBtn.classList.remove('hidden');

                    openModal('revenueModal');
                }
            });
        });
    }

    // View Toggle Handlers
    const carCalViewGridBtn = document.getElementById('carCalViewGridBtn');
    const carCalViewAgendaBtn = document.getElementById('carCalViewAgendaBtn');
    const carCalAddResBtn = document.getElementById('carCalAddResBtn');
    const carCalGridWrapper = document.querySelector('.car-cal-grid-wrapper');
    const carCalAgendaList = document.getElementById('carCalAgendaList');

    if (carCalViewGridBtn && carCalViewAgendaBtn) {
        carCalViewGridBtn.addEventListener('click', () => {
            carCalViewGridBtn.classList.remove('btn-secondary');
            carCalViewGridBtn.classList.add('btn-primary', 'active');
            carCalViewAgendaBtn.classList.remove('btn-primary', 'active');
            carCalViewAgendaBtn.classList.add('btn-secondary');
            if (carCalGridWrapper) carCalGridWrapper.classList.remove('hidden');
            if (carCalAgendaList) carCalAgendaList.classList.add('hidden');
        });
        carCalViewAgendaBtn.addEventListener('click', () => {
            carCalViewAgendaBtn.classList.remove('btn-secondary');
            carCalViewAgendaBtn.classList.add('btn-primary', 'active');
            carCalViewGridBtn.classList.remove('btn-primary', 'active');
            carCalViewGridBtn.classList.add('btn-secondary');
            if (carCalGridWrapper) carCalGridWrapper.classList.add('hidden');
            if (carCalAgendaList) carCalAgendaList.classList.remove('hidden');
        });
    }

    // Reservation Quick Add Button in Calendar Header
    if (carCalAddResBtn) {
        carCalAddResBtn.addEventListener('click', () => {
            if (delegatedCars.length === 0) {
                alert('먼저 위탁 차량을 등록해 주세요.');
                return;
            }
            document.getElementById('revenueId').value = '';
            document.getElementById('revenueForm').reset();
            const todayStr = getLocalDateString(new Date());
            document.getElementById('revenueStartDate').value = todayStr;
            document.getElementById('revenueEndDate').value = calculateOneMonthLater(todayStr);

            const revCarSelect = document.getElementById('revenueCarId');
            if (revCarSelect && typeof selectedCarId !== 'undefined' && selectedCarId !== 'all') {
                revCarSelect.value = selectedCarId;
            }

            if (revenueModalTitle) revenueModalTitle.innerHTML = '<i class="fa-solid fa-circle-plus"></i> 렌트 예약 등록';
            if (saveRevenueBtn) saveRevenueBtn.textContent = '예약 등록';
            if (deleteRevenueBtn) deleteRevenueBtn.classList.add('hidden');

            openModal('revenueModal');
        });
    }
});
