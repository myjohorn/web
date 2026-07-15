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

    // Fetch approved bookings map to lock dates
    function getLockedDatesMap() {
        const data = JSON.parse(localStorage.getItem('johorn_requests') || '[]');
        const map = {};
        
        // 1. Merge local storage bookings (Status: approved/완료)
        data.forEach(item => {
            if (item.type === 'stay' && item.status === 'approved' && item.checkin && item.checkout) {
                let start = new Date(item.checkin);
                let end = new Date(item.checkout);
                while (start <= end) {
                    const dateStr = start.toISOString().split('T')[0];
                    map[dateStr] = {
                        id: item.id,
                        name: item.name,
                        contact: item.contact || '',
                        notes: item.notes || '',
                        checkin: item.checkin,
                        checkout: item.checkout
                    };
                    start.setDate(start.getDate() + 1);
                }
            }
        });

        // 2. Merge Google Calendar events from cache
        gcalEventsCache.forEach(evt => {
            let start = new Date(evt.start);
            let end = new Date(evt.end);
            while (start <= end) {
                const dateStr = start.toISOString().split('T')[0];
                
                // Extract clean name from GCal event summary (Format: "[숙소예약] 홍길동" or "홍길동")
                const name = evt.summary.replace('\[숙소예약\]', '').trim();
                
                map[dateStr] = {
                    id: evt.id, // String ID from GCal
                    name: name,
                    contact: '',
                    notes: evt.description || '',
                    checkin: evt.start,
                    checkout: evt.end,
                    isGcal: true
                };
                start.setDate(start.getDate() + 1);
            }
        });
        
        return map;
    }

    // Name masking helper: "첫 글자 + **"
    function maskName(name) {
        if (!name) return '';
        name = name.trim();
        if (name.length <= 1) return name;
        return name.charAt(0) + '**';
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
        const lockedDatesMap = getLockedDatesMap();

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

            const thisDate = new Date(currentYear, currentMonth, day);
            const dateStr = thisDate.toISOString().split('T')[0];

            // Highlight today
            if (thisDate.toDateString() === today.toDateString()) {
                cell.classList.add('today');
            }

            // Disable past dates
            let isPast = thisDate < today && thisDate.toDateString() !== today.toDateString();
            let isBooked = !!lockedDatesMap[dateStr];

            if (isPast) {
                cell.classList.add('disabled');
            }

            // Disable locked (already booked) dates
            if (isBooked) {
                cell.classList.add('disabled');
                cell.classList.add('booked-cell');
            }

            // Set innerHTML (show masked name tag if booked)
            if (isBooked) {
                const masked = maskName(lockedDatesMap[dateStr].name);
                cell.innerHTML = `<span class="date-num">${day}</span><span class="booking-name-tag">${masked}</span>`;
            } else {
                cell.innerHTML = `<span class="date-num">${day}</span>`;
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
        loadGcalEventsForCurrentMonth();
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        loadGcalEventsForCurrentMonth();
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
            renderAdminCalendar();
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
        renderAdminCalendar(); // Sync admin calendar immediately
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

    // ----------------------------------------------------
    // Google Calendar API Integration State & Methods
    // ----------------------------------------------------
    let tokenClient;
    let gcalEventsCache = [];

    // DOM Elements for GCal settings
    const toggleGcalSettings = document.getElementById('toggleGcalSettings');
    const gcalSettingsBody = document.getElementById('gcalSettingsBody');
    const gcalSyncStatusBadge = document.getElementById('gcalSyncStatusBadge');
    
    const gcalClientId = document.getElementById('gcalClientId');
    const gcalApiKey = document.getElementById('gcalApiKey');
    const gcalCalendarId = document.getElementById('gcalCalendarId');
    
    const gcalConnectBtn = document.getElementById('gcalConnectBtn');
    const gcalDisconnectBtn = document.getElementById('gcalDisconnectBtn');
    const adminResDeleteBtn = document.getElementById('adminResDeleteBtn');

    // Toggle GCal settings display
    if (toggleGcalSettings && gcalSettingsBody) {
        toggleGcalSettings.addEventListener('click', () => {
            gcalSettingsBody.classList.toggle('hidden');
        });
    }

    // Check if GCal is connected and token is valid
    function isGcalConnected() {
        const connected = localStorage.getItem('gcal_connected') === 'true';
        const expiry = parseInt(localStorage.getItem('gcal_token_expiry') || '0');
        const token = localStorage.getItem('gcal_access_token');
        return connected && token && Date.now() < expiry;
    }

    // Update GCal UI based on connection status
    function updateGcalUI(isConnected) {
        if (!gcalSyncStatusBadge) return;
        
        if (isConnected) {
            const calendarId = localStorage.getItem('gcal_calendar_id') || 'primary';
            gcalSyncStatusBadge.textContent = '연동 완료';
            gcalSyncStatusBadge.className = 'status-badge status-approved';
            
            if (gcalConnectBtn) gcalConnectBtn.classList.add('hidden');
            if (gcalDisconnectBtn) gcalDisconnectBtn.classList.remove('hidden');
            
            // Populate inputs from localStorage
            if (gcalClientId) gcalClientId.value = localStorage.getItem('gcal_client_id') || '';
            if (gcalApiKey) gcalApiKey.value = localStorage.getItem('gcal_api_key') || '';
            if (gcalCalendarId) gcalCalendarId.value = calendarId;
        } else {
            gcalSyncStatusBadge.textContent = '연동 안됨';
            gcalSyncStatusBadge.className = 'status-badge status-rejected';
            
            if (gcalConnectBtn) gcalConnectBtn.classList.remove('hidden');
            if (gcalDisconnectBtn) gcalDisconnectBtn.classList.add('hidden');
        }
    }

    // Initialize GIS Client and request OAuth access token
    function connectGoogleCalendar() {
        const clientId = gcalClientId.value.trim();
        const apiKey = gcalApiKey.value.trim();
        const calendarId = gcalCalendarId.value.trim() || 'primary';

        if (!clientId) {
            alert('Google OAuth Client ID가 필요합니다.');
            return;
        }

        // Save inputs to localStorage
        localStorage.setItem('gcal_client_id', clientId);
        localStorage.setItem('gcal_api_key', apiKey);
        localStorage.setItem('gcal_calendar_id', calendarId);

        try {
            // Google Accounts Library Client Initialization (OAuth2 GIS)
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: 'https://www.googleapis.com/auth/calendar.events',
                callback: (tokenResponse) => {
                    if (tokenResponse.error !== undefined) {
                        alert(`구글 연동 실패: ${tokenResponse.error}`);
                        throw tokenResponse;
                    }
                    
                    // Save token details
                    const expiryTime = Date.now() + (tokenResponse.expires_in * 1000);
                    localStorage.setItem('gcal_access_token', tokenResponse.access_token);
                    localStorage.setItem('gcal_token_expiry', expiryTime);
                    localStorage.setItem('gcal_connected', 'true');
                    
                    alert('구글 캘린더 연동이 성공적으로 완료되었습니다!');
                    
                    updateGcalUI(true);
                    loadGcalEventsForCurrentMonth(); // Fetch and re-render
                },
            });

            // Request Token Popup
            tokenClient.requestAccessToken({ prompt: 'consent' });

        } catch (err) {
            console.error('Error initializing Google accounts client:', err);
            alert('구글 연동 라이브러리를 실행할 수 없습니다. 잠시 후 다시 시도해 주세요.');
        }
    }

    // Disconnect Google Calendar
    function disconnectGoogleCalendar() {
        localStorage.removeItem('gcal_access_token');
        localStorage.removeItem('gcal_token_expiry');
        localStorage.setItem('gcal_connected', 'false');
        
        gcalEventsCache = [];
        updateGcalUI(false);
        
        alert('구글 캘린더 연동이 해제되었습니다.');
        
        // Re-render calendars using local storage bookings only
        renderCalendar();
        renderAdminCalendar();
    }

    // Bind Connect/Disconnect buttons
    if (gcalConnectBtn) {
        gcalConnectBtn.addEventListener('click', connectGoogleCalendar);
    }
    if (gcalDisconnectBtn) {
        gcalDisconnectBtn.addEventListener('click', disconnectGoogleCalendar);
    }

    // Fetch Events via direct Google Calendar REST API
    async function fetchGcalEvents(timeMin, timeMax) {
        if (!isGcalConnected()) return [];
        const token = localStorage.getItem('gcal_access_token');
        const calendarId = localStorage.getItem('gcal_calendar_id') || 'primary';
        const apiKey = localStorage.getItem('gcal_api_key') || '';
        
        let url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
        url += `?timeMin=${encodeURIComponent(timeMin)}`;
        url += `?timeMax=${encodeURIComponent(timeMax)}`;
        url += `&singleEvents=true`;
        url += `&maxResults=250`;
        if (apiKey) url += `&key=${encodeURIComponent(apiKey)}`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                if (response.status === 401) {
                    // Access token is invalid or expired
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

    // Create or Edit Event via Google Calendar REST API
    async function saveGcalEvent(booking) {
        if (!isGcalConnected()) return null;
        const token = localStorage.getItem('gcal_access_token');
        const calendarId = localStorage.getItem('gcal_calendar_id') || 'primary';
        
        // GCal allday end date must be exclusive (+1 day)
        const checkinDate = new Date(booking.checkin);
        const checkoutDate = new Date(booking.checkout);
        const exclusiveCheckout = new Date(checkoutDate);
        exclusiveCheckout.setDate(exclusiveCheckout.getDate() + 1);
        
        const eventBody = {
            summary: `[숙소예약] ${booking.name}`,
            description: `${booking.notes || ''}\n연락처: ${booking.contact || ''}`,
            start: {
                date: booking.checkin
            },
            end: {
                date: exclusiveCheckout.toISOString().split('T')[0]
            }
        };

        const isEdit = typeof booking.id === 'string' || booking.gcalEventId;
        const gcalEventId = typeof booking.id === 'string' ? booking.id : booking.gcalEventId;

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

    // Delete Event via Google Calendar REST API
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

    // Helper to adjust Google Calendar date-only end date to inclusive check-out date
    function adjustGcalEndDate(isStartDateOnly, isEndDateOnly, endStr) {
        const dateStr = endStr.split('T')[0];
        if (isStartDateOnly && isEndDateOnly) {
            const d = new Date(dateStr);
            d.setDate(d.getDate() - 1);
            return d.toISOString().split('T')[0];
        }
        return dateStr;
    }

    // Asynchronously fetch Google Calendar events and trigger calendar rendering
    async function loadGcalEventsForCurrentMonth() {
        if (!isGcalConnected()) {
            gcalEventsCache = [];
            return;
        }

        const startOfMonth = new Date(currentYear, currentMonth - 1, 20); // Prev month buffer
        const endOfMonth = new Date(currentYear, currentMonth + 1, 10);  // Next month buffer
        
        const timeMin = startOfMonth.toISOString();
        const timeMax = endOfMonth.toISOString();

        const events = await fetchGcalEvents(timeMin, timeMax);
        
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

        // Trigger calendars rendering with GCal events in cache
        renderCalendar();
        renderAdminCalendar();
    }

    // Initial GCal state load
    updateGcalUI(isGcalConnected());
    if (isGcalConnected()) {
        loadGcalEventsForCurrentMonth();
    }

    // ----------------------------------------------------
    // Admin Calendar Implementation
    // ----------------------------------------------------
    let adminYear = 2026;
    let adminMonth = 6; // July (0-indexed: 6 = July)

    const adminCalendarMonthYear = document.getElementById('adminCalendarMonthYear');
    const adminPrevMonthBtn = document.getElementById('adminPrevMonthBtn');
    const adminNextMonthBtn = document.getElementById('adminNextMonthBtn');
    const adminCalendarDates = document.getElementById('adminCalendarDates');

    const adminResIdInput = document.getElementById('adminResId');
    const adminResNameInput = document.getElementById('adminResName');
    const adminResContactInput = document.getElementById('adminResContact');
    const adminResCheckinInput = document.getElementById('adminResCheckin');
    const adminResCheckoutInput = document.getElementById('adminResCheckout');
    const adminResMemoInput = document.getElementById('adminResMemo');
    
    const adminResSaveBtn = document.getElementById('adminResSaveBtn');
    const adminResClearBtn = document.getElementById('adminResClearBtn');
    const adminFormTitle = document.getElementById('adminFormTitle');

    function renderAdminCalendar() {
        if (!adminCalendarDates) return;
        const monthsKOR = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
        adminCalendarMonthYear.textContent = `${adminYear}년 ${monthsKOR[adminMonth]}`;
        adminCalendarDates.innerHTML = '';

        const firstDayIndex = new Date(adminYear, adminMonth, 1).getDay();
        const lastDay = new Date(adminYear, adminMonth + 1, 0).getDate();
        const prevLastDay = new Date(adminYear, adminMonth, 0).getDate();

        const today = new Date();
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
            const dateStr = thisDate.toISOString().split('T')[0];

            if (thisDate.toDateString() === today.toDateString()) {
                cell.classList.add('today');
            }

            const booking = lockedDatesMap[dateStr];
            if (booking) {
                cell.classList.add('booked-cell');
                cell.innerHTML = `<span class="date-num">${day}</span><span class="admin-booking-name-tag">${booking.name}</span>`;
                
                // Clicking a booked cell populates the form to edit
                cell.addEventListener('click', () => {
                    // Highlight active cell
                    document.querySelectorAll('#adminCalendarDates .calendar-cell').forEach(c => c.classList.remove('active-select'));
                    cell.classList.add('active-select');
                    
                    // Show Delete Button
                    if (adminResDeleteBtn) {
                        adminResDeleteBtn.classList.remove('hidden');
                        adminResDeleteBtn.innerHTML = booking.isGcal ? '<i class="fa-solid fa-trash"></i> 구글에서 삭제' : '<i class="fa-solid fa-trash"></i> 예약 삭제';
                    }

                    if (booking.isGcal) {
                        adminResIdInput.value = booking.id; // GCal string ID
                        adminResNameInput.value = booking.name;
                        adminResContactInput.value = booking.contact || '';
                        adminResCheckinInput.value = booking.checkin;
                        adminResCheckoutInput.value = booking.checkout;
                        adminResMemoInput.value = booking.notes;
                        adminFormTitle.innerHTML = `<i class="fa-solid fa-calendar-check" style="margin-right: 6px;"></i> 구글 캘린더 예약 수정 / 상세`;
                    } else {
                        // Fetch full booking data by ID
                        const data = JSON.parse(localStorage.getItem('johorn_requests') || '[]');
                        const fullItem = data.find(item => item.id === booking.id);
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
            } else {
                cell.innerHTML = `<span class="date-num">${day}</span>`;
                cell.addEventListener('click', () => {
                    // Highlight active cell
                    document.querySelectorAll('#adminCalendarDates .calendar-cell').forEach(c => c.classList.remove('active-select'));
                    cell.classList.add('active-select');

                    // Hide Delete Button
                    if (adminResDeleteBtn) adminResDeleteBtn.classList.add('hidden');

                    // Set dates in form
                    const clickedDateStr = thisDate.toISOString().split('T')[0];
                    const checkinVal = adminResCheckinInput.value;
                    const checkoutVal = adminResCheckoutInput.value;

                    if (!checkinVal || (checkinVal && checkoutVal)) {
                        adminResCheckinInput.value = clickedDateStr;
                        adminResCheckoutInput.value = '';
                    } else if (checkinVal && !checkoutVal) {
                        if (clickedDateStr < checkinVal) {
                            adminResCheckinInput.value = clickedDateStr;
                        } else {
                            adminResCheckoutInput.value = clickedDateStr;
                        }
                    }
                    
                    // Reset name/memo input only if we were editing a previous booking
                    if (adminResIdInput.value) {
                        adminResIdInput.value = '';
                        adminResNameInput.value = '';
                        adminResContactInput.value = '';
                        adminResMemoInput.value = '';
                    }
                    adminFormTitle.innerHTML = `<i class="fa-solid fa-calendar-plus" style="margin-right: 6px;"></i> 직접 예약 등록 / 상세 정보`;
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

    // Admin Calendar Month Nav Navigation
    if (adminPrevMonthBtn && adminNextMonthBtn) {
        adminPrevMonthBtn.addEventListener('click', () => {
            adminMonth--;
            if (adminMonth < 0) {
                adminMonth = 11;
                adminYear--;
            }
            // Keep client calendar active range synced
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
            // Keep client calendar active range synced
            currentMonth = adminMonth;
            currentYear = adminYear;
            loadGcalEventsForCurrentMonth();
            renderAdminCalendar();
        });
    }

    // Save Reservation from Admin Form
    if (adminResSaveBtn) {
        adminResSaveBtn.addEventListener('click', async () => {
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

            const data = JSON.parse(localStorage.getItem('johorn_requests') || '[]');
            const isGcalConnectedVal = isGcalConnected();
            
            const bookingObj = {
                id: idVal,
                name: nameVal,
                contact: contactVal,
                checkin: checkinVal,
                checkout: checkoutVal,
                notes: memoVal
            };

            if (idVal) {
                const isGcalOnly = isNaN(idVal); // GCal string ID
                
                if (isGcalOnly) {
                    if (isGcalConnectedVal) {
                        alert('구글 캘린더 예약을 수정 중입니다...');
                        const gcalId = await saveGcalEvent(bookingObj);
                        if (gcalId) {
                            alert('구글 캘린더 예약이 성공적으로 수정되었습니다.');
                        } else {
                            alert('구글 캘린더 예약 수정에 실패했습니다.');
                            return;
                        }
                    } else {
                        alert('구글 연동 상태가 아닙니다. 구글 예약을 수정할 수 없습니다.');
                        return;
                    }
                } else {
                    // Local booking edit
                    const targetId = parseInt(idVal);
                    const existingItem = data.find(item => item.id === targetId);
                    
                    let syncedGcalId = null;
                    if (isGcalConnectedVal) {
                        alert('구글 캘린더 동기화 중...');
                        bookingObj.gcalEventId = existingItem ? existingItem.gcalEventId : null;
                        syncedGcalId = await saveGcalEvent(bookingObj);
                    }

                    const updated = data.map(item => {
                        if (item.id === targetId) {
                            item.name = nameVal;
                            item.contact = contactVal;
                            item.checkin = checkinVal;
                            item.checkout = checkoutVal;
                            item.notes = memoVal;
                            if (syncedGcalId) item.gcalEventId = syncedGcalId;
                        }
                        return item;
                    });
                    localStorage.setItem('johorn_requests', JSON.stringify(updated));
                    alert('예약이 수정되었습니다.');
                }
            } else {
                // Add new reservation directly (Status: approved/완료)
                let syncedGcalId = null;
                if (isGcalConnectedVal) {
                    alert('구글 캘린더 동기화 중...');
                    syncedGcalId = await saveGcalEvent(bookingObj);
                }

                const newRes = {
                    id: Date.now(),
                    type: 'stay',
                    name: nameVal,
                    contact: contactVal,
                    notes: memoVal,
                    status: 'approved', // Direct bookings are auto-approved
                    dateCreated: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
                    checkin: checkinVal,
                    checkout: checkoutVal,
                    gcalEventId: syncedGcalId || null
                };
                data.push(newRes);
                localStorage.setItem('johorn_requests', JSON.stringify(data));
                
                if (syncedGcalId) {
                    alert('구글 캘린더에 예약이 등록되었습니다.');
                } else {
                    alert('예약이 성공적으로 등록되었습니다.');
                }
            }

            // Reset form
            resetAdminResForm();
            // Refresh
            renderAdminDashboard();
            await loadGcalEventsForCurrentMonth();
        });
    }

    // Delete Reservation Button Click Handler
    if (adminResDeleteBtn) {
        adminResDeleteBtn.addEventListener('click', async () => {
            const idVal = adminResIdInput.value;
            if (!idVal) return;

            const confirmDel = confirm('이 예약을 정말 삭제하시겠습니까?');
            if (!confirmDel) return;

            const isGcalConnectedVal = isGcalConnected();
            const isGcalOnly = isNaN(idVal); // String GCal ID

            if (isGcalOnly) {
                if (isGcalConnectedVal) {
                    alert('구글 캘린더에서 예약을 삭제 중입니다...');
                    const success = await deleteGcalEvent(idVal);
                    if (success) {
                        alert('구글 캘린더 예약이 성공적으로 삭제되었습니다.');
                    } else {
                        alert('구글 캘린더 예약 삭제에 실패했습니다.');
                        return;
                    }
                } else {
                    alert('구글 연동 상태가 아닙니다. 구글 예약을 삭제할 수 없습니다.');
                    return;
                }
            } else {
                // Local storage booking deletion
                const targetId = parseInt(idVal);
                const data = JSON.parse(localStorage.getItem('johorn_requests') || '[]');
                const targetItem = data.find(item => item.id === targetId);

                // If connected and synced, delete from GCal
                if (isGcalConnectedVal && targetItem && targetItem.gcalEventId) {
                    alert('구글 캘린더 예약 동기화 삭제 중...');
                    await deleteGcalEvent(targetItem.gcalEventId);
                }

                // Filter out of local requests
                const filtered = data.filter(item => item.id !== targetId);
                localStorage.setItem('johorn_requests', JSON.stringify(filtered));
                alert('예약이 삭제되었습니다.');
            }

            // Reset and refresh
            resetAdminResForm();
            renderAdminDashboard();
            await loadGcalEventsForCurrentMonth();
        });
    }

    // Reset/Clear Admin Form
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
        document.querySelectorAll('#adminCalendarDates .calendar-cell').forEach(c => c.classList.remove('active-select'));
    }

    loadInstagramFeed();

    // Initial render if admin session is already active (rare but good for consistency)
    if (adminCalendarDates && !adminLoginSection.classList.contains('hidden')) {
        renderAdminCalendar();
    }

});


