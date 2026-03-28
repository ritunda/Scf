import { supabase } from './config.js';
import { showToast, toggleDropdown } from './utils.js';
import { verifyInviteCode, login, signup, logout } from './auth.js';
import { initFeed, renderFeed, votePost, toggleLike, toggleSave, toggleComments } from './feed.js';
import { voteComment, addComment } from './comments.js';
import { renderDirectory, follow } from './directory.js';
import { renderJobs, createJob } from './jobs.js';
import { renderMentorship, requestMentorship, updateMentorship } from './mentorship.js';
import { renderEvents, createEvent } from './events.js';
import { renderProfile } from './profile.js';
import { renderMessages, sendMessage, openMessageModal, closeMessageModal } from './messages.js';
import { renderAdminDashboard, createInviteCode, deleteInviteCode } from './admin.js';
import {
  openPostModal, closePostModal, handleImageSelect, publishPost,
  openEditPostModal, closeEditPostModal, handleEditImageSelect, saveEditedPost,
  openJobModal, closeJobModal,
  openEventModal, closeEventModal,
  openReportModal, closeReportModal, submitReport
} from './modals.js';

let currentUser = null;
let currentProfile = null;
let activeTab = 'feed';

// Expose necessary globals for inline onclick handlers
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
window.editPost = openEditPostModal;
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

  // Update active tab styling
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

export async function initApp(user) {
  currentUser = user;
  // Ensure profile exists – if not, create one automatically
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
    if (insertError) {
      showToast("Failed to create profile: " + insertError.message, true);
      return;
    }
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
  // Initialize modules that need currentUser/profile
  initFeed(currentUser, currentProfile, () => loadView(activeTab));
  loadView('feed');
  setupRealtime();
}

function setupRealtime() {
  supabase.channel('public')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
      if (activeTab === 'feed') loadView('feed');
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${currentUser.id}` }, () => {
      if (activeTab === 'messages') loadView('messages');
    })
    .subscribe();
}

// Event listeners for tabs
document.getElementById('navFeed').addEventListener('click', () => loadView('feed'));
document.getElementById('navDirectory').addEventListener('click', () => loadView('directory'));
document.getElementById('navJobs').addEventListener('click', () => loadView('jobs'));
document.getElementById('navMentorship').addEventListener('click', () => loadView('mentorship'));
document.getElementById('navEvents').addEventListener('click', () => loadView('events'));
document.getElementById('navMessages').addEventListener('click', () => loadView('messages'));
document.getElementById('navAdmin').addEventListener('click', () => loadView('admin'));
document.getElementById('profileBtn').addEventListener('click', () => loadView('profile'));
document.getElementById('mobileFeed').addEventListener('click', () => loadView('feed'));
document.getElementById('mobileDirectory').addEventListener('click', () => loadView('directory'));
document.getElementById('mobileJobs').addEventListener('click', () => loadView('jobs'));
document.getElementById('mobileMentorship').addEventListener('click', () => loadView('mentorship'));
document.getElementById('mobileEvents').addEventListener('click', () => loadView('events'));
document.getElementById('mobileMessages').addEventListener('click', () => loadView('messages'));
document.getElementById('mobileAdmin').addEventListener('click', () => loadView('admin'));

// Show/hide login/signup forms
document.getElementById('showLoginBtn').addEventListener('click', () => {
  document.getElementById('loginForm').classList.remove('hidden');
  document.getElementById('signupForm').classList.add('hidden');
  document.getElementById('showLoginBtn').classList.add('border-b-2', 'border-[#0a66c2]', 'font-semibold');
  document.getElementById('showSignupBtn').classList.remove('border-b-2', 'border-[#0a66c2]', 'font-semibold');
});
document.getElementById('showSignupBtn').addEventListener('click', () => {
  document.getElementById('signupForm').classList.remove('hidden');
  document.getElementById('loginForm').classList.add('hidden');
  document.getElementById('showSignupBtn').classList.add('border-b-2', 'border-[#0a66c2]', 'font-semibold');
  document.getElementById('showLoginBtn').classList.remove('border-b-2', 'border-[#0a66c2]', 'font-semibold');
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', logout);

// Initial auth check
async function init() {
  const session = await supabase.auth.getSession();
  if (session.data.session) initApp(session.data.session.user);
  else {
    document.getElementById('authContainer').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
  }
}
init();