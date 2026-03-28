import { supabase } from './config.js';
import { showToast, escapeHtml } from './utils.js';
import { openMessageModal } from './modals.js';

export async function renderDirectory() {
  const { data: profiles, error } = await supabase.from('profiles').select('*').order('full_name');
  if (error) throw error;
  document.getElementById('appContent').innerHTML = `
    <h2 class="text-2xl font-bold mb-6">Alumni Directory</h2>
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      ${profiles.map(p => `
        <div class="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-xl">${p.full_name.charAt(0)}</div>
            <div><div class="font-semibold">${p.full_name}</div><div class="text-sm text-gray-500">${p.specialty || 'General'}</div></div>
          </div>
          <div class="mt-2 text-sm text-gray-600">Class of ${p.graduation_year || '?'}</div>
          <div class="text-sm text-gray-600">${p.workplace || ''}</div>
          <div class="mt-3 flex gap-2">
            <button onclick="follow('${p.user_id}')" class="btn-outline text-xs py-1 px-3">Follow</button>
            <button onclick="requestMentorship('${p.user_id}')" class="btn-primary text-xs py-1 px-3">Mentor Me</button>
            <button onclick="openMessageModal('${p.user_id}')" class="bg-gray-200 text-xs py-1 px-3 rounded-full">Message</button>
            <div class="dropdown relative">
              <i class="fa-solid fa-ellipsis-vertical cursor-pointer text-gray-400" onclick="toggleDropdown(this)"></i>
              <div class="dropdown-content"><a href="#" onclick="reportTargetFunc('profile', '${p.user_id}')">Report</a></div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

export async function follow(userId) {
  await supabase.from('follows').upsert({ follower_id: currentUser.id, followee_id: userId });
  showToast("Followed");
}