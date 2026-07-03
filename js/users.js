/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   USER MANAGEMENT
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function openUserModal(){renderUserTable();g('userOverlay').classList.add('open');}
function closeUserModal(){g('userOverlay').classList.remove('open');}
// ── User list cache ──
let _userList = [];

async function renderUserTable(){
  g('uTableBody').innerHTML = '<tr><td colspan="4" style="text-align:center;padding:16px;color:var(--t3)">Loading…</td></tr>';
  try {
    const resp = await apiFetch({ action:'listUsers', token:getToken() });
    if(resp.error) { toast(resp.error,'err'); return; }
    _userList = resp.users || [];
    g('uTableBody').innerHTML = _userList.map((u,i) => `<tr>
      <td style="font-size:12px;color:var(--t1)">${escapeHTML(u.email)}</td>
      <td style="font-size:12px;color:var(--t2)">${u.name ? escapeHTML(u.name) : '—'}</td>
      <td><select class="uRoleSel" data-user-index="${i}">
        <option value="viewer"${u.role==='viewer'?' selected':''}>Viewer</option>
        <option value="admin"${u.role==='admin'?' selected':''}>Admin</option>
      </select></td>
      <td style="text-align:center">
        <span style="font-size:10px;font-weight:600;padding:2px 6px;border-radius:10px;background:${u.active!==false?'rgba(0,196,122,.12)':'rgba(255,77,109,.12)'};color:${u.active!==false?'var(--green)':'var(--coral)'}">${u.active!==false?'Active':'Off'}</span>
      </td>
      <td><button class="uDel" data-user-index="${i}" title="Remove user">✕</button></td>
    </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;padding:16px;color:var(--t3)">No users found</td></tr>';
  } catch(e) {
    toast('Cannot load users: ' + e.message,'err');
  }
}

async function changeRole(i, role){
  const user = _userList[i];
  if(!user) return;
  try {
    const resp = await apiFetch({ action:'updateRole', token:getToken(), email:user.email, role });
    if(resp.error) { toast(resp.error,'err'); return; }
    toast('Role updated for ' + user.email,'ok');
    renderUserTable();
  } catch(e) { toast('Error: '+e.message,'err'); }
}

async function deleteUser(i){
  const user = _userList[i];
  if(!user) return;
  if(user.email.toLowerCase() === CU.u.toLowerCase()){ toast('Cannot remove yourself','err'); return; }
  if(!confirm('Remove ' + user.email + '?')) return;
  try {
    const resp = await apiFetch({ action:'removeUser', token:getToken(), email:user.email });
    if(resp.error) { toast(resp.error,'err'); return; }
    toast('User removed','ok');
    renderUserTable();
  } catch(e) { toast('Error: '+e.message,'err'); }
}

async function addUser(){
  const email = v('newU').toLowerCase().trim();
  const name  = v('newName').trim();
  const pwd   = g('newP').value;
  const role  = g('newR').value;
  if(!email||!pwd){ toast('Email and password required','err'); return; }
  if(!/^[^@]+@[^@]+\.[^@]+$/.test(email)){ toast('Invalid email address','err'); return; }
  if(pwd.length<6){ toast('Password must be 6+ characters','err'); return; }
  const hashed = await hashPwd(pwd);
  try {
    const resp = await apiFetch({ action:'addUser', token:getToken(), email, name:name||email.split('@')[0], pwd:hashed, role });
    if(resp.error){ toast(resp.error,'err'); return; }
    g('newU').value=''; g('newName').value=''; g('newP').value='';
    toast('User added — they can now sign in','ok');
    renderUserTable();
  } catch(e) { toast('Error: '+e.message,'err'); }
}


