/* ═══════════════════════════════════════════════
   LOGIN / LOGOUT
═══════════════════════════════════════════════ */
// ── Login button loading state ──
function setLoginLoading(loading) {
  const btn = document.querySelector('.loginBtn');
  if(!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? 'Signing in…' : 'Sign In →';
}

// Show / hide the password field (custom eye toggle).
function toggleLoginPw(){
  const i=g('lPass'), e=g('lEye');
  if(!i) return;
  const show = i.type==='password';
  i.type = show ? 'text' : 'password';
  if(e){ e.textContent = show ? '🙈' : '👁'; e.style.opacity = show ? '1' : '.5'; }
}

async function doLogin() {
  const emailRaw = v('lUser').toLowerCase().trim();
  const pwd      = g('lPass').value;
  const errEl    = g('loginErr');
  const lockEl   = g('lockoutMsg');

  if(!emailRaw || !pwd) {
    errEl.textContent = '⚠ Please enter email and password.';
    errEl.style.display = 'block';
    return;
  }

  // ── Local lockout check (rate limiting) ──
  const att = getAttempts(emailRaw);
  if(att.until > Date.now()) {
    const mins = Math.ceil((att.until - Date.now()) / 60000);
    errEl.textContent = `⛔ Too many attempts. Try again in ${mins} min.`;
    errEl.style.display = 'block';
    if(lockEl) lockEl.textContent = `Locked for ${mins} more minute(s)`;
    return;
  }

  setLoginLoading(true);
  errEl.style.display = 'none';

  try {
    // ── Hash password before sending ──
    const hashed = await hashPwd(pwd);

    // ── Verify with Apps Script (no key — login is server rate-limited) ──
    const resp = await apiFetch({
      action: 'login',
      email:  emailRaw,
      pwd:    hashed
    });

    if(resp.error) {
      // Record failed attempt locally
      const a = getAttempts(emailRaw);
      a.count = (a.count||0) + 1;
      if(a.count >= MAX_ATTEMPTS) {
        a.until = Date.now() + LOCKOUT_MINUTES * 60 * 1000;
        a.count = 0;
        errEl.textContent = `⛔ Account locked for ${LOCKOUT_MINUTES} minutes.`;
        if(lockEl) lockEl.textContent = `Too many failed attempts`;
      } else {
        const left = MAX_ATTEMPTS - a.count;
        errEl.textContent = `⚠ Invalid email or password. ${left} attempt(s) remaining.`;
      }
      setAttempts(emailRaw, a);
      errEl.style.display = 'block';
      g('lPass').value = '';
      g('lPass').focus();
      return;
    }

    // ── SUCCESS ──
    clearAttempts(emailRaw);
    const user  = resp.user;
    const token = resp.token;
    createSession(user, token);
    CU = { u: user.email, name: user.name, r: user.role };

    errEl.style.display = 'none';
    if(lockEl) lockEl.textContent = '';
    g('lPass').value = '';
    loginSuccess(user);

  } catch(err) {
    if(err.message === 'FILE_PROTOCOL') {
      errEl.textContent = '⚠ File opened locally — server not running. Follow the steps below.';
      errEl.style.display = 'block';
      showFileProtocolWarning();
    } else if(err.message === 'NETWORK_ERROR') {
      errEl.textContent = '⚠ Could not connect to server. Check the Apps Script deployment.';
      errEl.style.display = 'block';
    } else {
      errEl.textContent = '⚠ ' + err.message;
      errEl.style.display = 'block';
    }
  } finally {
    setLoginLoading(false);
  }
}

function showFileProtocolWarning() {
  // Show a helpful modal explaining the issue
  const existing = g('fileProtoWarning');
  if(existing) { existing.style.display='flex'; return; }
  const div = document.createElement('div');
  div.id = 'fileProtoWarning';
  div.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  div.innerHTML = `<div style="background:#0d1f35;border:1px solid #1e3a5f;border-radius:12px;padding:28px;max-width:480px;width:100%">
    <div style="font-size:20px;font-weight:700;color:#00e5c3;margin-bottom:6px">⚠️ Server Not Running</div>
    <div style="font-size:13px;color:#7a8fad;margin-bottom:18px">This file is opened via the <code style="color:#ffb800">file://</code> protocol — due to browser security it cannot connect to the login server.</div>
    <div style="font-size:13px;font-weight:600;color:#b0c4de;margin-bottom:10px">What to do:</div>
    <div style="background:#0a1628;border-radius:8px;padding:14px;font-size:12px;color:#7a8fad;line-height:1.8">
      <b style="color:#00e5c3">Option 1 — VS Code Live Server (Easiest):</b><br>
      1. Open the file in VS Code<br>
      2. Click "Go Live" at the bottom<br>
      3. It will open at <code style="color:#ffb800">http://127.0.0.1:5500</code><br><br>
      <b style="color:#00e5c3">Option 2 — Python:</b><br>
      In the terminal, go to the file's folder:<br>
      <code style="color:#ffb800">python -m http.server 8080</code><br>
      Then open: <code style="color:#ffb800">http://localhost:8080</code><br><br>
      <b style="color:#00e5c3">Option 3 — Netlify Drop:</b><br>
      Drag the file onto <a href="https://app.netlify.com/drop" target="_blank" style="color:#4d9fff">app.netlify.com/drop</a> — free hosting
    </div>
    <button onclick="this.parentElement.parentElement.style.display='none'"
      style="margin-top:16px;width:100%;padding:10px;background:#00e5c3;color:#020d1a;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:13px">
      Got it ✓
    </button>
  </div>`;
  document.body.appendChild(div);
}

function loginSuccess(user) {
  g('loginScreen').style.display = 'none';
  g('app').style.display = 'block';
  g('rolePill').textContent = user.role.toUpperCase();
  g('rolePill').className = 'rolePill ' + (user.role==='admin'?'rAdmin':'rViewer');
  g('unameEl').textContent = user.name || user.email.split('@')[0];
  // Targets tab + user management are admin-only — viewers never see them.
  const _isAdmin = user.role==='admin';
  if(_isAdmin) g('userMgmtBtn').style.display='flex';
  g('targetsTabBtn').style.display = _isAdmin ? 'inline-block' : 'none';
  const sess = getSession();
  if(sess) {
    const remaining = sess.expires - Date.now();
    setTimeout(() => {
      toast('Session expired. Please sign in again.','warn');
      setTimeout(doLogout, 3000);
    }, remaining);
  }
  setupAutoRefresh();
  loadData();
  loadRoasData();
}

// ── Check existing session on page load ──
function checkSession() {
  const session = getSession();
  if(!session) return false;
  // Restore from stored session — no server call needed (token in sessionStorage)
  CU = { u: session.email, name: session.name, r: session.role };
  loginSuccess({ email: session.email, name: session.name, role: session.role });
  return true;
}

g('lPass').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
g('lUser').addEventListener('keydown', e => { if(e.key==='Enter') g('lPass').focus(); });

function doLogout() {
  clearSession();
  CU = null;
  clearInterval(refreshTimer);
  g('loginScreen').style.display = 'flex';
  g('app').style.display = 'none';
  g('lUser').value = '';
  g('lPass').value = '';
  g('userMgmtBtn').style.display = 'none';
  const lockEl = g('lockoutMsg');
  if(lockEl) lockEl.textContent = '';
}
