// Application Core State and Logic for JohorN & Teega Residence
document.addEventListener('DOMContentLoaded', () => {
    
    // Hero Video Autoplay & Control Overlay (Mobile Friendly)
    const heroVideo = document.getElementById('heroVideo');
    const videoOverlay = document.getElementById('videoControlOverlay');
    const playBtnIcon = document.getElementById('playBtnIcon');

    if (heroVideo && videoOverlay) {
        // Ensure proper muted and playsinline settings programmatically
        heroVideo.setAttribute('playsinline', '');
        heroVideo.setAttribute('webkit-playsinline', '');
        heroVideo.setAttribute('preload', 'auto');
        heroVideo.muted = true;
        heroVideo.defaultMuted = true;

        // Toggle play/pause state function
        const toggleVideoPlayback = () => {
            if (heroVideo.paused) {
                heroVideo.play().catch(err => {
                    console.log("Playback failed on user toggle:", err);
                });
            } else {
                heroVideo.pause();
            }
        };

        // Click or tap on the overlay to toggle play/pause
        videoOverlay.addEventListener('click', toggleVideoPlayback);

        // Update overlay UI state based on actual video playback state
        const updateOverlayUI = () => {
            if (!heroVideo.paused) {
                videoOverlay.classList.add('playing');
                if (playBtnIcon) {
                    playBtnIcon.className = 'fa-solid fa-pause';
                }
            } else {
                videoOverlay.classList.remove('playing');
                if (playBtnIcon) {
                    playBtnIcon.className = 'fa-solid fa-play';
                }
            }
        };

        heroVideo.addEventListener('play', updateOverlayUI);
        heroVideo.addEventListener('playing', updateOverlayUI);
        heroVideo.addEventListener('pause', updateOverlayUI);

        // Attempt initial autoplay
        const attemptPlay = () => {
            const playPromise = heroVideo.play();
            if (playPromise !== undefined) {
                playPromise.then(updateOverlayUI).catch(error => {
                    console.log("Initial autoplay prevented:", error);
                    updateOverlayUI(); // Ensure overlay is visible if blocked
                });
            }
        };

        // Try playing immediately, or as soon as metadata is ready
        attemptPlay();
        heroVideo.addEventListener('loadedmetadata', attemptPlay);
        heroVideo.addEventListener('canplay', attemptPlay);

        // Global fallback to force-play on first general interaction (helps on mobile Safari)
        const forcePlayOnInteraction = () => {
            if (heroVideo.paused) {
                heroVideo.play()
                    .then(() => {
                        updateOverlayUI();
                        cleanupInteractionListeners();
                    })
                    .catch(err => {
                        console.log("Interaction play failed, retry on canplay:", err);
                        heroVideo.addEventListener('canplay', () => {
                            heroVideo.play().then(() => {
                                updateOverlayUI();
                                cleanupInteractionListeners();
                            }).catch(e => console.log(e));
                        }, { once: true });
                    });
            } else {
                cleanupInteractionListeners();
            }
        };

        const interactionEvents = ['touchstart', 'mousedown', 'keydown'];
        const cleanupInteractionListeners = () => {
            interactionEvents.forEach(event => {
                document.body.removeEventListener(event, forcePlayOnInteraction);
            });
        };

        interactionEvents.forEach(event => {
            document.body.addEventListener(event, forcePlayOnInteraction, { passive: true });
        });
    }
    
    // ----------------------------------------------------
    // 1. Navigation & Mobile Menu Setup
    // ----------------------------------------------------
    const navToggle = document.getElementById('navToggle');
    const navLinksContainer = document.getElementById('navLinks');
    const navLinks = document.querySelectorAll('.nav-link');
    const footerAdminLink = document.getElementById('footerAdminLink');
    const logoLink = document.querySelector('.logo a');
    const header = document.querySelector('header');

    // Toggle Mobile Navigation Menu
    navToggle.addEventListener('click', () => {
        navLinksContainer.classList.toggle('active');
        navToggle.classList.toggle('open');
    });

    // Function to show normal website view and hide admin
    function showNormalView() {
        document.querySelectorAll('main > section').forEach(s => {
            if (s.id !== 'admin') s.classList.remove('hidden');
        });
        document.getElementById('admin').classList.add('hidden');
    }

    // Function to show admin view and hide rest
    function showAdminView() {
        document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
        document.getElementById('admin').classList.remove('hidden');
        // Reset admin login state or keep current
        document.getElementById('adminPassword').value = '';
    }

    // Handle Active Tab Highlighting and Scroll Link Behaviour
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Close mobile menu if active
            navLinksContainer.classList.remove('active');
            navToggle.classList.remove('open');

            // Set Active Menu style
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Switch view
            showNormalView();
        });
    });

    // Logo Click (Go to Home)
    logoLink.addEventListener('click', () => {
        navLinks.forEach(l => l.classList.remove('active'));
        showNormalView();
    });

    // Footer Admin Link click handling
    footerAdminLink.addEventListener('click', (e) => {
        e.preventDefault();
        navLinks.forEach(l => l.classList.remove('active'));
        showAdminView();
        // Smooth scroll to main top
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Scroll Effect on Header
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });


    // ----------------------------------------------------
    // 2. Stay Gallery Thumbnail Handler
    // ----------------------------------------------------
    const galleryMainImg = document.getElementById('mainGalleryImg');
    const thumbnails = document.querySelectorAll('.thumb');

    thumbnails.forEach(thumb => {
        thumb.addEventListener('click', () => {
            // Remove active style from all thumbs
            thumbnails.forEach(t => t.classList.remove('active'));
            // Set clicked thumb active
            thumb.classList.add('active');
            // Change main image source with smooth transition
            const newSrc = thumb.getAttribute('data-img');
            galleryMainImg.style.opacity = 0;
            setTimeout(() => {
                galleryMainImg.setAttribute('src', newSrc);
                galleryMainImg.style.opacity = 1;
            }, 150);
        });
    });


    // ----------------------------------------------------
    // 3. Tab-based Booking/Inquiry Selector Interface
    // ----------------------------------------------------
    const tabStayBtn = document.getElementById('tabStayBtn');
    const tabConsultingBtn = document.getElementById('tabConsultingBtn');
    const stayInterface = document.getElementById('stayInterface');
    const consultingInterface = document.getElementById('consultingInterface');

    tabStayBtn.addEventListener('click', () => {
        tabStayBtn.classList.add('active');
        tabConsultingBtn.classList.remove('active');
        stayInterface.classList.remove('hidden');
        consultingInterface.classList.add('hidden');
    });

    tabConsultingBtn.addEventListener('click', () => {
        tabConsultingBtn.classList.add('active');
        tabStayBtn.classList.remove('active');
        consultingInterface.classList.remove('hidden');
        stayInterface.classList.add('hidden');
    });


    // ----------------------------------------------------
    // 4. Custom Range Calendar Implementation
    // ----------------------------------------------------
    let currentYear = 2026;
    let currentMonth = 6; // July (0-indexed: 6 = July)
    
    let checkinDate = null;
    let checkoutDate = null;

    const currentMonthYearLabel = document.getElementById('currentMonthYear');
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    const calendarDatesContainer = document.getElementById('calendarDates');
    const checkinDisplay = document.getElementById('checkinDisplay');
    const checkoutDisplay = document.getElementById('checkoutDisplay');

    // Fetch approved bookings to lock dates
    function getLockedDates() {
        const data = JSON.parse(localStorage.getItem('johorn_requests') || '[]');
        const locked = [];
        data.forEach(item => {
            if (item.type === 'stay' && item.status === 'approved' && item.checkin && item.checkout) {
                let start = new Date(item.checkin);
                let end = new Date(item.checkout);
                while (start <= end) {
                    locked.push(new Date(start).toISOString().split('T')[0]);
                    start.setDate(start.getDate() + 1);
                }
            }
        });
        return locked;
    }

    // Render Calendar Cells
    function renderCalendar() {
        const monthsKOR = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
        currentMonthYearLabel.textContent = `${currentYear}년 ${monthsKOR[currentMonth]}`;
        calendarDatesContainer.innerHTML = '';

        // Day info
        const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
        const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
        const prevLastDay = new Date(currentYear, currentMonth, 0).getDate();

        const today = new Date();
        const lockedDates = getLockedDates();

        // 1. Previous month blank days
        for (let i = firstDayIndex; i > 0; i--) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell prev-month';
            cell.textContent = prevLastDay - i + 1;
            calendarDatesContainer.appendChild(cell);
        }

        // 2. Current month dates
        for (let day = 1; day <= lastDay; day++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell';
            cell.textContent = day;

            const thisDate = new Date(currentYear, currentMonth, day);
            const dateStr = thisDate.toISOString().split('T')[0];

            // Highlight today
            if (thisDate.toDateString() === today.toDateString()) {
                cell.classList.add('today');
            }

            // Disable past dates
            if (thisDate < today && thisDate.toDateString() !== today.toDateString()) {
                cell.classList.add('disabled');
            }

            // Disable locked (already booked) dates
            if (lockedDates.includes(dateStr)) {
                cell.classList.add('disabled');
            }

            // Highlight selected range
            if (checkinDate && dateStr === checkinDate.toISOString().split('T')[0]) {
                cell.classList.add('selected');
            }
            if (checkoutDate && dateStr === checkoutDate.toISOString().split('T')[0]) {
                cell.classList.add('selected');
            }
            if (checkinDate && checkoutDate && thisDate > checkinDate && thisDate < checkoutDate) {
                cell.classList.add('in-range');
            }

            // Click Event for Selection
            if (!cell.classList.contains('disabled')) {
                cell.addEventListener('click', () => handleDateClick(thisDate));
            }

            calendarDatesContainer.appendChild(cell);
        }

        // 3. Next month blank days
        const totalCells = firstDayIndex + lastDay;
        const nextBlankCount = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
        for (let i = 1; i <= nextBlankCount; i++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell next-month';
            cell.textContent = i;
            calendarDatesContainer.appendChild(cell);
        }
    }

    // Handles logic for range date selection
    function handleDateClick(clickedDate) {
        if (!checkinDate || (checkinDate && checkoutDate)) {
            // Case 1: Select Check-in
            checkinDate = clickedDate;
            checkoutDate = null;
            checkinDisplay.textContent = formatDateKorean(clickedDate);
            checkoutDisplay.textContent = '달력에서 선택해 주세요';
        } else if (checkinDate && !checkoutDate) {
            // Case 2: Select Check-out
            if (clickedDate < checkinDate) {
                // If clicked date is before checkin, swap it as checkin
                checkinDate = clickedDate;
                checkinDisplay.textContent = formatDateKorean(clickedDate);
            } else {
                checkoutDate = clickedDate;
                checkoutDisplay.textContent = formatDateKorean(clickedDate);
            }
        }
        renderCalendar();
    }

    function formatDateKorean(date) {
        if (!date) return '';
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}년 ${m}월 ${d}일`;
    }

    // Month Navigation Listeners
    prevMonthBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });

    // Init Calendar
    renderCalendar();


    // ----------------------------------------------------
    // 5. Booking and Inquiry Form Submission (Two Forms)
    // ----------------------------------------------------
    const stayBookingForm = document.getElementById('stayBookingForm');
    const consultingInquiryForm = document.getElementById('consultingInquiryForm');

    // Form 1: Stay Booking Form Submission
    stayBookingForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('stayClientName').value.trim();
        const contact = document.getElementById('stayClientContact').value.trim();
        const adults = document.getElementById('stayAdults').value;
        const children = document.getElementById('stayChildren').value;
        const notesRaw = document.getElementById('stayNotes').value.trim();

        // Validate stay date inputs
        if (!checkinDate || !checkoutDate) {
            alert('예약을 위해 체크인 및 체크아웃 날짜를 달력에서 선택해 주세요.');
            return;
        }

        // Format notes with guest count
        const notes = `[투숙인원]: 성인 ${adults}명, 아동 ${children}명\n[요청사항]: ${notesRaw || '없음'}`;

        // Structure Request Data
        const newRequest = {
            id: Date.now(),
            type: 'stay',
            name: name,
            contact: contact,
            notes: notes,
            status: 'pending',
            dateCreated: new Date().toLocaleDateString(),
            checkin: checkinDate.toISOString().split('T')[0],
            checkout: checkoutDate.toISOString().split('T')[0]
        };

        // Save to LocalStorage
        const requests = JSON.parse(localStorage.getItem('johorn_requests') || '[]');
        requests.push(newRequest);
        localStorage.setItem('johorn_requests', JSON.stringify(requests));

        alert('Teega Residence 숙소 예약 신청이 접수되었습니다. 관리자 승인 후 연락드리겠습니다.');

        // Reset state
        stayBookingForm.reset();
        checkinDate = null;
        checkoutDate = null;
        checkinDisplay.textContent = '달력에서 선택해 주세요';
        checkoutDisplay.textContent = '달력에서 선택해 주세요';
        renderCalendar();
        
        // Refresh admin dashboard table if currently viewing it
        if (!document.getElementById('adminDashboard').classList.contains('hidden')) {
            renderAdminDashboard();
        }
    });

    // Form 2: Consulting Inquiry Form Submission
    consultingInquiryForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('consultName').value.trim();
        const contact = document.getElementById('consultContact').value.trim();
        const targetSchool = document.getElementById('consultSchool').value.trim();
        const targetDate = document.getElementById('consultTargetDate').value.trim();
        const notesRaw = document.getElementById('consultNotes').value.trim();

        // Get selected consulting categories
        const categories = [];
        const checkboxes = document.querySelectorAll('input[name="consultCategory"]:checked');
        checkboxes.forEach(cb => {
            if (cb.value === 'settlement') categories.push('이주정착 서비스');
            if (cb.value === 'tour') categories.push('국제학교 답사 서비스');
            if (cb.value === 'admission') categories.push('입학대행 서비스');
        });

        if (categories.length === 0) {
            alert('상담 희망 분야를 하나 이상 선택해 주세요.');
            return;
        }

        // Format notes with category, school, and target date
        const notes = `[희망분야]: ${categories.join(', ')}\n[희망학교]: ${targetSchool || '미정/없음'}\n[예정시기]: ${targetDate || '미정'}\n\n[상세내용]:\n${notesRaw}`;

        // Structure Request Data
        const newRequest = {
            id: Date.now(),
            type: 'consulting',
            name: name,
            contact: contact,
            notes: notes,
            status: 'pending',
            dateCreated: new Date().toLocaleDateString(),
            checkin: null,
            checkout: null
        };

        // Save to LocalStorage
        const requests = JSON.parse(localStorage.getItem('johorn_requests') || '[]');
        requests.push(newRequest);
        localStorage.setItem('johorn_requests', JSON.stringify(requests));

        alert('이주정착 & 학교 상담 신청이 완료되었습니다. 조속히 피드백 드리겠습니다.');

        // Reset state
        consultingInquiryForm.reset();
        
        // Refresh admin dashboard table if currently viewing it
        if (!document.getElementById('adminDashboard').classList.contains('hidden')) {
            renderAdminDashboard();
        }
    });


    // ----------------------------------------------------
    // 6. Admin System Login & Request management
    // ----------------------------------------------------
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    const adminPasswordInput = document.getElementById('adminPassword');
    const adminLoginSection = document.getElementById('adminLogin');
    const adminDashboardSection = document.getElementById('adminDashboard');
    const adminTableBody = document.getElementById('adminTableBody');

    // Load initial Mock Data to LocalStorage if empty
    function initializeMockData() {
        if (!localStorage.getItem('johorn_requests')) {
            const mockData = [
                {
                    id: 1,
                    type: 'consulting',
                    name: '김민준',
                    contact: '010-1234-5678',
                    notes: '초등학교 3학년, 5학년 자녀 학기 맞춰 입학 대행 및 답사 조율 상담 원합니다.',
                    status: 'pending',
                    dateCreated: '2026/07/01',
                    checkin: null,
                    checkout: null
                },
                {
                    id: 2,
                    type: 'stay',
                    name: '이서연',
                    contact: 'Kakao: seoyeon_johor',
                    notes: '답사 일정에 맞춰 3베드룸 렌트 신청합니다.',
                    status: 'approved',
                    dateCreated: '2026/07/02',
                    checkin: '2026-07-15',
                    checkout: '2026-07-20'
                }
            ];
            localStorage.setItem('johorn_requests', JSON.stringify(mockData));
        }
    }
    initializeMockData();

    // Login Event
    adminLoginBtn.addEventListener('click', handleAdminLogin);
    adminPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAdminLogin();
    });

    function handleAdminLogin() {
        const password = adminPasswordInput.value;
        if (password === '1234') { // Default admin password
            adminLoginSection.classList.add('hidden');
            adminDashboardSection.style.display = 'block';
            renderAdminDashboard();
        } else {
            alert('비밀번호가 올바르지 않습니다. (기본 비밀번호: 1234)');
        }
    }

    // Render Admin Table rows
    let currentFilter = 'all';

    function renderAdminDashboard() {
        const data = JSON.parse(localStorage.getItem('johorn_requests') || '[]');
        adminTableBody.innerHTML = '';

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
            if (item.status === 'approved') statusLabel = '승인됨';
            if (item.status === 'rejected') statusLabel = '반려됨';

            tr.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${typeLabel}</strong></td>
                <td>${item.name}</td>
                <td>${item.contact}</td>
                <td><span style="font-size:13px;">${scheduleStr}</span></td>
                <td><span class="status-badge ${badgeClass}">${statusLabel}</span></td>
                <td>
                    <select class="action-select" data-id="${item.id}">
                        <option value="pending" ${item.status === 'pending' ? 'selected' : ''}>대기중</option>
                        <option value="approved" ${item.status === 'approved' ? 'selected' : ''}>승인</option>
                        <option value="rejected" ${item.status === 'rejected' ? 'selected' : ''}>반려</option>
                    </select>
                </td>
            `;

            adminTableBody.appendChild(tr);
        });

        // Add Change status listener to select tags
        document.querySelectorAll('.action-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const id = parseInt(e.target.getAttribute('data-id'));
                const newStatus = e.target.value;
                updateRequestStatus(id, newStatus);
            });
        });
    }

    // Update Status and Refresh
    function updateRequestStatus(id, newStatus) {
        const data = JSON.parse(localStorage.getItem('johorn_requests') || '[]');
        const updated = data.map(item => {
            if (item.id === id) {
                item.status = newStatus;
            }
            return item;
        });
        localStorage.setItem('johorn_requests', JSON.stringify(updated));
        
        // Re-render
        renderAdminDashboard();
        renderCalendar(); // Sync locked calendar dates immediately
    }

    // Filter Buttons logic
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            renderAdminDashboard();
        });
    });

    // ----------------------------------------------------
    // 7. Serverless Instagram Feed Integration (via data/instagram_posts.json)
    // ----------------------------------------------------
    // GitHub Actions를 통해 주기적으로 Behold API를 호출해 다운로드 받아 저장한 json 파일을 로드합니다.
    const INSTAGRAM_JSON_URL = 'data/instagram_posts.json'; 

    const mockInstagramData = [
        {
            image_local: 'assets/stay_room6.jpg',
            url: 'https://instagram.com/myjohorn',
            caption: '테라스 아래로 보이는 멋진 수영장 야경. 밤에도 아름다운 티가 레지던스입니다. #조호바루한달살기 #티가레지던스 #조호엔',
            likes: 42
        },
        {
            image_local: 'assets/stay_balcony.jpg',
            url: 'https://instagram.com/myjohorn',
            caption: '테라스에서 바라보는 말라카 해협의 시원한 바다 뷰. 매일 아침 차 한 잔의 여유를 즐겨보세요. #오션뷰 #푸테리하버 #조호바루이주',
            likes: 38
        },
        {
            image_local: 'assets/stay_bedroom.jpg',
            url: 'https://instagram.com/myjohorn',
            caption: '아늑하고 포근하게 준비된 마스터룸. 한달살기도 내 집처럼 편안하게 머무르실 수 있습니다. #조호바루콘도 #가족여행 #조호엔stay',
            likes: 51
        },
        {
            image_local: 'assets/stay_room7.jpg',
            url: 'https://instagram.com/myjohorn',
            caption: '조호바루 국제학교 답사 및 이주 정착 컨설팅, 2026년 가을 학기 모집 진행 중입니다! #국제학교답사 #말레이시아유학 #조호엔',
            likes: 49
        }
    ];

    function renderInstagramFeed(posts) {
        const grid = document.getElementById('instagramGrid');
        if (!grid) return;
        grid.innerHTML = '';

        // Take only first 4 items
        const feeds = posts.slice(0, 4);

        feeds.forEach(feed => {
            const card = document.createElement('div');
            card.className = 'instagram-card';
            card.addEventListener('click', () => {
                window.open(feed.url, '_blank');
            });

            // If likes count exists, format it
            const likesCount = feed.likes !== undefined ? feed.likes : 0;

            card.innerHTML = `
                <img src="${feed.image_local}" alt="Instagram Post" onerror="this.src='assets/stay_balcony.jpg'">
                <div class="instagram-overlay">
                    <p>${feed.caption || 'Instagram Post'}</p>
                    <div style="font-size: 13px; color: rgba(255,255,255,0.9); margin-bottom: 10px; display: flex; align-items: center; gap: 5px;">
                        <i class="fa-solid fa-heart" style="color: #FF4B5C; font-size:14px;"></i> ${likesCount}
                    </div>
                    <i class="fa-brands fa-instagram" style="font-size:20px; color:rgba(255,255,255,0.75);"></i>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    async function loadInstagramFeed() {
        try {
            const response = await fetch(INSTAGRAM_JSON_URL);
            if (!response.ok) throw new Error('Failed to load JSON');
            const data = await response.json();
            
            if (Array.isArray(data) && data.length > 0) {
                renderInstagramFeed(data);
            } else {
                throw new Error('Empty or invalid data');
            }
        } catch (error) {
            console.warn('Error loading synced Instagram JSON, falling back to mock data:', error);
            renderInstagramFeed(mockInstagramData);
        }
    }

    loadInstagramFeed();

});


