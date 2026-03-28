import { supabase } from './config.js';
import { showToast, escapeHtml, toggleDropdown } from './utils.js';
import { openPostModal, openEditPostModal } from './modals.js';
import { renderComments, voteComment, addComment } from './comments.js';

let currentUser, currentProfile, renderFeedCallback;

export function initFeed(user, profile, renderCallback) {
  currentUser = user;
  currentProfile = profile;
  renderFeedCallback = renderCallback;
}

export async function renderFeed() {
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*, profiles!user_id(full_name, avatar_url, specialty)')
    .order('created_at', { ascending: false });
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
        <button onclick="window.openPostModal()" class="btn-primary"><i class="fa-regular fa-pen-to-square mr-2"></i> Create Post</button>
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

export async function votePost(postId, type) {
  const { error } = await supabase.from('votes').upsert({ post_id: postId, user_id: currentUser.id, vote_type: type }, { onConflict: 'post_id, user_id' });
  if (error) showToast(error.message, true);
  else renderFeedCallback();
}

export async function toggleLike(postId) {
  const { data: existing } = await supabase.from('post_likes').select('id').eq('post_id', postId).eq('user_id', currentUser.id).maybeSingle();
  if (existing) {
    await supabase.from('post_likes').delete().eq('id', existing.id);
  } else {
    await supabase.from('post_likes').insert({ post_id: postId, user_id: currentUser.id });
  }
  renderFeedCallback();
}

export async function toggleSave(postId) {
  const { data: existing } = await supabase.from('saved_posts').select('id').eq('user_id', currentUser.id).eq('post_id', postId).maybeSingle();
  if (existing) {
    await supabase.from('saved_posts').delete().eq('id', existing.id);
    showToast("Removed from saved");
  } else {
    await supabase.from('saved_posts').insert({ user_id: currentUser.id, post_id: postId });
    showToast("Saved post");
  }
  renderFeedCallback();
}

export async function toggleComments(postId) {
  const container = document.getElementById(`comments-${postId}`);
  if (container.style.display !== 'none') { container.style.display = 'none'; return; }
  const { data: comments, error } = await supabase
    .from('comments')
    .select('*, profiles!user_id(full_name)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
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

function filterFeed() {}