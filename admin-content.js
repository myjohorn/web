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
            booking_info: "카카오톡 채널 실시간 상담 및 하단 예약 신청 작성",
            main_img: "assets/stay_balcony.jpg"
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
            populateFormFromDraft();
            dispatchPreviewUpdate();
        });

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
    const postModal = document.getElementById('postModal');
    const openNewPostModalBtn = document.getElementById('openNewPostModalBtn');
    const closePostModalBtn = document.getElementById('closePostModalBtn');
    const cancelPostBtn = document.getElementById('cancelPostBtn');
    const postEditForm = document.getElementById('postEditForm');
    const adminBlogTableBody = document.getElementById('adminBlogTableBody');
    const adminBlogSearchInput = document.getElementById('adminBlogSearchInput');
    const adminBlogCatFilter = document.getElementById('adminBlogCatFilter');
    const adminBlogStatusFilter = document.getElementById('adminBlogStatusFilter');

    // Helper: Read and compress image to dataURL using HTML5 Canvas
    function readAndCompressThumbnail(file, callback) {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (file.type && file.type.startsWith('image/')) {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const maxDim = 1200;
                    const quality = 0.82;
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
            if (name) name.textContent = label || (val.startsWith('data:') ? '업로드된 이미지' : val.split('/').pop());
            wrapper.style.display = 'flex';
        } else {
            wrapper.style.display = 'none';
        }
    }

    function initBlog() {
        // Initialize Quill.js
        if (!quill && document.getElementById('quillEditor')) {
            quill = new Quill('#quillEditor', {
                theme: 'snow',
                placeholder: '조호바루 국제학교, 생활 정착에 관한 생생한 소식을 작성해 보세요...',
                modules: {
                    toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'color': [] }, { 'background': [] }],
                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                        ['blockquote', 'code-block'],
                        ['link', 'image'],
                        ['clean']
                    ]
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

        // Modal Open for New Post
        if (openNewPostModalBtn) {
            openNewPostModalBtn.addEventListener('click', () => {
                document.getElementById('postModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square" style="color: var(--accent-color);"></i> 신규 게시글 작성';
                document.getElementById('editPostId').value = '';
                document.getElementById('postTitleInput').value = '';
                document.getElementById('postCatInput').value = '국제학교';
                document.getElementById('postAuthorInput').value = '조호엔';
                document.getElementById('postStatusInput').value = 'published';
                document.getElementById('postThumbInput').value = 'assets/stay_balcony.jpg';
                document.getElementById('postSummaryInput').value = '';
                if (quill) quill.root.innerHTML = '';
                updateThumbPreview('assets/stay_balcony.jpg');
                postModal.style.display = 'flex';
            });
        }

        // Modal Close
        const closeModal = () => { postModal.style.display = 'none'; };
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

            postThumbFileInput.addEventListener('change', () => {
                const file = postThumbFileInput.files[0];
                if (file) {
                    const originalHtml = postThumbUploadBtn.innerHTML;
                    postThumbUploadBtn.disabled = true;
                    postThumbUploadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 압축 중...';
                    readAndCompressThumbnail(file, (dataUrl, fileName) => {
                        postThumbInput.value = dataUrl;
                        updateThumbPreview(dataUrl, fileName);
                        postThumbUploadBtn.disabled = false;
                        postThumbUploadBtn.innerHTML = originalHtml;
                    });
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
                const contentHtml = quill ? quill.root.innerHTML : '';

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
                if (quill) quill.root.innerHTML = post.contentHtml || '';
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

    // Initial Auth Check
    checkAuth();
});
