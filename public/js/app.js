/* ════════════════════════════════════════════════════════════════
   app.js — Router, State, Animations, WebSocket Copilot
   v3.0 — Full RBAC-locked routing
   ════════════════════════════════════════════════════════════════ */

/* ── State ──────────────────────────────────────────────────── */
let STATE = {
  user: null,
  candidate: null,
  candidates: [],
  analytics: null,
  interviewAnswers: [],
  currentQuestion: 0,
  currentPage: 'login',
  candidateCache: {},
};


/* ── Particle Canvas ─────────────────────────────────────────── */
class ParticleCanvas {
  constructor() {
    this.canvas = document.getElementById('particle-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.animId = null;
    this.resize();
    this.init();
    window.addEventListener('resize', () => { this.resize(); this.init(); });
  }
  resize() {
    if (!this.canvas) return;
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  init() {
    this.particles = [];
    const n = Math.min(Math.floor(window.innerWidth * window.innerHeight / 14000), 80);
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        r: Math.random() * 1.8 + 0.8,
        cyan: Math.random() > 0.4,
      });
    }
  }
  draw() {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);
    const ps = this.particles;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      for (let j = i + 1; j < ps.length; j++) {
        const q = ps[j];
        const dx = p.x - q.x, dy = p.y - q.y;
        const d  = Math.sqrt(dx*dx + dy*dy);
        if (d < 130) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(37,99,235,${(1 - d/130) * 0.08})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = p.cyan ? 'rgba(37,99,235,0.35)' : 'rgba(124,58,237,0.3)';
      ctx.fill();
    }
  }
  start() {
    if (!this.canvas) return;
    this.canvas.classList.add('visible');
    const loop = () => { this.draw(); this.animId = requestAnimationFrame(loop); };
    loop();
  }
  stop() {
    if (this.animId) cancelAnimationFrame(this.animId);
    if (this.canvas) this.canvas.classList.remove('visible');
    this.animId = null;
  }
}
const particles = new ParticleCanvas();


/* ── Toast Notifications ─────────────────────────────────────── */
function toast(msg, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success:'check-circle', error:'x-circle', info:'info', warning:'alert-triangle' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<i data-lucide="${icons[type]||'info'}"></i><span>${msg}</span>`;
  container.appendChild(el);
  try { lucide.createIcons({ icons: {}, elements: [el] }); } catch(e) {}
  setTimeout(() => {
    el.classList.add('toast-out');
    setTimeout(() => el.remove(), 350);
  }, duration);
}


/* ── Render Helper ──────────────────────────────────────────── */
function setView(html) {
  const vp = document.getElementById('app-view-port');
  if (vp) { vp.innerHTML = html; }
  setTimeout(() => { try { lucide.createIcons(); } catch(e){} }, 50);
}

function setNavbar(links = [], userInfo = null) {
  const nl = document.getElementById('nav-links');
  const na = document.getElementById('nav-actions-container');
  const nb = document.getElementById('app-navbar');

  if (nb) nb.style.display = userInfo ? 'block' : 'none';

  if (nl) {
    nl.innerHTML = links.map(l => `
      <button class="nav-link ${l.active ? 'active' : ''}" onclick="App.navigate('${l.page}')">
        <i data-lucide="${l.icon}"></i>${l.label}
      </button>`).join('');
  }

  if (na && userInfo) {
    const initials = userInfo.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
    const roleTag  = {
      'recruiter': `<span class="tag tag-cyan">RECRUITER</span>`,
      'admin':     `<span class="tag tag-amber">ADMIN</span>`,
      'candidate': `<span class="tag tag-purple">CANDIDATE</span>`,
    }[userInfo.role] || `<span class="tag tag-purple">${userInfo.role.toUpperCase()}</span>`;

    na.innerHTML = `
      ${roleTag}
      
      <!-- Notification Bell -->
      <div class="notif-bell-container" id="notification-panel-container" style="position: relative; display: inline-block; margin-right: 8px;">
        <button class="btn btn-ghost btn-sm btn-icon relative" id="notif-bell-btn" title="Notifications" onclick="toggleNotifDropdown(event)">
          <i data-lucide="bell"></i>
          <span class="badge" id="notif-badge" style="position: absolute; top: 0; right: 0; background: var(--cyan); color: #000; font-size: 0.7rem; font-weight: bold; border-radius: 50%; width: 15px; height: 15px; display: flex; align-items: center; justify-content: center; box-shadow: var(--glow-cyan); display: none;">0</span>
        </button>
        <div class="notif-dropdown card" id="notification-dropdown" style="position: absolute; top: 40px; right: 0; width: 300px; max-height: 400px; overflow-y: auto; display: none; z-index: 1000; padding: 0; border: 1px solid var(--border-cyan); background: rgba(10,25,40,0.95); backdrop-filter: blur(10px); box-shadow: var(--glow-cyan);">
          <div class="notif-header" style="padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.08); font-weight: bold; font-size: 0.85rem;">Notifications</div>
          <div id="notif-items-container"></div>
        </div>
      </div>

      <div class="user-chip">
        <div class="user-avatar">${initials}</div>
        <div class="user-name">${userInfo.name.split(' ')[0]}</div>
      </div>
      <button class="btn btn-red btn-sm" onclick="App.logout()" style="margin-left: 4px;">
        <i data-lucide="log-out"></i> Log Out
      </button>`;

      // Fetch notifications when navbar renders
      setTimeout(() => {
        if (typeof renderNotificationPanel === 'function') {
          renderNotificationPanel();
        }
      }, 100);
  } else if (na) {
    na.innerHTML = '';
  }
}

function toggleNotifDropdown(event) {
  event.stopPropagation();
  const dropdown = document.getElementById('notification-dropdown');
  const container = document.getElementById('notification-panel-container');
  if (dropdown && container) {
    const open = container.classList.toggle('open');
    dropdown.style.display = open ? 'block' : 'none';
    if (open && typeof renderNotificationPanel === 'function') {
      renderNotificationPanel();
    }
  }
}
window.toggleNotifDropdown = toggleNotifDropdown;

// Close dropdown on click outside
document.addEventListener('click', () => {
  const dropdown = document.getElementById('notification-dropdown');
  const container = document.getElementById('notification-panel-container');
  if (dropdown && container) {
    container.classList.remove('open');
    dropdown.style.display = 'none';
  }
});


/* ══════════════════════════════════════════════════════════════
   MAIN APP CONTROLLER
   ══════════════════════════════════════════════════════════════ */
const App = {

  /* ── Boot ─────────────────────────────────────────────────── */
  async init() {
    const savedUser  = localStorage.getItem('nexus_user');
    const savedToken = localStorage.getItem('nexus_token');

    if (savedUser && savedToken) {
      try {
        // Validate session with server
        const res = await API.getMe();
        STATE.user = res.user;
        STATE.candidate = res.candidate;
        localStorage.setItem('nexus_user', JSON.stringify({ user: res.user, candidate: res.candidate }));
        await this.navigate('dashboard');
      } catch(e) {
        localStorage.removeItem('nexus_user');
        localStorage.removeItem('nexus_token');
        this.showLogin();
      }
    } else {
      this.showLogin();
    }

    // WebSocket Copilot (recruiter only — initialized after login check)
    this.initCopilot();

    // FAB button
    document.getElementById('copilot-fab')?.addEventListener('click', () => {
      document.getElementById('copilot-panel')?.classList.toggle('open');
    });
    document.getElementById('copilot-close')?.addEventListener('click', () => {
      document.getElementById('copilot-panel')?.classList.remove('open');
    });

    // Copilot send
    document.getElementById('copilot-send')?.addEventListener('click', () => this.sendCopilotMsg());
    document.getElementById('copilot-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.sendCopilotMsg();
    });

    // Modal close
    document.getElementById('modal-close-btn')?.addEventListener('click', App.closeModal);
    document.getElementById('global-modal')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('global-modal')) App.closeModal();
    });
  },

  /* ── Login / Portal ────────────────────────────────────────── */
  showLogin() {
    STATE.currentPage = 'login';
    document.getElementById('app-navbar').style.display = 'none';
    document.getElementById('copilot-fab').style.display = 'none';
    setView(renderPortalPage());
    particles.start();
  },

  showRecruiterLogin() {
    STATE.currentPage = 'recruiter-login';
    particles.start();
    setView(renderRecruiterLogin());
  },

  showCandidateLogin() {
    STATE.currentPage = 'candidate-login';
    particles.start();
    setView(renderCandidateLogin());
  },

  switchLoginTab(tab) {
    document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${tab}`)?.classList.add('active');
    document.getElementById('login-form-wrap').style.display   = tab === 'login'    ? '' : 'none';
    document.getElementById('register-form-wrap').style.display = tab === 'register' ? '' : 'none';
    document.getElementById('login-error').style.display = 'none';
  },

  async handleLogin(e) {
    e.preventDefault();
    const btn    = document.getElementById('login-btn');
    const errEl  = document.getElementById('login-error');
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    btn.innerHTML = '<div class="loader-ring" style="width:18px;height:18px;border-width:2px"></div> Authenticating…';
    btn.disabled = true;
    errEl.style.display = 'none';
    try {
      const res = await API.login(username, password);

      // ── RBAC: validate role matches portal ─────────────────
      const expectedRole = STATE.currentPage === 'recruiter-login' ? 'recruiter' : 'candidate';
      if (STATE.currentPage !== 'login' && res.user.role !== expectedRole && res.user.role !== 'admin') {
        // Allow admin to log in through any portal
        if (res.user.role !== 'admin') {
          errEl.textContent = res.user.role === 'recruiter'
            ? '🔒 This is the Candidate Portal. Please use the Recruiter Portal instead.'
            : '🔒 This is the Recruiter Portal. Please use the Candidate Portal instead.';
          errEl.style.display = 'block';
          btn.innerHTML = '<i data-lucide="log-in"></i> Sign In';
          btn.disabled = false;
          lucide.createIcons();
          return;
        }
      }

      STATE.user = res.user;
      STATE.candidate = res.candidate;
      localStorage.setItem('nexus_token', res.access_token);
      localStorage.setItem('nexus_user', JSON.stringify({ user: res.user, candidate: res.candidate }));

      particles.stop();

      // Show copilot FAB only for recruiters / admins
      const fab = document.getElementById('copilot-fab');
      if (fab) fab.style.display = (res.user.role !== 'candidate') ? 'flex' : 'none';

      toast(`Welcome back, ${res.user.name.split(' ')[0]}! 👋`, 'success');
      this.navigate('dashboard');
    } catch(err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
      btn.innerHTML = '<i data-lucide="log-in"></i> Sign In';
      btn.disabled = false;
      lucide.createIcons();
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const name  = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass  = document.getElementById('reg-password').value;
    const errEl = document.getElementById('login-error');
    errEl.style.display = 'none';

    // Block recruiter registration from candidate portal
    if (STATE.currentPage === 'recruiter-login') {
      errEl.textContent = '🔒 Recruiter accounts must be created by an administrator.';
      errEl.style.display = 'block';
      return;
    }

    try {
      await API.register(email, pass, name);
      toast('Account created! Please sign in.', 'success');
      this.switchLoginTab('login');
      document.getElementById('login-username').value = email;
    } catch(err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    }
  },

  logout() {
    API.logout().catch(() => {}); // best-effort server-side token invalidation
    STATE = { user:null, candidate:null, candidates:[], analytics:null,
              interviewAnswers:[], currentQuestion:0, currentPage:'login', candidateCache:{} };
    localStorage.removeItem('nexus_user');
    localStorage.removeItem('nexus_token');
    document.getElementById('copilot-panel')?.classList.remove('open');
    document.getElementById('copilot-fab').style.display = 'none';
    this.showLogin();
    toast('Signed out successfully', 'info');
  },

  /* ── Navigation Router (RBAC-enforced) ───────────────────── */
  async navigate(page, id = null) {
    STATE.currentPage = page;
    const role        = STATE.user?.role;
    const isRecruiter = role === 'recruiter' || role === 'admin';
    const isCandidate = role === 'candidate';

    /* ── Guard: redirect candidates away from recruiter pages ── */
    const recruiterPages = ['candidates', 'analytics', 'jd', 'profile', 'code', 'job-postings', 'applications', 'compare-candidates'];
    if (isCandidate && recruiterPages.includes(page)) {
      toast('🔒 Access denied — this section is for recruiters only.', 'error');
      page = 'dashboard';
    }

    /* ── Guard: redirect recruiters away from candidate-only pages ── */
    if (isRecruiter && (page === 'my-profile' || page === 'job-board' || page === 'my-applications')) {
      page = 'dashboard';
    }

    // Navbar
    if (isRecruiter) {
      setNavbar([
        { page:'dashboard',          icon:'layout-dashboard', label:'Dashboard',    active: page === 'dashboard' },
        { page:'compare-candidates', icon:'git-pull-request', label:'Compare matrix',active: page === 'compare-candidates' },
        { page:'job-postings',       icon:'briefcase',        label:'Job JDs',      active: page === 'job-postings' },
        { page:'applications',       icon:'users',            label:'Applications', active: page === 'applications' },
        { page:'candidates',         icon:'search',           label:'Candidates',   active: page === 'candidates' },
        { page:'analytics',          icon:'bar-chart-3',      label:'Analytics',    active: page === 'analytics' },
        { page:'jd',                 icon:'file-text',        label:'JD Builder',   active: page === 'jd' },
        { page:'upload',             icon:'upload-cloud',     label:'Upload CV',    active: page === 'upload' },
      ], STATE.user);
    } else if (isCandidate) {
      const navLinks = [
        { page:'dashboard',       icon:'layout-dashboard', label:'My Application', active: page === 'dashboard' },
        { page:'job-board',       icon:'briefcase',        label:'Job Board',      active: page === 'job-board' },
        { page:'my-applications', icon:'layers',           label:'My Applications',active: page === 'my-applications' },
        { page:'interview',       icon:'mic',              label:'AI Screening',   active: page === 'interview' },
        { page:'upload',          icon:'upload-cloud',     label:'Update Resume',  active: page === 'upload' },
      ];
      if (STATE.candidate && STATE.candidate.status === 'Hired') {
        navLinks.push({ page:'onboarding', icon:'clipboard-check', label:'Onboarding', active: page === 'onboarding' });
      }
      setNavbar(navLinks, STATE.user);
    }

    switch(page) {
      case 'dashboard':          await this.showDashboard();  break;
      case 'candidates':         await this.showCandidates(); break;
      case 'profile':            await this.showProfile(id);  break;
      case 'interview':          await this.showInterview(id || STATE.candidate?.id); break;
      case 'onboarding':         await this.showOnboarding(); break;
      case 'analytics':          await this.showAnalytics();  break;
      case 'upload':             this._showUploadPage();      break;
      case 'jd':                 setView(renderJDPage());     break;
      case 'code':               await this.showCode(id);     break;
      case 'admin':              await this.showAdmin();      break;
      case 'job-board':          await renderJobBoard();      break;
      case 'my-applications':    await renderMyApplicationsPage(); break;
      case 'job-postings':       await renderJobPostingsPage(); break;
      case 'applications':       await renderApplicationsPage(); break;
      case 'video-interview':    await renderVideoInterview(id); break;
      case 'compare-candidates': setView(renderRecruiterComparisonBoard(STATE.candidates)); break;
      default:                   this.showLogin();
    }
  },

  _showUploadPage() {
    const isCandidate = STATE.user?.role === 'candidate';
    setView(renderUploadPage(isCandidate));
  },

  /* ── Dashboard ───────────────────────────────────────────── */
  async showDashboard() {
    const role = STATE.user?.role;

    if (role === 'candidate') {
      // Fetch latest candidate data from server
      try {
        const c = await API.getMyProfile();
        STATE.candidate = c;
        localStorage.setItem('nexus_user', JSON.stringify({ user: STATE.user, candidate: c }));
        setView(renderCandidateDashboard(c));
        animateScoreRings();
        animateProgressBars();
      } catch(e) {
        toast('Failed to load your profile: ' + e.message, 'error');
        this.logout();
      }
      return;
    }

    // Recruiter / Admin dashboard
    setView(`<div class="loader"><div class="loader-ring"></div><div class="loader-text">Loading dashboard…</div></div>`);
    try {
      const fetchAnalytics = API.getAnalytics();
      const fetchCandidates = API.getCandidates();
      const [analytics, candidates] = await Promise.all([fetchAnalytics, fetchCandidates]);
      STATE.candidates = candidates;
      STATE.analytics  = analytics;

      if (role === 'admin') {
        const stats = await API.adminGetStats().catch(() => null);
        setView(renderAdminDashboard(candidates, analytics, stats));
      } else {
        setView(renderDashboard(candidates, analytics));
      }
      animateScoreRings();
      animateProgressBars();
      animateKPIs();
      initDashboardCharts(analytics);
    } catch(e) {
      toast('Failed to load dashboard: ' + e.message, 'error');
    }
  },

  /* ── Onboarding ──────────────────────────────────────────── */
  async showOnboarding() {
    setView(`<div class="loader"><div class="loader-ring"></div><div class="loader-text">Loading onboarding portal…</div></div>`);
    try {
      const c = await API.getMyProfile();
      STATE.candidate = c;
      localStorage.setItem('nexus_user', JSON.stringify({ user: STATE.user, candidate: c }));
      setView(renderOnboardingPage(c));
      animateProgressBars();
      
      // If onboarding is completed on load, fire confetti!
      if (c.onboarding_progress === 100) {
        setTimeout(() => { if (window.triggerConfetti) window.triggerConfetti(); }, 300);
      }
    } catch(e) {
      toast('Failed to load onboarding: ' + e.message, 'error');
      this.navigate('dashboard');
    }
  },

  /* ── Candidates ──────────────────────────────────────────── */
  async showCandidates() {
    setView(`<div class="loader"><div class="loader-ring"></div><div class="loader-text">Loading candidates…</div></div>`);
    try {
      const candidates = await API.getCandidates();
      STATE.candidates = candidates;
      setView(renderCandidatesPage(candidates));
      animateScoreRings();
      animateProgressBars();
    } catch(e) {
      toast('Failed to load candidates: ' + e.message, 'error');
    }
  },

  /* ── Profile ─────────────────────────────────────────────── */
  async showProfile(id) {
    if (!id) { this.navigate('candidates'); return; }
    setView(`<div class="loader"><div class="loader-ring"></div><div class="loader-text">Loading profile…</div></div>`);
    try {
      const c = await API.getCandidate(id);
      STATE.candidateCache[id] = c;
      setView(renderCandidateProfile(c));
      animateScoreRings();
      animateProgressBars();
      setTimeout(() => initProfileCharts(c), 200);
    } catch(e) {
      toast('Failed to load profile: ' + e.message, 'error');
      this.navigate('candidates');
    }
  },

  async loadAISummary(id) {
    const el = document.getElementById('ai-summary-text');
    if (el) el.innerHTML = `<div class="loader" style="padding:20px"><div class="loader-ring"></div><div class="loader-text">Generating AI analysis…</div></div>`;
    try {
      const res = await API.getAISummary(id);
      if (el) el.innerHTML = renderMarkdownLite(res.summary);
      toast('AI summary generated!', 'success');
    } catch(e) {
      if (el) el.textContent = 'Failed to generate summary.';
    }
  },

  /* ── Remark Modal ────────────────────────────────────────── */
  showRemarkModal(id, currentRemark) {
    this.openModal(`
      <div style="padding:8px">
        <div class="section-title" style="margin-bottom:16px">
          <i data-lucide="message-square" style="width:16px;height:16px;color:var(--amber)"></i>
          Internal Recruiter Note
        </div>
        <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:14px">
          This note is <strong>visible only to recruiters</strong> and will never be shown to the candidate.
        </p>
        <textarea id="remark-input" class="form-input" style="min-height:110px;resize:vertical"
          placeholder="Add your internal notes, interview impressions, hiring decision rationale…"
        >${currentRemark || ''}</textarea>
        <div class="flex gap-10" style="margin-top:14px">
          <button class="btn btn-amber btn-sm" onclick="App.saveRemark('${id}')">
            <i data-lucide="save"></i> Save Note
          </button>
          <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">Cancel</button>
        </div>
      </div>`);
  },

  async saveRemark(id) {
    const val = document.getElementById('remark-input')?.value?.trim() || '';
    try {
      await API.addRemark(id, val);
      toast('Recruiter note saved.', 'success');
      this.closeModal();
      await this.showProfile(id);
    } catch(e) {
      toast('Failed to save note: ' + e.message, 'error');
    }
  },

  /* ── Interview ───────────────────────────────────────────── */
  async showInterview(id) {
    if (!id) { this.navigate('dashboard'); return; }

    let c;
    const role = STATE.user?.role;

    if (role === 'candidate') {
      // Candidate: use own profile
      try { c = await API.getMyProfile(); }
      catch(e) { toast('Profile not found', 'error'); return; }
      
      // Start Video Focus Lock
      STATE.tabSwitches = 0;
      STATE.fullscreenViolations = 0;
      setupVideoFocusLock();
    } else {
      // Recruiter: fetch by id
      c = STATE.candidateCache[id] || await API.getCandidate(id).catch(() => null);
      if (!c) { toast('Candidate not found', 'error'); return; }
      STATE.candidateCache[id] = c;
    }

    STATE.interviewAnswers = [];
    STATE.currentQuestion  = 0;
    setView(renderInterviewPage(c));
    this._showQuestion(0, c);
  },

  _showQuestion(idx, candidate) {
    const qEl  = document.getElementById('interview-question');
    const aEl  = document.getElementById('interview-answer');
    const nBtn = document.getElementById('next-q-btn');
    const pEl  = document.querySelector('.terminal-prompt');
    if (!qEl) return;

    document.querySelectorAll('.interview-progress-dot').forEach((d,i) => {
      d.classList.remove('active','done');
      if (i < idx) d.classList.add('done');
      if (i === idx) d.classList.add('active');
    });

    qEl.textContent = '';
    const question = INTERVIEW_QUESTIONS[idx];
    if (pEl) pEl.textContent = `▶ question ${idx+1} of ${INTERVIEW_QUESTIONS.length}`;

    if (typeof Typed !== 'undefined') {
      new Typed(qEl, {
        strings: [question],
        typeSpeed: 22,
        showCursor: false,
        onComplete: () => { document.getElementById('interview-waveform').style.display = 'flex'; }
      });
    } else {
      qEl.textContent = question;
      document.getElementById('interview-waveform').style.display = 'flex';
    }

    if (aEl) aEl.value = '';
    if (nBtn) {
      nBtn.innerHTML = idx < INTERVIEW_QUESTIONS.length - 1
        ? 'Next Question <i data-lucide="arrow-right"></i>'
        : '<i data-lucide="send"></i> Submit Interview';
      lucide.createIcons();
    }
  },

  skipQuestion() {
    const aEl = document.getElementById('interview-answer');
    if (aEl) aEl.value = '[Skipped]';
    this.submitAnswer();
  },

  async submitAnswer() {
    const aEl = document.getElementById('interview-answer');
    const ans = aEl?.value?.trim() || '';
    const idx = STATE.currentQuestion;

    STATE.interviewAnswers.push({ q: INTERVIEW_QUESTIONS[idx], a: ans });

    if (idx < INTERVIEW_QUESTIONS.length - 1) {
      STATE.currentQuestion++;
      // Get candidate from cache or state
      const c = STATE.user?.role === 'candidate'
        ? STATE.candidate
        : STATE.candidateCache[Object.keys(STATE.candidateCache)[0]];
      this._showQuestion(STATE.currentQuestion, c);
    } else {
      document.getElementById('interview-section').style.display = 'none';
      document.getElementById('interview-results').style.display = 'block';
      
      // Stop focus lock
      if (STATE.user?.role === 'candidate') {
        stopVideoFocusLock();
      }
      
      try {
        let result;
        if (STATE.user?.role === 'candidate') {
          result = await API.submitMyInterview(STATE.interviewAnswers, STATE.tabSwitches || 0, STATE.fullscreenViolations || 0);
          STATE.candidate = result.candidate;
          localStorage.setItem('nexus_user', JSON.stringify({ user: STATE.user, candidate: result.candidate }));
        } else {
          const candidateId = Object.keys(STATE.candidateCache)[0];
          result = await API.evaluateInterview(candidateId, STATE.interviewAnswers);
          STATE.candidateCache[candidateId] = result.candidate;
        }

        document.getElementById('eval-loader').style.display = 'none';
        const rc = document.getElementById('eval-results-content');
        if (rc) {
          rc.style.display = 'block';
          rc.innerHTML = renderInterviewResults(result);
          animateProgressBars();
          lucide.createIcons();
        }
        toast('Interview evaluated by AI!', 'success');
      } catch(e) {
        toast('Evaluation failed: ' + e.message, 'error');
      }
    }
  },

  /* ── Analytics ───────────────────────────────────────────── */
  async showAnalytics() {
    setView(`<div class="loader"><div class="loader-ring"></div><div class="loader-text">Crunching analytics…</div></div>`);
    try {
      const analytics = await API.getAnalytics();
      STATE.analytics = analytics;
      setView(renderAnalyticsPage(analytics));
      animateKPIs();
      setTimeout(() => initAnalyticsCharts(analytics), 200);
    } catch(e) {
      toast('Failed to load analytics: ' + e.message, 'error');
    }
  },

  /* ── Admin Dashboard ─────────────────────────────────────── */
  async showAdmin() {
    if (STATE.user?.role !== 'admin') {
      toast('🔒 Admin access required.', 'error');
      return this.navigate('dashboard');
    }
    setView(`<div class="loader"><div class="loader-ring"></div><div class="loader-text">Loading admin panel…</div></div>`);
    try {
      const [users, stats] = await Promise.all([API.adminGetUsers(), API.adminGetStats()]);
      setView(renderAdminPanel(users, stats));
      lucide.createIcons();
    } catch(e) {
      toast('Failed to load admin panel: ' + e.message, 'error');
    }
  },

  async adminCreateUser(e) {
    e.preventDefault();
    const username = document.getElementById('admin-new-email').value.trim();
    const password = document.getElementById('admin-new-pass').value;
    const name     = document.getElementById('admin-new-name').value.trim();
    const role     = document.getElementById('admin-new-role').value;
    try {
      await API.adminCreateUser(username, password, name, role);
      toast(`User "${name}" created as ${role}!`, 'success');
      this.showAdmin();
    } catch(e) {
      toast('Failed: ' + e.message, 'error');
    }
  },

  async adminDeleteUser(userId, userName) {
    if (!confirm(`Delete user "${userName}"? This cannot be undone.`)) return;
    try {
      await API.adminDeleteUser(userId);
      toast(`User "${userName}" deleted.`, 'success');
      this.showAdmin();
    } catch(e) {
      toast('Failed to delete: ' + e.message, 'error');
    }
  },

  /* ── Code Evaluator ──────────────────────────────────────── */
  async showCode(id) {
    const c = STATE.candidateCache[id] || await API.getCandidate(id).catch(() => null);
    if (!c) { toast('Candidate not found', 'error'); return; }
    STATE.candidateCache[id] = c;
    setView(renderCodePage(c));
  },

  async runCodeEval(id) {
    const code  = document.getElementById('code-input')?.value || '';
    const lang  = document.getElementById('code-lang')?.value || 'python';
    const resEl = document.getElementById('code-result');
    if (resEl) resEl.innerHTML = `<div class="loader" style="padding:16px"><div class="loader-ring"></div></div>`;
    try {
      const result = await API.evaluateCode(id, lang, code);
      if (resEl) { resEl.innerHTML = renderCodeResult(result); lucide.createIcons(); }
      toast(result.success ? '✅ All checks passed!' : '⚠️ Logic gaps detected', result.success ? 'success' : 'warning');
    } catch(e) {
      if (resEl) resEl.innerHTML = `<div class="code-feedback code-feedback-error">${e.message}</div>`;
    }
  },

  /* ── Status Updates ──────────────────────────────────────── */
  async updateStatus(id, newStatus) {
    try {
      const res = await API.updateStatus(id, newStatus);
      STATE.candidateCache[id] = res.candidate;
      toast(`Status updated to ${newStatus}`, 'success');
      await this.showProfile(id);
    } catch(e) {
      toast('Status update failed: ' + e.message, 'error');
    }
  },

  async quickStatus(id, status) {
    if (!status) return;
    try {
      await API.updateStatus(id, status);
      toast(`Candidate status → ${status}`, 'success');
      const cards = document.querySelectorAll('.candidates-grid');
      if (cards.length) await this.showCandidates();
    } catch(e) {
      toast('Failed: ' + e.message, 'error');
    }
  },

  /* ── Onboarding Task Toggle ──────────────────────────────── */
  async toggleTask(candidateId, taskId, completed) {
    try {
      let res;
      if (STATE.user?.role === 'candidate') {
        res = await API.toggleMyTask(taskId, completed);
        STATE.candidate = res.candidate;
        localStorage.setItem('nexus_user', JSON.stringify({ user: STATE.user, candidate: res.candidate }));
        
        // If progress is 100% and current page is onboarding, re-render to trigger celebration state
        if (STATE.currentPage === 'onboarding' && res.candidate.onboarding_progress === 100) {
          setView(renderOnboardingPage(res.candidate));
          setTimeout(() => { if (window.triggerConfetti) window.triggerConfetti(); }, 300);
          toast('🎉 Onboarding Completed!', 'success');
          return;
        }
      } else {
        res = await API.toggleTask(candidateId, taskId, completed);
        STATE.candidateCache[candidateId] = res.candidate;
      }

      const taskEl = document.getElementById(`task-${taskId}`);
      if (taskEl) taskEl.classList.toggle('done', completed);

      const prog = res.candidate.onboarding_progress;
      const fill = document.querySelector('.progress-bar-fill.progress-green');
      if (fill) fill.style.width = prog + '%';

      // Update completion percentage text next to progress bar
      const pctEl = document.getElementById('profile-onboarding-pct');
      if (pctEl) pctEl.textContent = `${prog}% Complete`;

      // Update onboarding status badge in candidate profile hero
      const badgeEl = document.getElementById('onboarding-badge-el');
      if (badgeEl) {
        if (prog === 100) {
          badgeEl.className = 'badge badge-completed';
          badgeEl.innerHTML = '<span class="badge-dot" style="background:var(--green)"></span>Onboarded ✓';
        } else {
          badgeEl.className = 'badge badge-pending';
          badgeEl.innerHTML = `<span class="badge-dot" style="background:var(--cyan)"></span>Onboarding: ${prog}%`;
        }
      }

      toast(completed ? '✅ Task completed!' : 'Task unmarked', 'info', 1500);
    } catch(e) {
      toast('Failed to update task: ' + e.message, 'error');
    }
  },

  /* ── Resume Upload ───────────────────────────────────────── */
  handleFileDrop(event) {
    event.preventDefault();
    document.getElementById('upload-dropzone')?.classList.remove('drag-over');
    if (STATE.user?.role === 'candidate') {
      const file = event.dataTransfer.files[0];
      if (file) this.processUpload(file);
    } else {
      const files = Array.from(event.dataTransfer.files);
      if (files.length > 0) this.processUploadBulk(files);
    }
  },
  handleFileSelect(event) {
    if (STATE.user?.role === 'candidate') {
      const file = event.target.files[0];
      if (file) this.processUpload(file);
    } else {
      const files = Array.from(event.target.files);
      if (files.length > 0) this.processUploadBulk(files);
    }
  },
  async processUploadBulk(files) {
    const fb = document.getElementById('upload-feedback');
    if (fb) fb.innerHTML = `<div class="loader" style="padding:20px"><div class="loader-ring"></div><div class="loader-text">AI is scanning ${files.length} resume(s) in bulk…</div></div>`;
    try {
      const result = await API.uploadResumeBulk(files);
      if (fb) {
        let listHtml = '';
        let successCount = 0;
        let failCount = 0;

        for (let item of result.results) {
          if (item.error) {
            failCount++;
            listHtml += `
            <div style="padding:10px;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;justify-content:space-between;align-items:center;font-size:0.85rem">
              <span style="color:var(--text-secondary)"><i data-lucide="file-text" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:6px"></i>${item.filename}</span>
              <span class="tag tag-red" style="font-size:0.7rem">${item.error}</span>
            </div>`;
          } else {
            successCount++;
            const c = item.candidate;
            listHtml += `
            <div style="padding:10px;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;justify-content:space-between;align-items:center;font-size:0.85rem">
              <span style="color:var(--text-secondary)"><i data-lucide="file-text" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:6px"></i>${item.filename} (${c.name})</span>
              <div style="display:flex;align-items:center;gap:10px">
                <span class="tag tag-green" style="font-size:0.7rem">Score: ${c.score}%</span>
                <button class="btn btn-ghost btn-sm" style="padding:2px 8px;font-size:0.72rem" onclick="App.navigate('profile','${c.id}')">View</button>
              </div>
            </div>`;
          }
        }

        fb.innerHTML = `
        <div class="card card-cyan" style="padding:20px;margin-top:12px">
          <div style="font-size:1rem;font-weight:700;margin-bottom:12px">✅ Bulk Upload Completed</div>
          <div style="font-size:0.85rem;margin-bottom:12px;color:var(--text-muted)">
            Successfully screened: <strong class="text-cyan">${successCount}</strong> | Failed: <strong class="text-red">${failCount}</strong>
          </div>
          <div style="max-height:300px;overflow-y:auto;background:rgba(0,0,0,0.2);border-radius:8px;padding:8px">
            ${listHtml}
          </div>
          <button class="btn btn-primary btn-sm mt-16" onclick="App.navigate('candidates')">
            <i data-lucide="users"></i> View All Candidates
          </button>
        </div>`;
        lucide.createIcons();
      }
      toast(`Bulk upload completed! Screened ${files.length} resume(s).`, 'success');
    } catch(e) {
      if (fb) fb.innerHTML = `<div class="code-feedback code-feedback-error">Bulk upload failed: ${e.message}</div>`;
      toast('Bulk upload failed: ' + e.message, 'error');
    }
  },
  async processUpload(file) {
    const fb = document.getElementById('upload-feedback');
    if (fb) fb.innerHTML = `<div class="loader" style="padding:20px"><div class="loader-ring"></div><div class="loader-text">AI is scanning resume…</div></div>`;
    try {
      let result;
      if (STATE.user?.role === 'candidate') {
        result = await API.uploadMyResume(file);
        // Refresh own profile in state
        STATE.candidate = result.candidate;
        localStorage.setItem('nexus_user', JSON.stringify({ user: STATE.user, candidate: result.candidate }));
      } else {
        result = await API.uploadResume(file);
      }

      const c = result.candidate;
      if (fb) {
        fb.innerHTML = `
        <div class="card card-cyan" style="padding:20px;margin-top:12px">
          <div style="font-size:1rem;font-weight:700;margin-bottom:12px">✅ Resume Screened — ${c.name}</div>
          <div class="flex gap-12 flex-wrap items-center" style="margin-bottom:14px">
            ${renderScoreRing(c.score, 72)}
            <div>
              ${statusBadge(c.status)}
              <div style="margin-top:8px;font-size:.82rem;color:var(--text-muted)">${c.email}</div>
            </div>
          </div>
          <div class="skill-pills mb-12">${skillPills(c.skills_matched, 'matched', 6)}</div>
          ${STATE.user?.role !== 'candidate' ? `
          <button class="btn btn-primary btn-sm" onclick="App.navigate('profile','${c.id}')">
            <i data-lucide="eye"></i> View Full Profile
          </button>` : `
          <button class="btn btn-primary btn-sm" onclick="App.navigate('dashboard')">
            <i data-lucide="layout-dashboard"></i> View My Dashboard
          </button>`}
        </div>`;
        animateScoreRings();
        lucide.createIcons();
      }
      toast(`Resume screened! AI Score: ${c.score}%`, 'success');
    } catch(e) {
      if (fb) fb.innerHTML = `<div class="code-feedback code-feedback-error">Upload failed: ${e.message}</div>`;
      toast('Upload failed: ' + e.message, 'error');
    }
  },

  /* ── JD Generator ────────────────────────────────────────── */
  async generateJD(e) {
    e.preventDefault();
    const title    = document.getElementById('jd-title').value;
    const skills   = document.getElementById('jd-skills').value;
    const locations= document.getElementById('jd-locations').value;
    try {
      const result = await API.generateJD(title, skills, locations);
      const wrap = document.getElementById('jd-output-wrap');
      const out  = document.getElementById('jd-output');
      if (wrap) wrap.style.display = 'block';
      if (out)  out.textContent = result.jd_text;
      toast('JD generated & activated for AI scoring!', 'success');
    } catch(e) {
      toast('JD generation failed: ' + e.message, 'error');
    }
  },

  /* ── Modal ───────────────────────────────────────────────── */
  openModal(html) {
    document.getElementById('modal-inner-content').innerHTML = html;
    document.getElementById('global-modal').classList.add('open');
    setTimeout(() => lucide.createIcons(), 50);
  },
  showModal(html) {
    this.openModal(html);
  },
  closeModal() {
    document.getElementById('global-modal')?.classList.remove('open');
  },

  /* ── WebSocket Copilot ───────────────────────────────────── */
  initCopilot() {
    const role = STATE.user?.role;
    if (role !== 'recruiter' && role !== 'admin') {
      return;
    }
    window.copilotWS.connect();

    let currentBotMsg = null;

    window.copilotWS.onWelcome = (msg) => {
      addCopilotMsg(msg.content, 'bot');
      renderSuggestions(msg.suggestions || []);
    };

    window.copilotWS.onTyping = () => {
      const msgList = document.getElementById('copilot-messages');
      if (!msgList) return;
      msgList.querySelector('.msg-typing')?.remove();
      const typing = document.createElement('div');
      typing.className = 'msg msg-bot msg-typing';
      typing.innerHTML = `<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>`;
      msgList.appendChild(typing);
      msgList.scrollTop = msgList.scrollHeight;

      currentBotMsg = document.createElement('div');
      currentBotMsg.className = 'msg msg-bot';
      currentBotMsg.style.display = 'none';
    };

    window.copilotWS.onChunk = (chunk) => {
      const msgList = document.getElementById('copilot-messages');
      if (!msgList) return;
      msgList.querySelector('.msg-typing')?.remove();
      if (currentBotMsg && !currentBotMsg.parentElement) {
        currentBotMsg.style.display = '';
        msgList.appendChild(currentBotMsg);
      }
      if (currentBotMsg) {
        currentBotMsg.innerHTML = renderMarkdownLite((currentBotMsg.textContent || '') + chunk);
      }
      msgList.scrollTop = msgList.scrollHeight;
    };

    window.copilotWS.onDone = (suggestions) => {
      currentBotMsg = null;
      renderSuggestions(suggestions);
    };
  },

  sendCopilotMsg() {
    const input = document.getElementById('copilot-input');
    const msg   = input?.value?.trim();
    if (!msg) return;
    if (input) input.value = '';

    addCopilotMsg(msg, 'user');
    document.getElementById('copilot-suggestions').innerHTML = '';

    const sent = window.copilotWS.send(msg);
    if (!sent) {
      API.chat(msg).then(res => {
        addCopilotMsg(res.reply, 'bot');
        renderSuggestions(res.suggestions || []);
      }).catch(err => addCopilotMsg('Error: ' + err.message, 'bot'));
    }
  },
};

function addCopilotMsg(text, who) {
  const list = document.getElementById('copilot-messages');
  if (!list) return;
  const el = document.createElement('div');
  el.className = `msg msg-${who}`;
  el.innerHTML = renderMarkdownLite(text);
  list.appendChild(el);
  list.scrollTop = list.scrollHeight;
}

function renderSuggestions(suggs) {
  const el = document.getElementById('copilot-suggestions');
  if (!el) return;
  el.innerHTML = (suggs || []).map(s =>
    `<button class="suggestion-chip" onclick="App.copilotSuggest('${s.replace(/'/g,"\\'")}')">${s}</button>`).join('');
}

App.copilotSuggest = function(text) {
  const input = document.getElementById('copilot-input');
  if (input) { input.value = text; App.sendCopilotMsg(); }
};


/* ── Filter Candidates ───────────────────────────────────────── */
function filterCandidates() {
  const search = document.getElementById('cand-search')?.value?.toLowerCase() || '';
  const status = document.getElementById('cand-status-filter')?.value || 'All';
  const sort   = document.getElementById('cand-sort')?.value || 'score';

  let cards = Array.from(document.querySelectorAll('#candidates-grid .candidate-card'));

  cards.forEach(card => {
    const name   = card.dataset.name   || '';
    const email  = card.dataset.email  || '';
    const skills = card.dataset.skills || '';
    const cs     = card.dataset.status || '';

    const matchSearch = !search || name.includes(search) || email.includes(search) || skills.includes(search);
    const matchStatus = status === 'All' || cs === status;
    card.style.display = (matchSearch && matchStatus) ? '' : 'none';
  });

  const grid = document.getElementById('candidates-grid');
  if (grid) {
    cards = cards.filter(c => c.style.display !== 'none');
    cards.sort((a, b) => {
      if (sort === 'score') return parseInt(b.dataset.score) - parseInt(a.dataset.score);
      if (sort === 'name')  return a.dataset.name.localeCompare(b.dataset.name);
      if (sort === 'date')  return new Date(b.dataset.date) - new Date(a.dataset.date);
      return 0;
    });
    cards.forEach(c => grid.appendChild(c));
  }
}


/* ── Animated KPI Counters ───────────────────────────────────── */
function animateKPIs() {
  document.querySelectorAll('.kpi-value[data-count]').forEach(el => {
    const raw = el.dataset.count;
    const isNum = !isNaN(parseInt(raw));
    if (!isNum) return;
    const target = parseInt(raw);
    const suffix = raw.includes('%') ? '%' : '';
    let current  = 0;
    const step   = Math.max(1, Math.ceil(target / 40));
    const timer  = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current + suffix;
      if (current >= target) clearInterval(timer);
    }, 30);
  });
}


/* ── Video Focus Lock Utilities ───────────────────────────────── */
let focusLockActive = false;

function setupVideoFocusLock() {
  STATE.tabSwitches = 0;
  STATE.fullscreenViolations = 0;
  focusLockActive = true;

  // Request fullscreen
  setTimeout(() => { triggerFullscreen(); }, 800);

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('blur', handleWindowBlur);
  document.addEventListener('fullscreenchange', handleFullscreenChange);
}
window.setupVideoFocusLock = setupVideoFocusLock;

function stopVideoFocusLock() {
  focusLockActive = false;
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('blur', handleWindowBlur);
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
}
window.stopVideoFocusLock = stopVideoFocusLock;

function triggerFullscreen() {
  const docEl = document.documentElement;
  if (docEl.requestFullscreen) {
    docEl.requestFullscreen().catch(() => {});
  }
}

function showFocusWarning(msg) {
  toast('⚠️ FOCUS LOCK WARNING: ' + msg, 'warning');
}

function handleVisibilityChange() {
  if (document.hidden && focusLockActive) {
    STATE.tabSwitches++;
    showFocusWarning('Tab switch detected! Focus violation has been logged.');
  }
}

function handleWindowBlur() {
  if (focusLockActive) {
    STATE.tabSwitches++;
    showFocusWarning('Window focus lost! Focus violation has been logged.');
  }
}

function handleFullscreenChange() {
  if (!document.fullscreenElement && focusLockActive) {
    STATE.fullscreenViolations++;
    showFocusWarning('Full-screen mode exited! Focus violation has been logged.');
  }
}


/* ── Boot App ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => App.init());
