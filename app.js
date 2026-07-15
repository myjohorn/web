// Application Core State and Logic for JohorN & Teega Stay
document.addEventListener('DOMContentLoaded', () => {
    
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
    // 3. Inquiry/Booking Form Logic (Conditional Fields)
    // ----------------------------------------------------
    const inquiryType = document.getElementById('inquiryType');
    const stayDateFields = document.getElementById('stayDateFields');
    const calendarWrapper = document.getElementById('calendarWrapper');

    // Toggle date input displays based on inquiry type selection
    inquiryType.addEventListener('change', () => {
        if (inquiryType.value === 'stay') {
            stayDateFields.classList.remove('hidden');
            calendarWrapper.classList.remove('hidden');
        } else {
            stayDateFields.classList.add('hidden');
            calendarWrapper.classList.add('hidden');
        }
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
    // 5. Booking and Inquiry Form Submission
    // ----------------------------------------------------
    const inquiryForm = document.getElementById('inquiryForm');

    inquiryForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const type = inquiryType.value;
        const name = document.getElementById('clientName').value.trim();
        const contact = document.getElementById('clientContact').value.trim();
        const notes = document.getElementById('additionalNotes').value.trim();

        // Validate stay date inputs if type is stay
        if (type === 'stay') {
            if (!checkinDate || !checkoutDate) {
                alert('예약을 위해 체크인 및 체크아웃 날짜를 달력에서 선택해 주세요.');
                return;
            }
        }

        // Structure Request Data
        const newRequest = {
            id: Date.now(),
            type: type,
            name: name,
            contact: contact,
            notes: notes,
            status: 'pending',
            dateCreated: new Date().toLocaleDateString(),
            checkin: type === 'stay' ? checkinDate.toISOString().split('T')[0] : null,
            checkout: type === 'stay' ? checkoutDate.toISOString().split('T')[0] : null
        };

        // Save to LocalStorage
        const requests = JSON.parse(localStorage.getItem('johorn_requests') || '[]');
        requests.push(newRequest);
        localStorage.setItem('johorn_requests', JSON.stringify(requests));

        // Alert Success
        if (type === 'stay') {
            alert('Teega Stay 숙소 예약 신청이 접수되었습니다. 관리자 승인 후 연락드리겠습니다.');
        } else {
            alert('이주정착 & 국제학교 상담 신청이 정상적으로 완료되었습니다. 조속히 피드백 드리겠습니다.');
        }

        // Reset state
        inquiryForm.reset();
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

});
