import { supabase } from './config.js';
import { showToast, escapeHtml } from './utils.js';

export async function renderAdminDashboard() {
  const [{ count: userCount }] = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  const [{ count: postCount }] = await supabase.from('posts').select('*', { count: 'exact', head: true });
  const [{ count: commentCount }] = await supabase.from('comments').select('*', { count: 'exact', head: true });
  const { data: inviteCodes } = await supabase.from('invite_codes').select('*').order('created_at', { ascending: false });

  const html = `
    <div class="space-y-8">
      <h2 class="text-2xl font-bold">Admin Dashboard</h2>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div class="bg-white p-4 rounded-xl shadow-sm text-center"><div class="text-3xl font-bold">${userCount}</div><div class="text-gray-500">Users</div></div>
        <div class="bg-white p-4 rounded-xl shadow-sm text-center"><div class="text-3xl font-bold">${postCount}</div><div class="text-gray-500">Posts</div></div>
        <div class="bg-white p-4 rounded-xl shadow-sm text-center"><div class="text-3xl font-bold">${commentCount}</div><div class="text-gray-500">Comments</div></div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4">
        <h3 class="text-xl font-bold mb-4">Invite Codes</h3>
        <div class="flex gap-2 mb-4"><input id="newInviteCode" placeholder="New invite code" class="flex-1 p-2 border rounded"><button onclick="createInviteCode()" class="btn-primary">Create</button></div>
        <div id="adminInviteList" class="space-y-1 text-sm">${inviteCodes.map(c => `<div class="flex justify-between"><code>${c.code}</code><span>${c.used ? 'Used' : 'Available'}</span><button onclick="deleteInviteCode('${c.id}')" class="text-red-600 text-xs">Delete</button></div>`).join('')}</div>
      </div>
    </div>
  `;
  document.getElementById('appContent').innerHTML = html;
}

export async function createInviteCode() {
  const code = document.getElementById('newInviteCode').value.trim();
  if (code) await supabase.from('invite_codes').insert({ code });
  renderAdminDashboard();
}

export async function deleteInviteCode(id) {
  await supabase.from('invite_codes').delete().eq('id', id);
  renderAdminDashboard();
}