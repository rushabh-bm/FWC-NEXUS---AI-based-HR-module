/* ══════════════════════════════════════════════════════
   api.js  —  All API calls + WebSocket client
   Includes: X-Session-Token header on every protected call
   ══════════════════════════════════════════════════════ */

const API_BASE = '';

const API = {
  /* ── Core fetch wrapper ───────────────────────────── */
  async call(method, path, body = null, auth = true) {
    const opts = { method, headers: {} };

    // Attach session token for authenticated calls
    if (auth) {
      const token = localStorage.getItem('nexus_token');
      if (token) {
        opts.headers['Authorization'] = `Bearer ${token}`;
        opts.headers['X-Session-Token'] = token;
      }
    }

    if (body && !(body instanceof FormData)) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    } else if (body instanceof FormData) {
      opts.body = body;
    }

    const res = await fetch(API_BASE + path, opts);

    // Handle 401 — force logout
    if (res.status === 401) {
      localStorage.removeItem('nexus_user');
      localStorage.removeItem('nexus_token');
      window.location.reload();
      throw new Error('Session expired. Please log in again.');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  },

  // ── Auth (no token required) ──────────────────────
  login: (username, password) =>
    API.call('POST', '/api/auth/login', { username, password }, false),
  register: (username, password, name) =>
    API.call('POST', '/api/auth/register', { username, password, name }, false),
  logout: () => API.call('POST', '/api/auth/logout'),
  getMe: () => API.call('GET', '/api/auth/me'),

  // ── Recruiter: Candidate Management ──────────────
  getCandidates: () => API.call('GET', '/api/candidates'),
  getCandidate: (id) => API.call('GET', `/api/candidates/${id}`),
  updateStatus: (id, status) =>
    API.call('POST', `/api/candidates/${id}/status`, { status }),
  addRemark: (id, remark) =>
    API.call('POST', `/api/candidates/${id}/remark`, { remark }),
  getAISummary: (id) => API.call('GET', `/api/candidates/${id}/ai-summary`),
  evaluateInterview: (id, answers) =>
    API.call('POST', `/api/candidates/${id}/interview/evaluate`, { answers }),
  toggleTask: (candidateId, taskId, completed) =>
    API.call('POST', `/api/candidates/${candidateId}/onboarding/tasks/${taskId}`, { completed }),
  evaluateCode: (id, language, code) =>
    API.call('POST', `/api/candidates/${id}/code/evaluate`, { language, code }),

  // ── Recruiter: Resume Upload (for any candidate) ──
  uploadResume: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return API.call('POST', '/api/resumes/upload', fd);
  },
  uploadResumeBulk: (files) => {
    const fd = new FormData();
    for (let file of files) {
      fd.append('files', file);
    }
    return API.call('POST', '/api/resumes/upload-bulk', fd);
  },

  // ── Recruiter: Analytics & AI ────────────────────
  getAnalytics: () => API.call('GET', '/api/analytics/overview'),
  chat: (message) => API.call('POST', '/api/ai/chat', { message }),
  generateJD: (title, skills, locations) =>
    API.call('POST', '/api/ai/generate-jd', { title, skills, locations }),

  // ── Recruiter: Export ─────────────────────────────
  exportCSV: () => {
    const token = localStorage.getItem('nexus_token');
    const url = `/api/export/candidates.csv`;
    // Open in new tab with token in header — use fetch download workaround
    API.call('GET', url).then(blob => {
      window.open(url + '?_t=' + Date.now(), '_blank');
    }).catch(() => {});
    // Direct window open (server also validates via header from same session)
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nexus_candidates.csv';
    // Workaround: fetch and create blob URL
    fetch(url, { headers: { 'Authorization': `Bearer ${token || ''}`, 'X-Session-Token': token || '' } })
      .then(r => r.blob())
      .then(b => {
        const bUrl = URL.createObjectURL(b);
        a.href = bUrl;
        a.click();
        URL.revokeObjectURL(bUrl);
      }).catch(() => {});
  },

  // ── Candidate Self-Service ────────────────────────
  getMyProfile: () => API.call('GET', '/api/me/profile'),
  updateProfile: (profileData) =>
    API.call('POST', '/api/me/profile/update', profileData),
  uploadDocument: (docType, file) => {
    const fd = new FormData();
    fd.append('doc_type', docType);
    fd.append('file', file);
    return API.call('POST', '/api/me/upload/doc', fd);
  },
  submitMyInterview: (answers, tab_switches = 0, fullscreen_violations = 0) =>
    API.call('POST', '/api/me/interview/evaluate', { answers, tab_switches, fullscreen_violations }),
  toggleMyTask: (taskId, completed) =>
    API.call('POST', `/api/me/onboarding/tasks/${taskId}`, { completed }),
  uploadMyResume: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return API.call('POST', '/api/me/resume/upload', fd);
  },

  // ── Admin ─────────────────────────────────────────
  adminGetUsers: () => API.call('GET', '/api/admin/users'),
  adminCreateUser: (username, password, name, role) =>
    API.call('POST', '/api/admin/users', { username, password, name, role }),
  adminDeleteUser: (userId) =>
    API.call('DELETE', `/api/admin/users/${userId}`),
  adminGetStats: () => API.call('GET', '/api/admin/stats'),

  // ── Recruitment Pipeline — Jobs, Applications, & Slots ──
  getJobs: () => API.call('GET', '/api/jobs'),
  getJob: (id) => API.call('GET', `/api/jobs/${id}`),
  createJob: (jobData) => API.call('POST', '/api/jobs', jobData),
  toggleJobActive: (id) => API.call('PATCH', `/api/jobs/${id}`),
  applyToJob: (id, coverNote) => API.call('POST', `/api/jobs/${id}/apply`, { cover_note: coverNote }),
  getJobApplications: (id) => API.call('GET', `/api/jobs/${id}/applications`),
  getAllApplications: () => API.call('GET', '/api/applications'),
  getMyApplications: () => API.call('GET', '/api/me/applications'),
  shortlistApp: (id) => API.call('POST', `/api/applications/${id}/shortlist`),
  rejectApp: (id) => API.call('POST', `/api/applications/${id}/reject`),
  scheduleSlot: (id, data) => API.call('POST', `/api/applications/${id}/schedule`, data),
  confirmSlot: (id, confirm, declineReason = '') => API.call('POST', `/api/applications/${id}/slot/confirm`, { confirm, decline_reason: declineReason }),
  completeInterview: (id, status, feedback = '') => API.call('POST', `/api/applications/${id}/complete`, { status, recruiter_feedback: feedback }),
  getNotifications: () => API.call('GET', '/api/notifications'),
  markNotifRead: (id) => API.call('POST', `/api/notifications/${id}/read`),
};


/* ── WebSocket Copilot Client ─────────────────────────── */
class CopilotWS {
  constructor() {
    this.ws = null;
    this.onChunk = null;
    this.onDone = null;
    this.onTyping = null;
    this.onWelcome = null;
    this.reconnectTimer = null;
    this.connected = false;
  }

  connect() {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${location.host}/ws/chat`;
    try {
      this.ws = new WebSocket(url);
      this.ws.onopen = () => {
        this.connected = true;
        const el = document.getElementById('copilot-status');
        if (el) { el.classList.add('connected'); el.textContent = 'Connected · Live'; }
      };
      this.ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'welcome' && this.onWelcome) this.onWelcome(msg);
        if (msg.type === 'typing'  && this.onTyping)  this.onTyping();
        if (msg.type === 'chunk'   && this.onChunk)   this.onChunk(msg.content);
        if (msg.type === 'done'    && this.onDone)    this.onDone(msg.suggestions || []);
      };
      this.ws.onclose = () => {
        this.connected = false;
        const el = document.getElementById('copilot-status');
        if (el) el.textContent = 'Reconnecting…';
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      };
      this.ws.onerror = () => this.ws.close();
    } catch(e) { /* WS not available */ }
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ message }));
      return true;
    }
    return false;
  }

  disconnect() {
    clearTimeout(this.reconnectTimer);
    if (this.ws) this.ws.close();
  }
}

window.copilotWS = new CopilotWS();
