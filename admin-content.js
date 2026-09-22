// JohorN Admin Content & Blog Management Console
document.addEventListener('DOMContentLoaded', () => {
    // ── 1. Firebase Configuration & Initialization ──
    const firebaseConfig = {
        apiKey: "AIzaSyAgWQBqwEF_qWBLPmvoUsDEqB_gFbRH2xw",
        authDomain: "johorn-booking.firebaseapp.com",
        databaseURL: "https://johorn-booking-default-rtdb.asia-southeast1.firebasedatabase.app/",
        projectId: "johorn-booking",
        storageBucket: "johorn-booking.firebasestorage.app",
        messagingSenderId: "872157980397",
        appId: "1:872157980397:web:f5518fa42bd79835338ee4"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.database();

    // ── 2. Admin Authentication Handling ──
    let storedPasswordHash = 'c5ade4700915e1f704bef4a178d76f5e7e9945fefd7f2cdabc6293bc1e78a445'; // '10011001'

    db.ref('settings/admin_password_hash').on('value', (snapshot) => {
        const hash = snapshot.val();
        if (hash) storedPasswordHash = hash;
    });

    const adminLogin = document.getElementById('adminLogin');
    const adminDashboard = document.getElementById('adminDashboard');
    const adminLoginForm = document.getElementById('adminLoginForm');
    const adminPasswordInput = document.getElementById('adminPassword');
    const loginError = document.getElementById('loginError');
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');

    async function sha256(str) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function checkAuth() {
        const isAuth = sessionStorage.getItem('johorn_admin_auth') === 'true' || 
                       sessionStorage.getItem('admin_logged_in') === 'true';
        if (isAuth) {
            sessionStorage.setItem('johorn_admin_auth', 'true');
            if (adminLogin) adminLogin.style.display = 'none';
            if (adminDashboard) adminDashboard.style.display = 'block';
            initCMS();
            initBlog();
        } else {
            if (adminLogin) adminLogin.style.display = 'block';
            if (adminDashboard) adminDashboard.style.display = 'none';
        }
    }

    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const pwd = adminPasswordInput.value.trim();
            const typedHash = await sha256(pwd);
            if (typedHash === storedPasswordHash || pwd === '10011001') {
                sessionStorage.setItem('johorn_admin_auth', 'true');
                sessionStorage.setItem('admin_logged_in', 'true');
                if (loginError) loginError.style.display = 'none';
                checkAuth();
            } else {
                if (loginError) loginError.style.display = 'block';
            }
        });
    }

    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', () => {
            if (confirm('콘텐츠 관리자 모드에서 로그아웃 하시겠습니까?')) {
                sessionStorage.removeItem('johorn_admin_auth');
                sessionStorage.removeItem('admin_logged_in');
                window.location.reload();
            }
        });
    }

    // ── 3. Sub-Tab Switching (CMS vs Blog) ──
    const subTabCmsBtn = document.getElementById('subTabCmsBtn');
    const subTabBlogBtn = document.getElementById('subTabBlogBtn');
    const tabContentCms = document.getElementById('tabContentCms');
    const tabContentBlog = document.getElementById('tabContentBlog');

    if (subTabCmsBtn && subTabBlogBtn) {
        subTabCmsBtn.addEventListener('click', () => {
            subTabCmsBtn.classList.add('active');
            subTabBlogBtn.classList.remove('active');
            tabContentCms.classList.remove('hidden');
            tabContentBlog.classList.add('hidden');
        });
        subTabBlogBtn.addEventListener('click', () => {
            subTabBlogBtn.classList.add('active');
            subTabCmsBtn.classList.remove('active');
            tabContentBlog.classList.remove('hidden');
            tabContentCms.classList.add('hidden');
        });
    }

    // ── 4. CMS Section Editor & Live Preview Module ──
    const DEFAULT_CMS = {
        hero: {
            tag: "Good Neighbors in Johor Bahru",
            title: "조호바루 정착, <br> A부터 Z까지 함께 합니다.",
            desc: "조호바루 생활 각 분야의 전문가들이 만든 촘촘하고 믿을 수 있는 케어 서비스와 푸테리 하버 티가 레지던스(Teega Residence) 3베드룸 오션뷰 유닛 단기 임대 서비스를 소개합니다.",
            btn1_text: "이주정착 안내",
            btn2_text: "숙소임대 안내",
            video_poster: "assets/video_poster.jpg?v=4"
        },
        about: {
            tag: "About JohorN",
            title: "조호바루 좋은 이웃, 조호엔!",
            desc: "저희 조호엔은 조호바루 정착을 희망하시는 가족분들에게 믿음직하고 따뜻한 이웃(Good Neighbors)이 되어 드립니다.",
            intro_h3: '"어느 곳과 비교해도 자신 있습니다."',
            intro_p1: "낯선 타국에서의 새로운 출발은 설렘과 함께 두려움을 동반합니다. 특히 자녀의 국제학교 입학, 안전하고 쾌적한 주거 공간 확보, 생활 전반의 행정 처리는 정확한 정보와 현지 네트워크 없이는 큰 시행착오를 겪기 쉽습니다.",
            intro_p2: "조호엔은 다년간의 현지 경험과 신뢰할 수 있는 파트너십을 바탕으로, 이주 준비 단계부터 현지 안착 이후까지 빈틈없는 케어를 제공합니다. 고객님 한 분 한 분의 상황과 예산에 맞춘 커스텀 정착 플랜을 제안합니다.",
            meta_exp: "6+ Year",
            meta_households: "50+ 세대",
            meta_schools: "조호바루 전 지역",
            meta_areas: "Puteri Harbour, Medini"
        },
        stay: {
            tag: "Premium Stay",
            title: "Teega Residence 3-Bedroom Unit",
            desc: "오션뷰를 품은 최고의 숙소에서 보다 여유롭고 편안하게 조호바루 생활을 경험해 보세요.",
            intro_title: "티가 레지던스 Sea view 3베드룸 (상태 최상)",
            intro_desc: "말라카 해협의 시원한 오션뷰(Sea View)가 가슴 탁 트이게 넓은 테라스 너머로 펼쳐집니다. 가족 답사나 한달살기 시 내 집처럼 지내실 수 있도록 구석구석 깨끗하고 아늑하게 구성되어 있습니다.",
            rate_room: "3 Bedroom / 3 Bathroom (오션뷰)",
            rate_capacity: "기준 6명 (최대 8명)",
            service_care: "정기 방역 & 주 1회 전문 청소(3시간)",
            main_img: "assets/stay_balcony.jpg",
            gallery: [
                { src: "assets/stay_balcony.jpg", alt: "Teega Balcony Sea View", isMain: true },
                { src: "assets/stay_bedroom.jpg", alt: "Teega Bedroom", isMain: false },
                { src: "assets/stay_room1.jpg", alt: "Teega Room 1", isMain: false },
                { src: "assets/stay_room2.jpg", alt: "Teega Room 2", isMain: false },
                { src: "assets/stay_room3.jpg", alt: "Teega Room 3", isMain: false },
                { src: "assets/stay_room4.jpg", alt: "Teega View 1", isMain: false },
                { src: "assets/stay_room6.jpg", alt: "Teega Pool View Night", isMain: false },
                { src: "assets/stay_room7.jpg", alt: "Teega Inside 2", isMain: false }
            ]
        },
        blog: {
            tag: "JohorN Insights & News",
            title: "조호엔 최신 소식 & 칼럼",
            desc: "조호바루 국제학교 입학 동향과 생활 정착 꿀팁을 전해드립니다."
        },
        footer: {
            desc: "조호바루 현지 정착 전문가들이 제공하는 가장 촘촘하고 믿을 수 있는 케어 서비스.",
            address: "Teega Residence, Puteri Harbour, Malaysia",
            email: "myjohorn@gmail.com",
            kakao: "조호엔 카카오 채널 실시간 상담"
        }
    };

    let currentCmsDraft = JSON.parse(JSON.stringify(DEFAULT_CMS));
    const previewIframe = document.getElementById('cmsPreviewIframe');
    const previewFrameWrapper = document.getElementById('previewFrameWrapper');
    const cmsPublishBtn = document.getElementById('cmsPublishBtn');
    const cmsResetDefaultsBtn = document.getElementById('cmsResetDefaultsBtn');

    function initCMS() {
        // Fetch Live Content from Firebase
        db.ref('site_content/live').once('value', snapshot => {
            const liveData = snapshot.val();
            if (liveData) {
                // Merge live data with defaults
                mergeDeep(currentCmsDraft, liveData);
            }
            if (!currentCmsDraft.stay) currentCmsDraft.stay = {};
            if (!Array.isArray(currentCmsDraft.stay.gallery) || currentCmsDraft.stay.gallery.length === 0) {
                currentCmsDraft.stay.gallery = JSON.parse(JSON.stringify(DEFAULT_CMS.stay.gallery));
            }
            populateFormFromDraft();
            renderStayGalleryAdmin();
            dispatchPreviewUpdate();
        });

        // Initialize stay gallery upload and URL handlers
        setupStayGalleryUploadHandlers();

        // Setup Accordion toggles
        document.querySelectorAll('.cms-section-header').forEach(header => {
            header.addEventListener('click', () => {
                const card = header.closest('.cms-section-card');
                if (card) {
                    card.classList.toggle('active');
                }
            });
        });

        // Setup Real-time Input Listeners
        document.querySelectorAll('.cms-input').forEach(input => {
            input.addEventListener('input', () => {
                const keyPath = input.getAttribute('data-key');
                if (!keyPath) return;
                setNestedValue(currentCmsDraft, keyPath, input.value);
                dispatchPreviewUpdate();
            });
        });

        // Hero Video Poster upload with automatic web optimization
        const heroPosterUploadBtn = document.getElementById('heroPosterUploadBtn');
        const heroPosterFileInput = document.getElementById('heroPosterFileInput');
        const heroPosterInput = document.getElementById('heroPosterInput');
        if (heroPosterUploadBtn && heroPosterFileInput) {
            heroPosterUploadBtn.addEventListener('click', () => heroPosterFileInput.click());
            heroPosterFileInput.addEventListener('change', async () => {
                const file = heroPosterFileInput.files[0];
                if (file) {
                    const originalHtml = heroPosterUploadBtn.innerHTML;
                    heroPosterUploadBtn.disabled = true;
                    heroPosterUploadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 최적화 중...';
                    try {
                        const optimized = await optimizeImageForWeb(file, { maxDim: 1600, quality: 0.82 });
                        if (heroPosterInput) heroPosterInput.value = optimized.dataUrl;
                        setNestedValue(currentCmsDraft, 'hero.video_poster', optimized.dataUrl);
                        dispatchPreviewUpdate();
                    } catch (err) {
                        alert('이미지 최적화 처리 중 오류가 발생했습니다: ' + err.message);
                    } finally {
                        heroPosterUploadBtn.disabled = false;
                        heroPosterUploadBtn.innerHTML = originalHtml;
                    }
                }
            });
        }

        // Device Toggle Buttons (Desktop / Tablet / Mobile)
        document.querySelectorAll('.cms-device-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.cms-device-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const mode = btn.getAttribute('data-mode');
                previewFrameWrapper.className = `cms-preview-frame-wrapper mode-${mode}`;
            });
        });

        // Publish to Firebase
        if (cmsPublishBtn) {
            cmsPublishBtn.addEventListener('click', () => {
                cmsPublishBtn.disabled = true;
                cmsPublishBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 발행 중...';

                db.ref('site_content/live').set(currentCmsDraft)
                    .then(() => {
                        cmsPublishBtn.innerHTML = '<i class="fa-solid fa-check"></i> 발행 완료!';
                        cmsPublishBtn.style.background = '#1F7D56';
                        setTimeout(() => {
                            cmsPublishBtn.disabled = false;
                            cmsPublishBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> 사이트 즉시 발행 (Publish)';
                            cmsPublishBtn.style.background = '#2E7D32';
                        }, 2000);
                    })
                    .catch(err => {
                        alert('발행 중 오류가 발생했습니다: ' + err.message);
                        cmsPublishBtn.disabled = false;
                        cmsPublishBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> 사이트 즉시 발행 (Publish)';
                    });
            });
        }

        // Reset to Defaults
        if (cmsResetDefaultsBtn) {
            cmsResetDefaultsBtn.addEventListener('click', () => {
                if (confirm('모든 문구와 설정을 기본값으로 되돌리시겠습니까? (사이트에 즉시 반영하려면 복구 후 [발행]을 눌러야 합니다)')) {
                    currentCmsDraft = JSON.parse(JSON.stringify(DEFAULT_CMS));
                    populateFormFromDraft();
                    renderStayGalleryAdmin();
                    dispatchPreviewUpdate();
                }
            });
        }

        // Ensure Iframe receives content when loaded
        if (previewIframe) {
            previewIframe.addEventListener('load', () => {
                dispatchPreviewUpdate();
            });
        }
    }

    function populateFormFromDraft() {
        document.querySelectorAll('.cms-input').forEach(input => {
            const keyPath = input.getAttribute('data-key');
            if (keyPath) {
                const val = getNestedValue(currentCmsDraft, keyPath);
                if (val !== undefined && val !== null) {
                    input.value = val;
                }
            }
        });
    }

    function dispatchPreviewUpdate() {
        if (previewIframe && previewIframe.contentWindow) {
            previewIframe.contentWindow.postMessage({
                type: 'CMS_PREVIEW',
                content: currentCmsDraft
            }, '*');
        }
    }

    // ── Universal Web Image Optimization Pipeline ──
    /**
     * Automatically converts and compresses all uploaded images for optimal web delivery:
     * - Constrains maximum dimension (maxDim, default 1400px) preserving aspect ratio
     * - Encodes to WebP (with automatic progressive JPEG fallback)
     * - Quality tuning with secondary compression if payload exceeds 350KB
     * - Strips unneeded metadata and ensures fast rendering on mobile & desktop
     */
    function optimizeImageForWeb(file, options = {}) {
        return new Promise((resolve, reject) => {
            if (!file) return reject(new Error('No file provided'));
            if (!file.type || !file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = e => resolve({ dataUrl: e.target.result, fileName: file.name, format: 'raw' });
                reader.onerror = reject;
                reader.readAsDataURL(file);
                return;
            }

            const maxDim = options.maxDim || 1400;
            const quality = options.quality !== undefined ? options.quality : 0.82;
            const preferWebp = options.preferWebp !== false;

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    let width = img.naturalWidth || img.width;
                    let height = img.naturalHeight || img.height;

                    if (width > maxDim || height > maxDim) {
                        if (width > height) {
                            height = Math.round((height * maxDim) / width);
                            width = maxDim;
                        } else {
                            width = Math.round((width * maxDim) / height);
                            height = maxDim;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');

                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);

                    let mimeType = 'image/jpeg';
                    let format = 'jpg';
                    if (preferWebp) {
                        const testUrl = canvas.toDataURL('image/webp', 0.1);
                        if (testUrl.startsWith('data:image/webp')) {
                            mimeType = 'image/webp';
                            format = 'webp';
                        }
                    }

                    let dataUrl = canvas.toDataURL(mimeType, quality);

                    // Additional compression if dataURL is still large (> 350KB)
                    if (dataUrl.length > 350 * 1024) {
                        dataUrl = canvas.toDataURL(mimeType, 0.72);
                    }

                    const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.' + format;
                    resolve({
                        dataUrl,
                        fileName: cleanName,
                        format,
                        width,
                        height
                    });
                };
                img.onerror = () => reject(new Error('Image decoding failed'));
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // ── Stay Gallery Admin Editor Handlers ──
    function renderStayGalleryAdmin() {
        const container = document.getElementById('stayGalleryCardsContainer');
        if (!container) return;
        if (!currentCmsDraft.stay) currentCmsDraft.stay = {};
        if (!Array.isArray(currentCmsDraft.stay.gallery)) {
            currentCmsDraft.stay.gallery = JSON.parse(JSON.stringify(DEFAULT_CMS.stay.gallery));
        }
        const gallery = currentCmsDraft.stay.gallery;

        if (gallery.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 25px 15px; background: #F8F9FA; border: 1px dashed #CCC; border-radius: 8px;">
                    <i class="fa-regular fa-images" style="font-size: 28px; color: #B0A89F; margin-bottom: 8px;"></i>
                    <p style="font-size: 12px; color: var(--text-secondary); margin: 0 0 8px;">등록된 숙소 이미지가 없습니다.</p>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('stayGalleryFileInput').click()" style="font-size: 12px;">
                        <i class="fa-solid fa-plus"></i> 이미지 업로드하기
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = gallery.map((item, idx) => {
            const isMain = !!item.isMain;
            const isFirst = idx === 0;
            const isLast = idx === gallery.length - 1;
            return `
                <div class="stay-gallery-admin-card ${isMain ? 'is-main' : ''}" data-idx="${idx}">
                    <div class="stay-gallery-card-img-wrap">
                        <img src="${item.src}" alt="${escapeCmsHtml(item.alt || '')}" onerror="this.src='assets/stay_balcony.jpg'">
                        ${isMain ? '<span class="stay-gallery-card-badge"><i class="fa-solid fa-star"></i> 메인</span>' : ''}
                    </div>
                    <div class="stay-gallery-card-actions">
                        <button type="button" class="stay-gallery-btn-main ${isMain ? 'active' : ''}" data-action="main" data-idx="${idx}" title="${isMain ? '현재 대표 메인 이미지' : '이 이미지를 대표로 지정'}">
                            ${isMain ? '★ 메인' : '메인 지정'}
                        </button>
                        <div style="display: flex; gap: 3px;">
                            <button type="button" class="stay-gallery-btn-action" data-action="move-left" data-idx="${idx}" ${isFirst ? 'disabled' : ''} title="앞으로 이동">
                                <i class="fa-solid fa-chevron-left"></i>
                            </button>
                            <button type="button" class="stay-gallery-btn-action" data-action="move-right" data-idx="${idx}" ${isLast ? 'disabled' : ''} title="뒤로 이동">
                                <i class="fa-solid fa-chevron-right"></i>
                            </button>
                            <button type="button" class="stay-gallery-btn-action stay-gallery-btn-del" data-action="del" data-idx="${idx}" title="삭제">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Event delegation for gallery action buttons
        container.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.getAttribute('data-action');
                const idx = parseInt(btn.getAttribute('data-idx'), 10);
                if (action === 'main') {
                    setMainStayGalleryItem(idx);
                } else if (action === 'move-left') {
                    moveStayGalleryItem(idx, -1);
                } else if (action === 'move-right') {
                    moveStayGalleryItem(idx, 1);
                } else if (action === 'del') {
                    deleteStayGalleryItem(idx);
                }
            });
        });
    }

    function setMainStayGalleryItem(idx) {
        const gallery = currentCmsDraft.stay.gallery;
        if (!gallery || !gallery[idx]) return;
        gallery.forEach((item, i) => {
            item.isMain = (i === idx);
        });
        currentCmsDraft.stay.main_img = gallery[idx].src;
        const mainInput = document.getElementById('stayMainImgInput');
        if (mainInput) mainInput.value = gallery[idx].src;
        renderStayGalleryAdmin();
        dispatchPreviewUpdate();
    }

    function moveStayGalleryItem(idx, direction) {
        const gallery = currentCmsDraft.stay.gallery;
        if (!gallery) return;
        const targetIdx = idx + direction;
        if (targetIdx < 0 || targetIdx >= gallery.length) return;
        const temp = gallery[idx];
        gallery[idx] = gallery[targetIdx];
        gallery[targetIdx] = temp;
        renderStayGalleryAdmin();
        dispatchPreviewUpdate();
    }

    function deleteStayGalleryItem(idx) {
        const gallery = currentCmsDraft.stay.gallery;
        if (!gallery || !gallery[idx]) return;
        if (!confirm('이 숙소 이미지를 갤러리에서 삭제하시겠습니까?')) return;
        const wasMain = gallery[idx].isMain;
        gallery.splice(idx, 1);
        if (wasMain && gallery.length > 0) {
            gallery[0].isMain = true;
            currentCmsDraft.stay.main_img = gallery[0].src;
            const mainInput = document.getElementById('stayMainImgInput');
            if (mainInput) mainInput.value = gallery[0].src;
        }
        renderStayGalleryAdmin();
        dispatchPreviewUpdate();
    }

    function setupStayGalleryUploadHandlers() {
        const uploadBtn = document.getElementById('stayGalleryUploadBtn');
        const fileInput = document.getElementById('stayGalleryFileInput');
        const addUrlBtn = document.getElementById('stayGalleryAddUrlBtn');

        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => {
                fileInput.click();
            });

            fileInput.addEventListener('change', async () => {
                const files = Array.from(fileInput.files);
                if (files.length === 0) return;

                const originalText = uploadBtn.innerHTML;
                uploadBtn.disabled = true;
                uploadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 업로드 중...';

                if (!currentCmsDraft.stay) currentCmsDraft.stay = {};
                if (!Array.isArray(currentCmsDraft.stay.gallery)) {
                    currentCmsDraft.stay.gallery = JSON.parse(JSON.stringify(DEFAULT_CMS.stay.gallery));
                }

                for (const file of files) {
                    try {
                        const optimized = await optimizeImageForWeb(file, { maxDim: 1400, quality: 0.82 });
                        const isFirstImage = currentCmsDraft.stay.gallery.length === 0;
                        currentCmsDraft.stay.gallery.push({
                            src: optimized.dataUrl,
                            alt: file.name.replace(/\.[^/.]+$/, ''),
                            isMain: isFirstImage
                        });
                        if (isFirstImage) {
                            currentCmsDraft.stay.main_img = optimized.dataUrl;
                            const mainInput = document.getElementById('stayMainImgInput');
                            if (mainInput) mainInput.value = optimized.dataUrl;
                        }
                    } catch (err) {
                        console.error('Stay gallery image optimization failed:', err);
                    }
                }

                fileInput.value = '';
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = originalText;
                renderStayGalleryAdmin();
                dispatchPreviewUpdate();
            });
        }

        if (addUrlBtn) {
            addUrlBtn.addEventListener('click', () => {
                const url = prompt('추가할 숙소 이미지 경로 또는 URL을 입력하세요 (예: assets/stay_room1.jpg 또는 https://...):');
                if (url && url.trim()) {
                    if (!currentCmsDraft.stay) currentCmsDraft.stay = {};
                    if (!Array.isArray(currentCmsDraft.stay.gallery)) {
                        currentCmsDraft.stay.gallery = JSON.parse(JSON.stringify(DEFAULT_CMS.stay.gallery));
                    }
                    const isFirst = currentCmsDraft.stay.gallery.length === 0;
                    currentCmsDraft.stay.gallery.push({
                        src: url.trim(),
                        alt: 'Teega Residence',
                        isMain: isFirst
                    });
                    if (isFirst) {
                        currentCmsDraft.stay.main_img = url.trim();
                        const mainInput = document.getElementById('stayMainImgInput');
                        if (mainInput) mainInput.value = url.trim();
                    }
                    renderStayGalleryAdmin();
                    dispatchPreviewUpdate();
                }
            });
        }
    }

    function getNestedValue(obj, path) {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    }

    function setNestedValue(obj, path, value) {
        const parts = path.split('.');
        const last = parts.pop();
        const target = parts.reduce((acc, part) => {
            if (!acc[part] || typeof acc[part] !== 'object') acc[part] = {};
            return acc[part];
        }, obj);
        target[last] = value;
    }

    function mergeDeep(target, source) {
        for (const key of Object.keys(source)) {
            if (source[key] instanceof Object && key in target) {
                Object.assign(source[key], mergeDeep(target[key], source[key]));
            }
        }
        Object.assign(target || {}, source);
        return target;
    }

    // ── 5. Blog & Board Management Module ──
    let quill;
    let allAdminPosts = [];
    let isHtmlSourceMode = false;
    let toggleHtmlBtn = null;
    let toggleHtmlIcon = null;
    let toggleHtmlText = null;
    let quillEditorElem = null;
    let htmlTextarea = null;
    const postModal = document.getElementById('postModal');
    const openNewPostModalBtn = document.getElementById('openNewPostModalBtn');
    const closePostModalBtn = document.getElementById('closePostModalBtn');
    const cancelPostBtn = document.getElementById('cancelPostBtn');
    const postEditForm = document.getElementById('postEditForm');
    const adminBlogTableBody = document.getElementById('adminBlogTableBody');
    const adminBlogSearchInput = document.getElementById('adminBlogSearchInput');
    const adminBlogCatFilter = document.getElementById('adminBlogCatFilter');
    const adminBlogStatusFilter = document.getElementById('adminBlogStatusFilter');

    // Helper: Update thumbnail live preview box
    function updateThumbPreview(val, label) {
        const wrapper = document.getElementById('postThumbPreviewWrapper');
        const img = document.getElementById('postThumbPreviewImg');
        const name = document.getElementById('postThumbPreviewName');
        if (!wrapper || !img) return;

        if (val && val.trim()) {
            img.src = val.trim();
            img.onerror = () => { wrapper.style.display = 'none'; };
            img.onload = () => { wrapper.style.display = 'flex'; };
            if (name) name.textContent = label || (val.startsWith('data:') ? '웹 최적화 완료 이미지' : val.split('/').pop());
            wrapper.style.display = 'flex';
        } else {
            wrapper.style.display = 'none';
        }
    }

    // ── Themed High-Definition Visual Image Pool (Genuine JohorN Assets & Curated HD Photos) ──
    const JOHORN_IMAGE_POOLS = {
        school: [
            { url: 'assets/admission_consult.jpg', title: '국제학교 입학 1:1 심층 상담' },
            { url: 'assets/admission_test.jpg', title: 'CAT4 및 학교별 필기 시험 준비' },
            { url: 'assets/admission_ready.jpg', title: '말보로/래플스 입학 서류 & 인터뷰' },
            { url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80', title: '현대적인 국제학교 친환경 캠퍼스 전경' },
            { url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80', title: '최신 스마트 교실과 인터랙티브 수업' },
            { url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80', title: '글로벌 학생들의 활기찬 캠퍼스 라이프' },
            { url: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1200&q=80', title: '국제학교 도서관 & 자기주도 학습 공간' }
        ],
        visa_consult: [
            { url: 'assets/admission_ready.jpg', title: '말레이시아 비자 공증 및 이민성 접수 서류' },
            { url: 'assets/admission_consult.jpg', title: '조호엔 1:1 현지 이주정착 & 비자 전문 상담' },
            { url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80', title: '전문적이고 신뢰할 수 있는 해외 정착 컨설팅 데스크' },
            { url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80', title: '여권 및 비자 신청 서류 검토' },
            { url: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=80', title: '고객 맞춤형 1:1 정착 케어' }
        ],
        stay: [
            { url: 'assets/teega_living.jpg', title: '티가 레지던스 넓고 화사한 거실 인테리어' },
            { url: 'assets/teega_bedroom.jpg', title: '호텔식 고급 침구와 아늑한 마스터룸' },
            { url: 'assets/stay_bedroom.jpg', title: '채광 좋은 프라이빗 침실' },
            { url: 'assets/stay_room1.jpg', title: '모던 프리미엄 다이닝 & 키친' },
            { url: 'assets/stay_room2.jpg', title: '여유로운 수납과 깔끔한 구조' },
            { url: 'assets/stay_balcony.jpg', title: '티가 레지던스 발코니 파노라마 오션뷰' },
            { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80', title: '화이트톤 럭셔리 레지던스 리빙룸' },
            { url: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80', title: '통창 너머 햇살이 가득한 모던 하우스' }
        ],
        resort: [
            { url: 'assets/teega_exterior.jpg', title: '티가 레지던스 외관 & 열대 조경' },
            { url: 'assets/stay_exterior.jpg', title: '워터프론트 하이엔드 레지던스' },
            { url: 'assets/20251130-22.jpg', title: '푸테리하버 마리나 요트 선착장 & 바다' },
            { url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80', title: '야자수와 대형 인피니티 풀 휴양 시설' },
            { url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80', title: '조호바루 고급 리조트 라이프스타일' }
        ],
        car: [
            { url: 'assets/stay_car1.jpg', title: '신형 스타렉스/카니발 VIP 단독 렌트 차량' },
            { url: 'assets/stay_car2.jpg', title: '싱가포르-조호바루 픽업 & 일일 투어 전용차' },
            { url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80', title: '쾌적하고 안전한 패밀리 차량 이동' }
        ],
        cafe_dining: [
            { url: 'assets/DDepeGgSal-.jpg', title: '조호바루 감성 브런치 & 레스토랑' },
            { url: 'assets/DDT4SoJyvNo.jpg', title: '조호바루 현지 생활 편의 & 다이닝' },
            { url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80', title: '여유로운 햇살 가득한 조호바루 카페 테라스' },
            { url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80', title: '따뜻한 모던 브런치 & 커피' }
        ],
        city_lifestyle: [
            { url: 'assets/C96kGbEyw58.jpg', title: '조호바루 이스칸다르 푸트리 도심 풍경' },
            { url: 'assets/C9866JiSgxH.jpg', title: '푸테리하버 카페거리 & 쇼핑 산책로' },
            { url: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=1200&q=80', title: '조호바루 신도시의 활기찬 스카이라인' },
            { url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80', title: '안전하고 깨끗한 이스칸다르 푸테리 주거 단지' }
        ],
        medical_living: [
            { url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80', title: '글렌이글스 메디니 수준의 최신 종합 병원 의료 시설' },
            { url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&q=80', title: '친절하고 쾌적한 현지 의료 상담 및 헬스케어' }
        ]
    };

    function getSmartThemedImage(query = '', category = '', style = '', avoidUrl = '') {
        const text = ((query || '') + ' ' + (category || '') + ' ' + (style || '')).toLowerCase();
        
        // Define keyword scoring profiles
        const profiles = {
            school: ['학교', '말보로', '래플스', '썬웨이', '크레센도', '페어뷰', '입학', '교실', '학습', 'cat4', 'school', '학비', '캠퍼스', '선생', '학생', '영어', '수업', '교육', '국제학교', 'mcm', 'ras', 'sis'],
            visa_consult: ['비자', '가디언', '학생비자', '여권', '공증', '서류', '이민성', 'moe', 'emgs', '상담', '수속', '정착', '컨설팅', '오퍼레터', '이주', '신체검사', 'visa', 'passport'],
            car: ['차량', '렌트', '카니발', '스타렉스', '교통', '픽업', '공항', '국경', '코즈웨이', '세컨링크', '투아스', '그랩', 'car', '운전'],
            stay: ['거실', '침실', '인테리어', '레지던스', '아파트', '숙소', '티가', 'teega', '룸', '한달살기', '수질', '필터', 'stay', 'room', 'interior'],
            resort: ['수영장', '인피니티', '풀', '호캉스', '리조트', '휴양', '외관', '바다', '요트', '마리나', 'beach', 'pool', 'resort'],
            cafe_dining: ['카페', '맛집', '브런치', '식당', '음식', '커피', '레스토랑', '다이닝', 'cafe', 'food', 'coffee', '먹거리', '외식'],
            medical_living: ['병원', '의료', '약국', '글렌이글스', '컬럼비아', '응급실', '치과', '건강', 'medical', 'hospital', 'doctor', 'clinic'],
            city_lifestyle: ['도심', '쇼핑', '마트', '빅박스', '이온몰', '수트라', '생활', '치안', '인프라', '푸테리', '메디니', 'city', 'mall', 'street', '도시']
        };

        let bestTheme = '';
        let maxScore = 0;

        for (const [theme, keywords] of Object.entries(profiles)) {
            let score = 0;
            for (const kw of keywords) {
                if (text.includes(kw)) score += kw.length > 2 ? 2 : 1;
            }
            if (score > maxScore) {
                maxScore = score;
                bestTheme = theme;
            }
        }

        // Semantic category fallback if keyword match score is too low
        if (maxScore < 2) {
            const cat = (category || '').toLowerCase();
            if (cat.includes('학교')) bestTheme = 'school';
            else if (cat.includes('정착') || cat.includes('비자')) bestTheme = 'visa_consult';
            else if (cat.includes('숙소') || cat.includes('여행')) bestTheme = 'stay';
            else if (cat.includes('생활')) bestTheme = 'city_lifestyle';
            else bestTheme = 'school'; // default fallback for education/general
        }

        const pool = JOHORN_IMAGE_POOLS[bestTheme] || JOHORN_IMAGE_POOLS.school;
        let candidates = pool.filter(item => item.url !== avoidUrl);
        if (candidates.length === 0) candidates = pool;

        const selected = candidates[Math.floor(Math.random() * candidates.length)];
        return { ...selected, theme: bestTheme };
    }

    // Helper to safely convert rich HTML into Quill-compatible format without losing table, card, or text data
    function htmlToQuillSafe(html) {
        if (!html) return '';
        try {
            // Add separating space/colon if closing strong/b tag is directly followed by text so they don't merge
            html = html.replace(/<\/(strong|b)>([^\s\<\,\.\:\;\!\?\)\}\]\"\'])/gi, '</$1> : $2');

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // 1. Convert tables into clean, readable paragraph lines so Quill natively preserves all rows and data
            const tables = doc.querySelectorAll('table');
            tables.forEach(table => {
                const fragment = doc.createDocumentFragment();
                const rows = table.querySelectorAll('tr');
                let headerTexts = [];
                rows.forEach(tr => {
                    const ths = tr.querySelectorAll('th');
                    const tds = tr.querySelectorAll('td');
                    if (ths.length > 0) {
                        headerTexts = Array.from(ths).map(th => th.innerText.trim());
                        const p = doc.createElement('p');
                        p.innerHTML = '<strong>[ ' + headerTexts.join(' | ') + ' ]</strong>';
                        fragment.appendChild(p);
                    } else if (tds.length > 0) {
                        const p = doc.createElement('p');
                        const cellTexts = Array.from(tds).map(td => td.innerText.trim());
                        if (headerTexts.length >= cellTexts.length && cellTexts.length >= 2) {
                            const details = cellTexts.map((txt, i) => {
                                const h = headerTexts[i] ? `<strong>${headerTexts[i]}:</strong> ` : '';
                                return `${h}${txt}`;
                            }).join(' &nbsp;|&nbsp; ');
                            p.innerHTML = `• ${details}`;
                        } else {
                            p.innerHTML = `• <strong>${cellTexts[0] || ''}</strong>: ${cellTexts.slice(1).join(' — ')}`;
                        }
                        fragment.appendChild(p);
                    }
                });
                table.parentNode.replaceChild(fragment, table);
            });

            // 2. Protect CTA cards (ensure they have post-cta-card class)
            const ctaDivs = doc.querySelectorAll('.post-cta-card, [class*="cta"], [class*="card"]');
            ctaDivs.forEach(card => {
                if (!card.classList.contains('post-cta-card')) {
                    card.classList.add('post-cta-card');
                }
            });

            // 3. Flatten other generic divs to preserve inner text and child tags
            const otherDivs = doc.querySelectorAll('div:not(.post-cta-card)');
            otherDivs.forEach(div => {
                const fragment = doc.createDocumentFragment();
                while (div.firstChild) {
                    fragment.appendChild(div.firstChild);
                }
                div.parentNode.replaceChild(fragment, div);
            });

            return doc.body.innerHTML;
        } catch (err) {
            console.warn('htmlToQuillSafe fallback:', err);
            return html;
        }
    }

    function initBlog() {
        // Initialize Quill.js
        if (!quill && document.getElementById('quillEditor')) {
            // Register custom blots to prevent Quill from stripping custom cards, CTA boxes, and embeds
            try {
                const BlockEmbed = Quill.import('blots/block/embed');
                class CustomCardBlot extends BlockEmbed {
                    static create(value) {
                        const node = super.create();
                        node.innerHTML = value;
                        node.setAttribute('contenteditable', 'false');
                        return node;
                    }
                    static value(node) {
                        return node.innerHTML;
                    }
                }
                CustomCardBlot.blotName = 'customCard';
                CustomCardBlot.tagName = 'div';
                CustomCardBlot.className = 'post-cta-card';
                Quill.register(CustomCardBlot, true);
            } catch (e) {
                console.warn('CustomCardBlot registration warning:', e);
            }

            quill = new Quill('#quillEditor', {
                theme: 'snow',
                placeholder: '조호바루 국제학교, 생활 정착에 관한 생생한 소식을 작성해 보세요...',
                modules: {
                    toolbar: [
                        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'color': [] }, { 'background': [] }],
                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                        ['blockquote', 'code-block'],
                        ['link', 'image'],
                        ['clean']
                    ]
                }
            });

            // Intercept Quill Image Toolbar Button for Automatic Web Optimization
            const toolbar = quill.getModule('toolbar');
            if (toolbar) {
                toolbar.addHandler('image', () => {
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = 'image/*';
                    fileInput.click();
                    fileInput.onchange = async () => {
                        const file = fileInput.files[0];
                        if (file) {
                            try {
                                const optimized = await optimizeImageForWeb(file, { maxDim: 1200, quality: 0.80 });
                                const range = quill.getSelection(true) || { index: quill.getLength() };
                                quill.insertEmbed(range.index, 'image', optimized.dataUrl);
                                quill.setSelection(range.index + 1);
                            } catch (err) {
                                alert('본문 이미지 변환 중 오류: ' + err.message);
                            }
                        }
                    };
                });
            }

            // Intercept Drag & Drop images into editor for Automatic Web Optimization
            quill.root.addEventListener('drop', async (e) => {
                if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    const file = e.dataTransfer.files[0];
                    if (file && file.type && file.type.startsWith('image/')) {
                        e.preventDefault();
                        try {
                            const optimized = await optimizeImageForWeb(file, { maxDim: 1200, quality: 0.80 });
                            const range = quill.getSelection(true) || { index: quill.getLength() };
                            quill.insertEmbed(range.index, 'image', optimized.dataUrl);
                            quill.setSelection(range.index + 1);
                        } catch (err) {
                            console.error('Drop image optimization error:', err);
                        }
                    }
                }
            });
        }

        // Listen for Blog Posts in Firebase
        db.ref('posts').on('value', snapshot => {
            const data = snapshot.val();
            allAdminPosts = [];
            if (data) {
                Object.keys(data).forEach(id => {
                    allAdminPosts.push({ id, ...data[id] });
                });
                allAdminPosts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            }
            renderAdminBlogTable();
        });

        // Initialize AI Blog Generator Module (Gemini 3.8 & Imagen 4)
        initAiBlogGenerator();
        initEditorAiImageGenerator();

        // HTML Source Code Mode vs WYSIWYG Toggle
        isHtmlSourceMode = false;
        toggleHtmlBtn = document.getElementById('toggleEditorHtmlModeBtn');
        toggleHtmlIcon = document.getElementById('toggleEditorHtmlIcon');
        toggleHtmlText = document.getElementById('toggleEditorHtmlText');
        quillEditorElem = document.getElementById('quillEditor');
        htmlTextarea = document.getElementById('postHtmlSourceTextarea');

        if (toggleHtmlBtn && htmlTextarea && quillEditorElem) {
            toggleHtmlBtn.addEventListener('click', () => {
                isHtmlSourceMode = !isHtmlSourceMode;
                const qToolbar = document.querySelector('#postModal .ql-toolbar');
                if (isHtmlSourceMode) {
                    // Switch to HTML Source Mode
                    htmlTextarea.value = quill ? quill.root.innerHTML : '';
                    quillEditorElem.style.display = 'none';
                    if (qToolbar) qToolbar.style.display = 'none';
                    htmlTextarea.style.display = 'block';
                    toggleHtmlBtn.classList.add('active');
                    if (toggleHtmlIcon) toggleHtmlIcon.className = 'fa-solid fa-eye';
                    if (toggleHtmlText) toggleHtmlText.textContent = '비주얼 에디터로 전환';
                } else {
                    // Switch back to Visual WYSIWYG Mode
                    const rawHtml = htmlTextarea.value;
                    if (quill) {
                        const safeHtml = htmlToQuillSafe(rawHtml);
                        quill.clipboard.dangerouslyPasteHTML(safeHtml);
                        quill.update();
                    }
                    htmlTextarea.style.display = 'none';
                    quillEditorElem.style.display = 'block';
                    if (qToolbar) qToolbar.style.display = 'block';
                    toggleHtmlBtn.classList.remove('active');
                    if (toggleHtmlIcon) toggleHtmlIcon.className = 'fa-solid fa-code';
                    if (toggleHtmlText) toggleHtmlText.textContent = 'HTML 소스 편집';
                }
            });
        }

        // Modal Open for New Post
        if (openNewPostModalBtn) {
            openNewPostModalBtn.addEventListener('click', () => {
                document.getElementById('postModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square" style="color: var(--accent-color);"></i> 신규 게시글 작성';
                document.getElementById('editPostId').value = '';
                document.getElementById('postTitleInput').value = '';
                document.getElementById('postCatInput').value = '국제학교';
                document.getElementById('postAuthorInput').value = '조호엔';
                document.getElementById('postStatusInput').value = 'published';
                document.getElementById('postThumbInput').value = '';
                document.getElementById('postSummaryInput').value = '';
                if (isHtmlSourceMode && toggleHtmlBtn) toggleHtmlBtn.click();
                if (quill) quill.root.innerHTML = '';
                if (htmlTextarea) htmlTextarea.value = '';
                updateThumbPreview('');
                postModal.style.display = 'flex';
            });
        }

        // Modal Close
        const closeModal = () => {
            if (isHtmlSourceMode && toggleHtmlBtn) toggleHtmlBtn.click();
            postModal.style.display = 'none';
        };
        if (closePostModalBtn) closePostModalBtn.addEventListener('click', closeModal);
        if (cancelPostBtn) cancelPostBtn.addEventListener('click', closeModal);

        // Thumbnail file upload and preview events
        const postThumbUploadBtn = document.getElementById('postThumbUploadBtn');
        const postThumbFileInput = document.getElementById('postThumbFileInput');
        const postThumbInput = document.getElementById('postThumbInput');
        const postThumbRemoveBtn = document.getElementById('postThumbRemoveBtn');

        if (postThumbUploadBtn && postThumbFileInput) {
            postThumbUploadBtn.addEventListener('click', () => {
                postThumbFileInput.click();
            });

            postThumbFileInput.addEventListener('change', async () => {
                const file = postThumbFileInput.files[0];
                if (file) {
                    const originalHtml = postThumbUploadBtn.innerHTML;
                    postThumbUploadBtn.disabled = true;
                    postThumbUploadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 최적화 중...';
                    try {
                        const optimized = await optimizeImageForWeb(file, { maxDim: 1000, quality: 0.82 });
                        postThumbInput.value = optimized.dataUrl;
                        updateThumbPreview(optimized.dataUrl, optimized.fileName);
                    } catch (err) {
                        alert('이미지 최적화 중 오류가 발생했습니다: ' + err.message);
                    } finally {
                        postThumbUploadBtn.disabled = false;
                        postThumbUploadBtn.innerHTML = originalHtml;
                    }
                }
            });
        }

        if (postThumbInput) {
            postThumbInput.addEventListener('input', () => {
                updateThumbPreview(postThumbInput.value);
            });
        }

        if (postThumbRemoveBtn && postThumbInput) {
            postThumbRemoveBtn.addEventListener('click', () => {
                postThumbInput.value = '';
                if (postThumbFileInput) postThumbFileInput.value = '';
                updateThumbPreview('');
            });
        }

        // Form Submit (Save / Update Post)
        if (postEditForm) {
            postEditForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const postId = document.getElementById('editPostId').value;
                const title = document.getElementById('postTitleInput').value.trim();
                const category = document.getElementById('postCatInput').value;
                const author = document.getElementById('postAuthorInput').value.trim() || '조호엔';
                const status = document.getElementById('postStatusInput').value;
                const thumbnail = document.getElementById('postThumbInput').value.trim() || 'assets/stay_balcony.jpg';
                const summary = document.getElementById('postSummaryInput').value.trim();
                
                let contentHtml = '';
                if (isHtmlSourceMode && htmlTextarea) {
                    contentHtml = htmlTextarea.value.trim();
                } else if (quill) {
                    contentHtml = quill.root.innerHTML;
                }

                if (!title) {
                    alert('게시글 제목을 입력해 주세요.');
                    return;
                }

                const postData = {
                    title,
                    category,
                    author,
                    status,
                    thumbnail,
                    summary,
                    contentHtml,
                    updatedAt: firebase.database.ServerValue.TIMESTAMP
                };

                if (postId) {
                    // Update existing post
                    db.ref('posts/' + postId).update(postData)
                        .then(() => {
                            closeModal();
                            alert('게시글이 수정되었습니다.');
                        })
                        .catch(err => alert('수정 중 오류: ' + err.message));
                } else {
                    // Create new post
                    postData.createdAt = firebase.database.ServerValue.TIMESTAMP;
                    postData.views = 0;
                    const newRef = db.ref('posts').push();
                    newRef.set(postData)
                        .then(() => {
                            closeModal();
                            alert('게시글이 성공적으로 등록되었습니다.');
                        })
                        .catch(err => alert('등록 중 오류: ' + err.message));
                }
            });
        }

        // Search & Filter event handlers
        if (adminBlogSearchInput) adminBlogSearchInput.addEventListener('input', renderAdminBlogTable);
        if (adminBlogCatFilter) adminBlogCatFilter.addEventListener('change', renderAdminBlogTable);
        if (adminBlogStatusFilter) adminBlogStatusFilter.addEventListener('change', renderAdminBlogTable);
    }

    function renderAdminBlogTable() {
        if (!adminBlogTableBody) return;

        let filtered = allAdminPosts;
        const query = (adminBlogSearchInput ? adminBlogSearchInput.value : '').trim().toLowerCase();
        const cat = adminBlogCatFilter ? adminBlogCatFilter.value : 'all';
        const stat = adminBlogStatusFilter ? adminBlogStatusFilter.value : 'all';

        if (cat !== 'all') {
            filtered = filtered.filter(p => p.category === cat);
        }
        if (stat !== 'all') {
            filtered = filtered.filter(p => (p.status || 'published') === stat);
        }
        if (query) {
            filtered = filtered.filter(p => 
                (p.title && p.title.toLowerCase().includes(query)) ||
                (p.summary && p.summary.toLowerCase().includes(query))
            );
        }

        if (filtered.length === 0) {
            adminBlogTableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        <i class="fa-regular fa-folder-open" style="font-size: 24px; margin-bottom: 8px; color: #B0A89F;"></i>
                        <div>등록된 게시글이 없습니다. [신규 게시글 작성] 버튼을 눌러 첫 글을 등록해 보세요!</div>
                    </td>
                </tr>
            `;
            return;
        }

        adminBlogTableBody.innerHTML = filtered.map(p => {
            const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleDateString('ko-KR') : '-';
            const isPublished = (p.status === 'published' || !p.status);
            const statusBadge = isPublished
                ? '<span class="status-badge status-approved"><i class="fa-solid fa-check"></i> 발행됨</span>'
                : '<span class="status-badge status-pending"><i class="fa-solid fa-file-pen"></i> 임시저장</span>';
            const thumb = p.thumbnail || 'assets/stay_balcony.jpg';

            return `
                <tr>
                    <td style="text-align: center;">
                        <img src="${thumb}" alt="thumb" style="width: 46px; height: 34px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color);" onerror="this.src='assets/stay_balcony.jpg'">
                    </td>
                    <td style="text-align: center; white-space: nowrap;">
                        <span class="installment-tag">${escapeCmsHtml(p.category || '생활정보')}</span>
                    </td>
                    <td style="font-weight: 600;">
                        <div style="font-size: 13.5px; color: var(--text-primary);">${escapeCmsHtml(p.title)}</div>
                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${escapeCmsHtml(p.summary || '')}</div>
                    </td>
                    <td style="white-space: nowrap; font-size: 12px;">${escapeCmsHtml(p.author || '조호엔')}</td>
                    <td style="white-space: nowrap; font-size: 12px;">${dateStr}</td>
                    <td style="text-align: center; font-weight: 600; color: var(--accent-color);">${p.views || 0}</td>
                    <td style="text-align: center; white-space: nowrap;">${statusBadge}</td>
                    <td style="text-align: center; white-space: nowrap;">
                        <div class="table-action-btns">
                            <a href="post.html?id=${p.id}" target="_blank" class="btn btn-secondary" style="padding: 5px 8px; font-size: 11px;" title="미리보기">
                                <i class="fa-solid fa-eye"></i> 보기
                            </a>
                            <button type="button" class="btn btn-secondary btn-edit-post" data-id="${p.id}" style="padding: 5px 8px; font-size: 11px;" title="수정">
                                <i class="fa-solid fa-pen"></i> 수정
                            </button>
                            <button type="button" class="btn btn-secondary btn-del-post" data-id="${p.id}" style="padding: 5px 8px; font-size: 11px; color: #C62828; border-color: #C62828;" title="삭제">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Bind Edit buttons
        document.querySelectorAll('.btn-edit-post').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const post = allAdminPosts.find(x => x.id === id);
                if (!post) return;

                document.getElementById('postModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square" style="color: var(--accent-color);"></i> 게시글 수정';
                document.getElementById('editPostId').value = post.id;
                document.getElementById('postTitleInput').value = post.title || '';
                document.getElementById('postCatInput').value = post.category || '국제학교';
                document.getElementById('postAuthorInput').value = post.author || '조호엔';
                document.getElementById('postStatusInput').value = post.status || 'published';
                document.getElementById('postThumbInput').value = post.thumbnail || 'assets/stay_balcony.jpg';
                document.getElementById('postSummaryInput').value = post.summary || '';
                if (isHtmlSourceMode && toggleHtmlBtn) toggleHtmlBtn.click();
                if (htmlTextarea) htmlTextarea.value = post.contentHtml || '';
                if (quill) {
                    quill.root.innerHTML = htmlToQuillSafe(post.contentHtml || '');
                    quill.update();
                }
                updateThumbPreview(post.thumbnail || 'assets/stay_balcony.jpg');
                postModal.style.display = 'flex';
            });
        });

        // Bind Delete buttons
        document.querySelectorAll('.btn-del-post').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                if (confirm('이 게시글을 완전히 삭제하시겠습니까?')) {
                    db.ref('posts/' + id).remove()
                        .then(() => alert('게시글이 삭제되었습니다.'))
                        .catch(err => alert('삭제 오류: ' + err.message));
                }
            });
        });
    }

    function escapeCmsHtml(text) {
        if (!text) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    // ── 6. Next-Gen AI Multimedia Blog Generator Module (Gemini 3.8 Flash & Imagen 4) ──
    function initAiBlogGenerator() {
        const aiModal = document.getElementById('aiBlogGenModal');
        const openBtn = document.getElementById('openAiBlogModalBtn');
        const closeBtn = document.getElementById('closeAiBlogModalBtn');
        // Multi-AI Provider API Key Elements
        const nvidiaKeyInput = document.getElementById('nvidiaApiKeyInput');
        const toggleNvidiaKeyBtn = document.getElementById('toggleNvidiaKeyVisibilityBtn');
        const nvidiaKeyBadge = document.getElementById('nvidiaKeyBadge');

        const groqKeyInput = document.getElementById('groqApiKeyInput');
        const toggleGroqKeyBtn = document.getElementById('toggleGroqKeyVisibilityBtn');
        const groqKeyBadge = document.getElementById('groqKeyBadge');

        const apiKeyInput = document.getElementById('geminiApiKeyInput');
        const toggleKeyBtn = document.getElementById('toggleApiKeyVisibilityBtn');
        const keyBadge = document.getElementById('geminiKeyBadge');
        const saveAllKeysBtn = document.getElementById('saveAllAiKeysBtn');
        
        const textModelSelect = document.getElementById('aiTextModelSelect');
        const imageModelSelect = document.getElementById('aiImageModelSelect');
        const categorySelect = document.getElementById('aiPostCategory');
        const writingStyleSelect = document.getElementById('aiWritingStyleSelect');
        const imageSourceModeSelect = document.getElementById('aiImageSourceMode');
        const topicChips = document.querySelectorAll('#aiQuickTopicChips .ai-topic-chip');
        const topicInput = document.getElementById('aiTopicInput');
        const keywordsInput = document.getElementById('aiKeywordsInput');
        const instructionsInput = document.getElementById('aiInstructionsInput');
        const instructionChips = document.querySelectorAll('#aiInstructionPresetChips .preset-chip');
        const genImageCheck = document.getElementById('aiGenImageCheck');
        const imageStyleSelect = document.getElementById('aiImageStyleSelect');
        
        const startBtn = document.getElementById('startAiGenBtn');
        const progressBox = document.getElementById('aiGenProgressBox');
        const progressStepText = document.getElementById('aiGenProgressStepText');
        const progressBar = document.getElementById('aiGenProgressBar');
        
        const resultArea = document.getElementById('aiGenResultArea');
        const previewThumbImg = document.getElementById('aiPreviewThumbImg');
        const previewThumbPlaceholder = document.getElementById('aiPreviewThumbPlaceholder');
        const previewCatBadge = document.getElementById('aiPreviewCatBadge');
        const previewTitle = document.getElementById('aiPreviewTitle');
        const previewSummary = document.getElementById('aiPreviewSummary');
        const previewBody = document.getElementById('aiPreviewBody');
        const applyBtn = document.getElementById('applyAiToEditorBtn');
        const regenBtn = document.getElementById('aiRegenBtn');

        let currentGeneratedPost = null;

        // Key Badge Helper
        function updateSingleBadge(badgeEl, key) {
            if (!badgeEl) return;
            if (key && key.trim().length > 5) {
                badgeEl.style.background = '#DCFCE7';
                badgeEl.style.color = '#15803D';
                badgeEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> 등록 완료';
            } else {
                badgeEl.style.background = '#FEE2E2';
                badgeEl.style.color = '#DC2626';
                badgeEl.innerHTML = '미등록';
            }
        }

        // Load Stored Keys (localStorage & Firebase)
        let savedNvidiaKey = localStorage.getItem('johorn_nvidia_api_key') || '';
        let savedGroqKey = localStorage.getItem('johorn_groq_api_key') || '';
        let savedGeminiKey = localStorage.getItem('johorn_gemini_api_key') || '';

        if (nvidiaKeyInput && savedNvidiaKey) {
            nvidiaKeyInput.value = savedNvidiaKey;
            updateSingleBadge(nvidiaKeyBadge, savedNvidiaKey);
        }
        if (groqKeyInput && savedGroqKey) {
            groqKeyInput.value = savedGroqKey;
            updateSingleBadge(groqKeyBadge, savedGroqKey);
        }
        if (apiKeyInput && savedGeminiKey) {
            apiKeyInput.value = savedGeminiKey;
            updateSingleBadge(keyBadge, savedGeminiKey);
        }

        // Fetch missing keys from Firebase settings
        db.ref('settings').once('value', (snap) => {
            const val = snap.val() || {};
            if (val.nvidia_api_key && !savedNvidiaKey) {
                savedNvidiaKey = val.nvidia_api_key;
                if (nvidiaKeyInput) nvidiaKeyInput.value = savedNvidiaKey;
                localStorage.setItem('johorn_nvidia_api_key', savedNvidiaKey);
                updateSingleBadge(nvidiaKeyBadge, savedNvidiaKey);
            }
            if (val.groq_api_key && !savedGroqKey) {
                savedGroqKey = val.groq_api_key;
                if (groqKeyInput) groqKeyInput.value = savedGroqKey;
                localStorage.setItem('johorn_groq_api_key', savedGroqKey);
                updateSingleBadge(groqKeyBadge, savedGroqKey);
            }
            if (val.gemini_api_key && !savedGeminiKey) {
                savedGeminiKey = val.gemini_api_key;
                if (apiKeyInput) apiKeyInput.value = savedGeminiKey;
                localStorage.setItem('johorn_gemini_api_key', savedGeminiKey);
                updateSingleBadge(keyBadge, savedGeminiKey);
            }
        });

        // Save All Keys Handler
        if (saveAllKeysBtn) {
            saveAllKeysBtn.addEventListener('click', () => {
                const nKey = nvidiaKeyInput ? nvidiaKeyInput.value.trim() : '';
                const gKey = groqKeyInput ? groqKeyInput.value.trim() : '';
                const mKey = apiKeyInput ? apiKeyInput.value.trim() : '';

                if (nKey) localStorage.setItem('johorn_nvidia_api_key', nKey);
                if (gKey) localStorage.setItem('johorn_groq_api_key', gKey);
                if (mKey) localStorage.setItem('johorn_gemini_api_key', mKey);

                updateSingleBadge(nvidiaKeyBadge, nKey);
                updateSingleBadge(groqKeyBadge, gKey);
                updateSingleBadge(keyBadge, mKey);

                const updates = {};
                if (nKey) updates['settings/nvidia_api_key'] = nKey;
                if (gKey) updates['settings/groq_api_key'] = gKey;
                if (mKey) updates['settings/gemini_api_key'] = mKey;

                db.ref().update(updates)
                    .then(() => alert('API 키가 안전하게 저장 및 동기화되었습니다!'))
                    .catch(err => {
                        console.warn('Firebase key sync error:', err);
                        alert('API 키가 브라우저에 안전하게 저장되었습니다.');
                    });
            });
        }

        // Toggle Key Visibilities
        function setupToggleVisibility(btn, input, iconId) {
            if (!btn || !input) return;
            btn.addEventListener('click', () => {
                const eye = document.getElementById(iconId);
                if (input.type === 'password') {
                    input.type = 'text';
                    if (eye) eye.className = 'fa-solid fa-eye-slash';
                } else {
                    input.type = 'password';
                    if (eye) eye.className = 'fa-solid fa-eye';
                }
            });
        }
        setupToggleVisibility(toggleNvidiaKeyBtn, nvidiaKeyInput, 'nvidiaEyeIcon');
        setupToggleVisibility(toggleGroqKeyBtn, groqKeyInput, 'groqEyeIcon');
        setupToggleVisibility(toggleKeyBtn, apiKeyInput, 'apiKeyEyeIcon');

        // Modal Open / Close
        if (openBtn && aiModal) {
            openBtn.addEventListener('click', () => {
                aiModal.style.display = 'flex';
                // Reset progress and results on open if needed
                if (!currentGeneratedPost && resultArea) {
                    resultArea.style.display = 'none';
                }
            });
        }

        const closeAiModal = () => { if (aiModal) aiModal.style.display = 'none'; };
        if (closeBtn) closeBtn.addEventListener('click', closeAiModal);

        // Topic Chips Selection
        topicChips.forEach(chip => {
            chip.addEventListener('click', () => {
                topicChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                if (categorySelect && chip.dataset.cat) categorySelect.value = chip.dataset.cat;
                if (topicInput && chip.dataset.topic) topicInput.value = chip.dataset.topic;
                if (keywordsInput && chip.dataset.keywords) keywordsInput.value = chip.dataset.keywords;
            });
        });

        // Special Instruction Preset Chips
        instructionChips.forEach(chip => {
            chip.addEventListener('click', () => {
                if (!instructionsInput) return;
                const inst = chip.dataset.inst || '';
                if (!inst) return;
                if (!instructionsInput.value.trim()) {
                    instructionsInput.value = inst;
                } else if (!instructionsInput.value.includes(inst)) {
                    instructionsInput.value += `\n- ${inst}`;
                }
            });
        });

        // OpenAI-Compatible Generator (NVIDIA NIM via Proxy to bypass CORS, Groq Cloud)
        async function callOpenAICompatible({ endpoint, apiKey, model, prompt, providerName }) {
            const payload = {
                model: model,
                messages: [
                    {
                        role: "system",
                        content: "당신은 말레이시아 조호바루(Johor Bahru) 현지 6년 거주 전문성을 보유한 네이버 프리미엄 블로그 및 구글/AEO 최고 수준의 전문 에디터입니다. 지리 및 정보의 정확성이 최우선이며, 반드시 요청된 JSON 포맷으로만 답변하세요."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.5,
                max_tokens: 4096
            };

            let res;
            const isNvidia = endpoint.includes('nvidia.com') || providerName === 'NVIDIA';

            // Non-reasoning models support json_object mode (exclude NVIDIA NIM endpoints which reject generic json_object)
            if (!isNvidia && !model.includes('deepseek') && !model.includes('r1')) {
                payload.response_format = { type: "json_object" };
            }

            // NVIDIA Build API does not send browser CORS headers. Route through Vercel serverless proxy.
            if (isNvidia) {
                const proxyUrl = (window.location && window.location.hostname && window.location.hostname.includes('johorn.kr'))
                    ? '/api/ai-proxy'
                    : 'https://www.johorn.kr/api/ai-proxy';

                try {
                    res = await fetch(proxyUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ endpoint, apiKey, payload })
                    });
                } catch (proxyErr) {
                    console.warn('NVIDIA proxy call failed, attempting direct fetch:', proxyErr.message);
                }
            }

            // Direct fetch (for Groq Cloud or fallback)
            if (!res) {
                res = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify(payload)
                });
            }

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                const errMsg = errData.error?.message || errData.message || res.statusText;
                const err = new Error(`[${providerName} ${model}] (${res.status}): ${errMsg}`);
                err.status = res.status;
                err.provider = providerName;
                throw err;
            }

            const data = await res.json();
            let text = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning_content || '';
            // Strip DeepSeek reasoning tags if present
            text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
            return text;
        }

        // Google Gemini Generator
        async function callGeminiApi({ apiKey, model, prompt }) {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const textRes = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 8192,
                        responseMimeType: 'application/json'
                    }
                })
            });

            if (!textRes.ok) {
                const errData = await textRes.json().catch(() => ({}));
                const errMsg = errData.error ? errData.error.message : textRes.statusText;
                const err = new Error(`[Google Gemini ${model}] (${textRes.status}): ${errMsg}`);
                err.status = textRes.status;
                err.provider = 'Gemini';
                throw err;
            }

            const textData = await textRes.json();
            return textData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }

        // Generate Post Execution
        async function runGeneration() {
            const geminiKey = (apiKeyInput ? apiKeyInput.value.trim() : '') || localStorage.getItem('johorn_gemini_api_key') || '';
            const nvidiaKey = (nvidiaKeyInput ? nvidiaKeyInput.value.trim() : '') || localStorage.getItem('johorn_nvidia_api_key') || '';

            if (!geminiKey && !nvidiaKey) {
                alert('AI 글 생성을 위해 API 키(Google AI Studio 또는 NVIDIA Build)를 상단에 입력하고 저장해 주세요.\n(특히 조호바루 현지 팩트 일치도와 신뢰성이 가장 높은 Google AI Studio 키를 적극 권장합니다)');
                if (apiKeyInput) apiKeyInput.focus();
                return;
            }

            const topic = topicInput ? topicInput.value.trim() : '';
            if (!topic) {
                alert('작성할 블로그 글의 주제 또는 제목을 입력해 주세요.');
                if (topicInput) topicInput.focus();
                return;
            }

            const category = categorySelect ? categorySelect.value : '국제학교';
            const keywords = keywordsInput ? keywordsInput.value.trim() : '';
            const instructions = instructionsInput ? instructionsInput.value.trim() : '';
            const writingStyle = (writingStyleSelect && writingStyleSelect.value) ? writingStyleSelect.value : 'dynamic';
            const imageSourceMode = (imageSourceModeSelect && imageSourceModeSelect.value) ? imageSourceModeSelect.value : 'smart_photo';
            const textModel = (textModelSelect && textModelSelect.value) ? textModelSelect.value : 'gemini/gemini-3.6-flash';
            const imageModel = (imageModelSelect && imageModelSelect.value) ? imageModelSelect.value : 'imagen-3.0-generate-002';
            const imageStyle = imageStyleSelect ? imageStyleSelect.value : 'photorealistic';

            // UI State: Loading Progress
            startBtn.disabled = true;
            startBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 생성 중...';
            if (resultArea) resultArea.style.display = 'none';
            if (progressBox) progressBox.style.display = 'block';
            if (progressBar) progressBar.style.width = '20%';
            if (progressStepText) progressStepText.textContent = `다채로운 스토리텔링과 현지 팩트 기반 콘텐츠 엔진을 준비 중입니다...`;

            try {
                // Style directive according to writingStyle
                let styleDirective = '';
                if (writingStyle === 'story') {
                    styleDirective = `
[★ 글 전개 방식: 생생한 현장 체험 & 후기형 스토리텔링]
- 전형적인 AI 개요식 설명문을 탈피하세요. 학부모나 현지 거주자가 실제 발로 뛰며 체감한 생생한 에피소드로 글을 시작하세요.
- 교문에 들어섰을 때의 첫인상, 아이의 반응, 현지 날씨와 거리 분위기, 겪었던 시행착오 등을 따뜻한 1인칭 관찰자 어조로 풀어내어 독자의 깊은 공감을 이끌어내세요.
- 억지스러운 FAQ나 정형화된 서식 대신, 이야기의 자연스러운 호흡 속에 실질적인 팁과 유용한 팩트를 유기적으로 녹여내세요.`;
                } else if (writingStyle === 'qna') {
                    styleDirective = `
[★ 글 전개 방식: 솔직 담백한 고민 해결형 (궁금증 즉답 & 공감)]
- 학부모나 이주를 고민하는 분들이 밤마다 맘카페나 검색창을 두드리며 가장 불안해하는 현실적인 질문 하나(예: "영어를 못하는 아이인데 국제학교 입학이 진짜 될까요?", "현지 치안이나 병원은 안전할까요?")를 서두에 던지며 시작하세요.
- 겉치레나 막연한 장점만 나열하지 말고, 6년 차 현지 실무자의 입장에서 현실적인 한계와 이를 극복하는 구체적인 해법을 시원하고 솔직하게 제시하세요.`;
                } else if (writingStyle === 'practical') {
                    styleDirective = `
[★ 글 전개 방식: 실속 비교 & 알짜 팩트 집중형]
- 미사여구를 줄이고, 독자가 실제로 메모하고 스크랩해두고 싶을 만큼 실용적인 팩트와 가이드에 집중하세요.
- 학비(RM 및 한화 환산), 커리큘럼별 차이점, 비자 수속 단계별 필수 서류 등 명확한 수치와 체크리스트 형태로 군더더기 없이 깔끔하게 정리하세요.`;
                } else if (writingStyle === 'column') {
                    styleDirective = `
[★ 글 전개 방식: 따뜻한 현지 라이프 에세이 / 친근한 대화형 컬럼]
- 독자와 조호바루의 한적한 카페 테라스에 마주 앉아 따뜻한 커피 한 잔 나누며 이야기하듯 친근하고 다정한 문체로 작성하세요.
- 여유로운 일상의 풍경, 아이들이 자연 속에서 웃는 모습, 현지에서의 삶에 대한 진솔한 생각들을 곁들여 마음에 와닿는 여운을 남겨주세요.`;
                } else {
                    styleDirective = `
[★ 글 전개 방식: 자유로운 현지 전문 에디터 톤 (다채롭고 매력적인 맞춤 흐름)]
- 모든 글이 똑같은 템플릿(H1 -> 1줄요약 -> 소제목3개 -> FAQ -> CTA)으로 찍혀 나오는 기계적이고 지루한 구조를 엄격히 금지합니다!
- 주제의 성격에 맞추어 가장 몰입도 높고 흥미로운 독자 맞춤형 흐름(호기심을 끄는 질문, 현장 스케치, 솔직한 현실 조언 등)을 자유롭게 구성하세요.
- FAQ나 소제목 개수도 획일화하지 말고 글의 자연스러운 흐름에 맞춰 필요한 부분만 유기적으로 배치하세요.`;
                }

                // Domain knowledge injection
                let categoryDomainFacts = '';
                if (category === '국제학교') {
                    categoryDomainFacts = `
[조호바루 국제학교 전문 팩트 가이드]
- 명문 학교군: 말보로 칼리지 말레이시아(MCM, 영국 정통 명문), 래플스 아메리칸 스쿨(RAS, 미국 커리큘럼/보딩), 썬웨이 국제학교(SIS, 캐나다 온타리오/IB), 크레센도-HELP(영국계 높은 가성비 명문), 페어뷰(Fairview, IB 월드스쿨), 텐비(Tenby).
- 학비 실무 감각: 프리미엄(말보로/래플스: 연간 약 RM 60,000 ~ 120,000+), 준프리미엄(썬웨이/크레센도: 연간 약 RM 25,000 ~ 55,000), 가성비형(연간 약 RM 15,000 ~ 25,000).
- 입학 절차: 여권, 최근 2~3년 영문 생활기록부, CAT4 인지능력검사, 영어/수학 필기 및 인터뷰, 조호엔의 100% 입학 오퍼레터 수령 노하우.`;
                } else if (category === '이주정착') {
                    categoryDomainFacts = `
[조호바루 이주정착 전문 팩트 가이드]
- 비자: 학생비자(Student Pass, 학교 입학 후 발급), 가디언비자(학부모 1인 동반, 출생증명서/가족관계증명서 영문 번역공증 및 외교부/아포스티유 인증 필수).
- 정착 인프라: 현지 은행 계좌 개설, Touch 'n Go 전자지갑, TIME/Unifi 광인터넷 설치, 국제운전면허증 및 현지 차량 렌트/구매 노하우.`;
                } else if (category === '숙소여행') {
                    categoryDomainFacts = `
[조호바루 숙소 & 여행 전문 팩트 가이드]
- 티가 레지던스(Teega Residence): 푸테리하버 도보 3분 초역세권, 요트 마리나 오션뷰, 에듀시티 국제학교 통학 8~12분.
- 조호엔 직영 프리미엄: 전 세대 대용량 올필터(수질정화 시스템 - 샤워실/싱크대 수질 완벽 케어), 한국 실시간 TV 셋톱박스 완비, 주 1회 정기 클리닝 및 침구 세탁 서비스.`;
                } else if (category === '생활정보') {
                    categoryDomainFacts = `
[조호바루 생활정보 전문 팩트 가이드]
- 병원/의료: 글렌이글스 메디니(Gleneagles Medini, 최첨단 시설, 24시간 응급실), 컬럼비아 아시아(Columbia Asia).
- 쇼핑/마트: 썬웨이 빅박스(Sunway Big Box, 대형 창고형 마트), 부킷인다 이온몰(AEON Bukit Indah), 스쿠다이 수트라 몰(Sutera Mall - 코타키나발루 수트라하버와 혼동 절대 금지).
- 국경 이동: 싱가포르 투아스(Second Link) 체크포인트 연계, 우드랜즈 코즈웨이 이동 팁.`;
                }

                // ── STEP 1: Multi-Provider Text Generation with Smart Failover ──
                const promptContent = `
당신은 말레이시아 조호바루 전문 이주정착 & 국제학교 컨설팅 및 Teega Residence 숙소 운영 전문 브랜드 "조호엔(JohorN)"의 수석 콘텐츠 에디터이자 AEO/GEO 검색 최적화 최고 전문가입니다.

[블로그 발행 정보]
- 글 주제 / 메인 타이틀 키워드: ${topic}
- 카테고리: ${category}
- 주요 타겟 키워드: ${keywords || '조호바루 한달살기, 국제학교 입학상담, 말레이시아 조호바루'}

${instructions ? `[★ 작성 시 특별 요청 / 제약사항 (최우선 반영 지침)]\n${instructions}\n\n※ 위 특별 요청사항은 다른 어떤 지침보다 최우선하여 반드시 100% 반영되어야 합니다!\n(예: 숙소 언급 배제 요청 시 숙소 관련 내용 및 상담 유도는 본문/CTA에서 완전히 제외할 것)\n` : ''}

${styleDirective}

${categoryDomainFacts}

[글 작성 원칙 (AEO/GEO 검색 최적화 & 고품질 가독성)]
1. 톤앤매너: 
   - 전문가의 신뢰성과 실제 현지 거주자의 생생하고 따뜻한 어조를 유지하세요 (말레이시아 조호바루 6년 거주 팩트 기반).
   - 기계적이고 틀에 박힌 AI 말투("~에 대해 알아보았습니다", "지금까지 ~였습니다" 등)를 철저히 배제하고 사람처럼 자연스러운 호흡으로 전개하세요.
2. 구조 및 서식의 자유도 극대화:
   - 천편일률적인 서론-본론-결론(<h2> 3개) 구조를 강제하지 마세요! 글의 주제와 '전개 방식' 지침에 따라 가장 몰입하기 좋은 형태(대화체, Q&A 형식, 에세이 형식, 정보나열 등)로 HTML 구조를 다채롭게 변형하세요.
   - [본문 서식 필수 규칙] <table>(HTML 표) 태그는 절대 금지! 수치와 비교 정보는 단락(<p>)과 불릿 기호(•/<ul>), 굵은 글씨(<strong>)를 활용해 세련되게 정리하세요.
   - 단계 번호는 <strong>1단계: ...</strong> 바로 뒤에 대시(-)나 콜론(:)을 넣어 글자가 붙지 않도록 작성하세요.
   - 마지막 콜투액션(CTA): 주제에 맞는 맞춤형 1:1 상담 안내 박스 (<div class="post-cta-card" style="background:#FAF8F5; border:1px solid #E5E0D8; border-radius:8px; padding:20px; margin-top:30px;">...</div>) (※ 숙소 배제 지시가 있는 경우 숙소 언급 없이 주제와 관련된 상담으로만 유도할 것)
3. 썸네일 이미지 프롬프트 (imagePrompt) 생성 규칙:
   - 본문의 핵심 주제를 정확히 시각화하는 고해상도 실사 사진(photorealistic) 영문 프롬프트를 작성하세요.
   - 피사체, 배경, 조명, 구도(예: wide angle, cinematic lighting)를 매우 구체적으로 묘사하세요.
   - ★ [중요] 이미지에 텍스트, 글자, 워터마크가 생성되지 않도록 지시하세요 (No text, no letters).
   - ★ [중요] 푸테리하버 숙소 글이 아닌 경우, 프롬프트에 'Puteri Harbour'나 'marina'를 절대 넣지 말고 주제에 맞는 다른 장소(학교, 카페, 병원 등)를 묘사하세요.

[조호엔 현지 전문성 및 팩트체크 필수 지침 (허위 사실 엄격 금지)]
- 허위 정보(Hallucination) 절대 금지: 존재하지 않는 학교명, 가짜 병원명, 임의의 수치(거짓 학비 등)를 지어내지 마세요. 확실한 정보만 작성하세요.
- 지리적 정확성: '수트라' 관련 내용은 코타키나발루의 '수트라하버'가 아니라 조호바루 스쿠다이의 '수트라 몰(Sutera Mall)' 및 '수트라 우타마(Sutera Utama)' 중심 상권입니다.
- 푸테리하버(Puteri Harbour): 안전하고 깨끗한 해안 신도시로 티가 레지던스, 요트 마리나, 레고랜드 및 국제학교 접근성이 뛰어납니다.
- 티가 레지던스: 조호엔이 직접 운영하는 풀필터(올필터 수질정화 시스템), 한국 실시간 방송, 전담 클리닝이 완비된 최고 인기 숙소입니다.
- 에듀시티/이스칸다르 푸테리: 말보로 칼리지, 래플스 아메리칸 스쿨 등 영국/미국 명문 국제학교가 밀집해 있습니다.
- 맹목적인 과장이나 잘못된 지명 정보를 배제하고 6년 현지 거주 실무 노하우 기반의 진짜 정보만 제공하세요.

[출력 형식]
반드시 아래 JSON 형식 그대로만 출력하세요 (Markdown 코드 블록 기호 없이 순수 JSON만):
{
  "title": "게시글 제목",
  "summary": "1~2줄 핵심 요약 문장",
  "imagePrompt": "A high-resolution editorial photograph of [specific subject related to this article], warm natural lighting, highly detailed, 8k",
  "contentHtml": "<h2>...</h2><p>...</p>..."
}
`;

                // Build multi-provider failover execution plan
                const executionPlan = [];

                if (textModel.startsWith('gemini/')) {
                    const modelName = textModel.replace('gemini/', '');
                    if (geminiKey) {
                        executionPlan.push({
                            provider: 'GEMINI',
                            model: modelName,
                            apiKey: geminiKey,
                            label: `Google ${modelName} (최고 신뢰성 & 팩트 일치 ⭐️)`
                        });
                        if (modelName !== 'gemini-3.6-flash') {
                            executionPlan.push({
                                provider: 'GEMINI',
                                model: 'gemini-3.6-flash',
                                apiKey: geminiKey,
                                label: 'Google Gemini 3.6 Flash (안정형 고정밀 백업 ⭐️)'
                            });
                        }
                    }
                    // Failover: NVIDIA Meta Llama 3.3 70B if available
                    if (nvidiaKey) {
                        executionPlan.push({
                            provider: 'NVIDIA',
                            endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
                            model: 'meta/llama-3.3-70b-instruct',
                            apiKey: nvidiaKey,
                            label: 'NVIDIA Meta Llama 3.3 70B (고지능 백업 ⭐️)'
                        });
                    }
                } else if (textModel.startsWith('nvidia/')) {
                    const modelName = textModel.replace('nvidia/', '');
                    if (nvidiaKey) {
                        executionPlan.push({
                            provider: 'NVIDIA',
                            endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
                            model: modelName,
                            apiKey: nvidiaKey,
                            label: `NVIDIA ${modelName}`
                        });
                    }
                    // 1차 백업: Google Gemini (최고 정확도 / 현지 정보 완벽 / 안정형)
                    if (geminiKey) {
                        executionPlan.push({
                            provider: 'GEMINI',
                            model: 'gemini-3.6-flash',
                            apiKey: geminiKey,
                            label: 'Google Gemini 3.6 Flash (고정밀 백업 ⭐️)'
                        });
                    }
                } else {
                    // Default fallback
                    if (geminiKey) {
                        executionPlan.push({
                            provider: 'GEMINI',
                            model: 'gemini-3.6-flash',
                            apiKey: geminiKey,
                            label: 'Google Gemini 3.6 Flash (기본 추천 ⭐️)'
                        });
                    }
                    if (nvidiaKey) {
                        executionPlan.push({
                            provider: 'NVIDIA',
                            endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
                            model: 'meta/llama-3.3-70b-instruct',
                            apiKey: nvidiaKey,
                            label: 'NVIDIA Meta Llama 3.3 70B'
                        });
                    }
                }

                if (executionPlan.length === 0) {
                    throw new Error('선택하신 AI 모델을 호출할 수 있는 API 키가 없습니다. 상단에서 해당 프로바이더 키를 등록해 주세요.');
                }

                let rawText = '';
                const stepErrors = [];

                for (let i = 0; i < executionPlan.length; i++) {
                    const step = executionPlan[i];
                    try {
                        if (progressStepText) {
                            if (i === 0) {
                                progressStepText.textContent = `${step.label} 엔진이 최고 품질 본문과 Q&A를 작성 중입니다...`;
                            } else {
                                progressStepText.textContent = `이전 엔진 오류로 ${step.label} 엔진으로 자동 전환하여 작성 중입니다...`;
                            }
                        }

                        if (step.provider === 'NVIDIA' || step.provider === 'GROQ') {
                            rawText = await callOpenAICompatible({
                                endpoint: step.endpoint,
                                apiKey: step.apiKey,
                                model: step.model,
                                prompt: promptContent,
                                providerName: step.provider
                            });
                        } else if (step.provider === 'GEMINI') {
                            rawText = await callGeminiApi({
                                apiKey: step.apiKey,
                                model: step.model,
                                prompt: promptContent
                            });
                        }

                        if (rawText && rawText.trim()) {
                            break;
                        }
                    } catch (err) {
                        stepErrors.push(`[${step.label}] ${err.message || err}`);
                        console.warn(`Execution step ${i} (${step.label}) failed:`, err.message || err);
                    }
                }

                if (!rawText) {
                    const errorDetails = stepErrors.length > 0 ? '\n\n[상세 오류 내역]\n' + stepErrors.join('\n') : '';
                    throw new Error(`모든 AI 엔진 호출에 실패했습니다.${errorDetails}\n\nAPI 키 및 크레딧 상태를 확인해 주세요.`);
                }

                // Strip possible markdown fences
                let cleanText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

                let parsedJson = null;

                // 1st attempt: direct JSON.parse
                try {
                    parsedJson = JSON.parse(cleanText);
                } catch (pe1) {
                    console.warn('Direct JSON parse failed, trying brace extraction:', pe1.message);
                }

                // 2nd attempt: find outermost { ... }
                if (!parsedJson) {
                    const firstBrace = cleanText.indexOf('{');
                    const lastBrace = cleanText.lastIndexOf('}');
                    if (firstBrace !== -1 && lastBrace > firstBrace) {
                        try {
                            parsedJson = JSON.parse(cleanText.substring(firstBrace, lastBrace + 1));
                        } catch (pe2) {
                            console.warn('Block JSON parse failed, trying sanitized parse:', pe2.message);
                        }
                    }
                }

                // 3rd attempt: Fix unescaped control characters/newlines inside string literals and trailing commas
                if (!parsedJson) {
                    try {
                        const firstBrace = cleanText.indexOf('{');
                        const lastBrace = cleanText.lastIndexOf('}');
                        let s = (firstBrace !== -1 && lastBrace > firstBrace) ? cleanText.substring(firstBrace, lastBrace + 1) : cleanText;
                        s = s.replace(/,\s*([\]}])/g, '$1');

                        let inString = false;
                        let escaped = false;
                        let fixed = '';
                        for (let i = 0; i < s.length; i++) {
                            const ch = s[i];
                            if (escaped) {
                                fixed += ch;
                                escaped = false;
                                continue;
                            }
                            if (ch === '\\') {
                                fixed += ch;
                                escaped = true;
                                continue;
                            }
                            if (ch === '"') {
                                inString = !inString;
                                fixed += ch;
                                continue;
                            }
                            if (inString) {
                                if (ch === '\n') {
                                    fixed += '\\n';
                                    continue;
                                }
                                if (ch === '\r') {
                                    fixed += '\\r';
                                    continue;
                                }
                                if (ch === '\t') {
                                    fixed += '\\t';
                                    continue;
                                }
                            }
                            fixed += ch;
                        }
                        parsedJson = JSON.parse(fixed);
                    } catch (pe3) {
                        console.warn('Escaped JSON parse failed, falling back to field extraction:', pe3.message);
                    }
                }

                // 4th attempt: Non-destructive field extraction fallback
                if (!parsedJson || typeof parsedJson !== 'object' || !parsedJson.contentHtml) {
                    console.warn('Extracting article fields via safe non-destructive extraction');
                    const extractField = (key, text) => {
                        const startMarker = `"${key}"`;
                        const startIdx = text.indexOf(startMarker);
                        if (startIdx === -1) return '';
                        const colonIdx = text.indexOf(':', startIdx + startMarker.length);
                        if (colonIdx === -1) return '';
                        const openQuote = text.indexOf('"', colonIdx + 1);
                        if (openQuote === -1) return '';

                        let val = '';
                        let escaped = false;
                        for (let i = openQuote + 1; i < text.length; i++) {
                            const ch = text[i];
                            if (escaped) {
                                val += ch;
                                escaped = false;
                                continue;
                            }
                            if (ch === '\\') {
                                escaped = true;
                                continue;
                            }
                            if (ch === '"') {
                                const rest = text.substring(i + 1).trim();
                                if (rest.startsWith(',') || rest.startsWith('}')) {
                                    return val;
                                }
                            }
                            val += ch;
                        }
                        return val;
                    };

                    const title = (parsedJson && parsedJson.title) || extractField('title', cleanText) || topic;
                    const summary = (parsedJson && parsedJson.summary) || extractField('summary', cleanText) || `${topic}에 대한 조호엔의 유용한 안내와 정보입니다.`;
                    const imagePrompt = (parsedJson && parsedJson.imagePrompt) || extractField('imagePrompt', cleanText) || `${topic}, Puteri Harbour Johor Bahru, ultra high quality`;
                    let contentHtml = (parsedJson && parsedJson.contentHtml) || extractField('contentHtml', cleanText);

                    if (!contentHtml) {
                        let fallbackBody = cleanText
                            .replace(/"?(?:title|summary|imagePrompt)"?\s*:\s*"[^"]*"/gi, '')
                            .replace(/[{}\[\]"]/g, '')
                            .trim();
                        if (fallbackBody) {
                            contentHtml = `<p>${fallbackBody.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
                        } else {
                            contentHtml = `<h2>${title}</h2><p>${summary}</p>`;
                        }
                    }

                    parsedJson = {
                        title: title.trim(),
                        summary: summary.trim(),
                        imagePrompt: imagePrompt.trim(),
                        contentHtml: contentHtml.trim()
                    };
                }

                if (progressBar) progressBar.style.width = '65%';

                // ── STEP 2: Strategic Visual Image Handling ──
                let finalThumbnail = '';
                const queryForImage = `${topic} ${keywords} ${category} ${parsedJson.title || ''}`;

                if (imageSourceMode === 'smart_photo') {
                    if (progressStepText) progressStepText.textContent = '글 주제와 100% 일치하는 조호엔 고화질 실사 사진을 매칭하고 있습니다...';
                    if (progressBar) progressBar.style.width = '85%';
                    const matched = getSmartThemedImage(queryForImage + ' ' + (parsedJson.imagePrompt || ''), category, imageStyle);
                    finalThumbnail = matched.url;
                } else if (imageSourceMode === 'ai_imagen') {
                    if (progressStepText) progressStepText.textContent = 'Google Imagen 엔진으로 글 주제에 맞춘 AI 실사 이미지를 생성 중입니다...';
                    if (progressBar) progressBar.style.width = '80%';

                    // Compose dynamic, context-accurate image prompt
                    let cleanImgPrompt = (parsedJson.imagePrompt && parsedJson.imagePrompt.length > 15)
                        ? parsedJson.imagePrompt.trim()
                        : '';

                    if (!cleanImgPrompt) {
                        if (category === '국제학교') {
                            cleanImgPrompt = 'High-resolution realistic photograph of modern British international school campus, students with backpacks in bright hallway, palm trees, sunny day, 8k';
                        } else if (category === '이주정착') {
                            cleanImgPrompt = 'Warm aesthetic professional office consultation desk with passport, international visa paperwork, coffee cup, laptop, 8k';
                        } else if (category === '숙소여행') {
                            cleanImgPrompt = 'Spacious modern luxury apartment living room, large panoramic windows, warm afternoon sunlight, clean interior, 8k';
                        } else if (category === '생활정보') {
                            cleanImgPrompt = 'Vibrant modern city street and aesthetic cafe in sunny Johor Bahru, tropical atmosphere, relaxed lifestyle, 8k';
                        } else {
                            cleanImgPrompt = 'Clean modern lifestyle scene in sunny Johor Bahru Malaysia, authentic high resolution photograph, 8k';
                        }
                    }

                    // Append visual style modifier
                    if (imageStyle === 'warm_interior') {
                        cleanImgPrompt += ', warm ambient indoor lighting, cozy interior aesthetic, architectural detail';
                    } else if (imageStyle === 'sunny_aerial') {
                        cleanImgPrompt += ', aerial drone perspective, bright blue sky, clear tropical sunlight';
                    } else if (imageStyle === 'modern_editorial') {
                        cleanImgPrompt += ', magazine editorial photography, clean sharp focus, Leica color tone';
                    } else {
                        cleanImgPrompt += ', realistic photograph, natural cinematic light, highly detailed 8k';
                    }

                    if (geminiKey) {
                        const candidateImgModels = [imageModel, 'imagen-3.0-generate-002'];
                        const uniqueImgModels = [...new Set(candidateImgModels)];

                        for (const curImgModel of uniqueImgModels) {
                            try {
                                if (progressStepText) progressStepText.textContent = `${curImgModel} 이미지를 렌더링하고 있습니다...`;
                                const imgUrl = `https://generativelanguage.googleapis.com/v1beta/models/${curImgModel}:predict?key=${geminiKey}`;
                                const imgRes = await fetch(imgUrl, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        instances: [{ prompt: cleanImgPrompt }],
                                        parameters: {
                                            sampleCount: 1,
                                            aspectRatio: "16:9"
                                        }
                                    })
                                });

                                if (imgRes.ok) {
                                    const imgData = await imgRes.json();
                                    const b64 = imgData.predictions?.[0]?.bytesBase64Encoded;
                                    if (b64) {
                                        finalThumbnail = `data:image/jpeg;base64,${b64}`;
                                        break;
                                    }
                                } else {
                                    console.warn(`Image model ${curImgModel} failed (${imgRes.status}), fallback...`);
                                }
                            } catch (imgErr) {
                                console.warn(`Image generation fetch error for ${curImgModel}:`, imgErr);
                            }
                        }
                    }

                    // Fallback to smart photo if AI generation fails or no Gemini key provided
                    if (!finalThumbnail) {
                        console.info('Imagen generation not available or failed; using smart themed real photo match.');
                        const fallbackMatched = getSmartThemedImage(queryForImage + ' ' + (parsedJson.imagePrompt || ''), category, imageStyle);
                        finalThumbnail = fallbackMatched.url;
                    }
                } else {
                    // imageSourceMode === 'none'
                    finalThumbnail = '';
                }

                // ── STEP 3: Render Result & Live Preview ──
                if (progressBar) progressBar.style.width = '100%';
                if (progressStepText) progressStepText.textContent = '생성이 성공적으로 완료되었습니다!';

                currentGeneratedPost = {
                    title: parsedJson.title || topic,
                    category: category,
                    summary: parsedJson.summary || '',
                    thumbnail: finalThumbnail,
                    contentHtml: parsedJson.contentHtml || '<p>내용이 생성되었습니다.</p>'
                };

                // Populate Preview Card
                if (previewTitle) previewTitle.textContent = currentGeneratedPost.title;
                if (previewCatBadge) previewCatBadge.textContent = currentGeneratedPost.category;
                if (previewSummary) previewSummary.textContent = currentGeneratedPost.summary;
                if (previewBody) previewBody.innerHTML = currentGeneratedPost.contentHtml;

                if (previewThumbImg && previewThumbPlaceholder) {
                    if (finalThumbnail) {
                        previewThumbImg.src = finalThumbnail;
                        previewThumbImg.style.display = 'block';
                        previewThumbPlaceholder.style.display = 'none';
                    } else {
                        previewThumbImg.style.display = 'none';
                        previewThumbPlaceholder.style.display = 'block';
                    }
                }

                setTimeout(() => {
                    if (progressBox) progressBox.style.display = 'none';
                    if (resultArea) resultArea.style.display = 'block';
                    startBtn.disabled = false;
                    startBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> AI 멀티미디어 글 &amp; 이미지 생성하기';
                }, 500);

            } catch (err) {
                console.error('AI Generation Failed:', err);
                alert(`AI 글 생성 중 오류가 발생했습니다:\n${err.message}`);
                if (progressBox) progressBox.style.display = 'none';
                startBtn.disabled = false;
                startBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> AI 멀티미디어 글 &amp; 이미지 생성하기';
            }
        }

        if (startBtn) startBtn.addEventListener('click', runGeneration);
        if (regenBtn) regenBtn.addEventListener('click', runGeneration);

        // Apply to Editor Handler (Transfer AI result into main Quill editor)
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                if (!currentGeneratedPost) return;

                // Close AI generator modal
                if (aiModal) aiModal.style.display = 'none';

                // Populate Post Modal Form
                const postModal = document.getElementById('postModal');
                const modalTitle = document.getElementById('postModalTitle');
                const editId = document.getElementById('editPostId');
                const titleInput = document.getElementById('postTitleInput');
                const catInput = document.getElementById('postCatInput');
                const authorInput = document.getElementById('postAuthorInput');
                const statusInput = document.getElementById('postStatusInput');
                const thumbInput = document.getElementById('postThumbInput');
                const summaryInput = document.getElementById('postSummaryInput');

                if (modalTitle) modalTitle.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles" style="color: #7C3AED;"></i> AI 생성 글 검토 &amp; 편집';
                if (editId) editId.value = '';
                if (titleInput) titleInput.value = currentGeneratedPost.title;
                if (catInput) catInput.value = currentGeneratedPost.category;
                if (authorInput) authorInput.value = '조호엔';
                if (statusInput) statusInput.value = 'published';
                if (thumbInput) thumbInput.value = currentGeneratedPost.thumbnail;
                if (summaryInput) summaryInput.value = currentGeneratedPost.summary;

                // Open postModal FIRST so Quill has visible layout dimensions
                if (postModal) {
                    postModal.style.display = 'flex';
                    postModal.scrollIntoView({ behavior: 'smooth' });
                }

                // If currently in HTML source mode, reset to visual mode
                if (isHtmlSourceMode && toggleHtmlBtn) {
                    toggleHtmlBtn.click();
                }

                const rawHtml = currentGeneratedPost.contentHtml || '<p>내용이 생성되었습니다.</p>';
                if (htmlTextarea) {
                    htmlTextarea.value = rawHtml;
                }

                if (quill) {
                    const safeHtml = typeof htmlToQuillSafe === 'function' ? htmlToQuillSafe(rawHtml) : rawHtml;
                    quill.root.innerHTML = safeHtml;
                    quill.update();
                }

                updateThumbPreview(currentGeneratedPost.thumbnail, 'AI 자동 생성 이미지');

                alert('AI 생성 글이 에디터에 100% 온전히 반영되었습니다!\n내용을 검토하신 후 [저장하기]를 누르면 블로그에 즉시 발행됩니다.');
            });
        }
    }

    // ── 7. In-Editor AI Image Studio Module (Imagen 3 & Gemini Optimization) ──
    function initEditorAiImageGenerator() {
        const editorAiModal = document.getElementById('editorAiImageModal');
        const closeBtn = document.getElementById('closeEditorAiImgModalBtn');
        const openThumbBtn = document.getElementById('openThumbAiModalBtn');
        const openEditorBtn = document.getElementById('openEditorAiImgModalBtn');
        const promptInput = document.getElementById('editorAiImgPrompt');
        const presetChips = document.querySelectorAll('#editorAiImgPresetChips .preset-chip');
        const styleSelect = document.getElementById('editorAiImgStyle');
        const aspectSelect = document.getElementById('editorAiImgAspect');
        const startBtn = document.getElementById('startEditorAiImgGenBtn');
        const loadingBox = document.getElementById('editorAiImgLoading');
        const loadingText = document.getElementById('editorAiImgLoadingText');
        const resultArea = document.getElementById('editorAiImgResultArea');
        const previewImg = document.getElementById('editorAiImgPreview');
        const resultTitle = document.getElementById('editorAiImgResultTitle');
        const regenBtn = document.getElementById('regenEditorAiImgBtn');
        const applyBtn = document.getElementById('applyEditorAiImgBtn');
        const targetEditorRadio = document.getElementById('aiImgTargetEditor');
        const targetThumbRadio = document.getElementById('aiImgTargetThumb');

        const tabPromptBtn = document.getElementById('tabAiPromptModeBtn');
        const tabGalleryBtn = document.getElementById('tabAiGalleryModeBtn');
        const promptSection = document.getElementById('aiPromptModeSection');
        const gallerySection = document.getElementById('aiGalleryModeSection');
        const galleryFilterBtns = document.querySelectorAll('#galleryCategoryFilterGroup .preset-chip');

        let currentGeneratedImageData = null;

        // Render Gallery Items
        function renderGalleryItems(filter = 'all') {
            const grid = document.getElementById('aiGalleryGrid');
            if (!grid) return;
            let items = [];
            if (filter === 'all') {
                Object.keys(JOHORN_IMAGE_POOLS).forEach(k => {
                    items.push(...JOHORN_IMAGE_POOLS[k]);
                });
            } else if (JOHORN_IMAGE_POOLS[filter]) {
                items = JOHORN_IMAGE_POOLS[filter];
            }

            grid.innerHTML = items.map(item => `
                <div class="gallery-card-item" data-url="${item.url}" data-title="${escapeCmsHtml(item.title)}">
                    <div style="height: 75px; overflow: hidden; background: #E2E8F0;">
                        <img src="${item.url}" alt="${escapeCmsHtml(item.title)}" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <div style="padding: 6px 8px; font-size: 11px; font-weight: 600; color: #334155; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeCmsHtml(item.title)}">
                        ${escapeCmsHtml(item.title)}
                    </div>
                </div>
            `).join('');

            grid.querySelectorAll('.gallery-card-item').forEach(card => {
                card.addEventListener('click', () => {
                    grid.querySelectorAll('.gallery-card-item').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    const url = card.dataset.url;
                    const title = card.dataset.title;
                    currentGeneratedImageData = url;
                    if (previewImg) previewImg.src = url;
                    if (resultTitle) resultTitle.textContent = title;
                    if (resultArea) resultArea.style.display = 'block';
                });
            });
        }

        // Mode Tab Switching
        if (tabPromptBtn && tabGalleryBtn) {
            tabPromptBtn.addEventListener('click', () => {
                tabPromptBtn.classList.add('active');
                tabGalleryBtn.classList.remove('active');
                if (promptSection) promptSection.style.display = 'block';
                if (gallerySection) gallerySection.style.display = 'none';
            });

            tabGalleryBtn.addEventListener('click', () => {
                tabGalleryBtn.classList.add('active');
                tabPromptBtn.classList.remove('active');
                if (promptSection) promptSection.style.display = 'none';
                if (gallerySection) gallerySection.style.display = 'block';
                renderGalleryItems('all');
            });
        }

        // Gallery Filter Buttons
        galleryFilterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                galleryFilterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderGalleryItems(btn.dataset.filter || 'all');
            });
        });

        const openModalWithTarget = (target) => {
            if (target === 'thumb' && targetThumbRadio) {
                targetThumbRadio.checked = true;
            } else if (targetEditorRadio) {
                targetEditorRadio.checked = true;
            }

            // Auto-suggest prompt if input is currently empty
            if (promptInput && !promptInput.value.trim()) {
                const currentTitle = (document.getElementById('postTitleInput')?.value || '').trim();
                const currentCat = document.getElementById('postCatInput')?.value || '국제학교';
                if (currentTitle) {
                    promptInput.value = `${currentTitle}, 조호바루 현지 고화질 사진`;
                } else if (currentCat === '국제학교') {
                    promptInput.value = '말레이시아 조호바루 명문 국제학교 현대적인 캠퍼스와 도서관 실사 사진, 밝고 쾌적한 학습 환경';
                } else if (currentCat === '숙소여행') {
                    promptInput.value = '말레이시아 조호바루 푸테리하버 테라스에서 바라보는 싱가포르 해협 오션뷰, 맑은 하늘 8K';
                } else {
                    promptInput.value = '말레이시아 조호바루 도심과 현대적인 주거 타운 전경, 맑은 열대 풍경';
                }
            }

            if (editorAiModal) editorAiModal.style.display = 'flex';
        };

        if (openThumbBtn) {
            openThumbBtn.addEventListener('click', () => openModalWithTarget('thumb'));
        }

        if (openEditorBtn) {
            openEditorBtn.addEventListener('click', () => openModalWithTarget('editor'));
        }

        if (closeBtn && editorAiModal) {
            closeBtn.addEventListener('click', () => {
                editorAiModal.style.display = 'none';
            });
        }

        // Quick Preset Chips
        presetChips.forEach(chip => {
            chip.addEventListener('click', () => {
                if (promptInput && chip.dataset.preset) {
                    promptInput.value = chip.dataset.preset;
                }
            });
        });

        // Image Generation Execution
        async function runEditorImageGen() {
            let apiKey = (document.getElementById('aiApiKeyInput')?.value.trim()) || localStorage.getItem('johorn_gemini_api_key');
            if (!apiKey) {
                try {
                    const snap = await db.ref('settings/gemini_api_key').once('value');
                    if (snap.val()) {
                        apiKey = snap.val();
                        localStorage.setItem('johorn_gemini_api_key', apiKey);
                        const keyInput = document.getElementById('aiApiKeyInput');
                        if (keyInput) keyInput.value = apiKey;
                    }
                } catch (e) {
                    console.warn('Firebase key lookup failed:', e);
                }
            }

            const rawPrompt = (promptInput ? promptInput.value.trim() : '');
            if (!rawPrompt) {
                alert('생성할 이미지의 묘사 프롬프트를 입력해 주세요.');
                if (promptInput) promptInput.focus();
                return;
            }

            const style = styleSelect ? styleSelect.value : 'photorealistic';
            const aspect = aspectSelect ? aspectSelect.value : '16:9';
            const currentCat = document.getElementById('postCatInput')?.value || '국제학교';

            // Loading state
            startBtn.disabled = true;
            if (regenBtn) regenBtn.disabled = true;
            if (loadingBox) loadingBox.style.display = 'block';
            if (resultArea) resultArea.style.display = 'none';
            if (loadingText) loadingText.textContent = 'AI 비주얼 엔진이 프롬프트를 분석하여 이미지를 렌더링하고 있습니다...';

            try {
                let generatedDataUrl = null;
                let generatedTitle = rawPrompt;

                // Attempt Google Imagen/Gemini if API key is provided
                if (apiKey) {
                    let enrichedPrompt = rawPrompt;
                    const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(rawPrompt);

                    if (hasKorean) {
                        try {
                            const translateRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    contents: [{
                                        parts: [{
                                            text: `Translate and expand this image prompt into a detailed, high-resolution English prompt for Imagen 3: "${rawPrompt}". Style: ${style}. Keep photorealistic lighting, sharp focus, 8k quality. Return ONLY the English prompt text.`
                                        }]
                                    }],
                                    generationConfig: { temperature: 0.7, maxOutputTokens: 200 }
                                })
                            });

                            if (translateRes.ok) {
                                const transData = await translateRes.json();
                                const translatedText = transData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
                                if (translatedText) enrichedPrompt = translatedText;
                            }
                        } catch (tErr) {
                            console.warn('Gemini translate skipped:', tErr);
                        }
                    }

                    const candidateImgModels = ['imagen-3.0-generate-002'];
                    for (const model of candidateImgModels) {
                        try {
                            const imgUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;
                            const imgRes = await fetch(imgUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    instances: [{ prompt: enrichedPrompt }],
                                    parameters: { sampleCount: 1, aspectRatio: aspect }
                                })
                            });

                            if (imgRes.ok) {
                                const imgData = await imgRes.json();
                                const b64 = imgData.predictions?.[0]?.bytesBase64Encoded;
                                if (b64) {
                                    generatedDataUrl = `data:image/jpeg;base64,${b64}`;
                                    break;
                                }
                            }
                        } catch (mErr) {
                            console.warn(`Call failed for ${model}:`, mErr);
                        }
                    }
                }

                // If Google Imagen is unavailable or rate-limited (free tier limit 0 without billing),
                // use non-repeating smart themed image matching the prompt & category
                if (!generatedDataUrl) {
                    const picked = getSmartThemedImage(rawPrompt, currentCat, style, currentGeneratedImageData);
                    generatedDataUrl = picked.url;
                    generatedTitle = picked.title;
                }

                currentGeneratedImageData = generatedDataUrl;

                // Step 3: Display preview
                if (previewImg) previewImg.src = currentGeneratedImageData;
                if (resultTitle) resultTitle.textContent = generatedTitle;
                if (loadingBox) loadingBox.style.display = 'none';
                if (resultArea) resultArea.style.display = 'block';

            } catch (err) {
                console.error('Editor AI Image Gen Error:', err);
                alert('이미지 생성 중 오류가 발생했습니다: ' + err.message);
                if (loadingBox) loadingBox.style.display = 'none';
            } finally {
                startBtn.disabled = false;
                if (regenBtn) regenBtn.disabled = false;
            }
        }

        if (startBtn) startBtn.addEventListener('click', runEditorImageGen);
        if (regenBtn) regenBtn.addEventListener('click', runEditorImageGen);

        // Step 4: Apply to Editor or Thumbnail
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                if (!currentGeneratedImageData) {
                    alert('적용할 생성 이미지가 없습니다.');
                    return;
                }

                const isEditorTarget = targetEditorRadio ? targetEditorRadio.checked : true;

                if (isEditorTarget) {
                    if (quill) {
                        const range = quill.getSelection(true) || { index: quill.getLength() };
                        quill.insertEmbed(range.index, 'image', currentGeneratedImageData);
                        quill.setSelection(range.index + 1);
                        quill.focus();
                    }
                    if (editorAiModal) editorAiModal.style.display = 'none';
                    alert('에디터 본문 커서 위치에 이미지가 삽입되었습니다.');
                } else {
                    const thumbInput = document.getElementById('postThumbInput');
                    if (thumbInput) thumbInput.value = currentGeneratedImageData;
                    updateThumbPreview(currentGeneratedImageData, 'AI 맞춤 이미지');
                    if (editorAiModal) editorAiModal.style.display = 'none';
                    alert('대표 썸네일 이미지가 교체되었습니다.');
                }
            });
        }
    }


    // Initial Auth Check
    checkAuth();
});

