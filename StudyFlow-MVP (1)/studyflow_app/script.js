/* ============================================================
   StudyFlow — script.js
   Vanilla JS application logic
   ============================================================ */

(function () {
  'use strict';

  /* ========================================================
     CONSTANTS & STATE
     ======================================================== */
  var STORAGE_KEY = 'studyflow_data_v1';
  var AUTH_ACCOUNTS_KEY = 'studyflow_accounts_v1';
  var AUTH_SESSION_KEY = 'studyflow_session_v1';
  var WEEK_DAYS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  var WEEK_LABELS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  var WEEK_SHORT  = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var TYPE_ICONS  = { tarefa: '📐', prova: '🧪', trabalho: '📚' };
  var TYPE_LABELS = { tarefa: 'Tarefa', prova: 'Prova', trabalho: 'Trabalho' };
  var PRIO_LABELS = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };
  var DIFF_LABELS = { facil: 'Fácil', media: 'Média', dificil: 'Difícil' };
  var DIFF_WEIGHTS = { facil: 1, media: 2, dificil: 3 };
  var PRIO_WEIGHTS = { baixa: 1, media: 2, alta: 3 };

  var state = {
    activities: [],
    availability: {},
    sessions: [],
    currentScreen: 'inicio',
    currentFilter: 'todas'
  };

  /* ========================================================
     INITIALIZATION
     ======================================================== */

  function init() {
    setupTheme();
    setupAuth();
    loadData();
    setupNavigation();
    setupModals();
    setupForms();
    setupFilters();
    setupCronograma();
    renderAll();
  }

  /* ========================================================
     DATA PERSISTENCE (localStorage)
     ======================================================== */

  function loadData() {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        var parsed = JSON.parse(saved);
        state.activities   = parsed.activities   || [];
        state.availability = parsed.availability || {};
        state.sessions     = parsed.sessions     || [];
        return;
      } catch (e) { /* fall through to seed */ }
    }
    seedDemoData();
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      activities: state.activities,
      availability: state.availability,
      sessions: state.sessions
    }));
  }

  /* ========================================================
     SEED DATA
     ======================================================== */

  function seedDemoData() {
    state.activities = [
      {
        id: uid(),
        titulo: 'Lista de Funções',
        materia: 'Matemática',
        tipo: 'tarefa',
        prazo: '2026-10-06',
        prioridade: 'alta',
        dificuldade: 'media',
        tempoEstimado: 60,
        status: 'pendente',
        tempoConcluido: 0
      },
      {
        id: uid(),
        titulo: 'Prova de Genética',
        materia: 'Biologia',
        tipo: 'prova',
        prazo: '2026-10-09',
        prioridade: 'alta',
        dificuldade: 'dificil',
        tempoEstimado: 120,
        status: 'pendente',
        tempoConcluido: 0
      },
      {
        id: uid(),
        titulo: 'Trabalho sobre República Velha',
        materia: 'História',
        tipo: 'trabalho',
        prazo: '2026-10-13',
        prioridade: 'media',
        dificuldade: 'media',
        tempoEstimado: 90,
        status: 'pendente',
        tempoConcluido: 0
      },
      {
        id: uid(),
        titulo: 'Resumo de Literatura Portuguesa',
        materia: 'Português',
        tipo: 'tarefa',
        prazo: '2026-10-15',
        prioridade: 'baixa',
        dificuldade: 'facil',
        tempoEstimado: 45,
        status: 'pendente',
        tempoConcluido: 0
      }
    ];

    state.availability = {
      segunda: 60,
      terca: 120,
      quarta: 90,
      quinta: 120,
      sexta: 60,
      sabado: 180,
      domingo: 0
    };

    state.sessions = [];
    saveData();
  }

  /* ========================================================
     UTILITIES
     ======================================================== */

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  function todayStr() {
    var d = new Date();
    return d.toISOString().split('T')[0];
  }

  function formatDate(iso) {
    if (!iso) return '—';
    var parts = iso.split('-');
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  function formatMinutes(min) {
    if (min < 60) return min + ' min';
    var h = Math.floor(min / 60);
    var m = min % 60;
    if (m === 0) return h + 'h';
    return h + 'h' + (m < 10 ? '0' : '') + m;
  }

  function daysUntil(iso) {
    var target = new Date(iso + 'T00:00:00');
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.round((target - now) / 86400000);
  }

  function isOverdue(a) {
    return a.status === 'pendente' && daysUntil(a.prazo) < 0;
  }

  function isToday(iso) {
    return iso === todayStr();
  }

  function isThisWeek(iso) {
    var d = daysUntil(iso);
    return d >= 0 && d <= 7;
  }

  function $(sel) { return document.querySelector(sel); }
  function $all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  /* ========================================================
     TOAST NOTIFICATIONS
     ======================================================== */

  function toast(msg, type) {
    var container = $('#toastContainer');
    var el = document.createElement('div');
    el.className = 'toast toast--' + (type || 'info');
    var icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    el.innerHTML = '<span class="toast__icon" aria-hidden="true">' + (icons[type] || 'ℹ') + '</span><span>' + msg + '</span>';
    container.appendChild(el);
    setTimeout(function () {
      el.style.opacity = '0';
      el.style.transform = 'translateX(40px)';
      el.style.transition = 'all 250ms ease';
      setTimeout(function () { el.remove(); }, 300);
    }, 3500);
  }

  /* ========================================================
     THEME
     ======================================================== */

  function setupTheme() {
    var savedTheme = localStorage.getItem('studyflow_theme') || 'light';
    applyTheme(savedTheme);
    $all('[data-theme-choice]').forEach(function (button) {
      button.addEventListener('click', function () {
        var selected = button.dataset.themeChoice;
        localStorage.setItem('studyflow_theme', selected);
        applyTheme(selected);
      });
    });
  }

  function applyTheme(theme) {
    document.body.dataset.theme = theme;
    $all('[data-theme-choice]').forEach(function (button) {
      var active = button.dataset.themeChoice === theme;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  /* ========================================================
     NAVIGATION
     ======================================================== */

  function setupNavigation() {
    var navItems = $all('[data-screen]');
    navItems.forEach(function (btn) {
      btn.addEventListener('click', function () {
        navigateTo(btn.dataset.screen);
      });
    });

    var btnOpen = $('#btnOpenSidebar');
    var overlay = $('#overlay');
    if (btnOpen) {
      btnOpen.addEventListener('click', function () {
        $('#sidebar').classList.add('open');
        overlay.classList.add('show');
        overlay.hidden = false;
      });
    }
    if (overlay) {
      overlay.addEventListener('click', closeSidebar);
    }
    $('#btnLogout').addEventListener('click', logout);
  }

  function closeSidebar() {
    var sb = $('#sidebar');
    var ov = $('#overlay');
    if (sb) sb.classList.remove('open');
    if (ov) { ov.classList.remove('show'); setTimeout(function () { ov.hidden = true; }, 250); }
  }

  function navigateTo(screen) {
    state.currentScreen = screen;
    $all('.screen').forEach(function (s) { s.classList.remove('active'); });
    var target = $('#screen-' + screen);
    if (target) target.classList.add('active');

    $all('.nav-item').forEach(function (n) {
      n.classList.toggle('active', n.dataset.screen === screen);
      n.removeAttribute('aria-current');
      if (n.dataset.screen === screen) n.setAttribute('aria-current', 'page');
    });
    $all('.bottomnav__item').forEach(function (n) {
      n.classList.toggle('active', n.dataset.screen === screen);
      n.removeAttribute('aria-current');
      if (n.dataset.screen === screen) n.setAttribute('aria-current', 'page');
    });

    closeSidebar();
    window.scrollTo(0, 0);
    renderScreen(screen);
  }

  function renderScreen(screen) {
    switch (screen) {
      case 'inicio':      renderInicio(); break;
      case 'atividades':  renderAtividades(); break;
      case 'cronograma':  renderCronograma(); break;
      case 'progresso':   renderProgresso(); break;
    }
  }

  function renderAll() {
    renderInicio();
  }

  /* ========================================================
     LOCAL AUTHENTICATION
     ======================================================== */

  function setupAuth() {
    $('#loginForm').addEventListener('submit', handleLogin);
    $('#signupForm').addEventListener('submit', handleSignup);
    $('#showSignup').addEventListener('click', function () { showAuthView('signup'); });
    $('#showLogin').addEventListener('click', function () { showAuthView('login'); });
    $('#forgotPassword').addEventListener('click', function () {
      setAuthNotice('login', 'Para este MVP local, crie uma nova conta ou use a conta cadastrada neste navegador.', 'info');
    });

    var session = localStorage.getItem(AUTH_SESSION_KEY) || sessionStorage.getItem(AUTH_SESSION_KEY);
    if (session) showApp();
    else showAuthView('login');
  }

  function readAccounts() {
    try {
      return JSON.parse(localStorage.getItem(AUTH_ACCOUNTS_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function showAuthView(view) {
    $('#authShell').hidden = false;
    $('#app').hidden = true;
    $('#loginView').hidden = view !== 'login';
    $('#signupView').hidden = view !== 'signup';
    clearAuthNotices();
    var focusTarget = view === 'login' ? '#loginEmail' : '#signupName';
    setTimeout(function () { $(focusTarget).focus(); }, 0);
  }

  function showApp() {
    $('#authShell').hidden = true;
    $('#app').hidden = false;
    updateUserIdentity();
  }

  function currentUser() {
    var raw = localStorage.getItem(AUTH_SESSION_KEY) || sessionStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function updateUserIdentity() {
    var user = currentUser();
    var name = user && user.name ? user.name : '';
    $('#greetingName').textContent = name;
    $('#userName').textContent = name;
    $('#userAvatar').textContent = name.charAt(0).toUpperCase();
  }

  function handleLogin(event) {
    event.preventDefault();
    clearAuthNotices();
    var form = event.target;
    var email = form.email.value.trim().toLowerCase();
    var password = form.password.value;
    if (!email || !email.includes('@')) {
      setAuthNotice('login', 'Informe um e-mail válido.', 'error');
      return;
    }
    if (!password) {
      setAuthNotice('login', 'Informe sua senha.', 'error');
      return;
    }
    var account = readAccounts().find(function (item) {
      return item.email === email && item.password === password;
    });
    if (!account) {
      setAuthNotice('login', 'E-mail ou senha incorretos. Confira seus dados ou crie uma conta.', 'error');
      return;
    }
    var sessionData = JSON.stringify({ email: account.email, name: account.name });
    if ($('#rememberMe').checked) {
      localStorage.setItem(AUTH_SESSION_KEY, sessionData);
    } else {
      sessionStorage.setItem(AUTH_SESSION_KEY, sessionData);
    }
    showApp();
    toast('Bem-vinda de volta, ' + account.name + '!', 'success');
  }

  function handleSignup(event) {
    event.preventDefault();
    clearAuthNotices();
    var form = event.target;
    var name = form.name.value.trim();
    var email = form.email.value.trim().toLowerCase();
    var password = form.password.value;
    var confirm = form.confirm.value;
    var valid = true;
    if (name.length < 2) { setAuthFieldError('signupNameError', 'Informe seu nome.'); valid = false; }
    if (!email || !email.includes('@')) { setAuthFieldError('signupEmailError', 'Informe um e-mail válido.'); valid = false; }
    if (password.length < 6) { setAuthFieldError('signupPasswordError', 'Use pelo menos 6 caracteres.'); valid = false; }
    if (password !== confirm) { setAuthFieldError('signupConfirmError', 'As senhas não coincidem.'); valid = false; }
    if (!valid) return;
    var accounts = readAccounts();
    if (accounts.some(function (item) { return item.email === email; })) {
      setAuthNotice('signup', 'Este e-mail já está cadastrado. Tente entrar.', 'error');
      return;
    }
    accounts.push({ name: name, email: email, password: password });
    localStorage.setItem(AUTH_ACCOUNTS_KEY, JSON.stringify(accounts));
    sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ name: name, email: email }));
    showApp();
    toast('Conta criada com sucesso. Bem-vinda, ' + name + '!', 'success');
  }

  function logout() {
    localStorage.removeItem(AUTH_SESSION_KEY);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    closeSidebar();
    showAuthView('login');
    $('#loginForm').reset();
    setAuthNotice('login', 'Você saiu da sua conta com segurança.', 'success');
  }

  function clearAuthNotices() {
    ['login', 'signup'].forEach(function (view) {
      var notice = $('#' + view + 'Notice');
      if (notice) { notice.textContent = ''; notice.className = 'auth-notice'; }
    });
    $all('.auth-form .form-error').forEach(function (item) { item.textContent = ''; });
  }

  function setAuthNotice(view, message, type) {
    var notice = $('#' + view + 'Notice');
    if (!notice) return;
    notice.textContent = message;
    notice.className = 'auth-notice auth-notice--' + type;
  }

  function setAuthFieldError(id, message) {
    var field = $('#' + id);
    if (field) field.textContent = message;
  }

  /* ========================================================
     MODALS
     ======================================================== */

  function setupModals() {
    var btnsOpen = $all('#btnNovaAtividadeInicio, #btnNovaAtividadeAtiv');
    btnsOpen.forEach(function (btn) {
      btn.addEventListener('click', openActivityModal);
    });
    $('#btnCloseModal').addEventListener('click', closeActivityModal);
    $('#btnCancelForm').addEventListener('click', closeActivityModal);
    $('#modalOverlay').addEventListener('click', function (e) {
      if (e.target === this) closeActivityModal();
    });
    $('#btnCloseDetail').addEventListener('click', closeDetailModal);
    $('#detailOverlay').addEventListener('click', function (e) {
      if (e.target === this) closeDetailModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeActivityModal();
        closeDetailModal();
      }
    });
  }

  function openActivityModal() {
    $('#activityForm').reset();
    clearFormErrors();
    $('#modalOverlay').classList.add('show');
    $('#modalOverlay').hidden = false;
    setTimeout(function () { $('#fTitulo').focus(); }, 100);
  }

  function closeActivityModal() {
    $('#modalOverlay').classList.remove('show');
    setTimeout(function () { $('#modalOverlay').hidden = true; }, 250);
  }

  function closeDetailModal() {
    $('#detailOverlay').classList.remove('show');
    setTimeout(function () { $('#detailOverlay').hidden = true; }, 250);
  }

  /* ========================================================
     FORMS
     ======================================================== */

  function setupForms() {
    var form = $('#activityForm');
    form.addEventListener('submit', handleActivitySubmit);

    // Real-time error clearing
    ['fTitulo', 'fMateria', 'fTipo', 'fPrazo', 'fPrioridade', 'fDificuldade', 'fTempo'].forEach(function (id) {
      var el = $('#' + id);
      el.addEventListener('input', function () { clearFieldError(el); });
      el.addEventListener('change', function () { clearFieldError(el); });
    });
  }

  function clearFormErrors() {
    $all('.form-error').forEach(function (el) { el.textContent = ''; });
    $all('.form-group input, .form-group select').forEach(function (el) {
      el.classList.remove('invalid');
    });
  }

  function clearFieldError(el) {
    el.classList.remove('invalid');
    var errSpan = el.parentElement.querySelector('.form-error');
    if (errSpan) errSpan.textContent = '';
  }

  function showFieldError(inputId, msg) {
    var el = $('#' + inputId);
    el.classList.add('invalid');
    var errSpan = el.parentElement.querySelector('.form-error');
    if (errSpan) errSpan.textContent = msg;
  }

  function validateForm(data) {
    clearFormErrors();
    var valid = true;

    if (!data.titulo || data.titulo.trim().length < 3) {
      showFieldError('fTitulo', 'Informe um título com pelo menos 3 caracteres.');
      valid = false;
    }
    if (!data.materia || data.materia.trim().length < 2) {
      showFieldError('fMateria', 'Informe a matéria.');
      valid = false;
    }
    if (!data.tipo) {
      showFieldError('fTipo', 'Selecione o tipo.');
      valid = false;
    }
    if (!data.prazo) {
      showFieldError('fPrazo', 'Informe a data ou prazo.');
      valid = false;
    }
    if (!data.prioridade) {
      showFieldError('fPrioridade', 'Selecione a prioridade.');
      valid = false;
    }
    if (!data.dificuldade) {
      showFieldError('fDificuldade', 'Selecione a dificuldade.');
      valid = false;
    }
    if (!data.tempoEstimado || data.tempoEstimado < 5 || data.tempoEstimado > 600) {
      showFieldError('fTempo', 'Informe um tempo entre 5 e 600 minutos.');
      valid = false;
    }
    return valid;
  }

  function handleActivitySubmit(e) {
    e.preventDefault();
    var form = e.target;
    var data = {
      titulo: form.titulo.value.trim(),
      materia: form.materia.value.trim(),
      tipo: form.tipo.value,
      prazo: form.prazo.value,
      prioridade: form.prioridade.value,
      dificuldade: form.dificuldade.value,
      tempoEstimado: parseInt(form.tempoEstimado.value, 10)
    };

    if (!validateForm(data)) {
      toast('Corrija os campos destacados para continuar.', 'error');
      return;
    }

    var activity = {
      id: uid(),
      titulo: data.titulo,
      materia: data.materia,
      tipo: data.tipo,
      prazo: data.prazo,
      prioridade: data.prioridade,
      dificuldade: data.dificuldade,
      tempoEstimado: data.tempoEstimado,
      status: 'pendente',
      tempoConcluido: 0
    };
    state.activities.push(activity);
    saveData();
    closeActivityModal();
    toast('Atividade adicionada ao seu planejamento.', 'success');
    renderScreen(state.currentScreen);
    renderInicio();
  }

  /* ========================================================
     FILTERS
     ======================================================== */

  function setupFilters() {
    $all('.filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $all('.filter-btn').forEach(function (b) {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        state.currentFilter = btn.dataset.filter;
        renderActivityList();
      });
    });
  }

  /* ========================================================
     CRONOGRAMA — AVAILABILITY & GENERATE
     ======================================================== */

  function setupCronograma() {
    $('#btnGerarCronograma').addEventListener('click', generateCronograma);
  }

  function renderAvailabilityGrid() {
    var grid = $('#availabilityGrid');
    grid.innerHTML = '';
    var ordered = [1, 2, 3, 4, 5, 6, 0]; // Seg→Sáb→Dom
    ordered.forEach(function (dayIdx) {
      var key = WEEK_DAYS[dayIdx];
      var val = state.availability[key] || 0;
      var div = document.createElement('div');
      div.className = 'av-day';
      div.innerHTML =
        '<label class="av-day__label" for="av-' + key + '">' + WEEK_LABELS[dayIdx] + '</label>' +
        '<div class="av-day__row">' +
          '<input type="number" id="av-' + key + '" min="0" max="600" step="15" value="' + val + '" data-day="' + key + '" aria-label="Minutos disponíveis para ' + WEEK_LABELS[dayIdx] + '">' +
          '<span class="av-day__unit">min</span>' +
          '<span class="av-day__preset" data-day="' + key + '" data-val="0" role="button" tabindex="0">Descanso</span>' +
        '</div>';
      grid.appendChild(div);
    });

    grid.querySelectorAll('input[type="number"]').forEach(function (input) {
      input.addEventListener('change', function () {
        var v = parseInt(input.value, 10);
        if (isNaN(v) || v < 0) v = 0;
        if (v > 600) v = 600;
        state.availability[input.dataset.day] = v;
        input.value = v;
        saveData();
      });
    });

    grid.querySelectorAll('.av-day__preset').forEach(function (preset) {
      preset.addEventListener('click', function () {
        var key = preset.dataset.day;
        state.availability[key] = 0;
        var inp = grid.querySelector('input[data-day="' + key + '"]');
        if (inp) inp.value = 0;
        saveData();
      });
      preset.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); preset.click(); }
      });
    });
  }

  /* ========================================================
     CRONOGRAMA GENERATION ALGORITHM
     ========================================================
     Strategy:
     1. Collect pending activities, sort by a composite priority score:
        - Provas get weight 3, trabalhos 2, tarefas 1
        - Alta prioridade +3, média +2, baixa +1
        - Dificuldade: fácil +1, média +2, difícil +3
        - Urgência: fewer days until deadline = higher score
     2. Build a 7-day plan starting from today.
     3. For each day, fill available minutes with sessions:
        - Max 60 min per session
        - Activities needing >60 min are split across sessions/days
        - Spread sessions across days to avoid overloading one day
        - Never exceed daily availability
     4. If not all activities fit, show the "tempo insuficiente" warning.
     ======================================================== */

  function computePriorityScore(a) {
    var typeWeight = a.tipo === 'prova' ? 3 : (a.tipo === 'trabalho' ? 2 : 1);
    var prioWeight = PRIO_WEIGHTS[a.prioridade] || 1;
    var diffWeight = DIFF_WEIGHTS[a.dificuldade] || 1;
    var daysLeft = daysUntil(a.prazo);
    // Urgency: fewer days = higher score. Deadline passed = max urgency.
    var urgency = daysLeft <= 0 ? 100 : Math.max(1, 30 - daysLeft);
    return typeWeight * 10 + prioWeight * 8 + diffWeight * 4 + urgency;
  }

  function generateCronograma() {
    var pending = state.activities.filter(function (a) { return a.status === 'pendente'; });

    if (pending.length === 0) {
      toast('Não há atividades pendentes para gerar um cronograma.', 'warning');
      state.sessions = [];
      saveData();
      renderCronograma();
      return;
    }

    // Sort by priority score (highest first), then by deadline (soonest first)
    pending.sort(function (a, b) {
      var scoreDiff = computePriorityScore(b) - computePriorityScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return a.prazo.localeCompare(b.prazo);
    });

    // Build 14-day plan starting today
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var days = [];
    var totalAvail = 0;
    for (var i = 0; i < 14; i++) {
      var d = new Date(today);
      d.setDate(d.getDate() + i);
      var dayIdx = d.getDay();
      var key = WEEK_DAYS[dayIdx];
      var avail = state.availability[key] || 0;
      totalAvail += avail;
      days.push({
        date: d.toISOString().split('T')[0],
        dayIdx: dayIdx,
        label: WEEK_LABELS[dayIdx],
        avail: avail,
        used: 0,
        sessions: []
      });
    }

    // Track remaining minutes per activity
    var remaining = pending.map(function (a) {
      return { activity: a, left: a.tempoEstimado - (a.tempoConcluido || 0) };
    });

    var totalNeeded = remaining.reduce(function (s, r) { return s + r.left; }, 0);

    // Fill days — round-robin: cycle through days, place one session per activity per pass
    var dayPtr = 0;
    var maxPasses = 200; // safety
    var passes = 0;

    while (passes < maxPasses) {
      var placedSomething = false;
      for (var pi = 0; pi < remaining.length; pi++) {
        var r = remaining[pi];
        if (r.left <= 0) continue;

        // Find next day with enough availability
        var attempts = 0;
        while (attempts < days.length) {
          var day = days[dayPtr];
          var dayRemain = day.avail - day.used;
          // Need at least 30 min, or the remaining study time if it's the last piece
          var minNeeded = Math.min(30, r.left);
          if (dayRemain >= minNeeded && r.left > 0) {
            // Session: max 60 min, limited by remaining study and day availability
            var slot = Math.min(60, r.left, dayRemain);
            // Round to nearest 5
            slot = Math.floor(slot / 5) * 5;
            if (slot < 1) slot = Math.min(5, r.left, dayRemain);
            if (slot > r.left) slot = r.left;
            if (slot > 60) slot = 60;
            if (slot > dayRemain) slot = dayRemain;
            if (slot >= minNeeded) {
              day.sessions.push({
                id: uid(),
                atividadeId: r.activity.id,
                materia: r.activity.materia,
                titulo: r.activity.titulo,
                tipo: r.activity.tipo,
                data: day.date,
                dayIdx: day.dayIdx,
                duracao: slot,
                status: 'pendente'
              });
              day.used += slot;
              r.left -= slot;
              placedSomething = true;
              dayPtr = (dayPtr + 1) % days.length;
              break;
            }
          }
          dayPtr = (dayPtr + 1) % days.length;
          attempts++;
        }
      }
      passes++;
      if (!placedSomething) break;
    }

    // Check if everything fit
    var allFit = remaining.every(function (r) { return r.left <= 0; });
    var leftover = remaining.reduce(function (s, r) { return s + Math.max(0, r.left); }, 0);

    // Flatten sessions into state, only for days that have sessions
    state.sessions = [];
    days.forEach(function (day) {
      day.sessions.forEach(function (s) {
        // Assign a start time
        s.horario = computeStartTime(day);
        state.sessions.push(s);
      });
    });

    saveData();

    // Show warning if time insufficient
    var warn = $('#cronogramaWarning');
    if (!allFit && leftover > 0) {
      warn.hidden = false;
      warn.innerHTML = '<span class="alert__icon" aria-hidden="true">⚠</span>' +
        '<span>Seu tempo disponível pode não ser suficiente para concluir todas as atividades antes dos prazos. Faltam ' +
        formatMinutes(leftover) + ' de estudo não alocados.</span>';
    } else if (totalAvail === 0) {
      warn.hidden = false;
      warn.innerHTML = '<span class="alert__icon" aria-hidden="true">⚠</span>' +
        '<span>Você ainda não informou sua disponibilidade. Defina os minutos para cada dia da semana acima.</span>';
    } else {
      warn.hidden = true;
    }

    toast('Cronograma gerado com sucesso!', 'success');
    renderCronogramaContent(days);
  }

  function computeStartTime(day) {
    // Assume study starts at 16:00 on weekdays, 9:00 on weekends
    var baseHour = (day.dayIdx === 0 || day.dayIdx === 6) ? 9 : 16;
    var usedMinutes = day.used - day.sessions[day.sessions.length - 1].duracao;
    var total = baseHour * 60 + usedMinutes;
    var h = Math.floor(total / 60);
    var m = total % 60;
    return pad(h) + ':' + pad(m);
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  /* ========================================================
     RENDER: INÍCIO
     ======================================================== */

  function renderInicio() {
    var pending    = state.activities.filter(function (a) { return a.status === 'pendente'; });
    var provas     = pending.filter(function (a) { return a.tipo === 'prova'; });
    var atrasadas  = state.activities.filter(isOverdue);
    var concluidas = state.activities.filter(function (a) { return a.status === 'concluida'; });

    // Summary cards
    var grid = $('#summaryGrid');
    grid.innerHTML =
      summaryCard('pendentes', pending.length, 'Tarefas pendentes', '📋') +
      summaryCard('provas', provas.length, 'Próximas provas', '🧪') +
      summaryCard('atrasadas', atrasadas.length, 'Atividades atrasadas', '⚠') +
      summaryCard('concluidas', concluidas.length, 'Concluídas', '✓');

    // Weekly progress
    renderWeeklyProgress();

    // Today's activities
    var todayActs = state.activities.filter(function (a) {
      return a.prazo === todayStr() && a.status === 'pendente';
    });
    var todayList = $('#todayList');
    if (todayActs.length === 0) {
      var upcoming = state.activities.filter(function (a) { return a.status === 'pendente'; });
      upcoming.sort(function (a, b) { return a.prazo.localeCompare(b.prazo); });
      if (upcoming.length > 0) {
        todayList.innerHTML = emptyStateSmall('Nada para hoje', 'Aproveite para adiantar as próximas atividades.');
        todayList.appendChild(activityCardElement(upcoming[0], true));
      } else {
        todayList.innerHTML = emptyState('Tudo em dia!', 'Nenhuma atividade pendente. Use o botão acima para adicionar uma nova.');
      }
    } else {
      todayList.innerHTML = '';
      todayActs.forEach(function (a) { todayList.appendChild(activityCardElement(a, true)); });
    }
    $('#todayCount').textContent = todayActs.length;

    // Upcoming
    var upcoming2 = state.activities.filter(function (a) {
      return a.status === 'pendente' && !isToday(a.prazo);
    });
    upcoming2.sort(function (a, b) { return a.prazo.localeCompare(b.prazo); });
    var upList = $('#upcomingList');
    if (upcoming2.length === 0) {
      upList.innerHTML = emptyState('Sem próximas atividades', 'Todas as suas atividades estão em dia.');
    } else {
      upList.innerHTML = '';
      upcoming2.slice(0, 5).forEach(function (a) { upList.appendChild(activityCardElement(a, true)); });
    }
  }

  function summaryCard(cls, value, label, icon) {
    return '<div class="summary-card summary-card--' + cls + '">' +
      '<div class="summary-card__icon" aria-hidden="true">' + icon + '</div>' +
      '<div class="summary-card__value">' + value + '</div>' +
      '<div class="summary-card__label">' + label + '</div>' +
      '</div>';
  }

  function renderWeeklyProgress() {
    var card = $('#weeklyProgressCard');
    var weekActs = state.activities.filter(function (a) { return isThisWeek(a.prazo) || isOverdue(a); });
    var weekDone = weekActs.filter(function (a) { return a.status === 'concluida'; }).length;
    var pct = weekActs.length > 0 ? Math.round((weekDone / weekActs.length) * 100) : 0;
    var barClass = pct >= 70 ? 'progress-bar__fill--success' : (pct >= 40 ? '' : 'progress-bar__fill--warning');
    card.innerHTML =
      '<div class="weekly-progress__header">' +
        '<h2>Progresso semanal</h2>' +
        '<span class="weekly-progress__pct">' + pct + '%</span>' +
      '</div>' +
      '<div class="progress-bar" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso semanal">' +
        '<div class="progress-bar__fill ' + barClass + '" style="width:' + pct + '%"></div>' +
      '</div>';
  }

  function emptyState(title, text) {
    return '<div class="empty-state">' +
      '<div class="empty-state__icon" aria-hidden="true">📝</div>' +
      '<div class="empty-state__title">' + title + '</div>' +
      '<div class="empty-state__text">' + text + '</div>' +
    '</div>';
  }

  function emptyStateSmall(title, text) {
    return '<div class="empty-state" style="padding:16px 8px 8px;">' +
      '<div class="empty-state__title" style="font-size:0.9rem;">' + title + '</div>' +
      '<div class="empty-state__text" style="font-size:0.82rem;">' + text + '</div>' +
    '</div>';
  }

  /* ========================================================
     RENDER: ATIVIDADES
     ======================================================== */

  function renderAtividades() {
    renderActivityList();
  }

  function getFilteredActivities() {
    var list = state.activities;
    var f = state.currentFilter;
    if (f === 'todas') return list.slice();
    if (f === 'tarefa' || f === 'prova' || f === 'trabalho') {
      return list.filter(function (a) { return a.tipo === f; });
    }
    if (f === 'pendente') return list.filter(function (a) { return a.status === 'pendente'; });
    if (f === 'concluida') return list.filter(function (a) { return a.status === 'concluida'; });
    return list.slice();
  }

  function renderActivityList() {
    var container = $('#activityList');
    var list = getFilteredActivities();
    list.sort(function (a, b) {
      if (a.status !== b.status) return a.status === 'pendente' ? -1 : 1;
      return a.prazo.localeCompare(b.prazo);
    });

    if (list.length === 0) {
      container.innerHTML = emptyState('Nenhuma atividade encontrada', 'Cadastre uma nova atividade ou altere o filtro para ver outras.');
      return;
    }

    container.innerHTML = '';
    list.forEach(function (a) {
      container.appendChild(activityCardElement(a, false));
    });
  }

  function activityCardElement(a, compact) {
    var overdue = isOverdue(a);
    var card = document.createElement('div');
    card.className = 'activity-card' +
      (a.status === 'concluida' ? ' activity-card--concluida' : '') +
      (overdue ? ' activity-card--atrasada' : '');

    var dueText = 'Prazo: ' + formatDate(a.prazo);
    var dueClass = '';
    if (overdue) { dueText = 'Atrasada — ' + formatDate(a.prazo); dueClass = ' due-atrasada'; }
    else if (isToday(a.prazo)) { dueText = 'Hoje — ' + formatDate(a.prazo); }

    var icon = TYPE_ICONS[a.tipo] || '📝';

    card.innerHTML =
      '<div class="activity-card__icon activity-card__icon--' + a.tipo + '" aria-hidden="true">' + icon + '</div>' +
      '<div class="activity-card__body">' +
        '<div class="activity-card__meta">' +
          '<span class="activity-card__materia">' + escapeHtml(a.materia) + '</span>' +
          '<span class="badge badge--' + a.tipo + '">' + TYPE_LABELS[a.tipo] + '</span>' +
          '<span class="badge badge--' + a.prioridade + '">Prioridade ' + PRIO_LABELS[a.prioridade] + '</span>' +
          (a.status === 'concluida' ? '<span class="badge badge--concluida">✓ Concluída</span>' : '') +
          (overdue ? '<span class="badge badge--atrasada">Atrasada</span>' : '') +
        '</div>' +
        '<div class="activity-card__title">' + escapeHtml(a.titulo) + '</div>' +
        '<div class="activity-card__info">' +
          '<span class="' + dueClass + '">📅 ' + dueText + '</span>' +
          '<span>⏱ ' + formatMinutes(a.tempoEstimado) + '</span>' +
          '<span>📊 ' + DIFF_LABELS[a.dificuldade] + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="activity-card__actions">' +
        (compact ? '' : '<button class="btn btn--ghost btn--sm" data-action="view" data-id="' + a.id + '" aria-label="Ver detalhes de ' + escapeHtml(a.titulo) + '">Ver</button>') +
        (compact ? '' : '<button class="btn btn--danger btn--sm" data-action="delete" data-id="' + a.id + '" aria-label="Excluir ' + escapeHtml(a.titulo) + '">Excluir</button>') +
        '<button class="activity-card__check" data-action="toggle" data-id="' + a.id + '" aria-label="' + (a.status === 'concluida' ? 'Reabrir atividade' : 'Marcar como concluída') + '" title="' + (a.status === 'concluida' ? 'Concluída' : 'Marcar como concluída') + '">' +
          (a.status === 'concluida' ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' : '') +
        '</button>' +
      '</div>';

    // Event listeners
    card.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.dataset.action;
        var id = btn.dataset.id;
        if (action === 'toggle') toggleActivity(id);
        else if (action === 'delete') deleteActivity(id);
        else if (action === 'view') showDetail(id);
      });
    });

    // Also allow clicking the card body in compact mode
    if (compact) {
      card.querySelector('.activity-card__body').addEventListener('click', function () {
        showDetail(a.id);
      });
      card.querySelector('.activity-card__body').style.cursor = 'pointer';
    }

    return card;
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  /* ========================================================
     ACTIVITY ACTIONS
     ======================================================== */

  function toggleActivity(id) {
    var a = findActivity(id);
    if (!a) return;
    if (a.status === 'pendente') {
      a.status = 'concluida';
      a.tempoConcluido = a.tempoEstimado;
      toast('Parabéns! Atividade concluída.', 'success');
      // Remove future pending sessions for this activity
      state.sessions = state.sessions.filter(function (s) {
        return !(s.atividadeId === id && s.status === 'pendente');
      });
    } else {
      a.status = 'pendente';
      a.tempoConcluido = 0;
      toast('Atividade reaberta.', 'info');
    }
    saveData();
    renderScreen(state.currentScreen);
    renderInicio();
  }

  function deleteActivity(id) {
    var a = findActivity(id);
    if (!a) return;
    if (!confirm('Tem certeza que deseja excluir "' + a.titulo + '"?')) return;
    state.activities = state.activities.filter(function (x) { return x.id !== id; });
    state.sessions = state.sessions.filter(function (s) { return s.atividadeId !== id; });
    saveData();
    toast('Atividade excluída.', 'info');
    renderScreen(state.currentScreen);
    renderInicio();
  }

  function findActivity(id) {
    return state.activities.find(function (a) { return a.id === id; });
  }

  function showDetail(id) {
    var a = findActivity(id);
    if (!a) return;
    var overdue = isOverdue(a);
    var body = $('#detailBody');
    body.innerHTML =
      detailRow('Matéria', escapeHtml(a.materia)) +
      detailRow('Tipo', '<span class="badge badge--' + a.tipo + '">' + TYPE_LABELS[a.tipo] + '</span>') +
      detailRow('Data / Prazo', formatDate(a.prazo) + (overdue ? ' <span class="badge badge--atrasada">Atrasada</span>' : '')) +
      detailRow('Prioridade', '<span class="badge badge--' + a.prioridade + '">' + PRIO_LABELS[a.prioridade] + '</span>') +
      detailRow('Dificuldade', DIFF_LABELS[a.dificuldade]) +
      detailRow('Tempo estimado', formatMinutes(a.tempoEstimado)) +
      detailRow('Tempo concluído', formatMinutes(a.tempoConcluido || 0)) +
      detailRow('Status', a.status === 'concluida' ?
        '<span class="badge badge--concluida">✓ Concluída</span>' :
        '<span class="badge badge--pendente">Pendente</span>') +
      '<div class="detail-actions">' +
        '<button class="btn btn--danger" id="btnDeleteDetail">Excluir</button>' +
        '<button class="btn btn--primary" id="btnToggleDetail">' +
          (a.status === 'concluida' ? 'Reabrir' : 'Marcar como concluída') +
        '</button>' +
      '</div>';

    $('#btnDeleteDetail').addEventListener('click', function () {
      closeDetailModal();
      deleteActivity(id);
    });
    $('#btnToggleDetail').addEventListener('click', function () {
      closeDetailModal();
      toggleActivity(id);
    });

    $('#detailOverlay').classList.add('show');
    $('#detailOverlay').hidden = false;
    setTimeout(function () { $('#btnCloseDetail').focus(); }, 100);
  }

  function detailRow(label, value) {
    return '<div class="detail-row"><span class="detail-row__label">' + label + '</span><span class="detail-row__value">' + value + '</span></div>';
  }

  /* ========================================================
     RENDER: CRONOGRAMA
     ======================================================== */

  function renderCronograma() {
    renderAvailabilityGrid();

    if (state.sessions.length === 0) {
      $('#cronogramaWarning').hidden = true;
      $('#cronogramaContent').innerHTML =
        emptyState('Cronograma vazio', 'Defina sua disponibilidade acima e clique em "Gerar meu cronograma" para criar seu plano de estudos.');
      return;
    }

    // Group sessions by date
    var grouped = {};
    state.sessions.forEach(function (s) {
      if (!grouped[s.data]) grouped[s.data] = [];
      grouped[s.data].push(s);
    });

    var sortedDates = Object.keys(grouped).sort();
    renderCronogramaFromGrouped(sortedDates, grouped);
  }

  function renderCronogramaContent(days) {
    // Called after generation — days is the array from the algorithm
    var hasSessions = days.some(function (d) { return d.sessions.length > 0; });
    if (!hasSessions) {
      $('#cronogramaContent').innerHTML = emptyState('Sem sessões geradas', 'Verifique sua disponibilidade e tente novamente.');
      return;
    }
    var html = '';
    days.forEach(function (day) {
      if (day.sessions.length === 0) return;
      html += cronDayHTML(day);
    });
    $('#cronogramaContent').innerHTML = html;
    bindSessionButtons();
  }

  function renderCronogramaFromGrouped(sortedDates, grouped) {
    var html = '';
    sortedDates.forEach(function (date) {
      var sessions = grouped[date];
      var dayIdx = sessions[0].dayIdx;
      var day = {
        date: date,
        dayIdx: dayIdx,
        label: WEEK_LABELS[dayIdx],
        avail: state.availability[WEEK_DAYS[dayIdx]] || 0,
        used: sessions.reduce(function (s, x) { return s + x.duracao; }, 0),
        sessions: sessions
      };
      html += cronDayHTML(day);
    });
    $('#cronogramaContent').innerHTML = html;
    bindSessionButtons();
  }

  function cronDayHTML(day) {
    var sessionsHTML = '';
    day.sessions.forEach(function (s) {
      var done = s.status === 'concluida';
      sessionsHTML +=
        '<div class="session' + (done ? ' session--done' : '') + '" data-session-id="' + s.id + '">' +
          '<div class="session__time">' + (s.horario || '--:--') + '</div>' +
          '<div class="session__body">' +
            '<span class="session__icon" aria-hidden="true">' + (TYPE_ICONS[s.tipo] || '📖') + '</span> ' +
            '<span class="session__materia">' + escapeHtml(s.materia) + '</span>' +
            '<div class="session__title">' + escapeHtml(s.titulo) + '</div>' +
            '<div class="session__meta">' + formatMinutes(s.duracao) + '</div>' +
          '</div>' +
          '<div class="session__action">' +
            (done
              ? '<span class="badge badge--concluida">✓ Concluída</span>'
              : '<button class="btn btn--primary btn--sm" data-session="' + s.id + '" aria-label="Concluir sessão de ' + escapeHtml(s.titulo) + '">Concluir sessão</button>') +
          '</div>' +
        '</div>';
    });
    return '<div class="cron-day">' +
      '<div class="cron-day__header">' +
        '<span class="cron-day__title">' + day.label + ' — ' + formatDate(day.date) + '</span>' +
        '<span class="cron-day__avail">' + formatMinutes(day.used) + ' de ' + formatMinutes(day.avail) + '</span>' +
      '</div>' +
      sessionsHTML +
    '</div>';
  }

  function bindSessionButtons() {
    $all('[data-session]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        completeSession(btn.dataset.session);
      });
    });
  }

  function completeSession(sessionId) {
    var s = state.sessions.find(function (x) { return x.id === sessionId; });
    if (!s || s.status === 'concluida') return;
    s.status = 'concluida';

    // Update activity's tempoConcluido
    var a = findActivity(s.atividadeId);
    if (a) {
      a.tempoConcluido = (a.tempoConcluido || 0) + s.duracao;
      // If all estimated time is done, mark activity as concluded
      if (a.tempoConcluido >= a.tempoEstimado && a.status === 'pendente') {
        a.status = 'concluida';
        // Remove remaining pending sessions for this activity
        state.sessions = state.sessions.filter(function (x) {
          return !(x.atividadeId === a.id && x.status === 'pendente');
        });
        toast('Sessão concluída! Atividade "' + a.titulo + '" finalizada.', 'success');
      } else {
        toast('Sessão concluída! Progresso atualizado.', 'success');
      }
    }

    saveData();
    renderCronograma();
    renderInicio();
  }

  /* ========================================================
     RENDER: PROGRESSO
     ======================================================== */

  function renderProgresso() {
    var total     = state.activities.length;
    var concluida = state.activities.filter(function (a) { return a.status === 'concluida'; }).length;
    var pendente  = total - concluida;
    var pct       = total > 0 ? Math.round((concluida / total) * 100) : 0;

    // Study time from completed sessions
    var completedSessions = state.sessions.filter(function (s) { return s.status === 'concluida'; });
    var studyMinutes = completedSessions.reduce(function (s, x) { return s + x.duracao; }, 0);

    // Weekly progress
    var weekActs = state.activities.filter(function (a) { return isThisWeek(a.prazo) || isOverdue(a); });
    var weekDone = weekActs.filter(function (a) { return a.status === 'concluida'; }).length;
    var weekPct  = weekActs.length > 0 ? Math.round((weekDone / weekActs.length) * 100) : 0;

    // Motivational message
    var msg;
    if (pct >= 75) {
      msg = 'Ótimo progresso! Você concluiu ' + pct + '% do seu planejamento.';
    } else if (pct >= 50) {
      msg = 'Bom ritmo! Você já concluiu ' + pct + '% das atividades. Continue assim!';
    } else if (pct >= 25) {
      msg = 'Você está no caminho certo. ' + pct + '% concluído — mantenha o foco!';
    } else if (total > 0) {
      msg = 'Vamos começar! Você tem ' + pendente + ' atividade' + (pendente !== 1 ? 's' : '') + ' pendente' + (pendente !== 1 ? 's' : '') + '.';
    } else {
      msg = 'Adicione atividades para acompanhar seu progresso.';
    }
    $('#progressoMensagem').textContent = msg;

    // Overview stats
    var overview = $('#progressOverview');
    overview.innerHTML =
      statCard(pct + '%', 'Atividades concluídas', 'primary') +
      statCard(concluida, 'Tarefas concluídas', 'success') +
      statCard(pendente, 'Tarefas pendentes', 'warning') +
      statCard(formatMinutes(studyMinutes), 'Tempo estudado', 'primary') +
      statCard(completedSessions.length, 'Sessões realizadas', 'success') +
      statCard(weekPct + '%', 'Progresso semanal', 'primary');

    // Progress by subject
    var subjects = {};
    state.activities.forEach(function (a) {
      if (!subjects[a.materia]) subjects[a.materia] = { total: 0, done: 0 };
      subjects[a.materia].total++;
      if (a.status === 'concluida') subjects[a.materia].done++;
    });
    var subjHTML = '';
    var subjKeys = Object.keys(subjects).sort();
    if (subjKeys.length === 0) {
      subjHTML = emptyState('Sem dados', 'Cadastre atividades para ver o progresso por matéria.');
    } else {
      subjKeys.forEach(function (m) {
        var s = subjects[m];
        var p = Math.round((s.done / s.total) * 100);
        var barClass = p >= 70 ? 'progress-bar__fill--success' : (p >= 40 ? '' : 'progress-bar__fill--warning');
        subjHTML +=
          '<div class="subject-progress">' +
            '<div class="subject-progress__header">' +
              '<span class="subject-progress__name">' + escapeHtml(m) + '</span>' +
              '<span class="subject-progress__pct">' + s.done + '/' + s.total + ' (' + p + '%)</span>' +
            '</div>' +
            '<div class="progress-bar" role="progressbar" aria-valuenow="' + p + '" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso em ' + escapeHtml(m) + '">' +
              '<div class="progress-bar__fill ' + barClass + '" style="width:' + p + '%"></div>' +
            '</div>' +
          '</div>';
      });
    }
    $('#progressBySubject').innerHTML = subjHTML;

    // Streak — days with at least one completed session
    var streakCard = $('#streakCard');
    var studyDays = {};
    completedSessions.forEach(function (s) {
      studyDays[s.data] = true;
    });

    // Current streak: count consecutive days up to today
    var streak = 0;
    var cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    // If nothing today, check yesterday to not break streak on off-days
    if (!studyDays[cursor.toISOString().split('T')[0]]) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (studyDays[cursor.toISOString().split('T')[0]]) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    // Last 7 days dots
    var dotsHTML = '';
    for (var i = 6; i >= 0; i--) {
      var d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      var key = d.toISOString().split('T')[0];
      var studied = !!studyDays[key];
      var dayLabel = WEEK_SHORT[d.getDay()];
      dotsHTML += '<div class="streak-dot ' + (studied ? 'streak-dot--studied' : 'streak-dot--not') + '" title="' + formatDate(key) + (studied ? ' — Estudou' : ' — Sem estudo') + '">' + dayLabel + '</div>';
    }

    streakCard.innerHTML =
      '<div class="streak-card__value">' + streak + ' <span>dia' + (streak !== 1 ? 's' : '') + '</span></div>' +
      '<div class="streak-card__label">Sequência de dias estudados consecutivos</div>' +
      '<div class="streak-card__days" aria-label="Últimos 7 dias">' + dotsHTML + '</div>';
  }

  function statCard(value, label, color) {
    return '<div class="progress-stat">' +
      '<div class="progress-stat__value progress-stat__value--' + (color || 'primary') + '">' + value + '</div>' +
      '<div class="progress-stat__label">' + label + '</div>' +
    '</div>';
  }

  /* ========================================================
     BOOT
     ======================================================== */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
