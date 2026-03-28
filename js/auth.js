import { supabase } from './config.js';
import { showToast } from './utils.js';
import { initApp } from './main.js';

let validInviteCode = null;

export async function verifyInviteCode() {
  const code = document.getElementById('inviteCode').value.trim();
  if (!code) { document.getElementById('errorMsg').innerText = "Enter an invite code"; return; }
  const { data, error } = await supabase.from('invite_codes').select('code, used').eq('code', code).maybeSingle();
  if (error || !data) { document.getElementById('errorMsg').innerText = "Invalid invite code"; return; }
  if (data.used) { document.getElementById('errorMsg').innerText = "This code has already been used"; return; }
  validInviteCode = code;
  document.getElementById('inviteStep').classList.add('hidden');
  document.getElementById('authStep').classList.remove('hidden');
  document.getElementById('errorMsg').innerText = "";
}

export async function login() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { document.getElementById('errorMsg').innerText = error.message; return; }
  document.getElementById('errorMsg').innerText = "";
  initApp(data.user);
}

export async function signup() {
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) { document.getElementById('errorMsg').innerText = error.message; return; }
  await supabase.from('invite_codes').update({ used: true, used_by: data.user.id }).eq('code', validInviteCode);
  document.getElementById('errorMsg').innerText = "";
  initApp(data.user);
}

export async function logout() {
  await supabase.auth.signOut();
  location.reload();
}