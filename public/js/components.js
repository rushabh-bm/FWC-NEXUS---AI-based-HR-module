/* ═══════════════════════════════════════════════════════════════
   components.js  —  All UI render functions
   ═══════════════════════════════════════════════════════════════ */

/* ── Helpers ──────────────────────────────────────────────────── */
function scoreColor(s) {
  if (s >= 80) return '#22c55e';
  if (s >= 60) return '#f59e0b';
  return '#ef4444';
}
function scoreGradient(s) {
  if (s >= 80) return ['#15803d','#22c55e'];
  if (s >= 60) return ['#b45309','#f59e0b'];
  return ['#b91c1c','#ef4444'];
}

function renderScoreRing(score, size = 80) {
  const R = size / 2 - 6;
  const circ = 2 * Math.PI * R;
  const offset = circ - (score / 100) * circ;
  const [c1, c2] = scoreGradient(score);
  const uid = 'sg' + Math.random().toString(36).slice(2,7);
  return `
  <svg class="score-ring-svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <circle class="score-ring-track" cx="${size/2}" cy="${size/2}" r="${R}" stroke-width="6"/>
    <circle class="score-ring-fill" cx="${size/2}" cy="${size/2}" r="${R}" stroke-width="6"
      stroke="url(#${uid})"
      stroke-dasharray="${circ}"
      stroke-dashoffset="${circ}"
      data-offset="${offset}"/>
    <text class="score-ring-label" x="${size/2}" y="${size/2 - 4}" text-anchor="middle"
      dominant-baseline="middle" transform="rotate(90,${size/2},${size/2})">${score}</text>
    <text class="score-ring-sub" x="${size/2}" y="${size/2 + 12}" text-anchor="middle"
      transform="rotate(90,${size/2},${size/2})">SCORE</text>
  </svg>`;
}

function animateScoreRings() {
  document.querySelectorAll('.score-ring-fill').forEach(el => {
    const offset = parseFloat(el.dataset.offset);
    setTimeout(() => { el.style.strokeDashoffset = offset; }, 100);
  });
}

function statusBadge(status) {
  const map = {
    'Applied': 'applied', 'Shortlisted': 'shortlisted',
    'Interviewed': 'interviewed', 'Hired': 'hired', 'Rejected': 'rejected'
  };
  const cls = map[status] || 'applied';
  return `<span class="badge badge-${cls}"><span class="badge-dot"></span>${status}</span>`;
}

function interviewBadge(s) {
  if (s === 'Completed') return `<span class="badge badge-completed"><span class="badge-dot"></span>Interviewed</span>`;
  if (s === 'Pending')   return `<span class="badge badge-pending"><span class="badge-dot"></span>Pending</span>`;
  return `<span class="badge badge-applied">—</span>`;
}

function skillPills(skills, variant = 'matched', max = 5) {
  if (!skills || !skills.length) return '<span class="text-muted" style="font-size:0.78rem">None</span>';
  const shown = skills.slice(0, max);
  const extra = skills.length - max;
  let html = shown.map(s => `<span class="skill-pill skill-pill-${variant}">${s}</span>`).join('');
  if (extra > 0) html += `<span class="skill-pill skill-pill-neutral">+${extra}</span>`;
  return html;
}

function progressBar(pct, color = 'cyan', label = '') {
  return `
  <div class="progress-bar-wrap">
    ${label ? `<div class="progress-bar-label"><span>${label}</span><span>${pct}%</span></div>` : ''}
    <div class="progress-bar-track">
      <div class="progress-bar-fill progress-${color}" style="width:0%" data-width="${pct}%"></div>
    </div>
  </div>`;
}

function animateProgressBars() {
  document.querySelectorAll('.progress-bar-fill[data-width]').forEach(el => {
    setTimeout(() => { el.style.width = el.dataset.width; }, 150);
  });
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

/* ═══════════════════════════════════════════════════════════════
   PORTAL LANDING PAGE — Choose Recruiter or Candidate
   ═══════════════════════════════════════════════════════════════ */
function renderPortalPage() {
  return `
  <div class="portal-page">
    <div class="portal-inner">
      <div class="portal-logo">
        <div class="portal-orb">N</div>
        <div>
          <div class="portal-title">FWC <span>NEXUS</span></div>
          <div class="portal-subtitle">AI Talent Intelligence Platform · Select your portal to continue</div>
        </div>
      </div>

      <div class="portal-cards">
        <!-- Recruiter Portal -->
        <div class="portal-card portal-card-recruiter" onclick="App.showRecruiterLogin()">
          <div class="portal-card-icon">
            <i data-lucide="briefcase"></i>
          </div>
          <div class="portal-card-title">Recruiter Portal</div>
          <div class="portal-card-desc">
            Manage the full hiring pipeline. Screen resumes with AI, run structured interviews, and track candidates from application to onboarding.
          </div>
          <div class="portal-card-features">
            <div class="portal-card-feature">
              <div class="portal-card-feature-dot"></div> AI Candidate Screening &amp; Scoring
            </div>
            <div class="portal-card-feature">
              <div class="portal-card-feature-dot"></div> Real-time Hiring Analytics
            </div>
            <div class="portal-card-feature">
              <div class="portal-card-feature-dot"></div> AI Interview Management
            </div>
            <div class="portal-card-feature">
              <div class="portal-card-feature-dot"></div> Onboarding Tracker
            </div>
          </div>
          <button class="portal-card-btn" type="button">
            <i data-lucide="log-in" style="width:16px;height:16px"></i>
            Enter Recruiter Portal
          </button>
        </div>

        <!-- Candidate Portal -->
        <div class="portal-card portal-card-candidate" onclick="App.showCandidateLogin()">
          <div class="portal-card-icon">
            <i data-lucide="user-circle"></i>
          </div>
          <div class="portal-card-title">Candidate Portal</div>
          <div class="portal-card-desc">
            Track your application, upload your resume, complete AI-powered interviews, and stay on top of your onboarding journey.
          </div>
          <div class="portal-card-features">
            <div class="portal-card-feature">
              <div class="portal-card-feature-dot"></div> Resume Upload &amp; AI Match Score
            </div>
            <div class="portal-card-feature">
              <div class="portal-card-feature-dot"></div> AI Interview &amp; Evaluation
            </div>
            <div class="portal-card-feature">
              <div class="portal-card-feature-dot"></div> Application Status Tracker
            </div>
            <div class="portal-card-feature">
              <div class="portal-card-feature-dot"></div> Onboarding Checklist
            </div>
          </div>
          <button class="portal-card-btn" type="button">
            <i data-lucide="log-in" style="width:16px;height:16px"></i>
            Enter Candidate Portal
          </button>
        </div>
      </div>
    </div>
  </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   RECRUITER LOGIN PAGE
   ═══════════════════════════════════════════════════════════════ */
function renderRecruiterLogin() {
  return `
  <div class="login-page">
    <!-- Left Illustration -->
    <div class="login-illustration login-illustration-recruiter">
      <div class="login-illo-content">
        <div class="login-illo-icon">
          <i data-lucide="briefcase" style="color:#fff;width:48px;height:48px"></i>
        </div>
        <div class="login-illo-title">Recruiter Hub</div>
        <div class="login-illo-sub">
          AI-powered talent acquisition. Screen hundreds of resumes in seconds, run structured interviews, and build high-performing teams.
        </div>
        <div class="login-illo-stats">
          <div class="login-illo-stat">
            <div class="login-illo-stat-val">92%</div>
            <div class="login-illo-stat-lbl">Match Accuracy</div>
          </div>
          <div class="login-illo-stat">
            <div class="login-illo-stat-val">3x</div>
            <div class="login-illo-stat-lbl">Faster Hiring</div>
          </div>
          <div class="login-illo-stat">
            <div class="login-illo-stat-val">5★</div>
            <div class="login-illo-stat-lbl">AI Rating</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Form -->
    <div class="login-form-panel">
      <div class="login-form-wrap">
        <button class="login-back-btn" onclick="App.showLogin()">
          <i data-lucide="arrow-left"></i> All Portals
        </button>

        <div class="login-form-logo">
          <div class="login-form-logo-orb login-form-logo-orb-recruiter">N</div>
          <div>
            <div class="login-form-logo-text">FWC NEXUS</div>
            <div class="login-form-logo-sub">Recruiter Portal</div>
          </div>
        </div>

        <div class="login-form-heading">Welcome back</div>
        <div class="login-form-heading-sub">Sign in to your recruiter account to continue</div>

        <div class="login-tabs">
          <button class="login-tab login-tab-recruiter active" id="tab-login" onclick="App.switchLoginTab('login')">Sign In</button>
          <button class="login-tab login-tab-recruiter" id="tab-register" onclick="App.switchLoginTab('register')">Register</button>
        </div>

        <div id="login-error" class="login-error" style="display:none"></div>

        <div id="login-form-wrap">
          <form class="login-form" id="login-form" onsubmit="App.handleLogin(event)">
            <div class="form-group">
              <label class="form-label">Work Email</label>
              <input type="email" id="login-username" class="form-input form-input-recruiter"
                placeholder="recruiter@fwc.com" required autocomplete="username">
            </div>
            <div class="form-group">
              <label class="form-label">Password</label>
              <input type="password" id="login-password" class="form-input form-input-recruiter"
                placeholder="••••••••" required autocomplete="current-password">
            </div>
            <button type="submit" class="btn btn-recruiter btn-full btn-lg" id="login-btn" style="margin-top:4px">
              <i data-lucide="log-in"></i> Sign In to Recruiter Portal
            </button>
          </form>
        </div>

        <div id="register-form-wrap" style="display:none">
          <form class="login-form" id="register-form" onsubmit="App.handleRegister(event)">
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input type="text" id="reg-name" class="form-input form-input-recruiter" placeholder="Sarah Jenkins" required>
            </div>
            <div class="form-group">
              <label class="form-label">Work Email</label>
              <input type="email" id="reg-email" class="form-input form-input-recruiter" placeholder="you@company.com" required autocomplete="email">
            </div>
            <div class="form-group">
              <label class="form-label">Password</label>
              <input type="password" id="reg-password" class="form-input form-input-recruiter" placeholder="Min. 6 characters" required minlength="6">
            </div>
            <button type="submit" class="btn btn-recruiter btn-full btn-lg" style="margin-top:4px">
              <i data-lucide="user-plus"></i> Create Recruiter Account
            </button>
          </form>
        </div>

        <div class="login-hint login-hint-recruiter">
          Demo — <strong>recruiter@fwc.com</strong> / <strong>password123</strong>
        </div>
      </div>
    </div>
  </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   CANDIDATE LOGIN PAGE
   ═══════════════════════════════════════════════════════════════ */
function renderCandidateLogin() {
  return `
  <div class="login-page">
    <!-- Left Illustration -->
    <div class="login-illustration login-illustration-candidate">
      <div class="login-illo-content">
        <div class="login-illo-icon">
          <i data-lucide="user-circle" style="color:#fff;width:48px;height:48px"></i>
        </div>
        <div class="login-illo-title">Candidate Hub</div>
        <div class="login-illo-sub">
          Track your application in real-time. Complete AI-powered interviews, see your skill match score, and stay on top of your onboarding.
        </div>
        <div class="login-illo-stats">
          <div class="login-illo-stat">
            <div class="login-illo-stat-val">AI</div>
            <div class="login-illo-stat-lbl">Powered Score</div>
          </div>
          <div class="login-illo-stat">
            <div class="login-illo-stat-val">Live</div>
            <div class="login-illo-stat-lbl">Status Updates</div>
          </div>
          <div class="login-illo-stat">
            <div class="login-illo-stat-val">360°</div>
            <div class="login-illo-stat-lbl">Profile View</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Form -->
    <div class="login-form-panel">
      <div class="login-form-wrap">
        <button class="login-back-btn" onclick="App.showLogin()">
          <i data-lucide="arrow-left"></i> All Portals
        </button>

        <div class="login-form-logo">
          <div class="login-form-logo-orb login-form-logo-orb-candidate">N</div>
          <div>
            <div class="login-form-logo-text">FWC NEXUS</div>
            <div class="login-form-logo-sub">Candidate Portal</div>
          </div>
        </div>

        <div class="login-form-heading">Your career starts here</div>
        <div class="login-form-heading-sub">Sign in to track your application and complete your interview</div>

        <div class="login-tabs">
          <button class="login-tab login-tab-candidate active" id="tab-login" onclick="App.switchLoginTab('login')">Sign In</button>
          <button class="login-tab login-tab-candidate" id="tab-register" onclick="App.switchLoginTab('register')">Register</button>
        </div>

        <div id="login-error" class="login-error" style="display:none"></div>

        <div id="login-form-wrap">
          <form class="login-form" id="login-form" onsubmit="App.handleLogin(event)">
            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="email" id="login-username" class="form-input form-input-candidate"
                placeholder="candidate@email.com" required autocomplete="username">
            </div>
            <div class="form-group">
              <label class="form-label">Password</label>
              <input type="password" id="login-password" class="form-input form-input-candidate"
                placeholder="••••••••" required autocomplete="current-password">
            </div>
            <button type="submit" class="btn btn-candidate btn-full btn-lg" id="login-btn" style="margin-top:4px">
              <i data-lucide="log-in"></i> Sign In to Candidate Portal
            </button>
          </form>
        </div>

        <div id="register-form-wrap" style="display:none">
          <form class="login-form" id="register-form" onsubmit="App.handleRegister(event)">
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input type="text" id="reg-name" class="form-input form-input-candidate" placeholder="Aryan Sharma" required>
            </div>
            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="email" id="reg-email" class="form-input form-input-candidate" placeholder="you@email.com" required autocomplete="email">
            </div>
            <div class="form-group">
              <label class="form-label">Password</label>
              <input type="password" id="reg-password" class="form-input form-input-candidate" placeholder="Min. 6 characters" required minlength="6">
            </div>
            <button type="submit" class="btn btn-candidate btn-full btn-lg" style="margin-top:4px">
              <i data-lucide="user-plus"></i> Create Candidate Account
            </button>
          </form>
        </div>

        <div class="login-hint login-hint-candidate">
          Demo — <strong>candidate@fwc.com</strong> / <strong>password123</strong>
        </div>
      </div>
    </div>
  </div>`;
}

/* Backward-compatible alias */
function renderLoginPage() { return renderPortalPage(); }


/* ═══════════════════════════════════════════════════════════════
   RECRUITER DASHBOARD
   ═══════════════════════════════════════════════════════════════ */
function renderDashboard(candidates, analytics) {
  const total       = analytics?.total       || candidates.length;
  const shortlisted = analytics?.shortlisted || 0;
  const hired       = analytics?.hired       || 0;
  const avgScore    = analytics?.avg_score   || 0;
  const top5        = analytics?.top_candidates || [...candidates].sort((a,b)=>b.score-a.score).slice(0,5);
  const ai          = analytics?.ai_enabled  || {};

  const kpiCards = [
    { label:'Total Candidates', value:total,       icon:'users',         color:'cyan',   variant:'kpi-card-cyan' },
    { label:'Shortlisted',       value:shortlisted, icon:'star',          color:'purple', variant:'kpi-card-purple' },
    { label:'Hired',             value:hired,       icon:'briefcase',     color:'green',  variant:'kpi-card-green' },
    { label:'Avg AI Score',      value:avgScore+'%',icon:'brain-circuit', color:'amber',  variant:'kpi-card-amber' },
  ];

  const aiStatus = [
    { label:'spaCy NER',             on: ai.spacy },
    { label:'Semantic Matching',     on: ai.sentence_transformers },
    { label:'Sentiment Analysis',    on: ai.transformers },
    { label:'SQLite SQL Database',   on: true },
    { label:'Real-time WebSocket',   on: true },
  ];

  return `
  <div class="page-wrapper">
    <div class="page-header">
      <div>
        <h1 class="page-title">Recruitment <span class="gradient-text">Command Center</span></h1>
        <p class="page-subtitle">Real-time AI candidate intelligence for FWC Global HTD Programme</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" onclick="API.exportCSV()">
          <i data-lucide="download"></i> Export CSV
        </button>
        <button class="btn btn-cyan btn-sm" onclick="App.navigate('upload')">
          <i data-lucide="upload"></i> Upload Resume
        </button>
      </div>
    </div>

    <!-- AI Status Bar -->
    <div class="ai-status-bar">
      <span style="font-size:0.72rem;font-weight:700;color:var(--text-muted);letter-spacing:.05em">AI ENGINE</span>
      ${aiStatus.map(s => `
        <span class="ai-status-item ${s.on ? 'ai-status-on' : 'ai-status-off'}">
          <i data-lucide="${s.on ? 'check-circle' : 'alert-circle'}" style="width:12px;height:12px"></i>
          ${s.label}
        </span>`).join('')}
    </div>

    <!-- KPI Cards -->
    <div class="kpi-grid">
      ${kpiCards.map(k => `
      <div class="kpi-card ${k.variant}">
        <div class="kpi-icon kpi-icon-${k.color}">
          <i data-lucide="${k.icon}"></i>
        </div>
        <div class="kpi-info">
          <div class="kpi-value" data-count="${k.value}">${k.value}</div>
          <div class="kpi-label">${k.label}</div>
        </div>
      </div>`).join('')}
    </div>

    <div class="dashboard-grid">
      <!-- Left column: charts + recent -->
      <div>
        <div class="card section">
          <div class="section-title">
            <i data-lucide="bar-chart-3" style="width:16px;height:16px;color:var(--cyan)"></i>
            Hiring Pipeline Funnel
            <div class="section-title-line"></div>
          </div>
          <div id="chart-funnel"></div>
        </div>

        <div class="card">
          <div class="section-title">
            <i data-lucide="zap" style="width:16px;height:16px;color:var(--purple)"></i>
            Skill Coverage Heatmap
            <div class="section-title-line"></div>
          </div>
          <div id="chart-skills"></div>
        </div>
      </div>

      <!-- Right column: leaderboard -->
      <div>
        <div class="card section">
          <div class="section-title">
            <i data-lucide="trophy" style="width:16px;height:16px;color:var(--amber)"></i>
            Top Candidates
            <div class="section-title-line"></div>
          </div>
          ${top5.map((c,i) => `
          <div class="leaderboard-item" onclick="App.navigate('profile', '${c.id}')">
            <div class="lb-rank lb-rank-${i < 3 ? i+1 : 'n'}">${i+1}</div>
            <div class="lb-info">
              <div class="lb-name">${c.name}</div>
              <div class="lb-status">${c.status} · ${c.experience_years}yr exp</div>
            </div>
            <div class="lb-score">${c.score}%</div>
          </div>`).join('')}
          <button class="btn btn-ghost btn-full btn-sm mt-16" onclick="App.navigate('candidates')">
            View All Candidates <i data-lucide="arrow-right"></i>
          </button>
        </div>

        <div class="card">
          <div class="section-title">
            <i data-lucide="pie-chart" style="width:16px;height:16px;color:var(--green)"></i>
            Status Distribution
            <div class="section-title-line"></div>
          </div>
          <div id="chart-status"></div>
        </div>
      </div>
    </div>
  </div>`;
}

function initDashboardCharts(analytics) {
  const funnel = analytics?.funnel || [];
  const skillHm = analytics?.skill_heatmap || [];
  const candidates = analytics?.top_candidates || [];

  // Funnel chart
  if (funnel.length && document.getElementById('chart-funnel')) {
    new ApexCharts(document.getElementById('chart-funnel'), {
      chart: { type: 'bar', height: 200, background: 'transparent', toolbar: { show: false },
        animations: { enabled: true, speed: 800 } },
      series: [{ name: 'Candidates', data: funnel.map(f => f.count) }],
      xaxis: { categories: funnel.map(f => f.stage), labels: { style: { colors: '#94a3b8', fontSize: '0.78rem' } } },
      yaxis: { labels: { style: { colors: '#94a3b8' } } },
      fill: { type: 'gradient', gradient: { shade: 'dark', type: 'horizontal',
        gradientToColors: ['#a855f7'], stops: [0, 100] } },
      colors: ['#00c8d4'],
      plotOptions: { bar: { borderRadius: 6, columnWidth: '60%' } },
      dataLabels: { enabled: true, style: { colors: ['#fff'], fontSize: '0.8rem', fontWeight: 700 } },
      grid: { borderColor: 'rgba(255,255,255,0.05)' },
      tooltip: { theme: 'dark' },
      theme: { mode: 'dark' }
    }).render();
  }

  // Skill heatmap / bar
  if (skillHm.length && document.getElementById('chart-skills')) {
    const top10 = skillHm.slice(0, 10);
    new ApexCharts(document.getElementById('chart-skills'), {
      chart: { type: 'bar', height: 200, background: 'transparent', toolbar: { show: false },
        animations: { enabled: true, speed: 600 } },
      series: [{ name: 'Candidates', data: top10.map(s => s.count) }],
      xaxis: { categories: top10.map(s => s.skill),
        labels: { style: { colors: '#94a3b8', fontSize: '0.7rem' }, rotate: -20 } },
      yaxis: { labels: { style: { colors: '#94a3b8' } } },
      colors: ['#a855f7'],
      plotOptions: { bar: { borderRadius: 4, columnWidth: '70%' } },
      dataLabels: { enabled: false },
      grid: { borderColor: 'rgba(255,255,255,0.05)' },
      tooltip: { theme: 'dark' },
      theme: { mode: 'dark' }
    }).render();
  }

  // Status donut
  const candidates2 = analytics?.top_candidates || [];
  if (document.getElementById('chart-status') && analytics) {
    const statuses = { Applied: analytics.total - analytics.shortlisted - analytics.interviewed - analytics.hired - analytics.rejected,
      Shortlisted: analytics.shortlisted, Interviewed: analytics.interviewed,
      Hired: analytics.hired, Rejected: analytics.rejected || 0 };
    const labels = Object.keys(statuses).filter(k => statuses[k] > 0);
    const vals   = labels.map(k => statuses[k]);
    new ApexCharts(document.getElementById('chart-status'), {
      chart: { type: 'donut', height: 200, background: 'transparent' },
      series: vals,
      labels: labels,
      colors: ['#94a3b8', '#00f5ff', '#a855f7', '#22c55e', '#ef4444'],
      legend: { position: 'bottom', labels: { colors: '#94a3b8' } },
      dataLabels: { enabled: false },
      plotOptions: { pie: { donut: { size: '65%',
        labels: { show: true, total: { show: true, label: 'Total',
          color: '#94a3b8', fontSize: '0.78rem',
          formatter: () => analytics.total } } } } },
      tooltip: { theme: 'dark' },
      theme: { mode: 'dark' }
    }).render();
  }
}


/* ═══════════════════════════════════════════════════════════════
   CANDIDATES LIST
   ═══════════════════════════════════════════════════════════════ */
function renderCandidatesPage(candidates) {
  const statuses = ['All', 'Applied', 'Shortlisted', 'Interviewed', 'Hired', 'Rejected'];
  return `
  <div class="page-wrapper">
    <div class="page-header">
      <div>
        <h1 class="page-title">Talent <span class="gradient-text">Pipeline</span></h1>
        <p class="page-subtitle">${candidates.length} candidate${candidates.length !== 1 ? 's' : ''} in the AI screening database</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-cyan btn-sm" onclick="App.navigate('upload')">
          <i data-lucide="upload-cloud"></i> Upload Resumes
        </button>
        <button class="btn btn-ghost btn-sm" onclick="API.exportCSV()">
          <i data-lucide="file-down"></i> Export CSV
        </button>
      </div>
    </div>

    <div class="candidates-toolbar">
      <div class="search-wrap">
        <i data-lucide="search"></i>
        <input type="text" id="cand-search" class="form-input search-input"
          placeholder="Search by name, email, skill…" oninput="filterCandidates()">
      </div>
      <select class="form-select" id="cand-status-filter" onchange="filterCandidates()" style="width:150px">
        ${statuses.map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>
      <select class="form-select" id="cand-sort" onchange="filterCandidates()" style="width:140px">
        <option value="score">Sort: Score</option>
        <option value="name">Sort: Name</option>
        <option value="date">Sort: Newest</option>
      </select>
    </div>

    <div class="candidates-grid" id="candidates-grid">
      ${candidates.map(c => renderCandidateCard(c)).join('')}
    </div>
  </div>`;
}

function renderCandidateCard(c) {
  const isRecruiter = typeof STATE !== 'undefined' && STATE.user && (STATE.user.role === 'recruiter' || STATE.user.role === 'admin');
  return `
  <div class="card candidate-card" data-id="${c.id}" data-name="${c.name.toLowerCase()}"
    data-email="${c.email.toLowerCase()}" data-status="${c.status}"
    data-score="${c.score}" data-skills="${(c.skills_matched||[]).join(',').toLowerCase()}"
    data-date="${c.created_at||''}"
    onclick="${isRecruiter ? `App.navigate('profile','${c.id}')` : ''}">

    <div class="candidate-card-header">
      <div class="profile-avatar" style="width:48px;height:48px;font-size:1.1rem;border-radius:12px">
        ${c.name.charAt(0).toUpperCase()}
      </div>
      <div class="candidate-info">
        <div class="candidate-name">${c.name}</div>
        <div class="candidate-email" title="${c.email}">${c.email}</div>
        <div class="candidate-meta">
          ${statusBadge(c.status)}
          ${interviewBadge(c.interview_status)}
          ${c.status === 'Hired' ? (c.onboarding_progress === 100 ? `<span class="badge badge-completed"><span class="badge-dot" style="background:var(--green)"></span>Onboarded ✓</span>` : `<span class="badge badge-pending"><span class="badge-dot" style="background:var(--cyan)"></span>Onboarding: ${c.onboarding_progress}%</span>`) : ''}
          <span class="chip"><i data-lucide="briefcase" style="width:10px;height:10px"></i> ${c.experience_years}yr</span>
        </div>
      </div>
      <div class="score-ring-wrap">
        ${renderScoreRing(c.score, 72)}
      </div>
    </div>

    <div>
      <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:6px;font-weight:600;letter-spacing:.04em">MATCHED SKILLS</div>
      <div class="skill-pills">${skillPills(c.skills_matched, 'matched', 5)}</div>
    </div>

    ${progressBar(c.onboarding_progress, 'cyan', 'Onboarding')}

    <div class="candidate-card-actions" onclick="event.stopPropagation()">
      ${isRecruiter ? `
      <button class="btn btn-cyan btn-sm" onclick="App.navigate('profile','${c.id}')">
        <i data-lucide="eye"></i> Profile
      </button>
      <button class="btn btn-purple btn-sm" onclick="App.navigate('interview','${c.id}')">
        <i data-lucide="mic"></i> Interview
      </button>
      <div style="margin-left:auto">
        <select class="form-select" style="padding:6px 10px;font-size:0.78rem"
          onchange="App.quickStatus('${c.id}',this.value)">
          <option value="">Change Status…</option>
          <option value="Applied">Applied</option>
          <option value="Shortlisted">Shortlisted</option>
          <option value="Interviewed">Interviewed</option>
          <option value="Hired">Hired ✓</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>
      ` : ''}
    </div>
  </div>`;
}


/* ═══════════════════════════════════════════════════════════════
   CANDIDATE PROFILE — 360° View
   ═══════════════════════════════════════════════════════════════ */
function renderCandidateProfile(c) {
  const initials = c.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
  const evalData = c.interview_eval || {};
  const semPct   = Math.round((c.semantic_score || 0) * 100);
  const isRecruiter = typeof STATE !== 'undefined' && STATE.user && (STATE.user.role === 'recruiter' || STATE.user.role === 'admin');

  return `
  <div class="page-wrapper">
    ${isRecruiter ? `
    <button class="btn btn-ghost btn-sm mb-20" onclick="App.navigate('candidates')">
      <i data-lucide="arrow-left"></i> Back to Pipeline
    </button>
    ` : `
    <button class="btn btn-ghost btn-sm mb-20" onclick="App.navigate('dashboard')">
      <i data-lucide="arrow-left"></i> Back to Dashboard
    </button>
    `}

    <!-- Hero -->
    <div class="profile-hero">
      <div class="profile-avatar">${initials}</div>
      <div class="profile-details">
        <div class="profile-name">${c.name}</div>
        <div class="profile-email">${c.email}</div>
        <div class="profile-badges">
          ${statusBadge(c.status)}
          ${interviewBadge(c.interview_status)}
          ${c.status === 'Hired' ? (c.onboarding_progress === 100 ? `<span class="badge badge-completed" id="onboarding-badge-el"><span class="badge-dot" style="background:var(--green)"></span>Onboarded ✓</span>` : `<span class="badge badge-pending" id="onboarding-badge-el"><span class="badge-dot" style="background:var(--cyan)"></span>Onboarding: ${c.onboarding_progress}%</span>`) : ''}
          <span class="chip"><i data-lucide="briefcase" style="width:10px;height:10px"></i> ${c.experience_years} yr exp</span>
          <span class="chip"><i data-lucide="file-text" style="width:10px;height:10px"></i> ${c.resume_name}</span>
          ${semPct ? `<span class="chip text-cyan"><i data-lucide="cpu" style="width:10px;height:10px"></i> Semantic: ${semPct}%</span>` : ''}
        </div>
      </div>
      <div class="profile-score">
        <div class="score-ring-wrap">
          ${renderScoreRing(c.score, 100)}
          <div class="score-ring-caption">AI FIT SCORE</div>
        </div>
      </div>
      ${isRecruiter ? `
      <div style="display:flex;flex-direction:column;gap:10px;flex-shrink:0">
        <button class="btn btn-primary btn-sm" onclick="App.navigate('interview','${c.id}')">
          <i data-lucide="mic"></i> Run Interview
        </button>
        <button class="btn btn-cyan btn-sm" onclick="App.loadAISummary('${c.id}')">
          <i data-lucide="sparkles"></i> AI Summary
        </button>
        <button class="btn btn-purple btn-sm" onclick="App.navigate('code','${c.id}')">
          <i data-lucide="code-2"></i> Code Test
        </button>
      </div>
      ` : ''}
    </div>

    <!-- AI Summary -->
    ${isRecruiter ? `
    <div class="ai-summary-card card" id="ai-summary-section">
      <div class="ai-summary-header">
        <div class="ai-summary-icon"><i data-lucide="sparkles" style="width:16px;height:16px"></i></div>
        <div class="ai-summary-title">Nexus AI Analysis</div>
        <span class="tag tag-purple" style="margin-left:auto">AI Generated</span>
      </div>
      <div class="ai-summary-text" id="ai-summary-text">
        ${c.ai_summary ? renderMarkdownLite(c.ai_summary) : '<span style="color:var(--text-muted)">Click "AI Summary" to generate a full AI analysis of this candidate.</span>'}
      </div>
    </div>
    ` : ''}

    <!-- Skills Grid -->
    <div class="profile-grid">
      <div class="card">
        <div class="section-title">
          <i data-lucide="check-circle" style="width:15px;height:15px;color:var(--green)"></i>
          Matched Skills (${(c.skills_matched||[]).length})
          <div class="section-title-line"></div>
        </div>
        <div class="skill-pills">
          ${(c.skills_matched||[]).map(s => `<span class="skill-pill skill-pill-matched">${s}</span>`).join('') || '<span class="text-muted">None detected</span>'}
        </div>
      </div>
      <div class="card">
        <div class="section-title">
          <i data-lucide="x-circle" style="width:15px;height:15px;color:var(--red)"></i>
          Skill Gaps (${(c.skills_missing||[]).length})
          <div class="section-title-line"></div>
        </div>
        <div class="skill-pills">
          ${(c.skills_missing||[]).map(s => `<span class="skill-pill skill-pill-missing">${s}</span>`).join('') || '<span class="text-muted" style="font-size:.78rem">No gaps detected!</span>'}
        </div>
      </div>
    </div>

    <!-- Skill Radar Chart -->
    <div class="card section">
      <div class="section-title">
        <i data-lucide="radar" style="width:15px;height:15px;color:var(--cyan)"></i>
        Skill Coverage Radar
        <div class="section-title-line"></div>
      </div>
      <div id="radar-chart"></div>
    </div>

    <!-- Interview Section -->
    ${c.interview_status === 'Completed' && evalData ? `
    <div class="card section">
      <div class="section-title">
        <i data-lucide="mic" style="width:15px;height:15px;color:var(--purple)"></i>
        Interview Performance
        <div class="section-title-line"></div>
      </div>
      <div class="interview-scoring">
        <div class="score-metric">
          <div class="score-metric-val text-cyan">${c.interview_score}</div>
          <div class="score-metric-lbl">Overall Score</div>
        </div>
        <div class="score-metric">
          <div class="score-metric-val text-purple">${evalData.accuracy || 0}</div>
          <div class="score-metric-lbl">Accuracy</div>
        </div>
        <div class="score-metric">
          <div class="score-metric-val text-green">${evalData.clarity || 0}</div>
          <div class="score-metric-lbl">Clarities</div>
        </div>
        <div class="score-metric">
          <div class="score-metric-val" style="font-size:.9rem;color:var(--amber)">${evalData.sentiment || '—'}</div>
          <div class="score-metric-lbl">Sentiment</div>
        </div>
      </div>
      ${progressBar(c.interview_score, 'purple', 'Interview Score')}
      ${evalData.summary ? `<div class="ai-summary-text mt-16" style="padding:14px;background:rgba(168,85,247,.05);border:1px solid rgba(168,85,247,.1);border-radius:10px">${evalData.summary}</div>` : ''}
      <div id="interview-chart" style="margin-top:16px"></div>
    </div>` : `
    <div class="card section">
      <div class="empty-state">
        <div class="empty-icon"><i data-lucide="mic-off"></i></div>
        <div class="empty-title">No Interview Yet</div>
        <div class="empty-sub">Run the AI interview to assess this candidate</div>
        <button class="btn btn-primary btn-sm mt-12" onclick="App.navigate('interview','${c.id}')">
          <i data-lucide="play"></i> Start AI Interview
        </button>
      </div>
    </div>`}

    <!-- Onboarding -->
    <div class="card section">
      <div class="section-title">
        <i data-lucide="clipboard-check" style="width:15px;height:15px;color:var(--green)"></i>
        Onboarding Progress
        <div class="section-title-line"></div>
        <span class="tag tag-green" id="profile-onboarding-pct">${c.onboarding_progress}% Complete</span>
      </div>
      ${progressBar(c.onboarding_progress, 'green')}
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:16px" id="onboarding-tasks">
        ${(c.onboarding_tasks||[]).sort((a,b)=>(a.order||0)-(b.order||0)).map(t => `
        <div class="onboarding-task ${t.completed ? 'done' : ''}"
          onclick="${isRecruiter ? `App.toggleTask('${c.id}','${t.id}',${!t.completed})` : ''}" id="task-${t.id}">
          <div class="task-check">
            <i data-lucide="check" style="width:12px;height:12px"></i>
          </div>
          <div class="task-title">${t.title}</div>
          <div class="task-number">${t.id.split('-')[0].toUpperCase()}</div>
        </div>`).join('')}
      </div>
    </div>

    <!-- Recruiter Remark -->
    ${isRecruiter ? `
    <div class="card" style="padding:16px">
      <div class="section-title" style="margin-bottom:12px">
        <i data-lucide="message-square" style="width:14px;height:14px;color:var(--amber)"></i>
        Internal Recruiter Note
        <div class="section-title-line"></div>
        <span class="tag tag-amber" style="font-size:.65rem">RECRUITER ONLY</span>
      </div>
      ${c.recruiter_remark
        ? `<div style="font-size:.85rem;color:var(--text-secondary);padding:10px 14px;background:rgba(251,191,36,.05);border:1px solid rgba(251,191,36,.15);border-radius:8px;margin-bottom:10px">${c.recruiter_remark}</div>`
        : `<div style="font-size:.8rem;color:var(--text-muted);margin-bottom:10px">No notes yet.</div>`
      }
      <button class="btn btn-amber btn-sm" onclick="App.showRemarkModal('${c.id}', '${(c.recruiter_remark||'').replace(/'/g,"\\'").replace(/\n/g,' ')}')">
        <i data-lucide="pencil"></i> ${c.recruiter_remark ? 'Edit Note' : 'Add Note'}
      </button>
    </div>

    <!-- Action Bar -->
    <div class="card" style="padding:16px">
      <div class="flex items-center gap-12 flex-wrap">
        <span style="font-size:.82rem;color:var(--text-muted);font-weight:600">UPDATE STATUS</span>
        ${['Applied','Shortlisted','Interviewed','Hired','Rejected'].map(s => `
        <button class="btn btn-sm ${c.status === s ? 'btn-primary' : 'btn-ghost'}"
          onclick="App.updateStatus('${c.id}','${s}')">
          ${s}
        </button>`).join('')}
      </div>
    </div>
    ` : ''}
  </div>`;
}

function initProfileCharts(c) {
  // Radar chart
  const all_skills = ['Python','JavaScript','React','Node.Js','Machine Learning','AI','Docker','AWS','SQL','Git'];
  const matched = c.skills_matched || [];
  const series  = all_skills.map(sk => matched.some(m => m.toLowerCase() === sk.toLowerCase()) ? 1 : 0);
  const radarEl = document.getElementById('radar-chart');
  if (radarEl && typeof ApexCharts !== 'undefined') {
    new ApexCharts(radarEl, {
      chart: { type: 'radar', height: 280, background: 'transparent', toolbar: { show: false } },
      series: [{ name: 'Has Skill', data: series }],
      labels: all_skills,
      fill: { type: 'gradient', gradient: { shade: 'dark', type: 'radial',
        colorStops: [{ offset: 0, color: '#00c8d4', opacity: 0.5 },
                     { offset: 100, color: '#a855f7', opacity: 0.2 }] } },
      stroke: { colors: ['#00f5ff'], width: 2 },
      markers: { size: 4, colors: ['#00f5ff'], strokeColors: '#00f5ff' },
      xaxis: { labels: { style: { colors: Array(all_skills.length).fill('#94a3b8'), fontSize: '0.72rem' } } },
      yaxis: { show: false, min: 0, max: 1 },
      plotOptions: { radar: { polygons: { strokeColors: 'rgba(255,255,255,0.05)',
        fill: { colors: ['rgba(255,255,255,0.01)', 'rgba(255,255,255,0.03)'] } } } },
      tooltip: { enabled: true },
      theme: { mode: 'dark' }
    }).render();
  }

  // Interview scores bar
  const evalData = c.interview_eval;
  const interviewEl = document.getElementById('interview-chart');
  if (interviewEl && evalData && evalData.detailed_scores && typeof ApexCharts !== 'undefined') {
    new ApexCharts(interviewEl, {
      chart: { type: 'bar', height: 160, background: 'transparent', toolbar: { show: false },
        animations: { speed: 700 } },
      series: [{ name: 'Score', data: evalData.detailed_scores }],
      xaxis: { categories: evalData.detailed_scores.map((_,i) => `Q${i+1}`),
        labels: { style: { colors: '#94a3b8' } } },
      yaxis: { max: 100, labels: { style: { colors: '#94a3b8' } } },
      colors: ['#a855f7'],
      plotOptions: { bar: { borderRadius: 6, columnWidth: '50%' } },
      dataLabels: { enabled: true, style: { colors: ['#fff'], fontSize: '0.78rem', fontWeight: 700 } },
      grid: { borderColor: 'rgba(255,255,255,0.05)' },
      tooltip: { theme: 'dark' },
      theme: { mode: 'dark' }
    }).render();
  }
}


/* ═══════════════════════════════════════════════════════════════
   AI INTERVIEW TERMINAL
   ═══════════════════════════════════════════════════════════════ */
const INTERVIEW_QUESTIONS = [
  "Describe your hands-on experience with Python or JavaScript. Include specific projects or frameworks you have used.",
  "What is your understanding of the Hire → Train → Deploy (HTD) model, and why does it excite you?",
  "You are on-call and a production server fails at 2 AM. Walk me through your exact response process.",
  "Why do you want to join FWC as an AI/ML Full Stack Developer, and how does this role align with your 3-year career plan?"
];

function renderInterviewPage(candidate) {
  const isCandidate = (window.STATE?.user?.role === 'candidate') ||
                      (typeof STATE !== 'undefined' && STATE.user?.role === 'candidate');
  const backBtn = isCandidate
    ? `<button class="btn btn-ghost btn-sm mb-20" onclick="App.navigate('dashboard')"><i data-lucide="arrow-left"></i> My Application</button>`
    : `<button class="btn btn-ghost btn-sm mb-20" onclick="App.navigate('profile','${candidate.id}')"><i data-lucide="arrow-left"></i> Back to Profile</button>`;
  return `
  <div class="page-wrapper interview-page">
    ${backBtn}

    <div class="terminal-card">
      <!-- Terminal Header -->
      <div class="terminal-header">
        <div class="terminal-dot terminal-dot-red"></div>
        <div class="terminal-dot terminal-dot-amber"></div>
        <div class="terminal-dot terminal-dot-green"></div>
        <div class="terminal-title">nexus-ai-interview.sh — ${candidate.name}</div>
      </div>

      <!-- Terminal Body -->
      <div class="terminal-body">
        <div class="terminal-prompt">▶ nexus-ai $ interview --candidate="${candidate.name}" --model=gpt-nexus-v2</div>
        <div style="margin:16px 0 24px">
          <div class="flex items-center gap-12" style="flex-wrap:wrap">
            <div class="score-ring-wrap">
              ${renderScoreRing(candidate.score, 72)}
              <div style="font-size:.68rem;color:var(--text-muted)">RESUME FIT</div>
            </div>
            <div style="flex:1">
              <div style="font-size:1.1rem;font-weight:700">${candidate.name}</div>
              <div style="font-size:.8rem;color:var(--text-muted);margin-top:2px">${candidate.email}</div>
              <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
                ${skillPills(candidate.skills_matched, 'matched', 4)}
              </div>
            </div>
          </div>
        </div>

        <!-- Progress dots -->
        <div class="interview-progress-bar" id="interview-progress">
          ${INTERVIEW_QUESTIONS.map((_,i) => `<div class="interview-progress-dot ${i===0?'active':''}" id="prog-dot-${i}"></div>`).join('')}
        </div>

        <!-- Question Display -->
        <div id="interview-section">
          <div class="terminal-prompt">▶ question 1 of ${INTERVIEW_QUESTIONS.length}</div>
          <div class="interview-question" id="interview-question"></div>

          <div class="interview-waveform" id="interview-waveform" style="display:none">
            ${Array.from({length:18},(_,i)=>`<div class="waveform-bar" style="animation-delay:${i*0.07}s"></div>`).join('')}
          </div>

          <div class="interview-answer-label">▶ your_answer.txt</div>
          <textarea class="form-textarea mono" id="interview-answer" rows="5"
            placeholder="Type your detailed answer here… Be thorough — the AI scores on depth and keyword alignment."></textarea>
          <div style="display:flex;gap:10px;margin-top:14px;justify-content:flex-end;flex-wrap:wrap">
            <button class="btn btn-ghost btn-sm" onclick="App.skipQuestion()">
              <i data-lucide="skip-forward"></i> Skip
            </button>
            <button class="btn btn-cyan" id="next-q-btn" onclick="App.submitAnswer()">
              Next Question <i data-lucide="arrow-right"></i>
            </button>
          </div>
        </div>

        <!-- Results Section (hidden initially) -->
        <div id="interview-results" style="display:none">
          <div class="terminal-prompt">▶ nexus-ai $ evaluate --mode=nlp+sentiment</div>
          <div class="loader" id="eval-loader">
            <div class="loader-ring"></div>
            <div class="loader-text">AI is evaluating your responses…</div>
          </div>
          <div id="eval-results-content" style="display:none"></div>
        </div>
      </div>
    </div>
  </div>`;
}

function renderInterviewResults(result) {
  const c = result.candidate;
  const eval_ = c.interview_eval || {};
  const scores = eval_.detailed_scores || [];
  return `
  <div class="interview-scoring">
    <div class="score-metric">
      <div class="score-metric-val text-cyan">${c.interview_score}</div>
      <div class="score-metric-lbl">Overall</div>
    </div>
    <div class="score-metric">
      <div class="score-metric-val text-purple">${eval_.accuracy}</div>
      <div class="score-metric-lbl">Accuracy</div>
    </div>
    <div class="score-metric">
      <div class="score-metric-val text-green">${eval_.clarity}</div>
      <div class="score-metric-lbl">Clarity</div>
    </div>
  </div>
  <div style="margin-top:14px;padding:14px;background:rgba(0,245,255,.05);border:1px solid rgba(0,245,255,.1);border-radius:10px">
    <div style="font-size:.72rem;color:var(--cyan);font-weight:700;margin-bottom:6px;letter-spacing:.05em">AI SENTIMENT: ${eval_.sentiment}</div>
    <div style="font-size:.875rem;color:var(--text-secondary);line-height:1.6">${eval_.summary}</div>
  </div>
  <div style="margin-top:14px">
    ${scores.map((s,i) => progressBar(s, s>=80?'green':s>=65?'cyan':'amber', `Q${i+1} Score`)).join('')}
  </div>
  <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap">
    <button class="btn btn-primary" onclick="App.navigate('dashboard')">
      <i data-lucide="layout-dashboard"></i> Back to Dashboard
    </button>
    ${(typeof STATE !== 'undefined' && STATE.user?.role !== 'candidate') ? `
    <button class="btn btn-cyan" onclick="App.navigate('profile','${c.id}')">
      <i data-lucide="user"></i> View Full Profile
    </button>
    <button class="btn btn-purple" onclick="App.updateStatus('${c.id}','Shortlisted')">
      <i data-lucide="star"></i> Shortlist Candidate
    </button>` : ''}
  </div>`;
}


/* ═══════════════════════════════════════════════════════════════
   ANALYTICS PAGE
   ═══════════════════════════════════════════════════════════════ */
function renderAnalyticsPage(analytics) {
  const ai = analytics?.ai_enabled || {};
  return `
  <div class="page-wrapper">
    <div class="page-header">
      <div>
        <h1 class="page-title">Analytics <span class="gradient-text">Intelligence</span></h1>
        <p class="page-subtitle">AI-powered recruitment pipeline insights & talent distribution metrics</p>
      </div>
    </div>

    <div class="ai-status-bar">
      <span style="font-size:.72rem;font-weight:700;color:var(--text-muted)">AI STATUS</span>
      ${[
        { l:'spaCy NER', v: ai.spacy },
        { l:'Semantic Matching (sentence-transformers)', v: ai.sentence_transformers },
        { l:'Sentiment Analysis (HuggingFace)', v: ai.transformers },
        { l:'SQL Database (SQLAlchemy)', v: true },
      ].map(x => `<span class="ai-status-item ${x.v?'ai-status-on':'ai-status-off'}">
        <i data-lucide="${x.v?'check-circle':'alert-triangle'}" style="width:11px;height:11px"></i> ${x.l}</span>`).join('')}
    </div>

    <!-- KPIs -->
    <div class="kpi-grid">
      ${[
        { label:'Total Candidates', value: analytics.total,       color:'cyan',   icon:'users' },
        { label:'Shortlisted',       value: analytics.shortlisted, color:'purple', icon:'star' },
        { label:'Interviewed',       value: analytics.interviewed, color:'amber',  icon:'mic' },
        { label:'Hired',             value: analytics.hired,       color:'green',  icon:'check-circle' },
      ].map(k => `
      <div class="kpi-card kpi-card-${k.color}">
        <div class="kpi-icon kpi-icon-${k.color}"><i data-lucide="${k.icon}"></i></div>
        <div class="kpi-info">
          <div class="kpi-value">${k.value}</div>
          <div class="kpi-label">${k.label}</div>
        </div>
      </div>`).join('')}
    </div>

    <div class="analytics-grid">
      <div class="card chart-card">
        <div class="chart-title">📊 Hiring Funnel</div>
        <div id="an-funnel"></div>
      </div>
      <div class="card chart-card">
        <div class="chart-title">🎯 Score Distribution</div>
        <div id="an-scores"></div>
      </div>
      <div class="card chart-card">
        <div class="chart-title">🔥 Top Skills Demand</div>
        <div id="an-skills"></div>
      </div>
      <div class="card chart-card">
        <div class="chart-title">🥇 Leaderboard</div>
        ${(analytics.top_candidates||[]).map((c,i) => `
        <div class="leaderboard-item" onclick="App.navigate('profile','${c.id}')">
          <div class="lb-rank lb-rank-${i<3?i+1:'n'}">${i+1}</div>
          <div class="lb-info">
            <div class="lb-name">${c.name}</div>
            <div style="font-size:.72rem;color:var(--text-muted)">${c.status}</div>
          </div>
          ${renderScoreRing(c.score, 52)}
        </div>`).join('')}
      </div>
    </div>
  </div>`;
}

function initAnalyticsCharts(analytics) {
  const funnel  = analytics?.funnel || [];
  const dist    = analytics?.score_distribution || [];
  const skills  = analytics?.skill_heatmap || [];

  // Funnel
  const funnelEl = document.getElementById('an-funnel');
  if (funnelEl && funnel.length) {
    new ApexCharts(funnelEl, {
      chart: { type: 'bar', height: 220, background: 'transparent', toolbar: { show: false } },
      plotOptions: { bar: { horizontal: true, borderRadius: 6, dataLabels: { position: 'top' } } },
      series: [{ name: 'Count', data: funnel.map(f => f.count) }],
      xaxis: { categories: funnel.map(f => f.stage), labels: { style: { colors: '#94a3b8' } } },
      yaxis: { labels: { style: { colors: '#94a3b8' } } },
      fill: { type: 'gradient', gradient: { shade: 'dark', type: 'horizontal',
        gradientToColors: ['#a855f7'] } },
      colors: ['#00c8d4'],
      dataLabels: { enabled: true, style: { colors: ['#fff'] } },
      grid: { borderColor: 'rgba(255,255,255,0.05)' },
      tooltip: { theme: 'dark' }, theme: { mode: 'dark' }
    }).render();
  }

  // Score Distribution
  const scEl = document.getElementById('an-scores');
  if (scEl && dist.length) {
    const filtered = dist.filter(d => d.count > 0);
    new ApexCharts(scEl, {
      chart: { type: 'area', height: 220, background: 'transparent', toolbar: { show: false },
        sparkline: { enabled: false } },
      series: [{ name: 'Candidates', data: dist.map(d => d.count) }],
      xaxis: { categories: dist.map(d => d.range), labels: { style: { colors: '#94a3b8', fontSize: '.7rem' }, rotate: -20 } },
      yaxis: { labels: { style: { colors: '#94a3b8' } } },
      fill: { type: 'gradient', gradient: { shade: 'dark', type: 'vertical',
        colorStops: [{ offset: 0, color: '#a855f7', opacity: 0.6 }, { offset: 100, color: '#a855f7', opacity: 0 }] } },
      stroke: { curve: 'smooth', colors: ['#a855f7'], width: 2 },
      dataLabels: { enabled: false },
      grid: { borderColor: 'rgba(255,255,255,0.05)' },
      tooltip: { theme: 'dark' }, theme: { mode: 'dark' }
    }).render();
  }

  // Skills bar
  const skEl = document.getElementById('an-skills');
  if (skEl && skills.length) {
    const top8 = skills.slice(0,8);
    new ApexCharts(skEl, {
      chart: { type: 'bar', height: 220, background: 'transparent', toolbar: { show: false } },
      plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
      series: [{ name: 'Candidates with skill', data: top8.map(s => s.count) }],
      xaxis: { categories: top8.map(s => s.skill), labels: { style: { colors: '#94a3b8' } } },
      yaxis: { labels: { style: { colors: '#94a3b8' } } },
      colors: ['#22c55e'],
      dataLabels: { enabled: true, style: { colors: ['#fff'] } },
      grid: { borderColor: 'rgba(255,255,255,0.05)' },
      tooltip: { theme: 'dark' }, theme: { mode: 'dark' }
    }).render();
  }
}


/* ═══════════════════════════════════════════════════════════════
   RESUME UPLOAD
   ═══════════════════════════════════════════════════════════════ */
function renderUploadPage(isCandidate = false) {
  const backTarget = isCandidate ? 'dashboard' : 'candidates';
  const backLabel  = isCandidate ? 'My Application' : 'Candidates';
  const heading    = isCandidate ? 'Update Your Resume' : 'Upload & Screen Resumes';
  const subtext    = isCandidate
    ? 'Upload your latest PDF resume. AI will re-score your skill match against the active job description.'
    : 'AI will parse the PDF(s), extract skills using NLP, and score candidates against the active JD. You can select and upload multiple PDF files in bulk.';
  return `
  <div class="page-wrapper" style="max-width:640px;margin:0 auto">
    <button class="btn btn-ghost btn-sm mb-20" onclick="App.navigate('${backTarget}')">
      <i data-lucide="arrow-left"></i> ${backLabel}
    </button>
    <div class="card">
      <h2 class="mb-12 gradient-text">${heading}</h2>
      <p class="mb-20" style="font-size:.875rem">${subtext}</p>
      <div id="upload-dropzone" class="upload-drop" onclick="document.getElementById('resume-file-input').click()"
        ondragover="event.preventDefault();this.classList.add('drag-over')"
        ondragleave="this.classList.remove('drag-over')"
        ondrop="App.handleFileDrop(event)">
        <i data-lucide="upload-cloud" style="width:40px;height:40px;color:var(--cyan);margin-bottom:12px"></i>
        <div style="font-weight:600">Drop PDF${isCandidate ? '' : '(s)'} here or click to browse</div>
        <div style="font-size:.78rem;color:var(--text-muted);margin-top:4px">PDF files only · Max 10MB</div>
        <input type="file" id="resume-file-input" accept=".pdf" style="display:none" onchange="App.handleFileSelect(event)" ${isCandidate ? '' : 'multiple'}>
      </div>
      <div id="upload-feedback" style="margin-top:16px"></div>
    </div>
  </div>`;
}


/* ═══════════════════════════════════════════════════════════════
   JD GENERATOR
   ═══════════════════════════════════════════════════════════════ */
function renderJDPage() {
  return `
  <div class="page-wrapper" style="max-width:700px;margin:0 auto">
    <div class="page-header">
      <div>
        <h1 class="page-title">JD <span class="gradient-text">Generator</span></h1>
        <p class="page-subtitle">Generate a custom Job Description and activate it for live AI scoring</p>
      </div>
    </div>
    <div class="card">
      <form onsubmit="App.generateJD(event)" style="display:flex;flex-direction:column;gap:18px">
        <div class="form-group">
          <label class="form-label">Role Title</label>
          <input type="text" id="jd-title" class="form-input" placeholder="e.g. AI/ML Full Stack Developer" required>
        </div>
        <div class="form-group">
          <label class="form-label">Required Skills (comma-separated)</label>
          <input type="text" id="jd-skills" class="form-input"
            placeholder="Python, Machine Learning, React, Docker, AWS" required>
        </div>
        <div class="form-group">
          <label class="form-label">Deployment Locations (comma-separated)</label>
          <input type="text" id="jd-locations" class="form-input" placeholder="Dubai, Singapore, India" required>
        </div>
        <button type="submit" class="btn btn-primary btn-full">
          <i data-lucide="wand-2"></i> Generate & Activate JD
        </button>
      </form>
      <div id="jd-output-wrap" style="margin-top:20px;display:none">
        <div class="section-title mt-20">
          <i data-lucide="file-text" style="width:15px;height:15px;color:var(--green)"></i>
          Generated JD (Now Active for AI Scoring)
          <div class="section-title-line"></div>
          <span class="tag tag-green">ACTIVE</span>
        </div>
        <div class="jd-output" id="jd-output"></div>
      </div>
    </div>
  </div>`;
}


/* ═══════════════════════════════════════════════════════════════
   CODE EVALUATOR
   ═══════════════════════════════════════════════════════════════ */
function renderCodePage(candidate) {
  return `
  <div class="page-wrapper" style="max-width:720px;margin:0 auto">
    <button class="btn btn-ghost btn-sm mb-20" onclick="App.navigate('profile','${candidate.id}')">
      <i data-lucide="arrow-left"></i> Back to Profile
    </button>
    <div class="terminal-card">
      <div class="terminal-header">
        <div class="terminal-dot terminal-dot-red"></div>
        <div class="terminal-dot terminal-dot-amber"></div>
        <div class="terminal-dot terminal-dot-green"></div>
        <div class="terminal-title">nexus-code-sandbox.py — ${candidate.name}</div>
      </div>
      <div class="terminal-body">
        <div class="terminal-prompt">▶ Challenge: Implement vector dot product A·B</div>
        <div style="margin:12px 0;padding:12px;background:rgba(0,245,255,.05);border:1px solid rgba(0,245,255,.1);border-radius:8px;font-size:.82rem;color:var(--text-secondary)">
          Given two lists A = [1, 2, 3] and B = [4, 5, 6], write a Python function <strong style="color:var(--cyan)">dot_product(A, B)</strong> that returns their dot product (1×4 + 2×5 + 3×6 = <strong style="color:var(--cyan)">32</strong>).
        </div>
        <div class="interview-answer-label">▶ solution.py</div>
        <textarea class="form-textarea mono" id="code-input" rows="12"
          placeholder="def dot_product(A, B):\n    # Your solution here\n    pass"></textarea>
        <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
          <select class="form-select" id="code-lang" style="width:130px">
            <option value="python">Python</option>
          </select>
          <button class="btn btn-primary" onclick="App.runCodeEval('${candidate.id}')">
            <i data-lucide="play"></i> Run AI Evaluation
          </button>
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('code-input').value='def dot_product(A, B):\\n    return sum(a*b for a,b in zip(A,B))'">
            Hint
          </button>
        </div>
        <div id="code-result" style="margin-top:16px"></div>
      </div>
    </div>
  </div>`;
}

function renderCodeResult(res) {
  const cls = res.success ? 'code-feedback-success' : res.complexity_time === 'N/A' ? 'code-feedback-error' : 'code-feedback-warn';
  const checks = (res.functional_checks || []).map(c => `<div style="font-size:.82rem;margin-bottom:4px">${c}</div>`).join('');
  const tips   = (res.optimization_tips || []).map(t => `<div style="font-size:.8rem;color:var(--amber);margin-bottom:4px">💡 ${t}</div>`).join('');
  return `
  <div class="code-feedback ${cls}">
    <strong>${res.feedback}</strong>
    ${checks}
    ${tips}
  </div>
  ${res.complexity_time !== 'N/A' ? `
  <div class="complexity-badges">
    <span class="complexity-badge">⏱ Time: ${res.complexity_time}</span>
    <span class="complexity-badge">💾 Space: ${res.complexity_space}</span>
    ${res.cyclomatic ? `<span class="complexity-badge">🔀 Complexity: ${res.cyclomatic}</span>` : ''}
  </div>` : ''}`;
}


/* ═══════════════════════════════════════════════════════════════
   CANDIDATE DASHBOARD (role-locked — candidates only)
   ═══════════════════════════════════════════════════════════════ */
function renderCandidateDashboard(candidate) {
  const interviewDone = candidate.interview_status === 'Completed';
  const evalData      = candidate.interview_eval || {};
  const semPct        = Math.round((candidate.semantic_score || 0) * 100);

  // Application timeline stages
  const stages = [
    { key: 'Applied',     label: 'Applied',     icon: 'send',           done: true },
    { key: 'Screened',    label: 'AI Screened', icon: 'cpu',            done: candidate.score > 0 },
    { key: 'Interviewed', label: 'Interviewed', icon: 'mic',            done: interviewDone },
    { key: 'Shortlisted', label: 'Shortlisted', icon: 'star',           done: ['Shortlisted','Hired'].includes(candidate.status) },
    { key: 'Hired',       label: 'Offer',        icon: 'briefcase',     done: candidate.status === 'Hired' },
  ];

  return `
  <div class="page-wrapper">
    <div class="page-header">
      <div>
        <h1 class="page-title">My <span class="gradient-text">Application</span></h1>
        <p class="page-subtitle">FWC Global HTD Programme — AI-powered recruitment tracker</p>
      </div>
    </div>

    <!-- Hero Card -->
    <div class="profile-hero">
      <div class="profile-avatar">${candidate.name.charAt(0).toUpperCase()}</div>
      <div class="profile-details">
        <div class="profile-name">${candidate.name}</div>
        <div class="profile-email">${candidate.email}</div>
        <div class="profile-badges">
          ${statusBadge(candidate.status)}
          ${interviewBadge(candidate.interview_status)}
          <span class="chip"><i data-lucide="briefcase" style="width:10px;height:10px"></i> ${candidate.experience_years}yr exp</span>
          <span class="chip"><i data-lucide="file-text" style="width:10px;height:10px"></i> ${candidate.resume_name}</span>
          ${semPct ? `<span class="chip text-cyan"><i data-lucide="cpu" style="width:10px;height:10px"></i> AI Match: ${semPct}%</span>` : ''}
        </div>
      </div>
      <div class="profile-score">
        <div class="score-ring-wrap">
          ${renderScoreRing(candidate.score, 100)}
          <div class="score-ring-caption">AI FIT SCORE</div>
        </div>
      </div>
    </div>

    <!-- Application Timeline -->
    <div class="card section">
      <div class="section-title">
        <i data-lucide="git-branch" style="width:15px;height:15px;color:var(--cyan)"></i>
        Application Timeline
        <div class="section-title-line"></div>
      </div>
      <div class="app-timeline">
        ${stages.map((s, i) => `
        <div class="timeline-step ${s.done ? 'done' : ''} ${i > 0 && !stages[i-1].done ? 'locked' : ''}">
          <div class="timeline-icon">
            <i data-lucide="${s.icon}" style="width:14px;height:14px"></i>
          </div>
          <div class="timeline-label">${s.label}</div>
          ${i < stages.length - 1 ? '<div class="timeline-connector"></div>' : ''}
        </div>`).join('')}
      </div>
    </div>

    <!-- Profile Completion Bar -->
    <div class="card" style="padding:18px">
      <div class="flex items-center gap-12" style="margin-bottom:10px">
        <i data-lucide="user-check" style="width:16px;height:16px;color:var(--purple)"></i>
        <span style="font-size:.85rem;font-weight:600">Profile Completion</span>
        <span class="tag tag-purple" style="margin-left:auto">${Math.min(100, 20 + (candidate.score > 0 ? 30 : 0) + (interviewDone ? 30 : 0) + (candidate.onboarding_progress > 0 ? 20 : 0))}%</span>
      </div>
      ${progressBar(Math.min(100, 20 + (candidate.score > 0 ? 30 : 0) + (interviewDone ? 30 : 0) + (candidate.onboarding_progress > 0 ? 20 : 0)), 'purple')}
      <div style="display:flex;gap:16px;margin-top:10px;flex-wrap:wrap">
        <span style="font-size:.75rem;color:${candidate.score > 0 ? 'var(--green)' : 'var(--text-muted)'}"><i data-lucide="${candidate.score > 0 ? 'check-circle' : 'circle'}" style="width:12px;height:12px"></i> Resume Uploaded</span>
        <span style="font-size:.75rem;color:${interviewDone ? 'var(--green)' : 'var(--text-muted)'}"><i data-lucide="${interviewDone ? 'check-circle' : 'circle'}" style="width:12px;height:12px"></i> Interview Completed</span>
        <span style="font-size:.75rem;color:${candidate.onboarding_progress > 0 ? 'var(--green)' : 'var(--text-muted)'}"><i data-lucide="${candidate.onboarding_progress > 0 ? 'check-circle' : 'circle'}" style="width:12px;height:12px"></i> Onboarding Started</span>
      </div>
    </div>

    <!-- Skills Grid -->
    <div class="profile-grid">
      <div class="card">
        <div class="section-title">
          <i data-lucide="check-circle" style="width:15px;height:15px;color:var(--green)"></i>
          Your Matched Skills
          <div class="section-title-line"></div>
          <span class="tag tag-green">${(candidate.skills_matched||[]).length}</span>
        </div>
        <div class="skill-pills">${skillPills(candidate.skills_matched, 'matched', 12)}</div>
      </div>
      <div class="card">
        <div class="section-title">
          <i data-lucide="target" style="width:15px;height:15px;color:var(--amber)"></i>
          Skills to Develop
          <div class="section-title-line"></div>
          <span class="tag tag-amber">${(candidate.skills_missing||[]).length}</span>
        </div>
        <div class="skill-pills">${skillPills(candidate.skills_missing, 'missing', 12)}</div>
      </div>
    </div>

    <!-- Interview Results (if completed) -->
    ${interviewDone ? `
    <div class="card section">
      <div class="section-title">
        <i data-lucide="mic" style="width:15px;height:15px;color:var(--purple)"></i>
        Your Interview Results
        <div class="section-title-line"></div>
        <span class="tag tag-purple">AI Evaluated</span>
      </div>
      <div class="interview-scoring">
        <div class="score-metric"><div class="score-metric-val text-cyan">${candidate.interview_score}</div><div class="score-metric-lbl">Overall</div></div>
        <div class="score-metric"><div class="score-metric-val text-purple">${evalData.accuracy || 0}</div><div class="score-metric-lbl">Accuracy</div></div>
        <div class="score-metric"><div class="score-metric-val text-green">${evalData.clarity || 0}</div><div class="score-metric-lbl">Clarity</div></div>
        <div class="score-metric"><div class="score-metric-val" style="font-size:.85rem;color:var(--amber)">${evalData.sentiment || '—'}</div><div class="score-metric-lbl">Sentiment</div></div>
      </div>
      ${progressBar(candidate.interview_score, 'purple', 'Interview Score')}
      ${evalData.summary ? `<div style="margin-top:14px;padding:12px;background:rgba(168,85,247,.05);border:1px solid rgba(168,85,247,.1);border-radius:8px;font-size:.85rem;color:var(--text-secondary);line-height:1.6">${evalData.summary}</div>` : ''}
    </div>` : `
    <div class="card section">
      <div class="empty-state" style="padding:24px">
        <div class="empty-icon"><i data-lucide="mic-off"></i></div>
        <div class="empty-title">Interview Pending</div>
        <div class="empty-sub">Complete your AI interview to boost your application score</div>
        <button class="btn btn-primary btn-sm mt-12" onclick="App.navigate('interview')">
          <i data-lucide="play"></i> Start AI Interview
        </button>
      </div>
    </div>`}

    <!-- Onboarding Checklist -->
    <div class="card section">
      <div class="section-title">
        <i data-lucide="clipboard-check" style="width:15px;height:15px;color:var(--green)"></i>
        Onboarding Checklist
        <div class="section-title-line"></div>
        <span class="tag tag-green">${candidate.onboarding_progress}% Complete</span>
      </div>
      ${progressBar(candidate.onboarding_progress, 'green')}
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:16px">
        ${(candidate.onboarding_tasks||[]).sort((a,b)=>(a.order||0)-(b.order||0)).map(t => `
        <div class="onboarding-task ${t.completed ? 'done' : ''}" id="task-${t.id}"
          onclick="App.toggleTask('${candidate.id}','${t.id}',${!t.completed})">
          <div class="task-check"><i data-lucide="check" style="width:12px;height:12px"></i></div>
          <div class="task-title">${t.title}</div>
          <div class="task-number">${t.id.split('-')[0].toUpperCase()}</div>
        </div>`).join('')}
      </div>
    </div>

    <!-- Quick Actions (candidate-safe only) -->
    <div class="card" style="padding:16px">
      <div class="section-title" style="margin-bottom:14px">
        <i data-lucide="zap" style="width:14px;height:14px;color:var(--amber)"></i>
        Quick Actions
        <div class="section-title-line"></div>
      </div>
      <div class="flex items-center gap-12 flex-wrap">
        <button class="btn btn-purple" onclick="App.navigate('interview')">
          <i data-lucide="mic"></i> ${interviewDone ? 'Redo Interview' : 'Take AI Interview'}
        </button>
        <button class="btn btn-cyan" onclick="App.navigate('upload')">
          <i data-lucide="upload"></i> Update Resume
        </button>
      </div>
    </div>
  </div>`;
}


/* ═══════════════════════════════════════════════════════════════
   ADMIN DASHBOARD WRAPPER
   ═══════════════════════════════════════════════════════════════ */
function renderAdminDashboard(candidates, analytics, stats) {
  const totalUsers = stats?.total_users || 0;
  const recruiters = stats?.recruiters || 0;
  const cands      = stats?.candidates || 0;
  return `
  <div class="page-wrapper">
    <div class="page-header">
      <div>
        <h1 class="page-title">Admin <span class="gradient-text">Control Center</span></h1>
        <p class="page-subtitle">System-wide platform overview — super-admin access</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-amber btn-sm" onclick="App.navigate('admin')">
          <i data-lucide="settings"></i> User Management
        </button>
        <button class="btn btn-ghost btn-sm" onclick="API.exportCSV()">
          <i data-lucide="download"></i> Export CSV
        </button>
      </div>
    </div>

    <div class="kpi-grid">
      ${[
        { label:'Total Users',    value: totalUsers, icon:'users',       variant:'kpi-card-cyan' },
        { label:'Recruiters',     value: recruiters, icon:'briefcase',   variant:'kpi-card-purple' },
        { label:'Candidates',     value: cands,      icon:'user-circle', variant:'kpi-card-green' },
        { label:'Avg AI Score',   value: (analytics?.avg_score || 0)+'%', icon:'brain-circuit', variant:'kpi-card-amber' },
      ].map(k => `
      <div class="kpi-card ${k.variant}">
        <div class="kpi-icon"><i data-lucide="${k.icon}"></i></div>
        <div class="kpi-info"><div class="kpi-value" data-count="${k.value}">${k.value}</div><div class="kpi-label">${k.label}</div></div>
      </div>`).join('')}
    </div>
    ${renderDashboard(candidates, analytics)}
  </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   ADMIN PANEL — User Management
   ═══════════════════════════════════════════════════════════════ */
function renderAdminPanel(users, stats) {
  const roleColor = { admin: 'amber', recruiter: 'cyan', candidate: 'purple' };
  return `
  <div class="page-wrapper">
    <div class="page-header">
      <div>
        <h1 class="page-title">User <span class="gradient-text">Management</span></h1>
        <p class="page-subtitle">${users.length} total users · Admin panel</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" onclick="App.navigate('dashboard')">
          <i data-lucide="arrow-left"></i> Dashboard
        </button>
      </div>
    </div>

    <!-- Create User Form -->
    <div class="card" style="margin-bottom:24px">
      <div class="section-title" style="margin-bottom:16px">
        <i data-lucide="user-plus" style="width:15px;height:15px;color:var(--cyan)"></i>
        Create New User
        <div class="section-title-line"></div>
      </div>
      <form onsubmit="App.adminCreateUser(event)" style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input type="text" id="admin-new-name" class="form-input" placeholder="Sarah Jenkins" required>
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" id="admin-new-email" class="form-input" placeholder="sarah@company.com" required>
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input type="password" id="admin-new-pass" class="form-input" placeholder="Min 6 chars" required minlength="6">
        </div>
        <div class="form-group">
          <label class="form-label">Role</label>
          <select id="admin-new-role" class="form-select">
            <option value="candidate">Candidate</option>
            <option value="recruiter">Recruiter</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div style="grid-column:1/-1">
          <button type="submit" class="btn btn-cyan">
            <i data-lucide="user-plus"></i> Create User
          </button>
        </div>
      </form>
    </div>

    <!-- Users Table -->
    <div class="card">
      <div class="section-title" style="margin-bottom:16px">
        <i data-lucide="users" style="width:15px;height:15px;color:var(--purple)"></i>
        All Users (${users.length})
        <div class="section-title-line"></div>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="border-bottom:1px solid var(--border)">
              ${['ID','Name','Email','Role','Joined','Actions'].map(h =>
                `<th style="padding:10px 12px;text-align:left;font-size:.75rem;color:var(--text-muted);font-weight:600;letter-spacing:.04em">${h}</th>`
              ).join('')}
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
            <tr style="border-bottom:1px solid rgba(255,255,255,.04);transition:background .15s" onmouseover="this.style.background='rgba(255,255,255,.02)'" onmouseout="this.style.background=''">
              <td style="padding:10px 12px;font-size:.78rem;color:var(--text-muted)">#${u.id}</td>
              <td style="padding:10px 12px;font-size:.88rem;font-weight:500">${u.name}</td>
              <td style="padding:10px 12px;font-size:.82rem;color:var(--text-muted)">${u.username}</td>
              <td style="padding:10px 12px">
                <span class="tag tag-${roleColor[u.role]||'cyan'}" style="font-size:.68rem">${u.role.toUpperCase()}</span>
              </td>
              <td style="padding:10px 12px;font-size:.78rem;color:var(--text-muted)">${u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
              <td style="padding:10px 12px">
                <button class="btn btn-ghost btn-sm" style="color:var(--red);padding:4px 8px"
                  onclick="App.adminDeleteUser(${u.id},'${u.name.replace(/'/g,"\\'")}')">
                  <i data-lucide="trash-2" style="width:13px;height:13px"></i>
                </button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>`;
}

/* ── Upload drop zone CSS helper (inline) ─────────────────── */
const _dropStyle = document.createElement('style');
_dropStyle.textContent = `
.upload-drop {
  border: 2px dashed var(--border-cyan);
  border-radius: var(--r-lg);
  padding: 48px 20px;
  text-align: center;
  cursor: pointer;
  transition: var(--t-mid);
  display: flex; flex-direction: column; align-items: center;
  background: rgba(0,245,255,0.02);
}
.upload-drop:hover, .upload-drop.drag-over {
  border-color: var(--cyan);
  background: rgba(0,245,255,0.06);
  box-shadow: var(--glow-cyan);
}`;
document.head.appendChild(_dropStyle);

/* ── Simple markdown bold/italic renderer ─────────────────── */
function renderMarkdownLite(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}


/* ══════════════════════════════════════════════════════════════
   RECRUITMENT PIPELINE — NEW COMPONENTS (v3.0)
   ══════════════════════════════════════════════════════════════ */

async function renderJobBoard() {
  setView(`
    <div class="container animate-fade-in">
      <div class="section-header">
        <h2 class="section-title"><i data-lucide="briefcase"></i> Explore Opportunities</h2>
        <p class="section-subtitle">Find your next role with real-time AI matching score assessment</p>
      </div>
      <div id="job-board-list" class="grid grid-3">
        <div class="col-span-full text-center py-12"><div class="spinner"></div> Loading jobs...</div>
      </div>
    </div>
  `);
  
  try {
    const jobs = await API.getJobs();
    const listEl = document.getElementById('job-board-list');
    if (!jobs || jobs.length === 0) {
      listEl.innerHTML = `
        <div class="col-span-full card text-center py-12">
          <i data-lucide="info" style="font-size: 48px; color: var(--text-muted); margin-bottom: 16px;"></i>
          <h3>No active job openings</h3>
          <p>Check back later or upload your resume for direct screening.</p>
        </div>
      `;
      return;
    }
    
    let candidate = STATE.candidate;
    listEl.innerHTML = jobs.map(job => {
      let matchScore = 0;
      let scoreBadge = '';
      if (candidate && candidate.skills_matched) {
        const cSkills = new Set((candidate.skills_matched || []).map(s => s.toLowerCase()));
        const jSkills = job.skills || [];
        const overlap = jSkills.filter(s => cSkills.has(s.toLowerCase()));
        matchScore = jSkills.length ? Math.round((overlap.length / jSkills.length) * 100) : 50;
        scoreBadge = `
          <div class="job-match-score" style="position: absolute; top: 16px; right: 16px; display: flex; align-items: center; gap: 8px;">
            <span class="tag tag-purple">AI Match ${matchScore}%</span>
          </div>
        `;
      }
      
      const skillsHtml = (job.skills || []).slice(0, 5).map(s => `<span class="tag tag-ghost">${s}</span>`).join(' ');
      const locationsHtml = (job.locations || []).join(', ');
      
      return `
        <div class="card job-card relative animate-scale-up" style="padding-top: 40px; transition: var(--t-mid); overflow: hidden; display: flex; flex-direction: column;">
          ${scoreBadge}
          <div style="margin-bottom: 12px;">
            <span class="tag tag-cyan">${job.employment_type || 'Full-Time'}</span>
            <span class="tag tag-amber" style="margin-left: 4px;">${job.department || 'Engineering'}</span>
          </div>
          <h3 class="card-title">${job.title}</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; margin-bottom: 12px;">
            <i data-lucide="map-pin" style="width: 14px; height: 14px;"></i> ${locationsHtml || 'Remote'}
            <span style="margin: 0 4px;">·</span>
            <i data-lucide="dollar-sign" style="width: 14px; height: 14px;"></i> ${job.salary_range || 'Competitive'}
          </p>
          <p style="font-size: 0.9rem; margin-bottom: 16px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; height: 60px;">
            ${job.description}
          </p>
          <div style="margin-bottom: 20px;">
            <strong style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 6px;">Skills</strong>
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              ${skillsHtml}
            </div>
          </div>
          <div style="display: flex; gap: 8px; margin-top: auto;">
            <button class="btn btn-cyan btn-sm flex-1" onclick="openApplyModal(${job.id}, '${job.title.replace(/'/g, "\\'")}')">Apply Now</button>
          </div>
        </div>
      `;
    }).join('');
    lucide.createIcons();
  } catch(e) {
    toast(e.message, 'error');
  }
}

function openApplyModal(jobId, jobTitle) {
  const content = `
    <div style="padding: 10px;">
      <h3 style="margin-bottom: 8px;">Apply for ${jobTitle}</h3>
      <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 20px;">
        Introduce yourself and outline why you are an ideal fit. Our AI will automatically screen your cover note alongside your resume.
      </p>
      <div class="form-group" style="margin-bottom: 20px;">
        <label>Cover Note (Optional)</label>
        <textarea id="apply-cover-note" class="form-control" rows="5" placeholder="Dear Hiring Manager, I am writing to express my interest..."></textarea>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 10px;">
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">Cancel</button>
        <button id="submit-application-btn" class="btn btn-cyan btn-sm" onclick="submitApplication(${jobId})">Submit Application</button>
      </div>
    </div>
  `;
  App.showModal(content);
}

async function submitApplication(jobId) {
  const btn = document.getElementById('submit-application-btn');
  const note = document.getElementById('apply-cover-note').value;
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting...'; }
  try {
    await API.applyToJob(jobId, note);
    toast('Application submitted successfully!', 'success');
    App.closeModal();
    App.navigate('my-applications');
  } catch(e) {
    toast(e.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Submit Application'; }
  }
}

async function renderMyApplicationsPage() {
  setView(`
    <div class="container animate-fade-in">
      <div class="section-header">
        <h2 class="section-title"><i data-lucide="layers"></i> My Applications</h2>
        <p class="section-subtitle">Real-time tracking of your job applications and interview stages</p>
      </div>
      <div id="my-apps-list" class="grid grid-2">
        <div class="col-span-full text-center py-12"><div class="spinner"></div> Loading applications...</div>
      </div>
    </div>
  `);
  
  try {
    const apps = await API.getMyApplications();
    const listEl = document.getElementById('my-apps-list');
    if (!apps || apps.length === 0) {
      listEl.innerHTML = `
        <div class="col-span-full card text-center py-12">
          <i data-lucide="layers" style="font-size: 48px; color: var(--text-muted); margin-bottom: 16px;"></i>
          <h3>No active applications</h3>
          <p style="margin-bottom: 16px;">Browse the Job Board to get started.</p>
          <button class="btn btn-cyan btn-sm" onclick="App.navigate('job-board')">Browse Jobs</button>
        </div>
      `;
      return;
    }
    
    listEl.innerHTML = apps.map(app => {
      const statusSteps = ['Applied', 'Shortlisted', 'Invited', 'Confirmed', 'Completed', 'Hired'];
      const currentIdx = statusSteps.indexOf(app.status);
      
      const timelineHtml = statusSteps.map((step, i) => {
        let stateClass = 'pending';
        if (i < currentIdx) stateClass = 'completed';
        else if (i === currentIdx) stateClass = 'active';
        else if (app.status === 'Rejected' && i > 1) stateClass = 'cancelled';
        
        const label = step === 'Invited' ? 'Interview Scheduled' : step;
        return `
          <div class="timeline-step ${stateClass}">
            <div class="step-dot"></div>
            <div class="step-label">${label}</div>
          </div>
        `;
      }).join('');
      
      let actionPanelHtml = '';
      if (app.status === 'Invited' && app.slot) {
        const slotDate = new Date(app.slot.scheduled_at).toLocaleString();
        actionPanelHtml = `
          <div class="card alert alert-warning" style="margin-top: 16px; background: rgba(245,158,11,0.05); border: 1px solid rgba(245,158,11,0.2);">
            <h4 style="display: flex; align-items: center; gap: 6px;"><i data-lucide="calendar"></i> Action Required: Confirm Interview</h4>
            <p style="font-size: 0.9rem; margin-bottom: 12px;">
              An interview is scheduled for <strong>${slotDate}</strong> (Duration: ${app.slot.duration_mins} mins).
              <br><small style="color: var(--text-muted);">Recruiter note: "${app.slot.recruiter_notes || 'None'}"</small>
            </p>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-cyan btn-sm" onclick="respondToSlot(${app.id}, true)">Confirm Attendance</button>
              <button class="btn btn-ghost btn-sm" style="color: var(--red); border-color: rgba(239,68,68,0.2);" onclick="openDeclineModal(${app.id})">Decline</button>
            </div>
          </div>
        `;
      } else if (app.status === 'Confirmed' && app.slot) {
        const slotDate = new Date(app.slot.scheduled_at).toLocaleString();
        actionPanelHtml = `
          <div class="card alert alert-success" style="margin-top: 16px; background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.2);">
            <h4 style="display: flex; align-items: center; gap: 6px; color: var(--green);"><i data-lucide="video"></i> Interview Room Confirmed!</h4>
            <p style="font-size: 0.9rem; margin-bottom: 12px;">
              Your interview room is active. Time: <strong>${slotDate}</strong>.
            </p>
            <button class="btn btn-cyan btn-sm" style="display: flex; align-items: center; gap: 6px;" onclick="App.navigate('video-interview', '${app.slot.room_id}')">
              <i data-lucide="video"></i> Join Live Interview Room
            </button>
          </div>
        `;
      } else if (app.status === 'Hired') {
        actionPanelHtml = `
          <div class="card alert alert-success" style="margin-top: 16px; background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.2);">
            <h4 style="display: flex; align-items: center; gap: 6px; color: var(--green);"><i data-lucide="party-popper"></i> Welcome Aboard!</h4>
            <p style="font-size: 0.9rem; margin-bottom: 8px;">
              Congratulations! You have been selected. Feedback: "${app.recruiter_feedback || 'Excellent profile & outstanding performance.'}"
            </p>
            <button class="btn btn-cyan btn-sm" onclick="App.navigate('onboarding')">Go to Onboarding</button>
          </div>
        `;
      } else if (app.status === 'Rejected') {
        actionPanelHtml = `
          <div class="card alert alert-danger" style="margin-top: 16px; background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.2);">
            <h4 style="display: flex; align-items: center; gap: 6px; color: var(--red);"><i data-lucide="alert-octagon"></i> Application Update</h4>
            <p style="font-size: 0.9rem;">
              Feedback: "${app.recruiter_feedback || 'Thank you for your time. We encourage you to apply for other open roles matching your profile.'}"
            </p>
          </div>
        `;
      }
      
      return `
        <div class="card animate-scale-up" style="display: flex; flex-direction: column;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <div>
              <h3 class="card-title" style="margin-bottom: 4px;">${app.job.title}</h3>
              <p style="font-size: 0.85rem; color: var(--text-muted);">${app.job.department}</p>
            </div>
            <span class="tag tag-purple">AI Match Score ${app.ai_score}%</span>
          </div>
          
          <div class="timeline" style="margin: 20px 0; display: flex; justify-content: space-between; position: relative;">
            <div class="timeline-bar" style="position: absolute; top: 12px; left: 10px; right: 10px; height: 2px; background: var(--border-cyan); z-index: 1;"></div>
            ${timelineHtml}
          </div>
          
          ${actionPanelHtml}
        </div>
      `;
    }).join('');
    lucide.createIcons();
  } catch(e) {
    toast(e.message, 'error');
  }
}

async function respondToSlot(appId, confirm, declineReason = '') {
  try {
    await API.confirmSlot(appId, confirm, declineReason);
    toast(confirm ? 'Interview attendance confirmed!' : 'Slot declined successfully.', 'success');
    renderMyApplicationsPage();
  } catch(e) {
    toast(e.message, 'error');
  }
}

function openDeclineModal(appId) {
  const content = `
    <div style="padding: 10px;">
      <h3 style="margin-bottom: 8px;">Decline Interview Slot</h3>
      <div class="form-group" style="margin-bottom: 20px;">
        <label>Reason for declining (Optional)</label>
        <textarea id="decline-reason" class="form-control" rows="3" placeholder="Conflict with scheduled hours..."></textarea>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 10px;">
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-danger btn-sm" onclick="submitDecline(${appId})">Decline Slot</button>
      </div>
    </div>
  `;
  App.showModal(content);
}

function submitDecline(appId) {
  const reason = document.getElementById('decline-reason').value;
  App.closeModal();
  respondToSlot(appId, false, reason);
}

async function renderJobPostingsPage() {
  setView(`
    <div class="container animate-fade-in">
      <div class="section-header" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2 class="section-title"><i data-lucide="briefcase"></i> Job Descriptions (JDs)</h2>
          <p class="section-subtitle">Manage posted opportunities, review candidates, and screen new hires</p>
        </div>
        <button class="btn btn-cyan btn-sm" onclick="openCreateJobModal()"><i data-lucide="plus"></i> Post New Job</button>
      </div>
      <div class="card">
        <table class="table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th>Job Title</th>
              <th>Department</th>
              <th>Salary Range</th>
              <th>Locations</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="job-postings-list">
            <tr><td colspan="6" class="text-center"><div class="spinner"></div> Loading jobs...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `);
  
  try {
    const jobs = await API.getJobs();
    const listEl = document.getElementById('job-postings-list');
    if (!jobs || jobs.length === 0) {
      listEl.innerHTML = `<tr><td colspan="6" class="text-center">No jobs created yet. Click 'Post New Job' to start.</td></tr>`;
      return;
    }
    
    listEl.innerHTML = jobs.map(job => {
      const activeTag = job.is_active ? `<span class="tag tag-cyan">Active</span>` : `<span class="tag tag-ghost">Inactive</span>`;
      const actionText = job.is_active ? 'Deactivate' : 'Activate';
      const locationsHtml = (job.locations || []).join(', ');
      
      return `
        <tr>
          <td><strong>${job.title}</strong></td>
          <td>${job.department}</td>
          <td>${job.salary_range || 'Competitive'}</td>
          <td>${locationsHtml || 'Remote'}</td>
          <td>${activeTag}</td>
          <td style="display: flex; gap: 8px;">
            <button class="btn btn-sm btn-ghost" onclick="toggleJobStatus(${job.id})">${actionText}</button>
          </td>
        </tr>
      `;
    }).join('');
    lucide.createIcons();
  } catch(e) {
    toast(e.message, 'error');
  }
}

function openCreateJobModal() {
  const content = `
    <div style="padding: 10px; max-height: 80vh; overflow-y: auto;">
      <h3 style="margin-bottom: 12px;">Create Job Posting</h3>
      <div class="form-group" style="margin-bottom: 12px;">
        <label>Job Title</label>
        <input type="text" id="new-job-title" class="form-control" placeholder="e.g. Senior Machine Learning Engineer">
      </div>
      <div class="form-group" style="margin-bottom: 12px;">
        <label>Department</label>
        <input type="text" id="new-job-dept" class="form-control" placeholder="e.g. Engineering">
      </div>
      <div class="form-group" style="margin-bottom: 12px;">
        <label>Description</label>
        <textarea id="new-job-desc" class="form-control" rows="4" placeholder="Detailed job description..."></textarea>
      </div>
      <div class="form-group" style="margin-bottom: 12px;">
        <label>Requirements</label>
        <textarea id="new-job-reqs" class="form-control" rows="3" placeholder="Key responsibilities & experience bullet points..."></textarea>
      </div>
      <div class="form-group" style="margin-bottom: 12px;">
        <label>Skills (comma separated)</label>
        <input type="text" id="new-job-skills" class="form-control" placeholder="Python, TensorFlow, FastAPI, AWS">
      </div>
      <div class="form-group" style="margin-bottom: 12px;">
        <label>Salary Range</label>
        <input type="text" id="new-job-salary" class="form-control" placeholder="Competitive or $100k - $120k">
      </div>
      <div class="form-group" style="margin-bottom: 12px;">
        <label>Locations (comma separated)</label>
        <input type="text" id="new-job-locations" class="form-control" placeholder="Singapore, Dubai, India">
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-cyan btn-sm" onclick="submitCreateJob()">Post Job</button>
      </div>
    </div>
  `;
  App.showModal(content);
}

async function submitCreateJob() {
  const title = document.getElementById('new-job-title').value.trim();
  const dept = document.getElementById('new-job-dept').value.trim() || 'Engineering';
  const desc = document.getElementById('new-job-desc').value.trim();
  const reqs = document.getElementById('new-job-reqs').value.trim();
  const skillsStr = document.getElementById('new-job-skills').value.trim();
  const salary = document.getElementById('new-job-salary').value.trim() || 'Competitive';
  const locStr = document.getElementById('new-job-locations').value.trim();
  
  if (!title || !desc) {
    toast('Job Title and Description are required.', 'warning');
    return;
  }
  
  const skills = skillsStr ? skillsStr.split(',').map(s => s.trim()) : [];
  const locations = locStr ? locStr.split(',').map(l => l.trim()) : [];
  
  try {
    await API.createJob({
      title,
      department: dept,
      description: desc,
      requirements: reqs,
      skills,
      salary_range: salary,
      locations
    });
    toast('Job posting created successfully!', 'success');
    App.closeModal();
    renderJobPostingsPage();
  } catch(e) {
    toast(e.message, 'error');
  }
}

async function toggleJobStatus(id) {
  try {
    const res = await API.toggleJobActive(id);
    toast(res.message, 'success');
    renderJobPostingsPage();
  } catch(e) {
    toast(e.message, 'error');
  }
}

async function renderApplicationsPage() {
  setView(`
    <div class="container animate-fade-in">
      <div class="section-header">
        <h2 class="section-title"><i data-lucide="users"></i> Talent Pipeline & Applications</h2>
        <p class="section-subtitle">Review active applications, screen candidate match scores, and schedule slot invites</p>
      </div>
      
      <div id="applications-board" class="grid grid-1 gap-12">
        <div class="text-center py-12"><div class="spinner"></div> Loading applications...</div>
      </div>
    </div>
  `);
  
  try {
    const apps = await API.getAllApplications();
    const board = document.getElementById('applications-board');
    if (!apps || apps.length === 0) {
      board.innerHTML = `
        <div class="card text-center py-12">
          <i data-lucide="users" style="font-size: 48px; color: var(--text-muted); margin-bottom: 16px;"></i>
          <h3>No applications received yet</h3>
          <p>Once candidates apply to jobs from the job board, they will show up here.</p>
        </div>
      `;
      return;
    }
    
    board.innerHTML = apps.map(app => {
      let actionButtons = '';
      if (app.status === 'Applied') {
        actionButtons = `
          <button class="btn btn-cyan btn-sm" onclick="shortlistApp(${app.id})"><i data-lucide="check"></i> Shortlist</button>
          <button class="btn btn-ghost btn-sm" style="color: var(--red); border-color: rgba(239,68,68,0.2);" onclick="rejectApp(${app.id})"><i data-lucide="x"></i> Reject</button>
        `;
      } else if (app.status === 'Shortlisted') {
        actionButtons = `
          <button class="btn btn-cyan btn-sm" onclick="openScheduleModal(${app.id})"><i data-lucide="calendar"></i> Schedule Interview</button>
          <button class="btn btn-ghost btn-sm" style="color: var(--red); border-color: rgba(239,68,68,0.2);" onclick="rejectApp(${app.id})"><i data-lucide="x"></i> Reject</button>
        `;
      } else if (app.status === 'Confirmed' && app.slot) {
        actionButtons = `
          <button class="btn btn-cyan btn-sm" onclick="App.navigate('video-interview', '${app.slot.room_id}')"><i data-lucide="video"></i> Join Interview Room</button>
        `;
      } else if (app.status === 'Invited') {
        actionButtons = `<span class="tag tag-ghost">Waiting for Candidate Slot Confirmation</span>`;
      } else if (app.status === 'Hired') {
        const onboardingProgress = app.candidate?.onboarding_progress || 0;
        actionButtons = onboardingProgress === 100 
          ? `<span class="tag tag-green">Onboarded ✓</span>` 
          : `<span class="tag tag-cyan">Onboarding: ${onboardingProgress}%</span>`;
      } else if (app.status === 'Rejected') {
        actionButtons = `<span class="tag tag-danger">Rejected</span>`;
      }
      
      const appliedDate = new Date(app.applied_at).toLocaleDateString();
      const statusBadge = `
        <span class="tag tag-${
          app.status === 'Hired' ? 'cyan' :
          app.status === 'Shortlisted' ? 'purple' :
          app.status === 'Confirmed' ? 'purple' :
          app.status === 'Rejected' ? 'danger' : 'ghost'
        }">${app.status}</span>
      `;
      
      return `
        <div class="card animate-scale-up" style="display: flex; justify-content: space-between; align-items: center; gap: 20px;">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
              <h3 class="card-title" style="margin-bottom: 0;">${app.candidate.name}</h3>
              ${statusBadge}
              <span class="tag tag-cyan" style="font-size: 0.75rem;">AI Match ${app.ai_score}%</span>
            </div>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">
              Applied for <strong>${app.job.title}</strong> (${app.job.department}) · Date: ${appliedDate}
            </p>
            <p style="font-size: 0.9rem; font-style: italic; color: var(--text-muted); padding-left: 10px; border-left: 2px solid var(--border-cyan);">
              Cover note: "${app.cover_note || 'None'}"
            </p>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            ${actionButtons}
          </div>
        </div>
      `;
    }).join('');
    lucide.createIcons();
  } catch(e) {
    toast(e.message, 'error');
  }
}

async function shortlistApp(id) {
  try {
    await API.shortlistApp(id);
    toast('Candidate shortlisted successfully!', 'success');
    renderApplicationsPage();
  } catch(e) {
    toast(e.message, 'error');
  }
}

async function rejectApp(id) {
  try {
    await API.rejectApp(id);
    toast('Candidate application rejected.', 'warning');
    renderApplicationsPage();
  } catch(e) {
    toast(e.message, 'error');
  }
}

function openScheduleModal(appId) {
  const content = `
    <div style="padding: 10px;">
      <h3 style="margin-bottom: 12px;">Schedule Interview Slot</h3>
      <div class="form-group" style="margin-bottom: 12px;">
        <label>Date & Time</label>
        <input type="datetime-local" id="schedule-time" class="form-control">
      </div>
      <div class="form-group" style="margin-bottom: 12px;">
        <label>Duration (Minutes)</label>
        <input type="number" id="schedule-duration" class="form-control" value="45">
      </div>
      <div class="form-group" style="margin-bottom: 12px;">
        <label>Recruiter Notes (shown to candidate)</label>
        <textarea id="schedule-notes" class="form-control" rows="3" placeholder="Please prepare a quick demo of a React state module..."></textarea>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-cyan btn-sm" onclick="submitSchedule(${appId})">Schedule Slot</button>
      </div>
    </div>
  `;
  App.showModal(content);
}

async function submitSchedule(appId) {
  const timeVal = document.getElementById('schedule-time').value;
  const duration = parseInt(document.getElementById('schedule-duration').value) || 45;
  const notes = document.getElementById('schedule-notes').value;
  
  if (!timeVal) {
    toast('Please select a date and time.', 'warning');
    return;
  }
  
  const isoTime = new Date(timeVal).toISOString();
  try {
    await API.scheduleSlot(appId, {
      scheduled_at: isoTime,
      duration_mins: duration,
      recruiter_notes: notes
    });
    toast('Interview scheduled. Notification sent to candidate!', 'success');
    App.closeModal();
    renderApplicationsPage();
  } catch(e) {
    toast(e.message, 'error');
  }
}

async function renderVideoInterview(roomId) {
  const isCandidate = STATE.user.role === 'candidate';
  const mainColClass = isCandidate ? 'col-span-3' : 'col-span-2';
  
  if (isCandidate) {
    const nb = document.getElementById('app-navbar');
    if (nb) nb.style.display = 'none';
    const fab = document.getElementById('copilot-fab');
    if (fab) fab.style.display = 'none';
  }
  
  const sidebarHtml = isCandidate ? '' : `
        <!-- Live AI Copilot & Assessment Sidebar -->
        <div class="col-span-1" style="display: flex; flex-direction: column; gap: 16px;">
          <div class="card" style="height: 230px; display: flex; flex-direction: column;">
            <h3 style="display: flex; align-items: center; gap: 6px; margin-bottom: 12px;"><i data-lucide="bot" style="color: var(--cyan);"></i> Real-Time AI Prompt</h3>
            <div id="ai-question-box" style="flex: 1; font-size: 0.95rem; overflow-y: auto; color: var(--text-muted); line-height: 1.5;">
              Select a question to evaluate candidate responses in real-time.
            </div>
            <button class="btn btn-cyan btn-sm" style="margin-top: 8px; width: 100%;" onclick="nextAIQuestion()">Generate Next Question</button>
          </div>
          
          <div id="evaluation-card" class="card" style="display: none; flex-direction: column; gap: 12px;">
            <h3>Interview Evaluator (Recruiter)</h3>
            <div class="form-group">
              <label>Final Decision</label>
              <select id="eval-status" class="form-control">
                <option value="Hired">Hire Candidate</option>
                <option value="Rejected">Reject Application</option>
              </select>
            </div>
            <div class="form-group">
              <label>Feedback for Candidate</label>
              <textarea id="eval-feedback" class="form-control" rows="4" placeholder="Outstanding performance, strong coding skill..."></textarea>
            </div>
            <button class="btn btn-cyan btn-sm" style="width: 100%;" onclick="submitFinalEvaluation()">Complete & Save Decision</button>
          </div>
        </div>`;

  setView(`
    <div class="container animate-fade-in" style="max-width: 1200px;">
      <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div>
          <h2 class="section-title"><i data-lucide="video"></i> FWC Live AI Video Assessment Room</h2>
          <p class="section-subtitle">${isCandidate ? 'Video Assessment Live Call' : 'WebRTC simulated video stream and real-time AI assistant'}</p>
        </div>
        <div id="video-timer" class="tag tag-purple" style="font-size: 1rem; padding: 6px 12px;">00:00</div>
      </div>
      
      <div class="grid grid-3 gap-20">
        <!-- Local & Remote Video Streams -->
        <div class="${mainColClass} card" style="display: flex; flex-direction: column; gap: 16px; background: rgba(13,27,42,0.9);">
          <div class="video-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; min-height: 380px;">
            <div class="video-container relative" style="border-radius: var(--r-md); overflow: hidden; background: #000; border: 1px solid var(--border-cyan); height: 340px;">
              <video id="local-video" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1);"></video>
              <div style="position: absolute; bottom: 12px; left: 12px;" class="tag tag-ghost">You (Local)</div>
            </div>
            <div class="video-container relative" style="border-radius: var(--r-md); overflow: hidden; background: #000; border: 1px solid var(--border-cyan); display: flex; align-items: center; justify-content: center; height: 340px;">
              <video id="remote-video" autoplay playsinline style="width: 100%; height: 100%; object-fit: cover; display: none;"></video>
              <div id="remote-placeholder" style="text-align: center; color: var(--text-muted);">
                <i data-lucide="user" style="font-size: 48px; margin-bottom: 8px;"></i>
                <p>Waiting for other participant...</p>
              </div>
              <div style="position: absolute; bottom: 12px; left: 12px;" class="tag tag-ghost">Remote Peer</div>
            </div>
          </div>
          
          <!-- Control bar -->
          <div style="display: flex; justify-content: center; gap: 16px; padding: 12px; border-top: 1px solid rgba(255,255,255,0.05);">
            <button class="btn btn-ghost btn-sm" id="btn-toggle-cam" style="border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;" onclick="toggleCamera()"><i data-lucide="video"></i></button>
            <button class="btn btn-ghost btn-sm" id="btn-toggle-mic" style="border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;" onclick="toggleMic()"><i data-lucide="mic"></i></button>
            <button class="btn btn-danger btn-sm" style="border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;" onclick="leaveInterview()"><i data-lucide="phone-off"></i></button>
          </div>
        </div>
        ${sidebarHtml}
      </div>
    </div>
  `);
  
  // Set up camera
  initCamera();
  startTimer();
  
  // Find linked application
  try {
    const apps = STATE.user.role === 'candidate' ? await API.getMyApplications() : await API.getAllApplications();
    const app = apps.find(a => a.slot && a.slot.room_id === roomId);
    if (app) {
      STATE.currentActiveApp = app;
      if (STATE.user.role !== 'candidate') {
        document.getElementById('evaluation-card').style.display = 'flex';
      }
      
      // Simulate remote connection in 3 seconds
      setTimeout(() => {
        const remoteVideo = document.getElementById('remote-video');
        const placeholder = document.getElementById('remote-placeholder');
        if (remoteVideo && placeholder) {
          remoteVideo.style.display = 'block';
          placeholder.style.display = 'none';
          toast('Other participant joined the meeting room.', 'success');
        }
      }, 3000);
      
      // Initialize AI questions box
      nextAIQuestion();
    }
  } catch(e) {
    toast('Error checking session: ' + e.message, 'error');
  }
}

let timerInterval;
function startTimer() {
  let seconds = 0;
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    seconds++;
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    const el = document.getElementById('video-timer');
    if (el) el.textContent = `${mins}:${secs}`;
  }, 1000);
}

async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    const localVideo = document.getElementById('local-video');
    if (localVideo) {
      localVideo.srcObject = stream;
      STATE.localStream = stream;
    }
  } catch(e) {
    toast('Could not access camera/microphone. Simulating feed.', 'warning');
  }
}

let camEnabled = true;
function toggleCamera() {
  camEnabled = !camEnabled;
  if (STATE.localStream) {
    STATE.localStream.getVideoTracks().forEach(track => track.enabled = camEnabled);
  }
  const btn = document.getElementById('btn-toggle-cam');
  if (btn) btn.style.background = camEnabled ? 'transparent' : 'var(--red)';
  toast(camEnabled ? 'Camera on' : 'Camera off');
}

let micEnabled = true;
function toggleMic() {
  micEnabled = !micEnabled;
  if (STATE.localStream) {
    STATE.localStream.getAudioTracks().forEach(track => track.enabled = micEnabled);
  }
  const btn = document.getElementById('btn-toggle-mic');
  if (btn) btn.style.background = micEnabled ? 'transparent' : 'var(--red)';
  toast(micEnabled ? 'Microphone unmuted' : 'Microphone muted');
}

function leaveInterview() {
  clearInterval(timerInterval);
  if (STATE.localStream) {
    STATE.localStream.getTracks().forEach(track => track.stop());
  }
  toast('Left the interview room.');
  
  // Restore navbar visibility
  const nb = document.getElementById('app-navbar');
  if (nb && STATE.user) nb.style.display = 'block';
  
  App.navigate('dashboard');
}

const AI_QUESTIONS = [
  "Describe your experience with Python, JavaScript, and building full-stack reactive components.",
  "What is your approach to handling production microservices failure or database locking in high concurrent situations?",
  "How would you integrate a real-time machine learning prediction pipeline inside a RESTful API framework?",
  "Can you write a fast caching strategy for search indices in a distributed setting?"
];
let currentQIdx = 0;
function nextAIQuestion() {
  const box = document.getElementById('ai-question-box');
  if (box) {
    box.innerHTML = `<strong>AI assessment question:</strong><br><p>${AI_QUESTIONS[currentQIdx]}</p>`;
    currentQIdx = (currentQIdx + 1) % AI_QUESTIONS.length;
  }
}

async function submitFinalEvaluation() {
  const app = STATE.currentActiveApp;
  if (!app) return;
  
  const status = document.getElementById('eval-status').value;
  const feedback = document.getElementById('eval-feedback').value;
  
  try {
    await API.completeInterview(app.id, status, feedback);
    toast('Interview assessment saved successfully!', 'success');
    leaveInterview();
  } catch(e) {
    toast(e.message, 'error');
  }
}

async function renderNotificationPanel() {
  const dropdown = document.getElementById('notification-dropdown');
  if (!dropdown) return;
  
  try {
    const notifs = await API.getNotifications();
    const unreadCount = notifs.filter(n => !n.is_read).length;
    
    // Update badge count
    const badge = document.getElementById('notif-badge');
    if (badge) {
      badge.textContent = unreadCount;
      badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }
    
    if (!notifs || notifs.length === 0) {
      dropdown.innerHTML = `<div class="notif-empty" style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">No new notifications</div>`;
      return;
    }
    
    dropdown.innerHTML = notifs.map(n => {
      const activeClass = n.is_read ? 'read' : 'unread';
      const indicator = n.is_read ? '' : '<span class="unread-dot" style="width: 8px; height: 8px; border-radius: 50%; background: var(--cyan); display: inline-block;"></span>';
      
      return `
        <div class="notif-item ${activeClass}" style="padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; display: flex; justify-content: space-between; align-items: center;" onclick="handleNotifClick(${n.id}, '${n.link_page || ''}', '${n.link_id || ''}')">
          <div style="flex: 1; padding-right: 8px;">
            <div style="font-weight: 600; font-size: 0.85rem; margin-bottom: 2px;">${n.title}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.3;">${n.message}</div>
          </div>
          ${indicator}
        </div>
      `;
    }).join('');
  } catch(e) {
    console.error(e);
  }
}

async function handleNotifClick(notifId, page, entityId) {
  try {
    await API.markNotifRead(notifId);
    renderNotificationPanel();
    
    const panel = document.getElementById('notification-panel-container');
    if (panel) panel.classList.remove('open');
    
    if (page) {
      App.navigate(page, entityId);
    }
  } catch(e) {
    console.error(e);
  }
}


/* ══════════════════════════════════════════════════════════════
   NEW HIGH-IMPACT RECRUITMENT SUITE (v4.0)
   ══════════════════════════════════════════════════════════════ */

function renderCandidateProfileBuilder(c) {
  return `
  <div class="page-wrapper" style="max-width: 860px; margin: 0 auto;">
    <div class="page-header">
      <div>
        <h1 class="page-title">Candidate <span class="gradient-text">Profile Builder</span></h1>
        <p class="page-subtitle">Complete your personal, academic, and professional details to unlock FWC jobs</p>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="App.navigate('dashboard')">
        <i data-lucide="layout-dashboard"></i> Back to Dashboard
      </button>
    </div>

    <!-- Stepper Indicator -->
    <div class="form-step-indicator">
      <div class="form-step-dot active" id="indicator-step-1">
        <div class="form-step-number">1</div>
        <span>Personal Details</span>
      </div>
      <div class="form-step-dot" id="indicator-step-2">
        <div class="form-step-number">2</div>
        <span>Academic Details</span>
      </div>
      <div class="form-step-dot" id="indicator-step-3">
        <div class="form-step-number">3</div>
        <span>Professional &amp; Skills</span>
      </div>
      <div class="form-step-dot" id="indicator-step-4">
        <div class="form-step-number">4</div>
        <span>Review &amp; Submit</span>
      </div>
    </div>

    <!-- Multi-step Form Box -->
    <div class="card" style="padding: 30px;">
      <form id="profile-builder-form" onsubmit="event.preventDefault();">
        
        <!-- STEP 1: PERSONAL INFORMATION -->
        <div class="step-container active" id="form-step-1">
          <h3 class="mb-20" style="display:flex; align-items:center; gap:8px;"><i data-lucide="user" style="color:var(--primary)"></i> Step 1: Personal Information</h3>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input type="text" id="prof-name" class="form-input" value="${c.name || ''}" placeholder="John Doe" required>
            </div>
            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="email" id="prof-email" class="form-input" value="${c.email || ''}" disabled>
            </div>
            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input type="text" id="prof-phone" class="form-input" value="${c.phone || ''}" placeholder="+91 98765 43210">
            </div>
            <div class="form-group">
              <label class="form-label">Date of Birth</label>
              <input type="date" id="prof-dob" class="form-input" value="${c.dob || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Gender</label>
              <select id="prof-gender" class="form-select">
                <option value="">Select Gender</option>
                <option value="Male" ${c.gender === 'Male' ? 'selected' : ''}>Male</option>
                <option value="Female" ${c.gender === 'Female' ? 'selected' : ''}>Female</option>
                <option value="Other" ${c.gender === 'Other' ? 'selected' : ''}>Other</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Profile Photo</label>
              <div style="display:flex; gap:12px; align-items:center;">
                <div class="profile-avatar" style="width: 50px; height: 50px; border-radius: 50%; font-size: 1.2rem;" id="photo-preview-box">
                  ${c.profile_photo ? `<img src="${c.profile_photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : c.name.charAt(0)}
                </div>
                <input type="file" id="prof-photo-file" accept="image/*" style="display:none" onchange="uploadDocHelper('profile_photo', this)">
                <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('prof-photo-file').click()"><i data-lucide="upload"></i> Upload Photo</button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">LinkedIn Profile URL</label>
              <input type="url" id="prof-linkedin" class="form-input" value="${c.linkedin_profile || ''}" placeholder="https://linkedin.com/in/username">
            </div>
            <div class="form-group">
              <label class="form-label">GitHub Profile URL</label>
              <input type="url" id="prof-github" class="form-input" value="${c.github_profile || ''}" placeholder="https://github.com/username">
            </div>
            <div class="form-group" style="grid-column: 1/-1;">
              <label class="form-label">Address</label>
              <textarea id="prof-address" class="form-input" rows="3" placeholder="Enter your full residential address">${c.address || ''}</textarea>
            </div>
          </div>
          <div class="flex justify-between mt-28">
            <div></div>
            <button type="button" class="btn btn-primary" onclick="nextStep(2)">Next: Academic Details <i data-lucide="arrow-right"></i></button>
          </div>
        </div>

        <!-- STEP 2: ACADEMIC DETAILS -->
        <div class="step-container" id="form-step-2">
          <h3 class="mb-20" style="display:flex; align-items:center; gap:8px;"><i data-lucide="graduation-cap" style="color:var(--purple)"></i> Step 2: Academic Details</h3>
          
          <!-- 10th Standard -->
          <div style="border-bottom: 1px solid var(--border); padding-bottom:16px; margin-bottom:16px;">
            <h4 style="margin-bottom:12px;">10th Standard Details</h4>
            <div class="grid-3">
              <div class="form-group">
                <label class="form-label">School Name</label>
                <input type="text" id="prof-10-school" class="form-input" value="${c.tenth_school || ''}" placeholder="e.g. KV School">
              </div>
              <div class="form-group">
                <label class="form-label">Board</label>
                <input type="text" id="prof-10-board" class="form-input" value="${c.tenth_board || ''}" placeholder="e.g. CBSE">
              </div>
              <div class="form-group">
                <label class="form-label">Year of Passing</label>
                <input type="number" id="prof-10-year" class="form-input" value="${c.tenth_passing_year || ''}" placeholder="2018">
              </div>
              <div class="form-group">
                <label class="form-label">Percentage/CGPA</label>
                <input type="number" step="0.01" id="prof-10-pct" class="form-input" value="${c.tenth_percentage || ''}" placeholder="88.5 or 9.5">
              </div>
              <div class="form-group" style="grid-column: span 2;">
                <label class="form-label">Marks Card Upload</label>
                <div style="display:flex; gap:10px; align-items:center;">
                  <input type="file" id="10th-file-input" accept=".pdf,image/*" style="display:none" onchange="uploadDocHelper('tenth_marks', this)">
                  <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('10th-file-input').click()"><i data-lucide="file-text"></i> Choose File</button>
                  <span style="font-size:0.75rem; color:var(--text-muted);" id="10th-file-name">${c.tenth_marks_card ? '✓ Uploaded' : 'No file chosen'}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 12th / PUC Details -->
          <div style="border-bottom: 1px solid var(--border); padding-bottom:16px; margin-bottom:16px;">
            <h4 style="margin-bottom:12px;">12th / PUC Details</h4>
            <div class="grid-3">
              <div class="form-group">
                <label class="form-label">College Name</label>
                <input type="text" id="prof-12-college" class="form-input" value="${c.twelfth_college || ''}" placeholder="e.g. St. Josephs">
              </div>
              <div class="form-group">
                <label class="form-label">Stream</label>
                <select id="prof-12-stream" class="form-select">
                  <option value="">Select Stream</option>
                  <option value="Science" ${c.twelfth_stream === 'Science' ? 'selected' : ''}>Science</option>
                  <option value="Commerce" ${c.twelfth_stream === 'Commerce' ? 'selected' : ''}>Commerce</option>
                  <option value="Arts" ${c.twelfth_stream === 'Arts' ? 'selected' : ''}>Arts</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Board</label>
                <input type="text" id="prof-12-board" class="form-input" value="${c.twelfth_board || ''}" placeholder="e.g. State Board">
              </div>
              <div class="form-group">
                <label class="form-label">Year of Passing</label>
                <input type="number" id="prof-12-year" class="form-input" value="${c.twelfth_passing_year || ''}" placeholder="2020">
              </div>
              <div class="form-group">
                <label class="form-label">Percentage/CGPA</label>
                <input type="number" step="0.01" id="prof-12-pct" class="form-input" value="${c.twelfth_percentage || ''}" placeholder="91.2">
              </div>
              <div class="form-group">
                <label class="form-label">Marks Card Upload</label>
                <div style="display:flex; gap:10px; align-items:center;">
                  <input type="file" id="12th-file-input" accept=".pdf,image/*" style="display:none" onchange="uploadDocHelper('twelfth_marks', this)">
                  <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('12th-file-input').click()"><i data-lucide="file-text"></i> Choose File</button>
                  <span style="font-size:0.75rem; color:var(--text-muted);" id="12th-file-name">${c.twelfth_marks_card ? '✓ Uploaded' : 'No file chosen'}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Diploma Details (Optional) -->
          <div style="border-bottom: 1px solid var(--border); padding-bottom:16px; margin-bottom:16px;">
            <h4 style="margin-bottom:12px;">Diploma Details (Optional)</h4>
            <div class="grid-3">
              <div class="form-group">
                <label class="form-label">College Name</label>
                <input type="text" id="prof-dip-college" class="form-input" value="${c.diploma_college || ''}" placeholder="Polytechnic College">
              </div>
              <div class="form-group">
                <label class="form-label">Branch</label>
                <input type="text" id="prof-dip-branch" class="form-input" value="${c.diploma_branch || ''}" placeholder="Computer Science">
              </div>
              <div class="form-group">
                <label class="form-label">Percentage</label>
                <input type="number" step="0.01" id="prof-dip-pct" class="form-input" value="${c.diploma_percentage || ''}" placeholder="82.4">
              </div>
              <div class="form-group">
                <label class="form-label">Year of Passing</label>
                <input type="number" id="prof-dip-year" class="form-input" value="${c.diploma_passing_year || ''}" placeholder="2020">
              </div>
            </div>
          </div>

          <!-- Graduation Details -->
          <div>
            <h4 style="margin-bottom:12px;">Graduation Details</h4>
            <div class="grid-3">
              <div class="form-group">
                <label class="form-label">College Name</label>
                <input type="text" id="prof-grad-college" class="form-input" value="${c.grad_college || ''}" placeholder="PES University" required>
              </div>
              <div class="form-group">
                <label class="form-label">Degree</label>
                <input type="text" id="prof-grad-degree" class="form-input" value="${c.grad_degree || ''}" placeholder="B.E / B.Tech / BCA" required>
              </div>
              <div class="form-group">
                <label class="form-label">Branch/Specialization</label>
                <input type="text" id="prof-grad-branch" class="form-input" value="${c.grad_branch || ''}" placeholder="Computer Science &amp; Eng" required>
              </div>
              <div class="form-group">
                <label class="form-label">Current CGPA</label>
                <input type="number" step="0.01" id="prof-grad-cgpa" class="form-input" value="${c.grad_cgpa || ''}" placeholder="8.6">
              </div>
              <div class="form-group">
                <label class="form-label">Active Backlogs</label>
                <input type="number" id="prof-grad-backlogs" class="form-input" value="${c.grad_backlogs || '0'}">
              </div>
              <div class="form-group">
                <label class="form-label">Year of Passing</label>
                <input type="number" id="prof-grad-year" class="form-input" value="${c.grad_passing_year || ''}" placeholder="2024" required>
              </div>
            </div>
          </div>

          <div class="flex justify-between mt-28">
            <button type="button" class="btn btn-ghost" onclick="nextStep(1)"><i data-lucide="arrow-left"></i> Previous</button>
            <button type="button" class="btn btn-primary" onclick="nextStep(3)">Next: Professional &amp; Skills <i data-lucide="arrow-right"></i></button>
          </div>
        </div>

        <!-- STEP 3: PROFESSIONAL & SKILLS -->
        <div class="step-container" id="form-step-3">
          <h3 class="mb-20" style="display:flex; align-items:center; gap:8px;"><i data-lucide="briefcase" style="color:var(--amber)"></i> Step 3: Skills &amp; Experience</h3>
          
          <div class="form-group">
            <label class="form-label">Technical Skills (comma-separated)</label>
            <input type="text" id="prof-skills-tech" class="form-input" value="${(c.skills_matched || []).join(', ')}" placeholder="Python, Java, Javascript, FastAPI, React">
          </div>

          <div class="form-group">
            <label class="form-label">Soft Skills (comma-separated)</label>
            <input type="text" id="prof-skills-soft" class="form-input" value="${(c.skills_soft || []).join(', ')}" placeholder="Communication, Teamwork, Critical Thinking">
          </div>

          <div class="form-group">
            <label class="form-label">Certifications (comma-separated)</label>
            <input type="text" id="prof-certs" class="form-input" value="${(c.certifications || []).join(', ')}" placeholder="AWS Certified Solutions Architect, Google Analytics">
          </div>

          <div class="form-group">
            <label class="form-label">Internship Experiences (comma-separated)</label>
            <input type="text" id="prof-internships" class="form-input" value="${(c.internships || []).join(', ')}" placeholder="SDE Intern at Oracle (3 months)">
          </div>

          <div class="form-group">
            <label class="form-label">Key Projects (comma-separated)</label>
            <input type="text" id="prof-projects" class="form-input" value="${(c.projects || []).join(', ')}" placeholder="AI Resume Screener in Python, Realtime Chat in Node.js">
          </div>

          <div class="form-group">
            <label class="form-label">Achievements</label>
            <input type="text" id="prof-achievements" class="form-input" value="${(c.achievements || []).join(', ')}" placeholder="Hackathon Winner, Rank 1 in Mathematics Olympiad">
          </div>

          <div class="flex justify-between mt-28">
            <button type="button" class="btn btn-ghost" onclick="nextStep(2)"><i data-lucide="arrow-left"></i> Previous</button>
            <button type="button" class="btn btn-primary" onclick="nextStep(4)">Next: Review &amp; Submit <i data-lucide="arrow-right"></i></button>
          </div>
        </div>

        <!-- STEP 4: REVIEW & SUBMIT -->
        <div class="step-container" id="form-step-4">
          <h3 class="mb-20" style="display:flex; align-items:center; gap:8px;"><i data-lucide="eye" style="color:var(--green)"></i> Step 4: Review &amp; Submit</h3>
          <p class="mb-20">Double-check your credentials below. Click "AI Verify &amp; Screen Profile" to compute your final AI Match ranking.</p>
          
          <div id="builder-review-grid" class="grid-2 gap-16 mb-24" style="background:rgba(255,255,255,0.02); padding:20px; border-radius:var(--r-lg); border:1px solid var(--border)">
            <!-- Populated dynamically via JS step change -->
          </div>

          <div class="flex justify-between mt-28">
            <button type="button" class="btn btn-ghost" onclick="nextStep(3)"><i data-lucide="arrow-left"></i> Previous</button>
            <button type="button" class="btn btn-green btn-lg" onclick="submitProfileBuilder()"><i data-lucide="check-circle"></i> AI Verify &amp; Submit Profile</button>
          </div>
        </div>

      </form>
    </div>
  </div>
  `;
}

// Wizard Step Navigation
window.nextStep = function(stepNum) {
  document.querySelectorAll('.step-container').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.form-step-dot').forEach((d, i) => {
    d.classList.remove('active');
    if (i < stepNum - 1) d.classList.add('completed');
    else d.classList.remove('completed');
  });

  const targetStep = document.getElementById(`form-step-${stepNum}`);
  const targetDot  = document.getElementById(`indicator-step-${stepNum}`);
  if (targetStep) targetStep.classList.add('active');
  if (targetDot) targetDot.classList.add('active');

  // If review step, populate summaries
  if (stepNum === 4) {
    const revGrid = document.getElementById('builder-review-grid');
    if (revGrid) {
      revGrid.innerHTML = `
        <div>
          <strong>Full Name:</strong> ${document.getElementById('prof-name').value}
        </div>
        <div>
          <strong>Phone:</strong> ${document.getElementById('prof-phone').value || '—'}
        </div>
        <div>
          <strong>10th Standard:</strong> ${document.getElementById('prof-10-school').value || '—'} (${document.getElementById('prof-10-pct').value || '—'}%)
        </div>
        <div>
          <strong>12th Standard:</strong> ${document.getElementById('prof-12-college').value || '—'} (${document.getElementById('prof-12-pct').value || '—'}%)
        </div>
        <div>
          <strong>Graduation:</strong> ${document.getElementById('prof-grad-degree').value || '—'} in ${document.getElementById('prof-grad-branch').value || '—'} (${document.getElementById('prof-grad-cgpa').value || '—'} CGPA)
        </div>
        <div>
          <strong>Skills Added:</strong> ${document.getElementById('prof-skills-tech').value || '—'}
        </div>
      `;
    }
  }
  lucide.createIcons();
};

window.uploadDocHelper = async function(docType, inputEl) {
  const file = inputEl.files[0];
  if (!file) return;
  const fileNameEl = document.getElementById(docType === 'tenth_marks' ? '10th-file-name' : docType === 'twelfth_marks' ? '12th-file-name' : 'photo-preview-box');
  if (fileNameEl && docType !== 'profile_photo') {
    fileNameEl.textContent = 'Uploading...';
  }
  try {
    const res = await API.uploadDocument(docType, file);
    STATE.candidate = res.candidate;
    localStorage.setItem('nexus_user', JSON.stringify({ user: STATE.user, candidate: res.candidate }));
    if (fileNameEl) {
      if (docType === 'profile_photo') {
        fileNameEl.innerHTML = `<img src="${res.file_path}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
      } else {
        fileNameEl.textContent = `✓ ${file.name.slice(0, 15)}...`;
      }
    }
    toast('Document uploaded successfully!', 'success');
  } catch(e) {
    toast(e.message, 'error');
    if (fileNameEl && docType !== 'profile_photo') fileNameEl.textContent = 'Upload failed';
  }
};

window.submitProfileBuilder = async function() {
  const data = {
    name: document.getElementById('prof-name').value.trim(),
    phone: document.getElementById('prof-phone').value.trim(),
    dob: document.getElementById('prof-dob').value,
    gender: document.getElementById('prof-gender').value,
    address: document.getElementById('prof-address').value.trim(),
    linkedin_profile: document.getElementById('prof-linkedin').value.trim(),
    github_profile: document.getElementById('prof-github').value.trim(),
    
    tenth_school: document.getElementById('prof-10-school').value.trim(),
    tenth_board: document.getElementById('prof-10-board').value.trim(),
    tenth_passing_year: parseInt(document.getElementById('prof-10-year').value) || null,
    tenth_percentage: parseFloat(document.getElementById('prof-10-pct').value) || null,
    
    twelfth_college: document.getElementById('prof-12-college').value.trim(),
    twelfth_stream: document.getElementById('prof-12-stream').value,
    twelfth_board: document.getElementById('prof-12-board').value.trim(),
    twelfth_passing_year: parseInt(document.getElementById('prof-12-year').value) || null,
    twelfth_percentage: parseFloat(document.getElementById('prof-12-pct').value) || null,
    
    diploma_college: document.getElementById('prof-dip-college').value.trim() || null,
    diploma_branch: document.getElementById('prof-dip-branch').value.trim() || null,
    diploma_percentage: parseFloat(document.getElementById('prof-dip-pct').value) || null,
    diploma_passing_year: parseInt(document.getElementById('prof-dip-year').value) || null,
    
    grad_college: document.getElementById('prof-grad-college').value.trim(),
    grad_degree: document.getElementById('prof-grad-degree').value.trim(),
    grad_branch: document.getElementById('prof-grad-branch').value.trim(),
    grad_passing_year: parseInt(document.getElementById('prof-grad-year').value) || null,
    grad_cgpa: parseFloat(document.getElementById('prof-grad-cgpa').value) || null,
    grad_backlogs: parseInt(document.getElementById('prof-grad-backlogs').value) || 0,
    
    skills_tech: document.getElementById('prof-skills-tech').value.split(',').map(s => s.trim()).filter(Boolean),
    skills_soft: document.getElementById('prof-skills-soft').value.split(',').map(s => s.trim()).filter(Boolean),
    certifications: document.getElementById('prof-certs').value.split(',').map(c => c.trim()).filter(Boolean),
    internships: document.getElementById('prof-internships').value.split(',').map(c => c.trim()).filter(Boolean),
    projects: document.getElementById('prof-projects').value.split(',').map(c => c.trim()).filter(Boolean),
    achievements: document.getElementById('prof-achievements').value.split(',').map(c => c.trim()).filter(Boolean)
  };

  try {
    const res = await API.updateProfile(data);
    STATE.candidate = res.candidate;
    localStorage.setItem('nexus_user', JSON.stringify({ user: STATE.user, candidate: res.candidate }));
    toast('Profile credentials updated & screened by AI successfully!', 'success');
    App.navigate('dashboard');
  } catch(e) {
    toast(e.message, 'error');
  }
};


/* ══════════════════════════════════════════════════════════════
   REDESIGNED CANDIDATE PORTAL DASHBOARD (v4.0)
   ══════════════════════════════════════════════════════════════ */

function renderCandidateDashboard(c) {
  const interviewDone = c.interview_status === 'Completed';
  const sug = c.ai_suggestions || {};
  const completionPct = sug.resume_completion_percentage || 25;
  const matchPct = sug.job_match_percentage || c.score || 50;
  
  // Pipeline tracking
  const steps = [
    { name: 'Applied', done: true, tag: 'Applied' },
    { name: 'Under Review', done: completionPct > 35, tag: 'Under Review' },
    { name: 'AI Shortlisted', done: matchPct >= 70, tag: 'AI Shortlisted' },
    { name: 'Interview Scheduled', done: c.status === 'Confirmed' || c.status === 'Invited' || interviewDone, tag: 'Interview Scheduled' },
    { name: 'HR Round Pending', done: interviewDone && c.status !== 'Hired', tag: 'HR Round Pending' },
    { name: 'Selected/Rejected', done: ['Hired', 'Rejected'].includes(c.status), tag: c.status === 'Rejected' ? 'Rejected' : 'Hired' }
  ];

  return `
  <div class="page-wrapper animate-fade-in">
    <div class="page-header" style="display:flex; justify-content:space-between; align-items:center;">
      <div>
        <h1 class="page-title">Candidate <span class="gradient-text">Productivity Dashboard</span></h1>
        <p class="page-subtitle">FWC Talent Hub — complete profile forms and track AI results</p>
      </div>
      <div style="display:flex; gap:10px;">
        <button class="btn btn-primary btn-sm" onclick="setView(renderCandidateProfileBuilder(STATE.candidate))"><i data-lucide="pencil"></i> Edit Full Credentials</button>
        <button class="btn btn-purple btn-sm" onclick="App.navigate('interview')"><i data-lucide="video"></i> Screen Interview Room</button>
      </div>
    </div>

    <!-- Application Progress Pipeline Tracker -->
    <div class="card mb-24" style="padding:22px;">
      <div class="section-title">
        <i data-lucide="layers" style="color:var(--cyan)"></i> Pipeline Application Tracker
        <div class="section-title-line"></div>
      </div>
      <div class="app-timeline" style="margin-top:20px; display:flex; justify-content:space-between; position:relative;">
        ${steps.map((st, i) => {
          let state = 'pending';
          if (st.done) state = 'completed';
          if (st.tag === c.status) state = 'active';
          if (c.status === 'Rejected' && i === steps.length - 1) state = 'cancelled';
          return `
            <div class="timeline-step ${state}">
              <div class="step-dot"></div>
              <div class="step-label">${st.name}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Triple Metric Grid -->
    <div class="grid-3 mb-24">
      
      <!-- Resume Completion Percentage Circle -->
      <div class="card flex flex-col items-center justify-center text-center" style="padding:22px;">
        <h4 class="mb-12">Profile Completion</h4>
        ${renderScoreRing(completionPct, 110)}
        <p style="font-size:0.8rem; color:var(--text-muted); margin-top:12px;">Fill academic &amp; personal details to reach 100%</p>
      </div>

      <!-- Job Match Score -->
      <div class="card flex flex-col items-center justify-center text-center" style="padding:22px;">
        <h4 class="mb-12">Job Match Percentage</h4>
        ${renderScoreRing(matchPct, 110)}
        <p style="font-size:0.8rem; color:var(--text-muted); margin-top:12px;">AI alignment against active JD skills</p>
      </div>

      <!-- Resume Trust & Fake Checker -->
      <div class="card flex flex-col justify-between" style="padding:22px;">
        <div>
          <h4 class="mb-12" style="display:flex; align-items:center; gap:6px;"><i data-lucide="shield-check" style="color:var(--green)"></i> AI Trust Integrity</h4>
          <div style="font-size:1.8rem; font-weight:800; color:${sug.fake_resume_detection?.is_suspicious ? 'var(--red)' : 'var(--green)'};">
            ${sug.fake_resume_detection?.trust_score || 95}%
          </div>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-top:6px;">Fake profile &amp; credentials anomaly screen</p>
        </div>
        <div style="font-size:0.75rem; background:rgba(255,255,255,0.03); padding:8px; border-radius:6px; border:1px solid var(--border)">
          ${sug.fake_resume_detection?.is_suspicious ? `⚠️ ${sug.fake_resume_detection.flags[0]}` : '✓ Identity &amp; timeline dates verified.'}
        </div>
      </div>

    </div>

    <!-- Suggested Actions & Recommendations Grid -->
    <div class="grid-2 mb-24">
      
      <!-- AI career suggestions & missing skills -->
      <div class="card" style="padding:22px;">
        <div class="section-title">
          <i data-lucide="sparkles" style="color:var(--purple)"></i> AI Skill &amp; Job Insights
          <div class="section-title-line"></div>
        </div>
        
        <div class="mb-16">
          <strong style="font-size:0.8rem; text-transform:uppercase; color:var(--text-muted); display:block; margin-bottom:6px;">Recommended Career Paths</strong>
          ${(sug.career_recommendations || ["AI/ML developer Cohort", "Application Dev Specialist"]).map(cr => `
            <div style="font-size:0.85rem; padding:8px 12px; background:rgba(124,58,237,0.05); border-radius:6px; border:1px solid rgba(124,58,237,0.1); margin-bottom:6px; font-weight:500;">
              ✨ ${cr}
            </div>
          `).join('')}
        </div>

        <div>
          <strong style="font-size:0.8rem; text-transform:uppercase; color:var(--text-muted); display:block; margin-bottom:6px;">Missing Core Skills</strong>
          <div class="skill-pills">
            ${(c.skills_missing || ["Docker", "AWS", "PyTorch"]).map(sk => `<span class="skill-pill skill-pill-missing">${sk}</span>`).join('')}
          </div>
        </div>
      </div>

      <!-- Suggested certifications & improvements -->
      <div class="card" style="padding:22px;">
        <div class="section-title">
          <i data-lucide="bookmark" style="color:var(--amber)"></i> Recommended Certifications
          <div class="section-title-line"></div>
        </div>
        
        <div class="mb-16">
          ${(sug.recommended_certifications || ["AWS Certified Developer", "React advanced"]).map(cert => `
            <div class="flex items-center gap-8 mb-8">
              <i data-lucide="award" style="width:14px; height:14px; color:var(--amber); flex-shrink:0;"></i>
              <span style="font-size:0.85rem; font-weight:500;">${cert}</span>
            </div>
          `).join('')}
        </div>

        <div style="border-top:1px solid var(--border); padding-top:12px;">
          <strong style="font-size:0.8rem; text-transform:uppercase; color:var(--text-muted); display:block; margin-bottom:6px;">Profile Improvements</strong>
          ${(sug.resume_improvements || ["Upload Github link to highlight code contribution"]).map(imp => `
            <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:4px;">• ${imp}</div>
          `).join('')}
        </div>
      </div>

    </div>

    <!-- Messages / Notifications panel -->
    <div class="card" style="padding:22px;">
      <div class="section-title">
        <i data-lucide="bell" style="color:var(--green)"></i> Recruiter Message Center
        <div class="section-title-line"></div>
      </div>
      <div id="dashboard-message-box" style="margin-top:12px;">
        <div style="padding:12px; background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:6px; font-size:0.85rem;">
          💬 ${c.recruiter_remark ? c.recruiter_remark : "Your application is being processed by the system. Complete pending interviews to prompt recruiter review."}
        </div>
      </div>
    </div>
  </div>`;
}


/* ══════════════════════════════════════════════════════════════
   ENTERPRISE RECRUITER COMPARISON MATRIX (v4.0)
   ══════════════════════════════════════════════════════════════ */

function renderRecruiterComparisonBoard(candidates) {
  const topCands = [...candidates].sort((a,b) => b.score - a.score).slice(0, 4);
  return `
  <div class="page-wrapper animate-fade-in">
    <div class="page-header">
      <div>
        <h1 class="page-title">Candidate <span class="gradient-text">Comparison matrix</span></h1>
        <p class="page-subtitle">Compare credentials, interview metrics, and academic results of top applicants side-by-side</p>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="App.navigate('dashboard')">Back to Dashboard</button>
    </div>

    <div class="card" style="overflow-x:auto; padding:20px;">
      <table class="comparison-matrix">
        <thead>
          <tr>
            <th>Metric / Candidate</th>
            ${topCands.map(tc => `
              <th class="comparison-cand-header">${tc.name}</th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>AI Fit Score</strong></td>
            ${topCands.map(tc => `
              <td><span class="tag tag-cyan" style="font-weight:700;">${tc.score}%</span></td>
            `).join('')}
          </tr>
          <tr>
            <td><strong>Technical Skills</strong></td>
            ${topCands.map(tc => `
              <td><div class="skill-pills">${skillPills(tc.skills_matched, 'matched', 4)}</div></td>
            `).join('')}
          </tr>
          <tr>
            <td><strong>Missing Skills</strong></td>
            ${topCands.map(tc => `
              <td><div class="skill-pills">${skillPills(tc.skills_missing, 'missing', 3)}</div></td>
            `).join('')}
          </tr>
          <tr>
            <td><strong>Graduation CGPA</strong></td>
            ${topCands.map(tc => `
              <td>${tc.grad_cgpa ? tc.grad_cgpa : '—'} (${tc.grad_degree || '—'})</td>
            `).join('')}
          </tr>
          <tr>
            <td><strong>Backlogs</strong></td>
            ${topCands.map(tc => `
              <td><span style="color:${tc.grad_backlogs > 0 ? 'var(--red)' : 'var(--text-muted)'};">${tc.grad_backlogs || 0}</span></td>
            `).join('')}
          </tr>
          <tr>
            <td><strong>Interview Score</strong></td>
            ${topCands.map(tc => `
              <td><span class="tag tag-purple" style="font-weight:700;">${tc.interview_score || 'Pending'}%</span></td>
            `).join('')}
          </tr>
          <tr>
            <td><strong>Trust Integrity</strong></td>
            ${topCands.map(tc => `
              <td>${tc.ai_suggestions?.fake_resume_detection?.trust_score || 90}%</td>
            `).join('')}
          </tr>
        </tbody>
      </table>
    </div>
  </div>`;
}
window.renderRecruiterComparisonBoard = renderRecruiterComparisonBoard;

function renderOnboardingPage(candidate) {
  const isCompleted = candidate.onboarding_progress === 100;
  
  if (isCompleted) {
    return `
    <div class="page-wrapper animate-fade-in" style="display: flex; align-items: center; justify-content: center; min-height: 70vh;">
      <div class="card celebration-card text-center animate-scale-up" style="padding: 40px 24px; max-width: 600px; width: 100%; background: rgba(13, 27, 42, 0.95); border: 2px solid var(--green); box-shadow: var(--glow-green); border-radius: var(--r-lg);">
        <div class="celebration-badge" style="width: 80px; height: 80px; border-radius: 50%; background: rgba(34, 197, 94, 0.1); border: 2px solid var(--green); display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; box-shadow: var(--glow-green);">
          <i data-lucide="party-popper" style="width: 40px; height: 40px; color: var(--green); animation: pulse 2s infinite;"></i>
        </div>
        <h2 class="gradient-text" style="font-size: 2.2rem; font-weight: 800; margin-bottom: 12px; background: linear-gradient(135deg, #22c55e, #00f5ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Congratulations, ${candidate.name}!</h2>
        <h4 style="color: var(--text-secondary); margin-bottom: 24px;">Onboarding Completed Successfully 🎉</h4>
        
        <div style="background: rgba(255,255,255,0.02); border: 1px dashed rgba(34, 197, 94, 0.3); border-radius: 8px; padding: 20px; margin-bottom: 30px; font-size: 0.95rem; line-height: 1.6; text-align: left; color: var(--text-muted);">
          <p style="margin-bottom: 12px;">🏆 <strong>All Onboarding Milestones Met:</strong></p>
          <ul style="list-style-type: none; padding-left: 0; display: flex; flex-direction: column; gap: 8px;">
            <li style="display: flex; align-items: center; gap: 8px;"><i data-lucide="check-circle" style="width: 16px; height: 16px; color: var(--green);"></i> Signed agreement & offer letter verified.</li>
            <li style="display: flex; align-items: center; gap: 8px;"><i data-lucide="check-circle" style="width: 16px; height: 16px; color: var(--green);"></i> Academic transcripts & ID verified.</li>
            <li style="display: flex; align-items: center; gap: 8px;"><i data-lucide="check-circle" style="width: 16px; height: 16px; color: var(--green);"></i> Completed AI Python foundations training.</li>
            <li style="display: flex; align-items: center; gap: 8px;"><i data-lucide="check-circle" style="width: 16px; height: 16px; color: var(--green);"></i> Mini-project review passed.</li>
          </ul>
          <p style="margin-top: 16px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px; color: var(--text-secondary);">
            📧 <strong>What's Next?</strong> Your official FWC Global offer letter and cohort onboarding details have been processed. You will receive them in your email <strong>${candidate.email}</strong> shortly.
          </p>
        </div>
        
        <button class="btn btn-cyan btn-sm" onclick="App.navigate('dashboard')" style="min-width: 200px;">
          <i data-lucide="layout-dashboard"></i> Return to Dashboard
        </button>
      </div>
    </div>`;
  }

  // Otherwise, render progress checklist
  return `
  <div class="page-wrapper animate-fade-in" style="max-width: 800px; margin: 0 auto;">
    <div class="page-header">
      <div>
        <h1 class="page-title">Candidate <span class="gradient-text">Onboarding Portal</span></h1>
        <p class="page-subtitle">Complete your checklists and training modules to receive your official offer letter</p>
      </div>
    </div>

    <!-- Onboarding Checklist -->
    <div class="card section mb-24" style="padding: 24px;">
      <div class="section-title" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <span style="display: flex; align-items: center; gap: 8px;">
          <i data-lucide="clipboard-check" style="width:18px;height:18px;color:var(--green)"></i>
          Onboarding Checklist
        </span>
        <span class="tag tag-green">${candidate.onboarding_progress}% Complete</span>
      </div>
      ${progressBar(candidate.onboarding_progress, 'green')}
      
      <div style="display:flex;flex-direction:column;gap:12px;margin-top:20px;">
        ${(candidate.onboarding_tasks||[]).sort((a,b)=>(a.order||0)-(b.order||0)).map(t => `
        <div class="onboarding-task ${t.completed ? 'done' : ''}" id="task-${t.id}"
          onclick="App.toggleTask('${candidate.id}','${t.id}',${!t.completed})">
          <div class="task-check">
            <i data-lucide="check" style="width:12px;height:12px;"></i>
          </div>
          <div class="task-title" style="flex: 1;">${t.title}</div>
          <div class="task-number" style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">
            ${t.id.split('-')[0]}
          </div>
        </div>`).join('')}
      </div>
    </div>
  </div>`;
}
window.renderOnboardingPage = renderOnboardingPage;

function triggerConfetti() {
  if (document.getElementById('confetti-canvas')) {
    document.getElementById('confetti-canvas').remove();
  }

  const canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const colors = ['#00f5ff', '#a855f7', '#22c55e', '#eab308', '#ec4899', '#3b82f6'];
  const confettiCount = 120;
  const confetti = [];

  class ConfettiParticle {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height - height;
      this.r = Math.random() * 6 + 4;
      this.d = Math.random() * confettiCount;
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.tilt = Math.random() * 10 - 5;
      this.tiltAngleChan = Math.random() * 0.07 + 0.02;
      this.tiltAngle = 0;
    }
    update() {
      this.tiltAngle += this.tiltAngleChan;
      this.y += (Math.cos(this.d) + 3 + this.r / 2) / 2;
      this.x += Math.sin(this.tiltAngle);
      this.tilt = Math.sin(this.tiltAngle - this.r/2) * 15;
      return this.y < height;
    }
    draw() {
      ctx.beginPath();
      ctx.lineWidth = this.r;
      ctx.strokeStyle = this.color;
      ctx.moveTo(this.x + this.tilt + this.r/2, this.y);
      ctx.lineTo(this.x + this.tilt, this.y + this.tilt + this.r/2);
      ctx.stroke();
    }
  }

  for (let i = 0; i < confettiCount; i++) {
    confetti.push(new ConfettiParticle());
  }

  let animationFrameId;
  function draw() {
    ctx.clearRect(0, 0, width, height);
    let active = false;
    confetti.forEach(p => {
      if (p.update()) {
        p.draw();
        active = true;
      }
    });
    if (active) {
      animationFrameId = requestAnimationFrame(draw);
    } else {
      canvas.remove();
    }
  }
  draw();

  setTimeout(() => {
    cancelAnimationFrame(animationFrameId);
    canvas.remove();
  }, 6000);
}
window.triggerConfetti = triggerConfetti;

