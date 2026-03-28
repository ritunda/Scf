import { supabase } from './config.js';
import { showToast } from './utils.js';
import { toggleComments } from './feed.js';

export async function voteComment(commentId, voteType) {
  const { error } = await supabase.from('comment_votes').upsert({ comment_id: commentId, user_id: currentUser.id, vote_type: voteType }, { onConflict: 'comment_id, user_id' });
  if (error) showToast(error.message, true);
  else {
    const commentDiv = document.getElementById(`comment-${commentId}`);
    const postId = commentDiv?.dataset.postId;
    if (postId) toggleComments(postId);
  }
}

export async function addComment(postId) {
  const content = document.getElementById(`newComment-${postId}`).value;
  if (!content) return;
  await supabase.from('comments').insert({ post_id: postId, user_id: currentUser.id, username: currentProfile.full_name, content });
  toggleComments(postId);
}