import { supabase } from './config.js';
import { showToast, escapeHtml } from './utils.js';

export async function renderMentorship() {
  const { data: connections, error } = await supabase
    .from('mentorship_connections')
    .select('*, mentor:profiles!mentor_id(full_name), mentee:profiles!mentee_id(full_name)')
    .or(`mentor_id.eq.${currentUser.id},mentee_id.eq.${currentUser.id}`);
  const incoming = connections?.filter(c => c.mentor_id === currentUser.id && c.status === 'pending') || [];
  const active = connections?.filter(c => c.status === 'active') || [];
  document.getElementById('appContent').innerHTML = `
    <h2 class="text-2xl font-bold mb-4">Mentorship Hub</h2>
    <div class="grid md:grid-cols-2 gap-6 mb-6">
      <div class="bg-white rounded-xl border border-gray-200 p-4"><h3 class="font-semibold text-lg">Incoming Requests</h3>${incoming.length ? incoming.map(c => `<div class="flex justify-between py-2"><span>${c.mentee.full_name}</span><div><button onclick="updateMentorship('${c.id}','accept')" class="btn-primary text-xs py-1 px-3">Accept</button><button onclick="updateMentorship('${c.id}','reject')" class="btn-outline text-xs py-1 px-3 ml-2">Reject</button></div></div>`).join('') : '<p class="text-gray-500">None</p>'}</div>
      <div class="bg-white rounded-xl border border-gray-200 p-4"><h3 class="font-semibold text-lg">Active Mentorships</h3>${active.length ? active.map(c => `<div class="py-1">${c.mentor_id === currentUser.id ? `Mentee: ${c.mentee.full_name}` : `Mentor: ${c.mentor.full_name}`}</div>`).join('') : '<p class="text-gray-500">None</p>'}</div>
    </div>
    <div class="bg-white rounded-xl border border-gray-200 p-4"><h3 class="font-semibold text-lg mb-2">Find a Mentor</h3><input id="mentorSearch" placeholder="Search name or specialty" class="w-full p-2 border border-gray-300 rounded-lg"><div id="mentorResults" class="mt-2"></div></div>
  `;
  document.getElementById('mentorSearch').addEventListener('input', async (e) => {
    const term = e.target.value.toLowerCase();
    const { data: mentors } = await supabase.from('profiles').select('*').neq('user_id', currentUser.id).or(`full_name.ilike.%${term}%,specialty.ilike.%${term}%`);
    document.getElementById('mentorResults').innerHTML = mentors.map(m => `<div class="flex justify-between py-1"><span>${m.full_name} (${m.specialty})</span><button onclick="requestMentorship('${m.user_id}')" class="btn-primary text-xs py-1 px-3">Request</button></div>`).join('');
  });
}

export async function requestMentorship(mentorId) {
  await supabase.from('mentorship_connections').insert({ mentor_id: mentorId, mentee_id: currentUser.id, status: 'pending' });
  showToast("Request sent");
}

export async function updateMentorship(connId, action) {
  await supabase.from('mentorship_connections').update({ status: action === 'accept' ? 'active' : 'rejected' }).eq('id', connId);
  renderMentorship();
}