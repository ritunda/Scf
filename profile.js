import { supabase } from './config.js';
import { showToast, escapeHtml } from './utils.js';

export async function renderProfile() {
  const { data: endorsements } = await supabase.from('endorsements').select('*, endorsed_by:profiles!endorsed_by(full_name)').eq('user_id', currentUser.id);
  const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('followee_id', currentUser.id);
  const { count: following } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', currentUser.id);
  document.getElementById('appContent').innerHTML = `
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div class="profile-cover"></div>
      <div class="px-6 pb-6 -mt-12">
        <div class="w-24 h-24 bg-white rounded-full border-4 border-white shadow flex items-center justify-center text-4xl font-bold">${currentProfile.full_name.charAt(0)}</div>
        <h1 class="text-2xl font-bold mt-2">${currentProfile.full_name}</h1>
        <div class="text-[#0a66c2]">${currentProfile.specialty || 'General'}</div>
        <div class="text-gray-500">Class of ${currentProfile.graduation_year || '?'} • ${currentProfile.workplace || ''}</div>
        <div class="mt-2 flex gap-4 text-sm"><span>👥 Followers: ${followers}</span><span>👤 Following: ${following}</span></div>
        <div class="mt-4">${currentProfile.bio || 'No bio yet.'}</div>
        <div class="mt-4"><button onclick="editProfile()" class="btn-outline">Edit Profile</button></div>
      </div>
    </div>
    <div class="mt-6 bg-white rounded-xl border border-gray-200 p-4"><h3 class="font-semibold text-lg mb-2">Skills & Endorsements</h3><div class="flex flex-wrap gap-2">${endorsements?.map(e => `<span class="bg-gray-100 px-3 py-1 rounded-full text-sm">${e.skill} (by ${e.endorsed_by?.full_name})</span>`).join('') || 'None yet'}</div><div class="mt-4"><input id="newSkill" placeholder="Add a skill" class="p-2 border border-gray-300 rounded-lg"><button onclick="addEndorsement()" class="ml-2 btn-primary">Endorse</button></div></div>
  `;
}

function editProfile() { showToast("Profile editing coming soon"); }
function addEndorsement() { showToast("Endorsement feature coming soon"); }