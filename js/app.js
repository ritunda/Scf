// ==================== CONFIG ====================
const SUPABASE_URL = "https://shsvitucpxmutxyyuqfg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_j2Xqe9mTX9RMO76wy1m3lg_pPlceFnA";
let supabase;
let currentUser = null;
let currentProfile = null;
let selectedImage = null;
let editSelectedImage = null;
let editPostId = null;
let activeTab = 'feed';
let validInviteCode = null;
let reportTarget = null;
let currentRecipientId = null;

// ==================== UTILS ====================
function showToast(msg, isError = false) {
  const toast = document.createElement('div');
  toast.className = `fixed bottom-20 md:bottom-6 right-6 z-[10000] flex items-center gap-3 px-6 py-4 rounded-full font-semibold shadow-lg text-white transition-all duration-300 ${isError ? 'bg-red-600' : 'bg-[#0a66c2]'}`;
  toast.innerHTML = `<i class="fa-solid ${isError ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i> ${msg}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m]));
}

function toggleDropdown(btn) {
  const dropdown = btn.nextElementSibling;
  dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
  window.addEventListener('click', function close(e) {
    if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
      window.removeEventListener('click', close);
    }
  });
}

// ==================== AUTH ====================
async function verifyInviteCode() {
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

async function login() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { document.getElementById('errorMsg').innerText = error.message; return; }
  document.getElementById('errorMsg').innerText = "";
  initApp(data.user);
}

async function signup() {
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) { document.getElementById('errorMsg').innerText = error.message; return; }
  await supabase.from('invite_codes').update({ used: true, used_by: data.user.id }).eq('code', validInviteCode);
  document.getElementById('errorMsg').innerText = "";
  initApp(data.user);
}

async function logout() {
  await supabase.auth.signOut();
  location.reload();
}

// ==================== FEED & COMMENTS ====================
async function renderFeed() {
  const { data: posts, error } = await supabase.from('posts').select('*, profiles!user_id(full_name, avatar_url, specialty)').order('created_at', { ascending: false });
  if (error) throw error;

  const enriched = await Promise.all(posts.map(async (post) => {
    const { count: likeCount } = await supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id);
    const { data: userLike } = await supabase.from('post_likes').select('id').eq('post_id', post.id).eq('user_id', currentUser.id).maybeSingle();
    const { data: saved } = await supabase.from('saved_posts').select('id').eq('user_id', currentUser.id).eq('post_id', post.id).maybeSingle();
    return { ...post, likeCount: likeCount || 0, userLiked: !!userLike, saved: !!saved };
  }));

  const html = `
    <div class="mb-6 flex justify-between items-center">
      <div class="flex gap-2">
        <button onclick="openPostModal()" class="btn-primary"><i class="fa-regular fa-pen-to-square mr-2"></i> Create Post</button>
        <button onclick="loadView('feedSaved')" class="btn-outline"><i class="fa-regular fa-bookmark mr-2"></i> Saved</button>
      </div>
      <select id="feedFilter" class="border border-gray-300 rounded-full px-4 py-2 text-sm">
        <option value="">All Specialties</option>
        <option>ICU</option><option>ER</option><option>Pediatrics</option><option>Oncology</option>
      </select>
    </div>
    <div id="feedList" class="space-y-4"></div>
  `;
  document.getElementById('appContent').innerHTML = html;
  const feedDiv = document.getElementById('feedList');
  feedDiv.innerHTML = enriched.map(post => `
    <div class="bg-white rounded-xl border border-gray-200 p-3 flex post-card transition-all">
      <div class="vote-column mr-3">
        <div class="vote-arrow" onclick="votePost('${post.id}', 'up')">▲</div>
        <div class="vote-count">${post.upvotes || 0}</div>
        <div class="vote-arrow" onclick="votePost('${post.id}', 'down')">▼</div>
      </div>
      <div class="flex-1">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <span>Posted by ${post.is_anonymous ? 'Anonymous' : (post.profiles?.full_name || 'Alumni')}</span>
            <span>•</span>
            <span>${post.profiles?.specialty || 'General'}</span>
            <span>•</span>
            <span>${new Date(post.created_at).toLocaleString()}</span>
            ${post.edited_at ? `<span>• edited</span>` : ''}
          </div>
          <div class="dropdown">
            <i class="fa-solid fa-ellipsis-vertical cursor-pointer text-gray-400 hover:text-gray-600" onclick="toggleDropdown(this)"></i>
            <div class="dropdown-content">
              ${post.user_id === currentUser.id ? `<a href="#" onclick="editPost('${post.id}', '${escapeHtml(post.content)}', ${post.is_anonymous}, '${post.specialty_tag || ''}')">Edit</a>` : ''}
              <a href="#" onclick="reportTargetFunc('post', '${post.id}')">Report</a>
            </div>
          </div>
        </div>
        <div class="text-gray-800 mb-2">${escapeHtml(post.content)}</div>
        ${post.image_url ? `<div class="mt-2 rounded-lg overflow-hidden"><img src="${post.image_url}" class="w-full max-h-96 object-cover"></div>` : ''}
        <div class="flex gap-4 mt-3 text-sm">
          <button onclick="toggleLike('${post.id}')" class="like-btn ${post.userLiked ? 'text-red-500' : 'text-gray-500'} hover:text-red-500">
            <i class="fa-regular fa-heart"></i> ${post.likeCount}
          </button>
          <button onclick="toggleSave('${post.id}')" class="save-btn ${post.saved ? 'text-yellow-500' : 'text-gray-500'} hover:text-yellow-500">
            <i class="fa-regular fa-bookmark"></i>
          </button>
          <button onclick="toggleComments('${post.id}')" class="text-gray-500 hover:text-[#0a66c2]"><i class="fa-regular fa-comment"></i> Comment</button>
        </div>
        <div id="comments-${post.id}" class="hidden mt-3 pl-4 border-l-2 border-gray-200 space-y-2"></div>
      </div>
    </div>
  `).join('');
  document.getElementById('feedFilter').addEventListener('change', () => filterFeed());
}

async function votePost(postId, type) {
  const { error } = await supabase.from('votes').upsert({ post_id: postId, user_id: currentUser.id, vote_type: type }, { onConflict: 'post_id, user_id' });
  if (error) showToast(error.message, true);
  else renderFeed();
}

async function toggleLike(postId) {
  const { data: existing } = await supabase.from('post_likes').select('id').eq('post_id', postId).eq('user_id', currentUser.id).maybeSingle();
  if (existing) {
    await supabase.from('post_likes').delete().eq('id', existing.id);
  } else {
    await supabase.from('post_likes').insert({ post_id: postId, user_id: currentUser.id });
  }
  renderFeed();
}

async function toggleSave(postId) {
  const { data: existing } = await supabase.from('saved_posts').select('id').eq('user_id', currentUser.id).eq('post_id', postId).maybeSingle();
  if (existing) {
    await supabase.from('saved_posts').delete().eq('id', existing.id);
    showToast("Removed from saved");
  } else {
    await supabase.from('saved_posts').insert({ user_id: currentUser.id, post_id: postId });
    showToast("Saved post");
  }
  renderFeed();
}

async function toggleComments(postId) {
  const container = document.getElementById(`comments-${postId}`);
  if (container.style.display !== 'none') { container.style.display = 'none'; return; }
  const { data: comments, error } = await supabase.from('comments').select('*, profiles!user_id(full_name)').eq('post_id', postId).order('created_at', { ascending: true });
  if (error) return;

  const enriched = await Promise.all(comments.map(async (c) => {
    const { data: vote } = await supabase.from('comment_votes').select('vote_type').eq('comment_id', c.id).eq('user_id', currentUser.id).maybeSingle();
    const { data: scoreData } = await supabase.from('comments').select('score').eq('id', c.id).single();
    return { ...c, userVote: vote?.vote_type, score: scoreData?.score || 0 };
  }));

  container.innerHTML = enriched.map(c => `
    <div id="comment-${c.id}" class="text-sm bg-gray-50 rounded p-2" data-post-id="${postId}">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <strong>${c.profiles?.full_name}</strong>
          <span class="text-xs text-gray-400">${new Date(c.created_at).toLocaleString()}</span>
        </div>
        <div class="dropdown">
          <i class="fa-solid fa-ellipsis-vertical cursor-pointer text-gray-400 text-xs" onclick="toggleDropdown(this)"></i>
          <div class="dropdown-content">
            <a href="#" onclick="reportTargetFunc('comment', '${c.id}')">Report</a>
          </div>
        </div>
      </div>
      <div class="mt-1">${c.content}</div>
      <div class="flex items-center gap-2 mt-1 text-xs">
        <button class="comment-vote ${c.userVote === 'up' ? 'text-green-600' : ''}" onclick="voteComment('${c.id}', 'up')">▲ ${c.score}</button>
        <button class="comment-vote ${c.userVote === 'down' ? 'text-red-600' : ''}" onclick="voteComment('${c.id}', 'down')">▼</button>
      </div>
    </div>
  `).join('') + `
    <textarea id="newComment-${postId}" class="w-full mt-2 p-2 border border-gray-300 rounded-lg text-sm" rows="2" placeholder="Add a comment..."></textarea>
    <button onclick="addComment('${postId}')" class="mt-1 bg-gray-200 px-3 py-1 rounded-full text-xs">Post</button>
  `;
  container.style.display = 'block';
}

async function voteComment(commentId, voteType) {
  const { error } = await supabase.from('comment_votes').upsert({ comment_id: commentId, user_id: currentUser.id, vote_type: voteType }, { onConflict: 'comment_id, user_id' });
  if (error) showToast(error.message, true);
  else {
    const commentDiv = document.getElementById(`comment-${commentId}`);
    const postId = commentDiv?.dataset.postId;
    if (postId) toggleComments(postId);
  }
}

async function addComment(postId) {
  const content = document.getElementById(`newComment-${postId}`).value;
  if (!content) return;
  await supabase.from('comments').insert({ post_id: postId, user_id: currentUser.id, username: currentProfile.full_name, content });
  toggleComments(postId);
}

function editPost(postId, content, isAnonymous, specialty) {
  editPostId = postId;
  document.getElementById('editPostContent').value = content;
  document.getElementById('editAnonymousPost').checked = isAnonymous;
  document.getElementById('editPostSpecialty').value = specialty;
  document.getElementById('editPostModal').classList.remove('hidden');
}

function handleEditImageSelect(e) { editSelectedImage = e.target.files[0]; document.getElementById('editImageNameDisplay').innerHTML = editSelectedImage ? editSelectedImage.name : ''; }
async function saveEditedPost() {
  const newContent = document.getElementById('editPostContent').value.trim();
  if (!newContent) return showToast("Content cannot be empty", true);
  let imageUrl = null;
  if (editSelectedImage) {
    const fileName = `${currentUser.id}_${Date.now()}.${editSelectedImage.name.split('.').pop()}`;
    const { error: upErr } = await supabase.storage.from('post-images').upload(fileName, editSelectedImage);
    if (!upErr) imageUrl = supabase.storage.from('post-images').getPublicUrl(fileName).data.publicUrl;
    else console.error(upErr);
  }
  const isAnonymous = document.getElementById('editAnonymousPost').checked;
  const specialtyTag = document.getElementById('editPostSpecialty').value;
  const { error } = await supabase.from('posts').update({
    content: newContent,
    image_url: imageUrl,
    is_anonymous: isAnonymous,
    specialty_tag: specialtyTag,
    edited_at: new Date()
  }).eq('id', editPostId);
  if (error) showToast(error.message, true);
  else { closeEditPostModal(); renderFeed(); showToast("Post updated"); }
}
function closeEditPostModal() { document.getElementById('editPostModal').classList.add('hidden'); editSelectedImage = null; document.getElementById('editImageNameDisplay').innerHTML = ''; }

// ==================== DIRECTORY ====================
async function renderDirectory() {
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

async function follow(userId) { await supabase.from('follows').upsert({ follower_id: currentUser.id, followee_id: userId }); showToast("Followed"); }

// ==================== JOBS ====================
async function renderJobs() {
  const { data: jobs, error } = await supabase.from('jobs').select('*, profiles!posted_by(full_name)').order('created_at', { ascending: false });
  if (error) throw error;
  document.getElementById('appContent').innerHTML = `
    <div class="flex justify-between items-center mb-6"><h2 class="text-2xl font-bold">Job Board</h2>${currentProfile?.is_verified ? `<button onclick="openJobModal()" class="btn-primary">+ Post a Job</button>` : ''}</div>
    <div class="space-y-4">${jobs.map(job => `
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <h3 class="text-xl font-bold">${job.title}</h3>
        <div class="text-[#0a66c2]">${job.employer}</div>
        <div class="text-sm text-gray-500">${job.location || 'Remote'}</div>
        <p class="mt-2 text-gray-700">${job.description}</p>
        <div class="mt-2 text-xs text-gray-400">Posted by ${job.profiles?.full_name}</div>
        <button onclick="applyJob('${job.id}')" class="mt-3 btn-outline text-sm">Apply</button>
      </div>
    `).join('')}</div>
  `;
}

async function createJob() {
  const title = document.getElementById('jobTitle').value;
  if (!title) { showToast("Title required", true); return; }
  await supabase.from('jobs').insert({
    title, employer: document.getElementById('jobEmployer').value,
    location: document.getElementById('jobLocation').value,
    description: document.getElementById('jobDescription').value,
    posted_by: currentUser.id
  });
  closeJobModal(); loadView('jobs'); showToast("Job posted");
}
function applyJob(jobId) { showToast("Apply feature coming soon – contact poster directly"); }

// ==================== MENTORSHIP ====================
async function renderMentorship() {
  const { data: connections, error } = await supabase.from('mentorship_connections').select('*, mentor:profiles!mentor_id(full_name), mentee:profiles!mentee_id(full_name)').or(`mentor_id.eq.${currentUser.id},mentee_id.eq.${currentUser.id}`);
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

async function requestMentorship(mentorId) { await supabase.from('mentorship_connections').insert({ mentor_id: mentorId, mentee_id: currentUser.id, status: 'pending' }); showToast("Request sent"); }
async function updateMentorship(connId, action) { await supabase.from('mentorship_connections').update({ status: action === 'accept' ? 'active' : 'rejected' }).eq('id', connId); renderMentorship(); }

// ==================== EVENTS ====================
async function renderEvents() {
  const { data: events, error } = await supabase.from('events').select('*').order('start_time');
  if (error) throw error;
  document.getElementById('appContent').innerHTML = `
    <div class="flex justify-between items-center mb-6"><h2 class="text-2xl font-bold">Upcoming Events</h2>${currentProfile?.is_verified ? `<button onclick="openEventModal()" class="btn-primary">+ Create Event</button>` : ''}</div>
    <div class="grid md:grid-cols-2 gap-4">${events.map(ev => `<div class="bg-white rounded-xl border border-gray-200 p-4"><h3 class="text-xl font-bold">${ev.title}</h3><div class="text-[#0a66c2] text-sm">${new Date(ev.start_time).toLocaleString()}</div><p class="mt-2">${ev.description}</p>${ev.virtual_link ? `<a href="${ev.virtual_link}" target="_blank" class="text-[#0a66c2]">Join online</a>` : `<div>📍 ${ev.location}</div>`}</div>`).join('')}</div>
  `;
}

async function createEvent() {
  const title = document.getElementById('eventTitle').value;
  if (!title) { showToast("Title required", true); return; }
  await supabase.from('events').insert({
    title, description: document.getElementById('eventDescription').value,
    start_time: document.getElementById('eventDate').value,
    location: document.getElementById('eventLocation').value,
    event_type: document.getElementById('eventType').value,
    organizer_id: currentUser.id
  });
  closeEventModal(); loadView('events'); showToast("Event created");
}

// ==================== PROFILE ====================
async function renderProfile() {
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

// ==================== MESSAGES ====================
function openMessageModal(recipientId) { currentRecipientId = recipientId; document.getElementById('messageModal').classList.remove('hidden'); }
function closeMessageModal() { document.getElementById('messageModal').classList.add('hidden'); document.getElementById('messageContent').value = ''; }
async function sendMessage() {
  const content = document.getElementById('messageContent').value.trim();
  if (!content) return showToast("Message cannot be empty", true);
  const { error } = await supabase.from('messages').insert({ sender_id: currentUser.id, recipient_id: currentRecipientId, content });
  if (error) showToast(error.message, true);
  else { closeMessageModal(); showToast("Message sent"); }
}
async function renderMessages() {
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*, sender:profiles!sender_id(full_name), recipient:profiles!recipient_id(full_name)')
    .or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const conversations = {};
  messages.forEach(m => {
    const otherId = m.sender_id === currentUser.id ? m.recipient_id : m.sender_id;
    const otherName = m.sender_id === currentUser.id ? m.recipient.full_name : m.sender.full_name;
    if (!conversations[otherId] || new Date(m.created_at) > new Date(conversations[otherId].created_at)) {
      conversations[otherId] = { ...m, otherName, otherId };
    }
  });

  const html = `
    <h2 class="text-2xl font-bold mb-6">Messages</h2>
    <div class="space-y-4">
      ${Object.values(conversations).map(conv => `
        <div class="bg-white rounded-xl border border-gray-200 p-4 flex justify-between items-center">
          <div><strong>${conv.otherName}</strong><div class="text-sm text-gray-500">${conv.content.substring(0, 50)}</div></div>
          <button onclick="openMessageModal('${conv.otherId}')" class="btn-primary text-sm">Reply</button>
        </div>
      `).join('')}
      ${Object.keys(conversations).length === 0 ? '<p class="text-gray-500">No messages yet. Start a conversation from the directory.</p>' : ''}
    </div>
  `;
  document.getElementById('appContent').innerHTML = html;
}

// ==================== ADMIN DASHBOARD ====================
async function renderAdminDashboard() {
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
async function createInviteCode() { const code = document.getElementById('newInviteCode').value.trim(); if (code) await supabase.from('invite_codes').insert({ code }); renderAdminDashboard(); }
async function deleteInviteCode(id) { await supabase.from('invite_codes').delete().eq('id', id); renderAdminDashboard(); }

// ==================== MODALS ====================
function openPostModal() { document.getElementById('postModal').classList.remove('hidden'); }
function closePostModal() { document.getElementById('postModal').classList.add('hidden'); selectedImage = null; document.getElementById('imageNameDisplay').innerHTML = ''; document.getElementById('postImage').value = ''; }
function handleImageSelect(e) { selectedImage = e.target.files[0]; document.getElementById('imageNameDisplay').innerHTML = selectedImage ? selectedImage.name : ''; }
async function publishPost() {
  const content = document.getElementById('postContent').value.trim();
  if (!content) { showToast("Write something", true); return; }
  if (!currentProfile) { showToast("Profile not loaded", true); return; }
  let imageUrl = null;
  if (selectedImage) {
    const fileName = `${currentUser.id}_${Date.now()}.${selectedImage.name.split('.').pop()}`;
    const { error: upErr } = await supabase.storage.from('post-images').upload(fileName, selectedImage);
    if (!upErr) imageUrl = supabase.storage.from('post-images').getPublicUrl(fileName).data.publicUrl;
    else console.error(upErr);
  }
  const isAnonymous = document.getElementById('anonymousPost').checked;
  const specialtyTag = document.getElementById('postSpecialty').value;
  const { error } = await supabase.from('posts').insert({
    user_id: currentUser.id,
    username: isAnonymous ? 'Anonymous' : currentProfile.full_name,
    content,
    image_url: imageUrl,
    is_anonymous: isAnonymous,
    specialty_tag: specialtyTag || null
  });
  if (error) showToast("Failed to post: " + error.message, true);
  else { closePostModal(); loadView('feed'); showToast("Post published!"); }
}

function openJobModal() { document.getElementById('jobModal').classList.remove('hidden'); }
function closeJobModal() { document.getElementById('jobModal').classList.add('hidden'); }
function openEventModal() { document.getElementById('eventModal').classList.remove('hidden'); }
function closeEventModal() { document.getElementById('eventModal').classList.add('hidden'); }

function openReportModal(type, id) { reportTarget = { type, id }; document.getElementById('reportModal').classList.remove('hidden'); }
function closeReportModal() { document.getElementById('reportModal').classList.add('hidden'); document.getElementById('reportReason').value = ''; }
async function submitReport() {
  const reason = document.getElementById('reportReason').value.trim();
  if (!reason) return showToast("Please provide a reason", true);
  const { error } = await supabase.from('reports').insert({
    reporter_id: currentUser.id,
    target_type: reportTarget.type,
    target_id: reportTarget.id,
    reason
  });
  if (error) showToast(error.message, true);
  else { closeReportModal(); showToast("Report submitted. Thank you."); }
}

// ==================== VIEW LOADER ====================
async function loadView(view) {
  activeTab = view;
  const container = document.getElementById('appContent');
  container.innerHTML = `<div class="flex justify-center py-20"><i class="fa-solid fa-spinner fa-spin text-3xl text-[#0a66c2]"></i></div>`;
  if (view === 'feed') await renderFeed();
  else if (view === 'directory') await renderDirectory();
  else if (view === 'jobs') await renderJobs();
  else if (view === 'mentorship') await renderMentorship();
  else if (view === 'events') await renderEvents();
  else if (view === 'profile') await renderProfile();
  else if (view === 'messages') await renderMessages();
  else if (view === 'admin') await renderAdminDashboard();

  document.querySelectorAll('.tab-btn, #mobileFeed, #mobileDirectory, #mobileJobs, #mobileMentorship, #mobileEvents, #mobileMessages, #mobileAdmin').forEach(btn => btn.classList.remove('tab-active', 'text-[#0a66c2]'));
  const tabMap = {
    feed: ['#navFeed', '#mobileFeed'],
    directory: ['#navDirectory', '#mobileDirectory'],
    jobs: ['#navJobs', '#mobileJobs'],
    mentorship: ['#navMentorship', '#mobileMentorship'],
    events: ['#navEvents', '#mobileEvents'],
    messages: ['#navMessages', '#mobileMessages'],
    admin: ['#navAdmin', '#mobileAdmin']
  };
  if (tabMap[view]) {
    tabMap[view].forEach(sel => {
      const el = document.querySelector(sel);
      if (el) el.classList.add('tab-active', 'text-[#0a66c2]');
    });
  }
}

// ==================== REALTIME ====================
function setupRealtime() {
  supabase.channel('public')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => { if (activeTab === 'feed') loadView('feed'); })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${currentUser.id}` }, () => { if (activeTab === 'messages') loadView('messages'); })
    .subscribe();
}

function filterFeed() {}

// ==================== INIT APP ====================
async function initApp(user) {
  currentUser = user;
  let { data: profile, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
  if (error) console.error(error);
  if (!profile) {
    const { error: insertError } = await supabase.from('profiles').insert({
      user_id: user.id,
      full_name: user.email ? user.email.split('@')[0] : 'Alumni',
      email: user.email || 'user@example.com',
      oath_affirmed: true,
      is_verified: false
    });
    if (insertError) { showToast("Failed to create profile: " + insertError.message, true); return; }
    const { data: newProfile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
    profile = newProfile;
  }
  currentProfile = profile;
  document.getElementById('userNameDisplay').innerText = profile.full_name.split(' ')[0];
  document.querySelector('#profileBtn div').innerText = profile.full_name.charAt(0);
  document.getElementById('authContainer').classList.add('hidden');
  document.getElementById('appContainer').classList.remove('hidden');
  if (profile.is_admin) {
    document.getElementById('navAdmin').classList.remove('hidden');
    document.getElementById('mobileAdmin').classList.remove('hidden');
  }
  loadView('feed');
  setupRealtime();
}

// ==================== INITIALIZATION ====================
async function init() {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const session = await supabase.auth.getSession();
  if (session.data.session) initApp(session.data.session.user);
  else {
    document.getElementById('authContainer').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
  }
}

// ==================== ATTACH GLOBALS ====================
window.verifyInviteCode = verifyInviteCode;
window.login = login;
window.signup = signup;
window.logout = logout;
window.openPostModal = openPostModal;
window.closePostModal = closePostModal;
window.handleImageSelect = handleImageSelect;
window.publishPost = publishPost;
window.votePost = votePost;
window.toggleLike = toggleLike;
window.toggleSave = toggleSave;
window.toggleComments = toggleComments;
window.voteComment = voteComment;
window.addComment = addComment;
window.editPost = editPost;
window.handleEditImageSelect = handleEditImageSelect;
window.saveEditedPost = saveEditedPost;
window.closeEditPostModal = closeEditPostModal;
window.openMessageModal = openMessageModal;
window.closeMessageModal = closeMessageModal;
window.sendMessage = sendMessage;
window.reportTargetFunc = openReportModal;
window.closeReportModal = closeReportModal;
window.submitReport = submitReport;
window.follow = follow;
window.requestMentorship = requestMentorship;
window.updateMentorship = updateMentorship;
window.openJobModal = openJobModal;
window.closeJobModal = closeJobModal;
window.createJob = createJob;
window.openEventModal = openEventModal;
window.closeEventModal = closeEventModal;
window.createEvent = createEvent;
window.toggleDropdown = toggleDropdown;
window.createInviteCode = createInviteCode;
window.deleteInviteCode = deleteInviteCode;
window.loadView = loadView;

// ==================== EVENT LISTENERS ====================
document.getElementById('showLoginBtn')?.addEventListener('click', () => {
  document.getElementById('loginForm').classList.remove('hidden');
  document.getElementById('signupForm').classList.add('hidden');
  document.getElementById('showLoginBtn').classList.add('border-b-2', 'border-[#0a66c2]', 'font-semibold');
  document.getElementById('showSignupBtn').classList.remove('border-b-2', 'border-[#0a66c2]', 'font-semibold');
});
document.getElementById('showSignupBtn')?.addEventListener('click', () => {
  document.getElementById('signupForm').classList.remove('hidden');
  document.getElementById('loginForm').classList.add('hidden');
  document.getElementById('showSignupBtn').classList.add('border-b-2', 'border-[#0a66c2]', 'font-semibold');
  document.getElementById('showLoginBtn').classList.remove('border-b-2', 'border-[#0a66c2]', 'font-semibold');
});
document.getElementById('logoutBtn')?.addEventListener('click', logout);
document.getElementById('navFeed')?.addEventListener('click', () => loadView('feed'));
document.getElementById('navDirectory')?.addEventListener('click', () => loadView('directory'));
document.getElementById('navJobs')?.addEventListener('click', () => loadView('jobs'));
document.getElementById('navMentorship')?.addEventListener('click', () => loadView('mentorship'));
document.getElementById('navEvents')?.addEventListener('click', () => loadView('events'));
document.getElementById('navMessages')?.addEventListener('click', () => loadView('messages'));
document.getElementById('navAdmin')?.addEventListener('click', () => loadView('admin'));
document.getElementById('profileBtn')?.addEventListener('click', () => loadView('profile'));
document.getElementById('mobileFeed')?.addEventListener('click', () => loadView('feed'));
document.getElementById('mobileDirectory')?.addEventListener('click', () => loadView('directory'));
document.getElementById('mobileJobs')?.addEventListener('click', () => loadView('jobs'));
document.getElementById('mobileMentorship')?.addEventListener('click', () => loadView('mentorship'));
document.getElementById('mobileEvents')?.addEventListener('click', () => loadView('events'));
document.getElementById('mobileMessages')?.addEventListener('click', () => loadView('messages'));
document.getElementById('mobileAdmin')?.addEventListener('click', () => loadView('admin'));

// Start
init();
