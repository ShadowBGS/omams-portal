/* ============================================================
   OMAMS – Attendance Web Portal  |  app.js  v2
   ============================================================ */
'use strict';

// Configuration loaded from config.js
const FIREBASE_CONFIG = CONFIG.firebase;
const API_BASE = CONFIG.apiBaseUrl;
const DEBUG_MODE = CONFIG.features.enableDebugLogging;

firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// ── App state ─────────────────────────────────────────────────
let currentUser = null;
let userProfile = null;
let idToken = null;
let allSessions = [];
let sortState = { col: null, dir: 1 };

// Lecturer state
let lecturerCourses = [];
let selectedCourseId = null;
let selectedCourseCode = '';
let selectedCourseName = '';
let lecturerSessions = [];
let sessionAttendance = [];
let lecturerStudents = [];
let lecturerStudentQuery = '';
let selectedLecturerStudentId = null;
let selectedLecturerStudentCourseId = null;
let lecturerStudentCourseAttendance = [];

// ─────────────────────────────────────────────────────────────
//  AUTH
// ─────────────────────────────────────────────────────────────

function hideSplash() {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;
  splash.style.transition = 'opacity 0.35s ease';
  splash.style.opacity = '0';
  setTimeout(() => splash.remove(), 360);
}

// Handle redirect result (for Google sign-in redirect method)
auth.getRedirectResult().then((result) => {
  if (result.user) {
    // User signed in via redirect, auth state listener will handle it
    console.log('Google sign-in via redirect successful');
  }
}).catch((error) => {
  if (error.code !== 'auth/popup-closed-by-user') {
    console.error('Redirect result error:', error);
  }
});

auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    idToken = await user.getIdToken(false);
    hideSplash();
    await bootDashboard();
  } else {
    currentUser = null; idToken = null;
    hideSplash();
    showLoginPage();
  }
});

async function getToken() {
  idToken = await currentUser.getIdToken(false);
  return idToken;
}

// ─────────────────────────────────────────────────────────────
//  LOGIN
// ─────────────────────────────────────────────────────────────

function switchTab(tab) {
  ['email', 'google'].forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle('active', t === tab);
    document.getElementById(`panel-${t}`).classList.toggle('hidden', t !== tab);
  });
}

async function emailLogin() {
  const email = document.getElementById('input-email').value.trim();
  const password = document.getElementById('input-password').value;
  const errEl = document.getElementById('auth-error');
  errEl.classList.add('hidden');

  if (!email || !password) {
    showAuthError('Please enter your email and password.');
    return;
  }

  if (!email.includes('@')) {
    showAuthError('Please enter a valid email address.');
    return;
  }

  const btn = document.getElementById('btn-email-login');
  const btnText = document.getElementById('btn-email-text');
  btnText.textContent = 'Signing in…';
  btn.disabled = true;

  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (e) {
    console.error('Email login error:', e);
    showAuthError(friendlyAuthError(e.code));
    btnText.textContent = 'Sign in';
    btn.disabled = false;
  }
}

async function googleLogin() {
  const errEl = document.getElementById('google-error');
  const btn = document.getElementById('btn-google-login');
  errEl.classList.add('hidden');
  btn.disabled = true;
  btn.innerHTML = `<span style="display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite"></span> Signing in…`;

  try {
    // Try popup first (faster UX)
    await auth.signInWithPopup(googleProvider);
  } catch (e) {
    console.error('Google sign-in error:', e);

    // If popup was blocked, automatically fall back to redirect
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/cancelled-popup-request') {
      try {
        // Redirect method works even with popup blockers
        await auth.signInWithRedirect(googleProvider);
        // User will be redirected, don't reset button
        return;
      } catch (redirectError) {
        console.error('Google redirect error:', redirectError);
        errEl.textContent = 'Unable to sign in with Google. Please enable popups or try email login.';
      }
    } else {
      errEl.textContent = friendlyAuthError(e.code);
    }

    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg> Continue with Google`;
  }
}

async function logout() {
  await auth.signOut();
}

function friendlyAuthError(code) {
  return ({
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/too-many-requests': 'Too many failed attempts. Try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/popup-closed-by-user': 'Sign-in cancelled.',
    'auth/invalid-credential': 'Invalid email or password.',
  })[code] ?? 'Authentication failed. Please try again.';
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

// ─────────────────────────────────────────────────────────────
//  PAGE SWITCHES
// ─────────────────────────────────────────────────────────────

function showLoginPage() {
  document.getElementById('login-page').classList.remove('hidden');
  document.getElementById('dashboard-page').classList.add('hidden');

  // Reset Google button to its default state (clears the "Signing in…" spinner
  // that persists after a sign-out or a failed sign-in attempt).
  const googleBtn = document.getElementById('btn-google-login');
  if (googleBtn) {
    googleBtn.disabled = false;
    googleBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg> Continue with Google`;
  }

  // Reset email button too
  const emailBtn = document.getElementById('btn-email-login');
  const emailBtnText = document.getElementById('btn-email-text');
  if (emailBtn) emailBtn.disabled = false;
  if (emailBtnText) emailBtnText.textContent = 'Sign in';

  // Hide any leftover error messages
  document.getElementById('auth-error')?.classList.add('hidden');
  document.getElementById('google-error')?.classList.add('hidden');

  // Always land back on the Email tab (not the Google tab mid-spinner)
  switchTab('email');
}

function showDashboardPage() {
  document.getElementById('login-page').classList.add('hidden');
  document.getElementById('dashboard-page').classList.remove('hidden');
}

// ─────────────────────────────────────────────────────────────
//  BOOT
// ─────────────────────────────────────────────────────────────

async function bootDashboard() {
  showDashboardPage();

  const name = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
  document.getElementById('user-display-name').textContent = name;

  const avatarEl = document.getElementById('user-avatar-el');
  const photoURL = currentUser.photoURL;
  avatarEl.innerHTML = `<img src="${photoURL || 'avatar.svg'
    }" alt="avatar" onerror="this.src='avatar.svg'" />`;

  setMain(skeletonHTML());

  try {
    userProfile = await apiGet('/profile/info');
  } catch (_) {
    try {
      await apiPost('/auth/bootstrap', { role: 'student' });
      userProfile = await apiGet('/profile/info');
    } catch (e2) {
      const errorDetail = DEBUG_MODE
        ? `Cannot connect to backend at ${API_BASE}`
        : 'Please check your internet connection and try again.';
      setMain(errorState('Could not reach the backend.', errorDetail));
      return;
    }
  }

  // Auto-repair: if the role-specific DB row (students/lecturers table) is missing,
  // call /profile/complete to create it using the existing profile data.
  if (userProfile && userProfile.role_record_exists === false && userProfile.external_id) {
    try {
      await apiPost('/profile/complete', {
        external_id: userProfile.external_id,
        department: userProfile.department ?? 'Unknown',
        name: userProfile.name ?? currentUser.displayName ?? '',
      });
      userProfile = await apiGet('/profile/info');
      toast('✓ Account linked successfully', 'success');
    } catch (repairErr) {
      console.warn('Auto-repair failed:', repairErr.message);
      // Not fatal — continue, but data may be empty
    }
  }

  const role = userProfile?.role ?? 'student';
  document.getElementById('user-display-role').textContent =
    role.charAt(0).toUpperCase() + role.slice(1);

  buildSidebar(role);
  navigateTo(role === 'lecturer' ? 'lecturer-courses' : 'student-attendance');
}

// ─────────────────────────────────────────────────────────────
//  SIDEBAR
// ─────────────────────────────────────────────────────────────

function buildSidebar(role) {
  const items = role === 'lecturer'
    ? [
      { id: 'lecturer-courses', icon: '📚', label: 'My Courses' },
      { id: 'lecturer-sessions', icon: '📅', label: 'Sessions' },
      { id: 'lecturer-students', icon: '👥', label: 'Students' },
    ]
    : [
      { id: 'student-attendance', icon: '📋', label: 'Attendance' },
      { id: 'student-courses', icon: '📚', label: 'My Courses' },
    ];

  document.getElementById('sidebar-nav').innerHTML = items.map(i => `
    <button class="nav-item" id="nav-${i.id}" onclick="navigateTo('${i.id}')">
      <span class="icon">${i.icon}</span>${i.label}
    </button>`).join('') + `
    <div style="margin-top:auto; padding:0 12px">
      <a class="btn-download" style="padding:10px 14px; margin-top:16px" href="https://github.com/ShadowBGS/omams-portal/releases/download/v1.0.0/OMAMS.apk" download="OMAMS.apk">
        <span class="dl-icon" style="font-size:1.1rem">📱</span>
        <span class="dl-text">
          <span class="dl-label" style="font-size:0.75rem">Download OMAMS</span>
        </span>
      </a>
    </div>`;
}

function setActiveNav(id) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById(`nav-${id}`)?.classList.add('active');
}

function navigateTo(view) {
  setActiveNav(view);
  closeMobileSidebar();
  switch (view) {
    case 'student-attendance': return renderStudentAttendance();
    case 'student-courses': return renderStudentCourses();
    case 'lecturer-courses': return renderLecturerCourses();
    case 'lecturer-sessions':
      if (!selectedCourseId) return renderLecturerCourses();
      return renderLecturerSessions();
    case 'lecturer-students': return renderLecturerStudents();
  }
}

// Mobile sidebar
function toggleMobileSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
function closeMobileSidebar() { document.getElementById('sidebar').classList.remove('open'); }

// ─────────────────────────────────────────────────────────────
//  GREETING
// ─────────────────────────────────────────────────────────────

function greetingBanner(name) {
  const h = new Date().getHours();
  const [period, emoji] =
    h < 12 ? ['Good morning', '☀️'] :
      h < 17 ? ['Good afternoon', '👋'] :
        ['Good evening', '🌙'];
  const firstName = name.split(' ')[0];
  return `
  <div class="greeting-banner">
    <div class="greeting-text">
      <div class="greeting-time">${period}</div>
      <h3>${firstName}!</h3>
      <p>Here's a summary of your attendance records.</p>
    </div>
    <div class="greeting-emoji">${emoji}</div>
  </div>`;
}

// ─────────────────────────────────────────────────────────────
//  STUDENT – ATTENDANCE
// ─────────────────────────────────────────────────────────────

async function renderStudentAttendance() {
  setMain(skeletonHTML());
  try {
    allSessions = (await apiGetAllPages('/student/my-sessions')) ?? [];
    sortState = { col: null, dir: 1 };
    setMain(buildStudentAttendanceHTML(allSessions, null));
  } catch (e) {
    console.error('Failed to load student attendance:', e);
    setMain(errorState('Failed to load attendance.', e.message || 'Please check your connection and try again.'));
  }
}

async function renderCourseAttendance(courseCode) {
  setMain(skeletonHTML());
  // reuse allSessions if already loaded, otherwise fetch
  if (!allSessions.length) {
    try { allSessions = (await apiGetAllPages('/student/my-sessions')) ?? []; }
    catch (e) { setMain(errorState('Failed to load attendance.', e.message)); return; }
  }
  const courseSessions = allSessions.filter(s => s.course_code === courseCode);
  sortState = { col: null, dir: 1 };
  setMain(buildStudentAttendanceHTML(courseSessions, courseCode));
}

function buildStudentAttendanceHTML(sessions, courseFilter) {
  const name = currentUser.displayName || currentUser.email?.split('@')[0] || 'there';
  const total = sessions.length;
  const present = sessions.filter(s => s.attendance_status === 'present').length;
  const absent = sessions.filter(s => !s.attendance_status || s.attendance_status === 'absent').length;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  // Per-course breakdown
  const courseMap = {};
  sessions.forEach(s => {
    if (!courseMap[s.course_code]) courseMap[s.course_code] = { total: 0, present: 0 };
    courseMap[s.course_code].total++;
    if (s.attendance_status === 'present') courseMap[s.course_code].present++;
  });
  const breakdownHTML = Object.entries(courseMap).map(([code, d]) => {
    const r = d.total > 0 ? Math.round((d.present / d.total) * 100) : 0;
    const color = r >= 80 ? '#22c55e' : r >= 60 ? '#f59e0b' : '#ef4444';
    return `
    <div class="breakdown-item">
      <span class="breakdown-code">${esc(code)}</span>
      <div class="breakdown-bar-track">
        <div class="breakdown-bar-fill" style="width:${r}%;background:${color}"></div>
      </div>
      <span class="breakdown-pct">${r}%</span>
    </div>`;
  }).join('');

  // Ring
  const ringColor = rate >= 80 ? '#22c55e' : rate >= 60 ? '#f59e0b' : '#ef4444';
  const r = 42; const circ = 2 * Math.PI * r;
  const offset = circ - (rate / 100) * circ;

  const courses = [...new Set(sessions.map(s => s.course_code))].sort();

  return `
  ${courseFilter ? '' : greetingBanner(name)}

  ${courseFilter ? `
  <button class="back-link" onclick="renderStudentAttendance()">← Back to All Attendance</button>
  <div class="page-header">
    <h2>${esc(sessions[0]?.course_code ?? courseFilter)}</h2>
    <p>${esc(sessions[0]?.course_name ?? '')} · ${total} session(s)</p>
  </div>` : ''}

  <!-- Attendance rate card -->
  <div class="rate-card">
    <div class="ring-wrap">
      <svg viewBox="0 0 100 100">
        <circle class="ring-bg"   cx="50" cy="50" r="${r}" />
        <circle class="ring-fill" cx="50" cy="50" r="${r}"
          stroke="${ringColor}"
          stroke-dasharray="${circ}"
          stroke-dashoffset="${offset}"
          id="ring-fill-el" />
      </svg>
      <div class="ring-label">
        <span class="ring-pct" style="color:${ringColor}">${rate}%</span>
        <span class="ring-sub">RATE</span>
      </div>
    </div>
    <div class="rate-info">
      <h3>Overall Attendance Rate</h3>
      <p>${present} present out of ${total} sessions across ${Object.keys(courseMap).length} course(s).</p>
      <div class="course-breakdown">${breakdownHTML || '<span style="color:var(--text-muted);font-size:.8rem">No sessions yet.</span>'}</div>
    </div>
  </div>

  <!-- Quick stats -->
  <div class="stats-grid">
    <div class="stat-card c-purple">
      <div class="stat-icon">📋</div>
      <div class="stat-label">Total Sessions</div>
      <div class="stat-value" id="stat-total">${total}</div>
    </div>
    <div class="stat-card c-green">
      <div class="stat-icon">✅</div>
      <div class="stat-label">Present</div>
      <div class="stat-value good" id="stat-present">${present}</div>
    </div>
    <div class="stat-card c-red">
      <div class="stat-icon">❌</div>
      <div class="stat-label">Absent</div>
      <div class="stat-value ${absent > 0 ? 'warn' : ''}" id="stat-absent">${absent}</div>
    </div>
  </div>

  <!-- Session table -->
  <div class="section-card">
    <div class="section-header">
      <h3>Session History</h3>
      <div class="actions">
        <button class="btn-export" onclick="exportStudentCSV()">⬇ Export CSV</button>
      </div>
    </div>
    <div class="filters-bar">
      <input type="search" class="search-input" id="search-input" placeholder="Search course…" oninput="applyFilters()" />
      <select class="filter-select" id="filter-course" onchange="applyFilters()">
        <option value="">All Courses</option>
        ${courses.map(c => `<option value="${c}" ${courseFilter === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
      <select class="filter-select" id="filter-status" onchange="applyFilters()">
        <option value="">All Statuses</option>
        <option value="present">✅ Present</option>
        <option value="absent">❌ Absent</option>
      </select>
      <span class="filter-count" id="filter-count">${total} sessions</span>
    </div>
    <div class="table-wrap">
      <table id="att-table">
        <thead>
          <tr>
            <th onclick="sortTable('course_code')" data-col="course_code">Course<span class="sort-arrow">↕</span></th>
            <th onclick="sortTable('start_time')"  data-col="start_time">Date<span class="sort-arrow">↕</span></th>
            <th>Start</th>
            <th>End</th>
            <th onclick="sortTable('attendance_status')" data-col="attendance_status">Status<span class="sort-arrow">↕</span></th>
          </tr>
        </thead>
        <tbody id="att-tbody">
          ${buildAttendanceRows(sessions)}
        </tbody>
      </table>
    </div>
  </div>`;
}

function buildAttendanceRows(sessions) {
  if (!sessions.length) return `<tr><td colspan="5">${emptyRowHTML('No sessions match your filters.')}</td></tr>`;
  return sessions.map(s => {
    const status = s.attendance_status ?? 'absent';
    const rowClass = `row-${status}`;
    return `
    <tr class="${rowClass}">
      <td>
        <span class="course-code-pill">${esc(s.course_code)}</span>
        <span style="margin-left:8px;font-size:.78rem;color:var(--text-muted)">${esc(s.course_name)}</span>
      </td>
      <td class="session-date-label">${formatDate(s.start_time)}</td>
      <td style="color:var(--text-soft)">${formatTime(s.start_time)}</td>
      <td style="color:var(--text-soft)">${formatTime(s.end_time)}</td>
      <td>${statusBadge(status)}</td>
    </tr>`;
  }).join('');
}

// Filtering
function applyFilters() {
  const q = (document.getElementById('search-input')?.value ?? '').toLowerCase();
  const course = document.getElementById('filter-course')?.value ?? '';
  const status = document.getElementById('filter-status')?.value ?? '';

  let filtered = allSessions.filter(s => {
    const cMatch = !course || s.course_code === course;
    const sMatch = !status || (s.attendance_status ?? 'absent') === status;
    const qMatch = !q || s.course_code.toLowerCase().includes(q) || s.course_name.toLowerCase().includes(q);
    return cMatch && sMatch && qMatch;
  });

  // Apply current sort
  filtered = applySortToData(filtered);

  document.getElementById('att-tbody').innerHTML = buildAttendanceRows(filtered);
  const countEl = document.getElementById('filter-count');
  if (countEl) countEl.textContent = `${filtered.length} session${filtered.length !== 1 ? 's' : ''}`;
}

// Sorting
function sortTable(col) {
  if (sortState.col === col) sortState.dir *= -1;
  else { sortState.col = col; sortState.dir = 1; }

  // Update header arrows
  document.querySelectorAll('#att-table th[data-col]').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.col === col) {
      th.classList.add(sortState.dir === 1 ? 'sort-asc' : 'sort-desc');
      const arrow = th.querySelector('.sort-arrow');
      if (arrow) arrow.textContent = sortState.dir === 1 ? '↑' : '↓';
    } else {
      const arrow = th.querySelector('.sort-arrow');
      if (arrow) arrow.textContent = '↕';
    }
  });

  applyFilters();
}

function applySortToData(data) {
  if (!sortState.col) return data;
  return [...data].sort((a, b) => {
    let av = a[sortState.col] ?? '', bv = b[sortState.col] ?? '';
    if (typeof av === 'string') av = av.toLowerCase(), bv = bv.toLowerCase();
    return av < bv ? -sortState.dir : av > bv ? sortState.dir : 0;
  });
}

function exportStudentCSV() {
  const q = (document.getElementById('search-input')?.value ?? '').toLowerCase();
  const course = document.getElementById('filter-course')?.value ?? '';
  const status = document.getElementById('filter-status')?.value ?? '';
  const filtered = allSessions.filter(s => {
    const cMatch = !course || s.course_code === course;
    const sMatch = !status || (s.attendance_status ?? 'absent') === status;
    const qMatch = !q || s.course_code.toLowerCase().includes(q) || s.course_name.toLowerCase().includes(q);
    return cMatch && sMatch && qMatch;
  });
  downloadCSV([
    ['Course Code', 'Course Name', 'Date', 'Start Time', 'End Time', 'Status'],
    ...filtered.map(s => [
      s.course_code, s.course_name,
      formatDate(s.start_time), formatTime(s.start_time), formatTime(s.end_time),
      s.attendance_status ?? 'absent',
    ]),
  ], 'my_attendance.csv');
  toast('✓ CSV downloaded', 'success');
}

// ─────────────────────────────────────────────────────────────
//  STUDENT – COURSES
// ─────────────────────────────────────────────────────────────

async function renderStudentCourses() {
  setMain(skeletonHTML());
  try {
    const info = await apiGet('/student/my-courses');
    setMain(buildStudentCoursesHTML(info));
  } catch (e) {
    console.error('Failed to load student courses:', e);
    setMain(errorState('Failed to load courses.', e.message || 'Please check your connection and try again.'));
  }
}

function buildStudentCoursesHTML(info) {
  const courses = info.enrolled_courses ?? [];
  return `
  <div class="page-header">
    <h2>My Courses</h2>
    <p>Matric No: <strong style="color:var(--accent2)">${esc(info.matric_no ?? '—')}</strong> &nbsp;·&nbsp; ${info.total_enrollments} course(s)</p>
  </div>
  <div class="section-card">
    <div class="section-header"><h3>Enrolled Courses</h3></div>
    <div class="course-grid">
      ${courses.length === 0
      ? `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📚</div><p>No courses found yet.<br><small>Attend a session first to appear here.</small></p></div>`
      : courses.map(c => `
          <div class="course-card" onclick="jumpToAttendance('${esc(c.course_code)}')">
            <div class="course-card-top">
              <span class="course-code-pill">${esc(c.course_code)}</span>
              <span class="course-card-icon">📖</span>
            </div>
            <div class="course-card-name">${esc(c.course_name)}</div>
            <div class="course-card-meta">
              <span>View attendance →</span>
            </div>
          </div>`).join('')
    }
    </div>
  </div>`;
}

function jumpToAttendance(code) {
  setActiveNav('student-attendance');
  closeMobileSidebar();
  renderCourseAttendance(code);
}

// ─────────────────────────────────────────────────────────────
//  LECTURER – COURSES
// ─────────────────────────────────────────────────────────────

async function renderLecturerCourses() {
  selectedCourseId = null;
  setMain(skeletonHTML());
  try {
    const resp = await apiGet('/courses/my-courses');
    lecturerCourses = resp.courses ?? [];
    setMain(buildLecturerCoursesHTML());
  } catch (e) {
    console.error('Failed to load lecturer courses:', e);
    setMain(errorState('Failed to load courses.', e.message || 'Please check your connection and try again.'));
  }
}

function buildLecturerCoursesHTML() {
  const name = currentUser.displayName || currentUser.email?.split('@')[0] || 'Lecturer';
  return `
  ${greetingBanner(name)}
  <div class="page-header">
    <h2>My Courses</h2>
    <p>Click a course to view its sessions and attendance records.</p>
  </div>
  <div class="section-card">
    <div class="section-header">
      <h3>Courses <span style="color:var(--text-muted);font-weight:400;font-size:0.8rem">(${lecturerCourses.length})</span></h3>
    </div>
    <div class="course-grid">
      ${lecturerCourses.length === 0
      ? `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📚</div><p>No courses found.<br><small>Create your first course in the mobile app.</small></p></div>`
      : lecturerCourses.map(c => `
          <div class="course-card" onclick="openLecturerCourse(${c.course_id},'${esc(c.course_code)}','${esc(c.course_name)}')">
            <div class="course-card-top">
              <span class="course-code-pill">${esc(c.course_code)}</span>
              <span class="course-card-icon">🎓</span>
            </div>
            <div class="course-card-name">${esc(c.course_name)}</div>
            <div class="course-card-meta"><span>View sessions →</span></div>
          </div>`).join('')
    }
    </div>
  </div>`;
}

async function openLecturerCourse(id, code, name) {
  selectedCourseId = id;
  selectedCourseCode = code;
  selectedCourseName = name;
  setActiveNav('lecturer-sessions');
  await renderLecturerSessions();
}

// ─────────────────────────────────────────────────────────────
//  LECTURER – SESSIONS
// ─────────────────────────────────────────────────────────────

async function renderLecturerSessions() {
  setMain(skeletonHTML());
  try {
    lecturerSessions = await apiGetAllPages(`/courses/${selectedCourseId}/sessions`);
    setMain(buildLecturerSessionsHTML());
  } catch (e) {
    console.error('Failed to load lecturer sessions:', e);
    setMain(errorState('Failed to load sessions.', e.message || 'Please check your connection and try again.'));
  }
}

function buildLecturerSessionsHTML() {
  return `
  <button class="back-link" onclick="navigateTo('lecturer-courses')">← Back to Courses</button>
  <div class="page-header">
    <h2>${esc(selectedCourseCode)}</h2>
    <p>${esc(selectedCourseName)}</p>
  </div>

  <div class="section-card">
    <div class="section-header">
      <h3>Sessions <span style="color:var(--text-muted);font-weight:400;font-size:0.8rem">(${lecturerSessions.length})</span></h3>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Start</th>
            <th>End</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${lecturerSessions.length === 0
      ? `<tr><td colspan="5">${emptyRowHTML('No sessions yet.')}</td></tr>`
      : lecturerSessions.map((s, i) => `
              <tr>
                <td><span class="session-num-badge">${i + 1}</span></td>
                <td class="session-date-label">${formatDate(s.start_time)}</td>
                <td style="color:var(--text-soft)">${formatTime(s.start_time)}</td>
                <td style="color:var(--text-soft)">${formatTime(s.end_time)}</td>
                <td>
                  <button class="btn-view" onclick="loadSessionAttendance(${s.session_id})">
                    👥 View Attendance
                  </button>
                </td>
              </tr>`).join('')
    }
        </tbody>
      </table>
    </div>
  </div>

  <div id="session-panel" class="section-card hidden"></div>`;
}

async function loadSessionAttendance(sessionId) {
  const panel = document.getElementById('session-panel');
  if (!panel) return;
  panel.classList.remove('hidden');
  panel.innerHTML = skeletonHTML(2);
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  try {
    sessionAttendance = await apiGetAllPages(`/sessions/${sessionId}/attendance`);
    panel.innerHTML = buildSessionAttendanceHTML(sessionId);
  } catch (e) {
    panel.innerHTML = errorState('Failed to load attendance.', e.message);
  }
}

function buildSessionAttendanceHTML(sessionId) {
  const session = lecturerSessions.find(s => s.session_id === sessionId);
  const records = sessionAttendance;
  const total = records.length;
  const present = records.filter(r => r.status === 'present').length;
  const absent = records.filter(r => !r.status || r.status === 'absent').length;
  const verified = records.filter(r => r.verified).length;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  // Session search
  return `
  <div class="section-header">
    <h3>📅 ${session ? formatDate(session.start_time) : `Session ${sessionId}`} — Attendance</h3>
    <div class="actions">
      <button class="btn-export" onclick="exportLecturerCSV(${sessionId})">⬇ Export CSV</button>
    </div>
  </div>

  <div class="summary-bar">
    <div class="summary-stat">
      <span class="summary-label">Total</span>
      <span class="summary-value">${total}</span>
    </div>
    <div class="summary-stat">
      <span class="summary-label">Present</span>
      <span class="summary-value" style="color:var(--success)">${present}</span>
    </div>
    <div class="summary-stat">
      <span class="summary-label">Absent</span>
      <span class="summary-value" style="color:var(--danger)">${absent}</span>
    </div>
    <div class="summary-stat">
      <span class="summary-label">Rate</span>
      <span class="summary-value" style="color:${rate >= 80 ? 'var(--success)' : 'var(--warning)'}">${rate}%</span>
    </div>
    <div class="summary-stat">
      <span class="summary-label">Face Verified</span>
      <span class="summary-value" style="color:var(--accent2)">${verified}</span>
    </div>
  </div>

  <div class="filters-bar">
    <input type="search" class="search-input" id="sess-search" placeholder="Search by name or matric…" oninput="filterSessionTable()" />
    <select class="filter-select" id="sess-status-filter" onchange="filterSessionTable()">
      <option value="">All Statuses</option>
      <option value="present">✅ Present</option>
      <option value="absent">❌ Absent</option>
    </select>
    <span class="filter-count" id="sess-count">${total} students</span>
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Matric No</th>
          <th>Department</th>
          <th>Status</th>
          <th>Verified</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody id="sess-tbody">
        ${buildSessionRows(records)}
      </tbody>
    </table>
  </div>`;
}

function buildSessionRows(records) {
  if (!records.length) return `<tr><td colspan="6">${emptyRowHTML('No attendance records yet.')}</td></tr>`;
  return records.map(r => {
    const status = r.status ?? 'absent';
    return `
    <tr class="row-${status}">
      <td style="font-weight:500">${esc(r.student?.name ?? '—')}</td>
      <td style="font-family:monospace;font-size:.8rem;color:var(--accent2)">${esc(r.student?.matric_no ?? '—')}</td>
      <td style="color:var(--text-muted);font-size:.8rem">${esc(r.student?.department ?? '—')}</td>
      <td>${statusBadge(status)}</td>
      <td>${r.verified ? '<span class="badge badge-verified">✓ Verified</span>' : '<span style="color:var(--text-muted);font-size:.78rem">—</span>'}</td>
      <td style="color:var(--text-muted);font-size:.78rem">${formatTime(r.timestamp)}</td>
    </tr>`;
  }).join('');
}

function filterSessionTable() {
  const q = (document.getElementById('sess-search')?.value ?? '').toLowerCase();
  const status = document.getElementById('sess-status-filter')?.value ?? '';
  const filtered = sessionAttendance.filter(r => {
    const sMatch = !status || (r.status ?? 'absent') === status;
    const qMatch = !q ||
      (r.student?.name ?? '').toLowerCase().includes(q) ||
      (r.student?.matric_no ?? '').toLowerCase().includes(q);
    return sMatch && qMatch;
  });
  document.getElementById('sess-tbody').innerHTML = buildSessionRows(filtered);
  const cnt = document.getElementById('sess-count');
  if (cnt) cnt.textContent = `${filtered.length} student${filtered.length !== 1 ? 's' : ''}`;
}

function exportLecturerCSV(sessionId) {
  const session = lecturerSessions.find(s => s.session_id === sessionId);
  const dateStr = session ? formatDate(session.start_time).replace(/\s/g, '_') : `session_${sessionId}`;
  downloadCSV([
    ['Name', 'Matric No', 'Email', 'Department', 'Status', 'Face Verified', 'Timestamp'],
    ...sessionAttendance.map(r => [
      r.student?.name ?? '', r.student?.matric_no ?? '',
      r.student?.email ?? '', r.student?.department ?? '',
      r.status ?? 'absent',
      r.verified ? 'Yes' : 'No',
      r.timestamp,
    ]),
  ], `attendance_${selectedCourseCode}_${dateStr}.csv`);
  toast('✓ CSV downloaded', 'success');
}

// ─────────────────────────────────────────────────────────────
//  LECTURER – STUDENTS
// ─────────────────────────────────────────────────────────────

async function renderLecturerStudents() {
  setMain(skeletonHTML());

  try {
    if (!lecturerCourses.length) {
      const courseResp = await apiGet('/courses/my-courses');
      lecturerCourses = courseResp.courses ?? [];
    }

    if (!lecturerCourses.length) {
      setMain(`
      <div class="page-header">
        <h2>Students</h2>
        <p>Your student list appears after your courses start getting attendance records.</p>
      </div>
      <div class="section-card">
        <div class="students-empty">No courses found for your account yet.<br><small>Create a course in the mobile app to get started.</small></div>
      </div>`);
      return;
    }

    const byStudent = new Map();

    await Promise.all(lecturerCourses.map(async (course) => {
      let courseStudents = [];
      try {
        courseStudents = await apiGetAllPages(`/courses/${course.course_id}/students`);
      } catch (_) {
        courseStudents = [];
      }

      courseStudents.forEach((student) => {
        const sid = student.student_id;
        if (!byStudent.has(sid)) {
          byStudent.set(sid, {
            student_id: sid,
            name: student.name ?? 'Unknown Student',
            email: student.email ?? '',
            matric_no: student.matric_no ?? '—',
            department: student.department ?? '—',
            courses: [],
          });
        }
        byStudent.get(sid).courses.push({
          course_id: course.course_id,
          course_code: course.course_code,
          course_name: course.course_name,
        });
      });
    }));

    lecturerStudents = [...byStudent.values()]
      .map((s) => ({ ...s, courses: s.courses.sort((a, b) => a.course_code.localeCompare(b.course_code)) }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    lecturerStudentQuery = '';
    selectedLecturerStudentId = lecturerStudents[0]?.student_id ?? null;
    selectedLecturerStudentCourseId = null;
    lecturerStudentCourseAttendance = [];

    setMain(buildLecturerStudentsShellHTML());
    renderLecturerStudentsList();
    renderLecturerStudentDetail();
  } catch (e) {
    console.error('Failed to load students:', e);
    setMain(errorState('Failed to load students.', e.message || 'Please check your connection and try again.'));
  }
}

function buildLecturerStudentsShellHTML() {
  return `
  <div class="page-header">
    <h2>Students</h2>
    <p>Search students, view shared courses, and open attendance by course.</p>
  </div>

  <div class="section-card">
    <div class="students-workspace">
      <div class="students-panel students-panel-left">
        <div class="students-panel-head">
          <h3>Student Directory</h3>
          <span id="lecturer-student-count" class="filter-count"></span>
        </div>
        <div class="students-search-wrap">
          <input
            type="search"
            class="search-input"
            id="lecturer-student-search"
            placeholder="Search name, matric, email, or course..."
            aria-label="Search students by name, matric number, email, department, or course"
            oninput="updateLecturerStudentQuery()"
          />
        </div>
        <div id="lecturer-student-list" class="students-list" role="list" aria-live="polite"></div>
      </div>

      <div class="students-panel students-panel-right">
        <div id="lecturer-student-detail"></div>
      </div>
    </div>
  </div>`;
}

function getFilteredLecturerStudents() {
  const q = lecturerStudentQuery.trim().toLowerCase();
  if (!q) return lecturerStudents;

  return lecturerStudents.filter((s) => {
    const courseMatch = s.courses.some((c) =>
      `${c.course_code} ${c.course_name}`.toLowerCase().includes(q)
    );
    return (
      (s.name ?? '').toLowerCase().includes(q) ||
      (s.email ?? '').toLowerCase().includes(q) ||
      (s.matric_no ?? '').toLowerCase().includes(q) ||
      (s.department ?? '').toLowerCase().includes(q) ||
      courseMatch
    );
  });
}

function updateLecturerStudentQuery() {
  lecturerStudentQuery = document.getElementById('lecturer-student-search')?.value ?? '';
  const filtered = getFilteredLecturerStudents();

  if (selectedLecturerStudentId && !filtered.some(s => s.student_id === selectedLecturerStudentId)) {
    selectedLecturerStudentId = filtered[0]?.student_id ?? null;
    selectedLecturerStudentCourseId = null;
    lecturerStudentCourseAttendance = [];
  }

  renderLecturerStudentsList();
  renderLecturerStudentDetail();
}

function renderLecturerStudentsList() {
  const listEl = document.getElementById('lecturer-student-list');
  const cntEl = document.getElementById('lecturer-student-count');
  if (!listEl || !cntEl) return;

  const filtered = getFilteredLecturerStudents();
  cntEl.textContent = `${filtered.length} student${filtered.length !== 1 ? 's' : ''}`;

  if (!filtered.length) {
    listEl.innerHTML = `<div class="students-empty">No students match your search.</div>`;
    return;
  }

  listEl.innerHTML = filtered.map((s) => `
    <button class="student-list-item ${s.student_id === selectedLecturerStudentId ? 'active' : ''}"
      onclick="selectLecturerStudent(${s.student_id})"
      aria-label="${esc(s.name)}, ${esc(s.matric_no)}, ${s.courses.length} course${s.courses.length !== 1 ? 's' : ''}"
      ${s.student_id === selectedLecturerStudentId ? 'aria-current="true"' : ''}>
      <div class="student-list-top">
        <span class="student-name">${esc(s.name)}</span>
        <span class="student-meta">${s.courses.length} course${s.courses.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="student-list-sub">${esc(s.matric_no)} · ${esc(s.department)}</div>
    </button>
  `).join('');
}

function selectLecturerStudent(studentId) {
  selectedLecturerStudentId = studentId;
  selectedLecturerStudentCourseId = null;
  lecturerStudentCourseAttendance = [];
  renderLecturerStudentsList();
  renderLecturerStudentDetail();
}

async function selectLecturerStudentCourse(courseId) {
  const student = lecturerStudents.find(s => s.student_id === selectedLecturerStudentId);
  if (!student) return;

  selectedLecturerStudentCourseId = courseId;
  lecturerStudentCourseAttendance = [];
  renderLecturerStudentDetail(true);

  try {
    const sessions = await apiGetAllPages(`/courses/${courseId}/sessions`);
    const recordsBySession = await Promise.all(
      sessions.map(async (session) => {
        try {
          const rows = await apiGetAllPages(`/sessions/${session.session_id}/attendance`);
          const record = rows.find(r => r.student?.student_id === student.student_id);
          return record ? {
            session_id: session.session_id,
            start_time: session.start_time,
            end_time: session.end_time,
            status: record.status ?? 'absent',
            verified: !!record.verified,
            timestamp: record.timestamp,
          } : null;
        } catch (_) {
          return null;
        }
      })
    );

    lecturerStudentCourseAttendance = recordsBySession
      .filter(Boolean)
      .sort((a, b) => String(b.start_time).localeCompare(String(a.start_time)));
  } catch (e) {
    toast(`Failed to load attendance: ${e.message}`, 'error');
    lecturerStudentCourseAttendance = [];
  }

  renderLecturerStudentDetail();
}

function renderLecturerStudentDetail(loading = false) {
  const detailEl = document.getElementById('lecturer-student-detail');
  if (!detailEl) return;

  const student = lecturerStudents.find(s => s.student_id === selectedLecturerStudentId);
  if (!student) {
    detailEl.innerHTML = `<div class="students-empty">Select a student to view details.</div>`;
    return;
  }

  const selectedCourse = student.courses.find(c => c.course_id === selectedLecturerStudentCourseId) ?? null;

  const present = lecturerStudentCourseAttendance.filter(r => r.status === 'present').length;
  const total = lecturerStudentCourseAttendance.length;
  const absent = total - present;
  const rate = total ? Math.round((present / total) * 100) : 0;

  detailEl.innerHTML = `
    <div class="students-detail-head">
      <h3>${esc(student.name)}</h3>
      <p>${esc(student.email || 'No email available')}</p>
      <div class="students-detail-meta">
        <span>${esc(student.matric_no)}</span>
        <span>${esc(student.department)}</span>
      </div>
    </div>

    <div class="students-course-list">
      <div class="students-course-title">Courses shared with you</div>
      <div class="students-course-chips">
        ${student.courses.map((course) => `
          <button class="student-course-chip ${course.course_id === selectedLecturerStudentCourseId ? 'active' : ''}"
            onclick="selectLecturerStudentCourse(${course.course_id})"
            aria-label="View attendance for ${esc(course.course_code)}"
            ${course.course_id === selectedLecturerStudentCourseId ? 'aria-pressed="true"' : 'aria-pressed="false"'}>
            ${esc(course.course_code)}
          </button>
        `).join('')}
      </div>
    </div>

    ${selectedCourse ? `
      <div class="students-attendance-block">
        <div class="students-attendance-title">${esc(selectedCourse.course_code)} · ${esc(selectedCourse.course_name)}</div>
        ${loading
        ? `<div class="students-empty">Loading attendance...</div>`
        : `<div class="summary-bar">
              <div class="summary-stat">
                <span class="summary-label">Sessions</span>
                <span class="summary-value">${total}</span>
              </div>
              <div class="summary-stat">
                <span class="summary-label">Present</span>
                <span class="summary-value" style="color:var(--success)">${present}</span>
              </div>
              <div class="summary-stat">
                <span class="summary-label">Absent</span>
                <span class="summary-value" style="color:var(--danger)">${absent}</span>
              </div>
              <div class="summary-stat">
                <span class="summary-label">Rate</span>
                <span class="summary-value" style="color:${rate >= 80 ? 'var(--success)' : 'var(--warning)'}">${rate}%</span>
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Status</th>
                    <th>Verified</th>
                  </tr>
                </thead>
                <tbody>
                  ${lecturerStudentCourseAttendance.length
          ? lecturerStudentCourseAttendance.map((row) => `
                      <tr class="row-${row.status}">
                        <td class="session-date-label">${formatDate(row.start_time)}</td>
                        <td style="color:var(--text-soft)">${formatTime(row.start_time)}</td>
                        <td style="color:var(--text-soft)">${formatTime(row.end_time)}</td>
                        <td>${statusBadge(row.status)}</td>
                        <td>${row.verified ? '<span class="badge badge-verified">✓ Verified</span>' : '<span style="color:var(--text-muted);font-size:.78rem">—</span>'}</td>
                      </tr>
                    `).join('')
          : `<tr><td colspan="5">${emptyRowHTML('No attendance records found for this student in the selected course.')}</td></tr>`}
                </tbody>
              </table>
            </div>`}
      </div>
    ` : '<div class="students-empty">Select one of the student courses to view attendance.</div>'}
  `;
}

// ─────────────────────────────────────────────────────────────
//  API
// ─────────────────────────────────────────────────────────────

async function apiGet(path) {
  try {
    const token = await getToken();
    const res = await fetch(API_BASE + path, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      throw new Error(b.detail ?? `Server error (${res.status})`);
    }
    return res.json();
  } catch (error) {
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to server. Please check if the backend is running.');
    }
    throw error;
  }
}

async function apiGetAllPages(path, pageSize = 200) {
  const allItems = [];
  let page = 1;

  while (true) {
    const separator = path.includes('?') ? '&' : '?';
    const pagedPath = `${path}${separator}page=${page}&page_size=${pageSize}`;
    const response = await apiGet(pagedPath);

    // Backward compatibility: if backend still returns a plain array.
    if (Array.isArray(response)) {
      return response;
    }

    const items = response?.items ?? [];
    allItems.push(...items);

    const hasNext = response?.pagination?.has_next;
    if (!hasNext) break;
    page += 1;
  }

  return allItems;
}

async function apiPost(path, body) {
  try {
    const token = await getToken();
    const res = await fetch(API_BASE + path, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      throw new Error(b.detail ?? `Server error (${res.status})`);
    }
    return res.json();
  } catch (error) {
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to server. Please check if the backend is running.');
    }
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────
//  UI HELPERS
// ─────────────────────────────────────────────────────────────

function setMain(html) {
  const el = document.getElementById('main-content');
  el.innerHTML = html;
  el.classList.remove('page-fade-in');
  void el.offsetWidth; // force reflow
  el.classList.add('page-fade-in');
}

function skeletonHTML(rows = 4) {
  const cards = Array(3).fill(0).map(() => `<div class="skeleton skeleton-card"></div>`).join('');
  const tableRows = Array(rows).fill(0).map(() => `<div class="skeleton skeleton-row"></div>`).join('');
  return `<div style="padding:8px">${cards}<br>${tableRows}</div>`;
}

function errorState(title, detail = '') {
  return `
    <div class="empty-state error-state">
      <div class="empty-icon">⚠️</div>
      <p><strong>${esc(title)}</strong></p>
      ${detail ? `<p class="error-detail">${esc(detail)}</p>` : ''}
      <button class="btn-retry" onclick="location.reload()">Retry</button>
    </div>`;
}

function emptyRowHTML(msg) {
  return `<div class="empty-state"><div class="empty-icon">🗒️</div><p>${esc(msg)}</p></div>`;
}

function statusBadge(status) {
  const cfg = {
    present: { cls: 'badge-present', label: 'Present' },
    absent: { cls: 'badge-absent', label: 'Absent' },
    late: { cls: 'badge-late', label: 'Late' },
  };
  const c = cfg[status?.toLowerCase()] ?? cfg.absent;
  return `<span class="badge ${c.cls}"><span class="badge-dot"></span>${c.label}</span>`;
}

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return iso; }
}

function formatTime(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

// ─────────────────────────────────────────────────────────────
//  CSV EXPORT
// ─────────────────────────────────────────────────────────────

function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────
//  GLOBAL ERROR HANDLING
// ─────────────────────────────────────────────────────────────

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Prevent showing error UI for minor script errors in production
  if (event.error && event.error.message && !event.error.message.includes('ResizeObserver')) {
    showAuthError('An unexpected error occurred. Please refresh the page.');
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault();
  if (event.reason && event.reason.message) {
    showAuthError(event.reason.message);
  }
});

// Performance monitoring (development only)
if (DEBUG_MODE && window.performance && window.performance.measure) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = performance.getEntriesByType('navigation')[0];
      if (perfData) {
        console.log('⚡ Page load performance:', {
          domContentLoaded: Math.round(perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart),
          totalLoad: Math.round(perfData.loadEventEnd - perfData.loadEventStart),
          domInteractive: Math.round(perfData.domInteractive),
        });
      }
    }, 0);
  });
}

