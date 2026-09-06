// Application Core State and Logic for JohorN & Teega Residence
window.onerror = function(message, source, lineno, colno, error) {
    console.error("[JohorN Error]", message, "at", source, "line:", lineno, error);
    return false;
};
window.addEventListener('unhandledrejection', function(event) {
    console.warn("[JohorN Unhandled Promise]", event.reason);
});
document.addEventListener('DOMContentLoaded', () => {
    // Google Calendar API Integration State & cache (declared at top to avoid Temporal Dead Zone)
    let tokenClient;
    let gcalEventsCache = [];
    
    // Global Reservations Cache (Synchronized with Firebase Realtime Database)
    let johornRequests = [];

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

    // Initialize Firebase Realtime Database
    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    // ── Firebase Realtime Listener ──
    // Sync all requests from Firebase into johornRequests and re-render calendar
    db.ref('requests').on('value', (snapshot) => {
        johornRequests = [];
        const data = snapshot.val();
        if (data) {
            Object.keys(data).forEach(key => {
                johornRequests.push({ id: key, ...data[key] });
            });
        }
        // Re-render calendar whenever booking data changes
        if (typeof renderCalendar === 'function') {
            renderCalendar();
        }
    });

    // ── Google Calendar Events Cache (from Firebase) ──
    // Admin syncs GCal events to Firebase at settings/gcal_events_cache.
    // Guest visitors read this cache to display GCal bookings on the front-end calendar.
    db.ref('settings/gcal_events_cache').on('value', (snapshot) => {
        gcalEventsCache = snapshot.val() || [];
        // Re-render calendar whenever GCal cache changes
        if (typeof renderCalendar === 'function') {
            renderCalendar();
        }
    });

    // ── Site Content CMS Hydration & Live Preview ──
    function applyCmsContent(contentData) {
        if (!contentData || typeof contentData !== 'object') return;
        
        document.querySelectorAll('[data-cms]').forEach(el => {
            const keyPath = el.getAttribute('data-cms');
            if (!keyPath) return;
            const parts = keyPath.split('.');
            let val = contentData;
            for (const part of parts) {
                if (val && typeof val === 'object' && part in val) {
                    val = val[part];
                } else {
                    val = undefined;
                    break;
                }
            }
            if (val !== undefined && val !== null && val !== '') {
                if (el.tagName === 'IMG') {
                    el.src = val;
                } else if (el.tagName === 'VIDEO') {
                    el.poster = val;
                } else if (el.tagName === 'A' && keyPath.endsWith('_link')) {
                    el.href = val;
                } else {
                    el.innerHTML = val;
                }
            }
        });
    }

    // 1. Listen for live CMS content from Firebase
    db.ref('site_content/live').on('value', (snapshot) => {
        const liveData = snapshot.val();
        if (liveData) {
            applyCmsContent(liveData);
        }
    });

    // 2. Listen for preview postMessage when embedded in Admin CMS Editor iframe
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'CMS_PREVIEW') {
            applyCmsContent(event.data.content);
        }
    });

    // ── Recent Blog Posts Loader on index.html ──
    const recentBlogPostsEl = document.getElementById('recentBlogPosts');
    if (recentBlogPostsEl) {
        db.ref('posts').on('value', (snapshot) => {
            const data = snapshot.val();
            const posts = [];
            if (data) {
                Object.keys(data).forEach(id => {
                    if (data[id] && (data[id].status === 'published' || !data[id].status)) {
                        posts.push({ id, ...data[id] });
                    }
                });
                posts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            }

            if (posts.length === 0) {
                recentBlogPostsEl.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; background: var(--white); border: 1px solid var(--border-color); border-radius: 10px;">
                        <i class="fa-regular fa-newspaper" style="font-size: 32px; color: #8C8782; margin-bottom: 12px;"></i>
                        <h4 style="margin-bottom: 6px; font-size: 16px;">등록된 소식이 준비 중입니다</h4>
                        <p style="font-size: 13px; color: var(--text-secondary); margin: 0;">조호바루 국제학교 및 정착 정보를 곧 업로드할 예정입니다.</p>
                    </div>
                `;
            } else {
                const recentThree = posts.slice(0, 3);
                recentBlogPostsEl.innerHTML = recentThree.map(post => {
                    const thumb = post.thumbnail || 'assets/stay_balcony.jpg';
                    const category = post.category || '생활정보';
                    const dateStr = post.createdAt ? new Date(post.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
                    return `
                        <a href="post.html?id=${post.id}" class="blog-card">
                            <div class="blog-card-img-wrap">
                                <img src="${thumb}" alt="${escapeCmsHtml(post.title)}" class="blog-card-thumb" onerror="this.src='assets/stay_balcony.jpg'">
                                <span class="blog-card-cat-badge">${escapeCmsHtml(category)}</span>
                            </div>
                            <div class="blog-card-body">
                                <h3 class="blog-card-title">${escapeCmsHtml(post.title)}</h3>
                                <p class="blog-card-summary">${escapeCmsHtml(post.summary || '')}</p>
                                <div class="blog-card-footer">
                                    <span><i class="fa-regular fa-calendar"></i> ${dateStr}</span>
                                    <span style="color: var(--accent-color); font-weight: 600;">자세히 보기 <i class="fa-solid fa-arrow-right"></i></span>
                                </div>
                            </div>
                        </a>
                    `;
                }).join('');
            }
        });
    }

    function escapeCmsHtml(text) {
        if (!text) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    // loadGcalEventsForCurrentMonth: On the public site, GCal events are loaded
    // via the Firebase listener above. This function is a no-op for guests.
    // (Admin page has its own full OAuth-based implementation.)
    function loadGcalEventsForCurrentMonth() {
        // Guest visitors rely on the Firebase gcal_events_cache listener.
        // No direct GCal API call needed here.
    }

    // ── Form Element References ──
    const stayBookingForm = document.getElementById('stayBookingForm');
    const consultingInquiryForm = document.getElementById('consultingInquiryForm');

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
    const logoLink = document.querySelector('.logo a');
    const header = document.querySelector('header');

    // Toggle Mobile Navigation Menu
    navToggle.addEventListener('click', () => {
        navLinksContainer.classList.toggle('active');
        navToggle.classList.toggle('open');
    });

    // Handle Active Tab Highlighting and Scroll Link Behaviour
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Close mobile menu if active
            navLinksContainer.classList.remove('active');
            navToggle.classList.remove('open');

            // Set Active Menu style
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    // Logo Click (Go to Home)
    logoLink.addEventListener('click', () => {
        navLinks.forEach(l => l.classList.remove('active'));
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
    const today = new Date();
    let currentYear = today.getFullYear();
    let currentMonth = today.getMonth(); // 0-indexed (current month)
    
    let checkinDate = null;
    let checkoutDate = null;

    const currentMonthYearLabel = document.getElementById('currentMonthYear');
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    const calendarDatesContainer = document.getElementById('calendarDates');
    const checkinDisplay = document.getElementById('checkinDisplay');
    const checkoutDisplay = document.getElementById('checkoutDisplay');

    // Fetch approved bookings map to lock dates (Returns: dateStr -> Array of bookings)
    function getLockedDatesMap() {
        const data = johornRequests;
        const map = {};
        
        const approvedRequests = data.filter(item => item.type === 'stay' && item.status === 'approved' && item.checkin && item.checkout);
        const localGcalIds = new Set();
        const localBookingsKeys = new Set();

        // 1. Merge local storage bookings (Status: approved/완료)
        approvedRequests.forEach(item => {
            if (item.gcalEventId) {
                localGcalIds.add(item.gcalEventId);
            }
            if (item.name && item.checkin && item.checkout) {
                localBookingsKeys.add(`${item.name.trim()}_${item.checkin}_${item.checkout}`);
            }

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
        });

        // 2. Merge Google Calendar events from cache (ignoring duplicates)
        gcalEventsCache.forEach(evt => {
            // Skip GCal event if already added from local reservations by ID
            if (evt.id && localGcalIds.has(evt.id)) {
                return;
            }

            // Extract clean name from GCal event summary (Format: "[숙소예약] 홍길동" or "홍길동")
            const cleanName = evt.summary ? evt.summary.replace(/^\[숙소예약\]\s*/, '').trim() : '';

            // Skip GCal event if already added from local reservations by name and dates
            const gcalKey = `${cleanName}_${evt.start}_${evt.end}`;
            if (localBookingsKeys.has(gcalKey)) {
                return;
            }

            let start = parseLocalDate(evt.start);
            let end = parseLocalDate(evt.end);
            while (start <= end) {
                const dateStr = getLocalDateString(start);
                
                if (!map[dateStr]) {
                    map[dateStr] = [];
                }
                map[dateStr].push({
                    id: evt.id, // String ID from GCal
                    name: cleanName || evt.summary,
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
            const dateStr = getLocalDateString(thisDate);

            const isToday = (thisDate.toDateString() === today.toDateString());

            // Highlight today
            if (isToday) {
                cell.classList.add('today');
            }

            // Disable past dates
            let isPast = thisDate < today && !isToday;
            let isBooked = lockedDatesMap[dateStr] && lockedDatesMap[dateStr].length > 0;

            if (isPast) {
                cell.classList.add('disabled');
            }

            // Disable locked (already booked) dates
            if (isBooked) {
                cell.classList.add('disabled');
                cell.classList.add('booked-cell');
            }

            // Set innerHTML (show masked name tags if booked)
            if (isBooked) {
                const bookingsList = lockedDatesMap[dateStr];
                const tagsMarkup = bookingsList.map(b => `<span class="booking-name-tag">${maskName(b.name)}</span>`).join('');
                cell.innerHTML = `<span class="date-num">${day}</span>${tagsMarkup}`;
            } else {
                cell.innerHTML = `<span class="date-num">${day}</span>`;
            }

            // Highlight selected range
            if (checkinDate && dateStr === getLocalDateString(checkinDate)) {
                cell.classList.add('selected');
            }
            if (checkoutDate && dateStr === getLocalDateString(checkoutDate)) {
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
    // Telegram Real-time Notification Dispatcher
    // ----------------------------------------------------
    const TELEGRAM_BOT_TOKEN = '8974842623:AAHG_TOs21lxUG3D45P5ZRA2WrOA86jS0eA';
    const TELEGRAM_CHAT_ID = '6587018091';

    function sendTelegramNotification(text) {
        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: text
            })
        }).catch(err => console.error('Telegram notification error:', err));
    }

    // ----------------------------------------------------
    // Email Notification Dispatcher (to myjohorn@gmail.com)
    // ----------------------------------------------------
    function sendEmailNotification(subject, formData) {
        fetch('https://formsubmit.co/ajax/myjohorn@gmail.com', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                _subject: `[조호엔 알림] ${subject}`,
                _template: 'table',
                _captcha: 'false',
                ...formData
            })
        }).catch(err => console.error('Email notification error:', err));
    }

    // Track form submission states to gate KakaoTalk chat button access
    let isStaySubmitted = false;
    let isConsultSubmitted = false;

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
            type: 'stay',
            name: name,
            contact: contact,
            notes: notes,
            status: 'pending',
            dateCreated: getLocalDateString(new Date()),
            checkin: getLocalDateString(checkinDate),
            checkout: getLocalDateString(checkoutDate)
        };

        // Save to Firebase
        db.ref('requests').push(newRequest);

        // Dispatch Telegram Notification
        const telegramMsg = `🏠 [조호엔 숙소 예약 접수]\n\n• 신청자: ${name}\n• 연락처: ${contact}\n• 체크인: ${getLocalDateString(checkinDate)}\n• 체크아웃: ${getLocalDateString(checkoutDate)}\n• 인원: 성인 ${adults}명, 아동 ${children}명\n• 요청사항: ${notesRaw || '없음'}`;
        sendTelegramNotification(telegramMsg);

        // Dispatch Email Notification to myjohorn@gmail.com
        sendEmailNotification(`[숙소 예약 접수] ${name} 님`, {
            "신청 구분": "Teega Residence 3베드룸 오션뷰 숙소 예약",
            "신청자 성함": name,
            "연락처": contact,
            "체크인 날짜": getLocalDateString(checkinDate),
            "체크아웃 날짜": getLocalDateString(checkoutDate),
            "투숙 인원": `성인 ${adults}명, 아동 ${children}명`,
            "요청 및 문의사항": notesRaw || '없음',
            "접수 일시": new Date().toLocaleString('ko-KR')
        });

        // Open KakaoTalk channel window before alert to avoid popup blocker on mobile
        const kakaoWindow = window.open('https://pf.kakao.com/_vPVLb/chat', '_blank');

        alert('Teega Residence 숙소 예약 신청이 접수되었습니다!\n실시간 상담을 위해 조호엔 카카오톡 채널 창으로 연결됩니다.');

        isStaySubmitted = true; // Mark as submitted

        // Highlight the KakaoTalk chat button below
        const stayKakaoBtn = document.getElementById('stayKakaoBtn');
        if (stayKakaoBtn) {
            stayKakaoBtn.classList.add('active-highlight');
        }

        // Reset state
        stayBookingForm.reset();
        checkinDate = null;
        checkoutDate = null;
        checkinDisplay.textContent = '달력에서 선택해 주세요';
        checkoutDisplay.textContent = '달력에서 선택해 주세요';
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
            type: 'consulting',
            name: name,
            contact: contact,
            notes: notes,
            status: 'pending',
            dateCreated: getLocalDateString(new Date()),
            checkin: null,
            checkout: null
        };

        // Save to Firebase
        db.ref('requests').push(newRequest);

        // Dispatch Telegram Notification
        const telegramMsg = `📋 [조호엔 상담 신청 접수]\n\n• 신청자: ${name}\n• 연락처: ${contact}\n• 희망분야: ${categories.join(', ')}\n• 희망학교: ${targetSchool || '미정/없음'}\n• 예정시기: ${targetDate || '미정'}\n• 상세내용: ${notesRaw || '없음'}`;
        sendTelegramNotification(telegramMsg);

        // Dispatch Email Notification to myjohorn@gmail.com
        sendEmailNotification(`[상담 신청 접수] ${name} 님`, {
            "신청 구분": "이주정착 & 국제학교 상담 신청",
            "신청자 성함": name,
            "연락처": contact,
            "상담 희망 분야": categories.join(', '),
            "희망 학교": targetSchool || '미정/없음',
            "예정 시기": targetDate || '미정',
            "상세 내용": notesRaw || '없음',
            "접수 일시": new Date().toLocaleString('ko-KR')
        });

        // Open KakaoTalk channel window before alert to avoid popup blocker on mobile
        const kakaoWindow = window.open('https://pf.kakao.com/_vPVLb/chat', '_blank');

        alert('이주정착 & 학교 상담 신청이 완료되었습니다!\n실시간 상담을 위해 조호엔 카카오톡 채널 창으로 연결됩니다.');

        isConsultSubmitted = true; // Mark as submitted

        // Highlight the KakaoTalk chat button below
        const consultKakaoBtn = document.getElementById('consultKakaoBtn');
        if (consultKakaoBtn) {
            consultKakaoBtn.classList.add('active-highlight');
        }

        // Reset state
        consultingInquiryForm.reset();
    });

    // Gate KakaoTalk buttons until respective forms are submitted
    const stayKakaoBtn = document.getElementById('stayKakaoBtn');
    if (stayKakaoBtn) {
        stayKakaoBtn.addEventListener('click', (e) => {
            if (!isStaySubmitted) {
                e.preventDefault();
                alert('예약신청 먼저 접수해주세요.');
            }
        });
    }

    const consultKakaoBtn = document.getElementById('consultKakaoBtn');
    if (consultKakaoBtn) {
        consultKakaoBtn.addEventListener('click', (e) => {
            if (!isConsultSubmitted) {
                e.preventDefault();
                alert('상담신청 먼저 접수해주세요.');
            }
        });
    }

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

    // ==========================================================================
    // Ambient UI & Interactive Motion Effects (Added 2026-08-13)
    // ==========================================================================

    // 1. Scroll-Reactive Header Hiding/Revealing
    let lastScrollTop = 0;
    const scrollThreshold = 10;
    const headerEl = document.querySelector('header');
    const navLinksEl = document.getElementById('navLinks');

    window.addEventListener('scroll', () => {
        if (!headerEl) return;

        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // Prevent bounce effect errors on mobile devices
        if (scrollTop < 0) {
            scrollTop = 0;
        }

        // If mobile nav list is currently open, do not hide header
        const isMobileMenuOpen = navLinksEl && navLinksEl.classList.contains('active');

        if (Math.abs(scrollTop - lastScrollTop) <= scrollThreshold) {
            return;
        }

        if (scrollTop > lastScrollTop && scrollTop > 100 && !isMobileMenuOpen) {
            // Scrolling down -> hide header
            headerEl.classList.add('header-hidden');
        } else {
            // Scrolling up -> show header
            headerEl.classList.remove('header-hidden');
        }

        lastScrollTop = scrollTop;
    });
});



