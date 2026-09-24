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

// ==================== SAFE INITIALIZATION ====================
async function init() {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    initApp(session.data.session.user);
  } else {
    document.getElementById('authContainer').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
  }
}

// Wait for Supabase CDN before starting
function waitForSupabase(maxAttempts = 100) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      if (window.supabase && typeof window.supabase.createClient === "function") {
        console.log("✅ Supabase ready");
        resolve();
      } else if (attempts++ >= maxAttempts) {
        reject(new Error("Supabase CDN failed to load"));
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
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

// ==================== START ====================
waitForSupabase()
  .then(() => init())
  .catch((err) => {
    console.error("❌", err.message);
    alert("Could not load Supabase. Please check your internet connection and refresh.");
  });
