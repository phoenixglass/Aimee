/**
 * Aimee API Client
 * Handles all communication with the backend.
 */
const API = {
  baseUrl: '/api',
  token: null,

  setToken(token) {
    this.token = token;
    localStorage.setItem('aimee_token', token);
  },

  getToken() {
    if (!this.token) {
      this.token = localStorage.getItem('aimee_token');
    }
    return this.token;
  },

  clearToken() {
    this.token = null;
    localStorage.removeItem('aimee_token');
    localStorage.removeItem('aimee_user');
  },

  async request(method, path, body, isFormData) {
    const headers = {};
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const opts = { method, headers };
    if (body) {
      opts.body = isFormData ? body : JSON.stringify(body);
    }

    const res = await fetch(`${this.baseUrl}${path}`, opts);
    if (res.status === 401) {
      this.clearToken();
      location.reload();
      return;
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },

  get(path) { return this.request('GET', path); },
  post(path, body, isFormData) { return this.request('POST', path, body, isFormData); },
  put(path, body) { return this.request('PUT', path, body); },

  // Auth
  login(email, password) { return this.post('/auth/login', { email, password }); },
  getProfile() { return this.get('/auth/me'); },

  // Wines
  getWines(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/wines${qs ? '?' + qs : ''}`);
  },
  getWine(id) { return this.get(`/wines/${id}`); },

  // Accounts
  getAccounts(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/accounts${qs ? '?' + qs : ''}`);
  },
  getAccount(id) { return this.get(`/accounts/${id}`); },

  // Orders
  getOrders(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/orders${qs ? '?' + qs : ''}`);
  },
  getOrder(id) { return this.get(`/orders/${id}`); },
  confirmOrder(id) { return this.post(`/orders/${id}/confirm`); },
  cancelOrder(id) { return this.post(`/orders/${id}/cancel`); },

  // Appointments
  getAppointments(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/appointments${qs ? '?' + qs : ''}`);
  },

  // Voice
  async sendVoiceText(text) {
    return this.post('/voice/text', { text });
  },

  async sendVoiceAudio(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    return this.post('/voice/converse', formData, true);
  },
};
