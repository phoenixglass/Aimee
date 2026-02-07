/**
 * Aimee - Main Application
 */
(function () {
  // ─── DOM REFS ──────────────────────────────────────────
  const loginScreen = document.getElementById('login-screen');
  const appScreen = document.getElementById('app-screen');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const userNameEl = document.getElementById('user-name');
  const logoutBtn = document.getElementById('logout-btn');

  const conversation = document.getElementById('conversation');
  const micBtn = document.getElementById('mic-btn');
  const textInput = document.getElementById('text-input');
  const textSendBtn = document.getElementById('text-send-btn');

  const navItems = document.querySelectorAll('.nav-item');
  const views = document.querySelectorAll('.view');

  let currentUser = null;
  let micReady = false;

  // ─── INIT ──────────────────────────────────────────────
  async function init() {
    const token = API.getToken();
    const savedUser = localStorage.getItem('aimee_user');

    if (token && savedUser) {
      try {
        currentUser = JSON.parse(savedUser);
        showApp();
        // Verify token is still valid
        const profile = await API.getProfile();
        currentUser = profile;
        localStorage.setItem('aimee_user', JSON.stringify(profile));
        userNameEl.textContent = `${profile.firstName}`;
      } catch {
        logout();
      }
    }
  }

  // ─── AUTH ──────────────────────────────────────────────
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const result = await API.login(email, password);
      API.setToken(result.token);
      currentUser = result.user;
      localStorage.setItem('aimee_user', JSON.stringify(result.user));
      userNameEl.textContent = result.user.firstName;
      showApp();
    } catch (err) {
      loginError.textContent = err.message;
    }
  });

  logoutBtn.addEventListener('click', logout);

  function logout() {
    API.clearToken();
    currentUser = null;
    loginScreen.classList.add('active');
    appScreen.classList.remove('active');
    loginForm.reset();
  }

  function showApp() {
    loginScreen.classList.remove('active');
    appScreen.classList.add('active');
    initMic();
  }

  // ─── NAVIGATION ────────────────────────────────────────
  navItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.view;
      navItems.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      views.forEach((v) => v.classList.remove('active'));
      document.getElementById(`view-${target}`).classList.add('active');

      // Load data when switching views
      if (target === 'orders') loadOrders();
      if (target === 'accounts') loadAccounts();
      if (target === 'schedule') loadSchedule();
      if (target === 'wines') loadWines();
    });
  });

  // ─── VOICE ─────────────────────────────────────────────
  async function initMic() {
    micReady = await VoiceRecorder.init();
    if (!micReady) {
      addMessage('info', 'Microphone access not available. Use text input instead.');
    }
  }

  micBtn.addEventListener('click', async () => {
    if (!micReady) {
      micReady = await VoiceRecorder.init();
      if (!micReady) {
        addMessage('info', 'Please allow microphone access to use voice.');
        return;
      }
    }

    if (VoiceRecorder.isRecording) {
      // Stop recording
      micBtn.classList.remove('recording');
      micBtn.classList.add('processing');
      const audioBlob = await VoiceRecorder.stop();

      if (audioBlob && audioBlob.size > 0) {
        addMessage('info', 'Processing...');
        try {
          const result = await API.sendVoiceAudio(audioBlob);
          removeLastInfo();
          if (result.transcript) addMessage('user', result.transcript);
          if (result.responseText) addMessage('assistant', result.responseText);
          if (result.audio) {
            await VoiceRecorder.playBase64Audio(result.audio, result.audioMimeType);
          }
        } catch (err) {
          removeLastInfo();
          addMessage('assistant', `Sorry, something went wrong: ${err.message}`);
        }
      }
      micBtn.classList.remove('processing');
    } else {
      // Start recording
      VoiceRecorder.start();
      micBtn.classList.add('recording');
    }
  });

  // ─── TEXT INPUT ─────────────────────────────────────────
  async function sendTextCommand() {
    const text = textInput.value.trim();
    if (!text) return;

    textInput.value = '';
    addMessage('user', text);

    try {
      const result = await API.sendVoiceText(text);
      if (result.responseText) addMessage('assistant', result.responseText);
      if (result.audio) {
        await VoiceRecorder.playBase64Audio(result.audio, result.audioMimeType);
      }
    } catch (err) {
      addMessage('assistant', `Sorry, something went wrong: ${err.message}`);
    }
  }

  textSendBtn.addEventListener('click', sendTextCommand);
  textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendTextCommand();
  });

  // ─── CONVERSATION ──────────────────────────────────────
  function addMessage(type, text) {
    // Remove welcome message on first real message
    const welcome = conversation.querySelector('.conversation-welcome');
    if (welcome) welcome.remove();

    const div = document.createElement('div');
    div.className = `msg msg-${type}`;
    div.textContent = text;
    conversation.appendChild(div);
    conversation.scrollTop = conversation.scrollHeight;
  }

  function removeLastInfo() {
    const msgs = conversation.querySelectorAll('.msg-info');
    if (msgs.length > 0) msgs[msgs.length - 1].remove();
  }

  // ─── ORDERS VIEW ───────────────────────────────────────
  const orderStatusFilter = document.getElementById('order-status-filter');
  orderStatusFilter.addEventListener('change', loadOrders);

  async function loadOrders() {
    const list = document.getElementById('orders-list');
    list.innerHTML = '<div class="loading">Loading orders...</div>';

    try {
      const params = {};
      const status = orderStatusFilter.value;
      if (status) params.status = status;

      const orders = await API.getOrders(params);
      if (orders.length === 0) {
        list.innerHTML = '<div class="empty-state">No orders found</div>';
        return;
      }

      list.innerHTML = orders.map((order) => {
        const items = order.items.map((i) =>
          `${i.quantity} ${i.unitType === 'case' ? 'cs' : 'btl'} ${i.wine?.name || 'Unknown'}`
        ).join(', ');
        const date = new Date(order.orderDate).toLocaleDateString();
        const statusClass = `badge-${order.status.replace('pending_confirmation', 'pending')}`;

        return `
          <div class="card">
            <div class="card-row" style="margin-top:0">
              <span class="card-title">Order #${order.id}</span>
              <span class="badge ${statusClass}">${order.status.replace(/_/g, ' ')}</span>
            </div>
            <div class="card-subtitle">${order.account?.name || 'Unknown'} &middot; ${date}</div>
            <div class="card-detail" style="margin-top:6px">${items}</div>
            <div class="card-row">
              <span class="card-detail">Total: <strong>$${order.total.toFixed(2)}</strong></span>
              ${order.status === 'pending_confirmation' ? `
                <div style="display:flex;gap:8px">
                  <button class="btn btn-primary" style="padding:6px 14px;font-size:13px" onclick="App.confirmOrder(${order.id})">Confirm</button>
                  <button class="btn" style="padding:6px 14px;font-size:13px;background:var(--bg-input);color:var(--text)" onclick="App.cancelOrder(${order.id})">Cancel</button>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      list.innerHTML = `<div class="empty-state">Error loading orders: ${err.message}</div>`;
    }
  }

  // ─── ACCOUNTS VIEW ─────────────────────────────────────
  const accountSearch = document.getElementById('account-search');
  let accountSearchTimer;
  accountSearch.addEventListener('input', () => {
    clearTimeout(accountSearchTimer);
    accountSearchTimer = setTimeout(loadAccounts, 300);
  });

  async function loadAccounts() {
    const list = document.getElementById('accounts-list');
    list.innerHTML = '<div class="loading">Loading accounts...</div>';

    try {
      const params = {};
      const search = accountSearch.value.trim();
      if (search) params.search = search;

      const accounts = await API.getAccounts(params);
      if (accounts.length === 0) {
        list.innerHTML = '<div class="empty-state">No accounts found</div>';
        return;
      }

      list.innerHTML = accounts.map((acct) => {
        const typeClass = `badge-${acct.accountType}`;
        return `
          <div class="card">
            <div class="card-row" style="margin-top:0">
              <span class="card-title">${acct.name}</span>
              <span class="badge ${typeClass}">${acct.accountType}</span>
            </div>
            ${acct.contactName ? `<div class="card-subtitle">${acct.contactName}</div>` : ''}
            <div class="card-detail" style="margin-top:6px">
              ${[acct.city, acct.state].filter(Boolean).join(', ') || 'No address'}
              ${acct.phone ? ` &middot; ${acct.phone}` : ''}
            </div>
            ${acct.salesperson ? `<div class="card-detail">Rep: ${acct.salesperson.firstName} ${acct.salesperson.lastName}</div>` : ''}
          </div>
        `;
      }).join('');
    } catch (err) {
      list.innerHTML = `<div class="empty-state">Error: ${err.message}</div>`;
    }
  }

  // ─── SCHEDULE VIEW ─────────────────────────────────────
  async function loadSchedule() {
    const list = document.getElementById('schedule-list');
    list.innerHTML = '<div class="loading">Loading appointments...</div>';

    try {
      const appointments = await API.getAppointments({ upcoming: true });
      if (appointments.length === 0) {
        list.innerHTML = '<div class="empty-state">No upcoming appointments</div>';
        return;
      }

      list.innerHTML = appointments.map((appt) => {
        const date = new Date(appt.scheduledAt);
        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const isToday = new Date().toDateString() === date.toDateString();

        return `
          <div class="card">
            <div class="card-row" style="margin-top:0">
              <span class="card-title">${appt.title}</span>
              ${isToday ? '<span class="badge badge-confirmed">Today</span>' : ''}
            </div>
            <div class="card-subtitle">${dateStr} at ${timeStr}</div>
            ${appt.account ? `<div class="card-detail" style="margin-top:6px">${appt.account.name}${appt.account.city ? ` &middot; ${appt.account.city}` : ''}</div>` : ''}
            ${appt.notes ? `<div class="card-detail">${appt.notes}</div>` : ''}
          </div>
        `;
      }).join('');
    } catch (err) {
      list.innerHTML = `<div class="empty-state">Error: ${err.message}</div>`;
    }
  }

  // ─── WINES VIEW ────────────────────────────────────────
  const wineSearch = document.getElementById('wine-search');
  let wineSearchTimer;
  wineSearch.addEventListener('input', () => {
    clearTimeout(wineSearchTimer);
    wineSearchTimer = setTimeout(loadWines, 300);
  });

  async function loadWines() {
    const list = document.getElementById('wines-list');
    list.innerHTML = '<div class="loading">Loading wines...</div>';

    try {
      const params = {};
      const search = wineSearch.value.trim();
      if (search) params.search = search;

      const wines = await API.getWines(params);
      if (wines.length === 0) {
        list.innerHTML = '<div class="empty-state">No wines found</div>';
        return;
      }

      list.innerHTML = wines.map((wine) => {
        const stock = wine.inventory?.quantityAvailable ?? '?';
        const stockClass = stock <= (wine.inventory?.reorderPoint || 0) ? 'stock-low' : 'stock-ok';
        const casePrice = (wine.priceWholesale * wine.caseSize).toFixed(2);

        return `
          <div class="card">
            <div class="card-title">${wine.name}${wine.vintage ? ` (${wine.vintage})` : ''}</div>
            ${wine.phoneticSimple ? `<div class="wine-pronunciation">"${wine.phoneticSimple}"</div>` : ''}
            <div class="card-subtitle">
              ${wine.grapeVariety?.name || ''}${wine.region ? ` &middot; ${wine.region.name}` : ''}
              ${wine.producer ? ` &middot; ${wine.producer.name}` : ''}
            </div>
            <div class="card-row">
              <span class="wine-price">$${wine.priceWholesale.toFixed(2)}/btl &middot; $${casePrice}/cs</span>
              <span class="${stockClass}">${stock} btl</span>
            </div>
            ${wine.appellation ? `<div class="card-detail">${wine.appellation}</div>` : ''}
          </div>
        `;
      }).join('');
    } catch (err) {
      list.innerHTML = `<div class="empty-state">Error: ${err.message}</div>`;
    }
  }

  // ─── GLOBAL ACTIONS (for inline onclick) ───────────────
  window.App = {
    async confirmOrder(id) {
      try {
        await API.confirmOrder(id);
        loadOrders();
      } catch (err) {
        alert(`Error: ${err.message}`);
      }
    },
    async cancelOrder(id) {
      try {
        await API.cancelOrder(id);
        loadOrders();
      } catch (err) {
        alert(`Error: ${err.message}`);
      }
    },
  };

  // ─── START ─────────────────────────────────────────────
  init();
})();
