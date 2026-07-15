/* ═══════════════════════════════════════════════
   UTILS — DEFINED FIRST
═══════════════════════════════════════════════ */
const g  = id => document.getElementById(id);
const v  = id => g(id) ? g(id).value.trim() : '';
const fm  = n => '$' + Math.abs(Math.round(n)).toLocaleString();
const fmK = n => { const a=Math.abs(n); return(n<0?'-':'')+(a>=1e6?'$'+(a/1e6).toFixed(2)+'M':a>=1e3?'$'+(a/1e3).toFixed(1)+'K':'$'+Math.round(a)); };
// Full number with commas — for KPI cards
const fmFull = n => { const neg=n<0; const a=Math.abs(Math.round(n)); return(neg?'-':'')+'$'+a.toLocaleString(); };
const fr2 = n => (+n).toFixed(2);
const gc  = () => isLight ? 'rgba(0,0,0,.07)' : 'rgba(255,255,255,.055)';
const tc  = () => isLight ? '#4d6080' : '#7a8fad';
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ═══════════════════════════════════════════════
   CONFIG
   ▸ Only the deployment URL lives in the browser now.
   ▸ The SECRET_KEY stays on the server (Apps Script) and is NEVER
     shipped to the client — auth happens via short-lived login tokens
     stored in sessionStorage.
═══════════════════════════════════════════════ */
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbxCjLA9EUPcWINARcKj2Iv7kBef9fCGHNC8nb-bBXT2_lmwEgrfXMelkbjLFhcTCcUa/exec';

/* ═══════════════════════════════════════════════
   SECURITY CONFIG
   ▸ Add/remove Gmail addresses in ALLOWED_EMAILS
   ▸ Each entry: { email, name, password, role }
   ▸ Passwords are stored as SHA-256 hashes
   ▸ To generate a hash: open browser console → hashPwd('yourpassword')
═══════════════════════════════════════════════ */

// ── SHA-256 hashing (Web Crypto API) ──
async function hashPwd(pwd) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pwd));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

// ── Session config ──
const SESSION_HOURS   = 8;
const MAX_ATTEMPTS    = 5;
const LOCKOUT_MINUTES = 15;

/* ═══════════════════════════════════════════════
   AUTH — Users stored in Google Sheet (DashUsers tab)
   All auth requests go to Apps Script
   Browser only stores: session token + user info
═══════════════════════════════════════════════ */

// ── Session helpers (token-based) ──
function createSession(user, token) {
  const session = {
    email:   user.email,
    name:    user.name,
    role:    user.role,
    token:   token,
    expires: Date.now() + SESSION_HOURS * 3600 * 1000
  };
  sessionStorage.setItem('ed_session', JSON.stringify(session));
  return session;
}
function getSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem('ed_session')||'null');
    if(!s || Date.now() > s.expires) { clearSession(); return null; }
    return s;
  } catch(e) { return null; }
}
function clearSession() { sessionStorage.removeItem('ed_session'); }
function getToken() { return getSession()?.token || ''; }

// ── Attempt tracking (local — just for rate limiting) ──
function getAttempts(email) {
  try { return JSON.parse(localStorage.getItem('ed_att_'+btoa(email))||'{"count":0,"until":0}'); }
  catch(e) { return {count:0,until:0}; }
}
function setAttempts(email, data) { localStorage.setItem('ed_att_'+btoa(email), JSON.stringify(data)); }
function clearAttempts(email) { localStorage.removeItem('ed_att_'+btoa(email)); }

// ── User management via Apps Script ──
async function apiFetch(params) {
  // file:// protocol cannot make cross-origin requests
  if(location.protocol === 'file:') {
    throw new Error('FILE_PROTOCOL');
  }
  const qs  = Object.entries(params).map(([k,v])=>k+'='+encodeURIComponent(v)).join('&');
  const url = SHEET_API_URL + '?' + qs;
  try {
    const res = await fetch(url, { redirect:'follow', mode:'cors' });
    const txt = await res.text();
    try { return JSON.parse(txt); }
    catch(e) { throw new Error('Invalid JSON from server'); }
  } catch(err) {
    if(err.message === 'FILE_PROTOCOL') throw err;
    throw new Error('NETWORK_ERROR');
  }
}


/* ═══════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════ */
let CU=null, isLight=false;
let rawData=[], filteredData=[], prevPeriodData=[];
let refreshTimer=null, lastRefresh=null;
let charts={};
let currentPreset='28d';
let dateFrom='', dateTo='';
let gaugeState={q:0,a:0};
// Initialize lastDate to yesterday so presets work before data loads
window._dataLastDate = (()=>{const d=new Date();d.setDate(d.getDate()-1);d.setHours(0,0,0,0);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;})();

// ── Data reference "today" ──
// Our pipeline is always a day behind: yesterday is the latest complete day of
// data. So every "current month / current day" HIGHLIGHT must use YESTERDAY,
// not the wall-clock date — otherwise on the 1st of a month the projection +
// monthly table jump to the new month before any data for it exists. This keeps
// the month projection, the monthly table's current-row, and "days left" all
// aligned with the data (1-day shift).
function dataNow(){ const d=new Date(); d.setDate(d.getDate()-1); d.setHours(0,0,0,0); return d; }


/* ═══════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════ */
function showLoader(on,txt='Loading…'){g('loader').classList.toggle('on',on);if(txt)g('loaderTxt').textContent=txt;}
let toastT=null;
function toast(msg,type='ok'){
  const el=g('toast');el.textContent=msg;
  el.className='toast '+({ok:'tOk',warn:'tWarn',err:'tErr'}[type]||'tOk')+' on';
  clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('on'),3500);
}
function fmtLbl(d){if(!d)return'';const dt=new Date(d+'T00:00:00');return isNaN(dt)?d:dt.toLocaleDateString('en-GB',{day:'2-digit',month:'short'});}
