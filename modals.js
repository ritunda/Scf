let selectedImage = null;
let editSelectedImage = null;
let editPostId = null;
let reportTarget = null;

export function openPostModal() {
  document.getElementById('postModal').classList.remove('hidden');
}

export function closePostModal() {
  document.getElementById('postModal').classList.add('hidden');
  selectedImage = null;
  document.getElementById('imageNameDisplay').innerHTML = '';
  document.getElementById('postImage').value = '';
}

export function handleImageSelect(e) {
  selectedImage = e.target.files[0];
  document.getElementById('imageNameDisplay').innerHTML = selectedImage ? selectedImage.name : '';
}

export function openEditPostModal(postId, content, isAnonymous, specialty) {
  editPostId = postId;
  document.getElementById('editPostContent').value = content;
  document.getElementById('editAnonymousPost').checked = isAnonymous;
  document.getElementById('editPostSpecialty').value = specialty;
  document.getElementById('editPostModal').classList.remove('hidden');
}

export function closeEditPostModal() {
  document.getElementById('editPostModal').classList.add('hidden');
  editSelectedImage = null;
  document.getElementById('editImageNameDisplay').innerHTML = '';
}

export function handleEditImageSelect(e) {
  editSelectedImage = e.target.files[0];
  document.getElementById('editImageNameDisplay').innerHTML = editSelectedImage ? editSelectedImage.name : '';
}

export function openJobModal() {
  document.getElementById('jobModal').classList.remove('hidden');
}

export function closeJobModal() {
  document.getElementById('jobModal').classList.add('hidden');
}

export function openEventModal() {
  document.getElementById('eventModal').classList.remove('hidden');
}

export function closeEventModal() {
  document.getElementById('eventModal').classList.add('hidden');
}

export function openReportModal(type, id) {
  reportTarget = { type, id };
  document.getElementById('reportModal').classList.remove('hidden');
}

export function closeReportModal() {
  document.getElementById('reportModal').classList.add('hidden');
  document.getElementById('reportReason').value = '';
}

export function openMessageModal(recipientId) {
  currentRecipientId = recipientId;
  document.getElementById('messageModal').classList.remove('hidden');
}

export function closeMessageModal() {
  document.getElementById('messageModal').classList.add('hidden');
  document.getElementById('messageContent').value = '';
}