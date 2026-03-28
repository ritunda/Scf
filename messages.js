import { supabase } from './config.js';
import { showToast, escapeHtml } from './utils.js';

let currentRecipientId = null;

export function openMessageModal(recipientId) {
  currentRecipientId = recipientId;
  document.getElementById('messageModal').classList.remove('hidden');
}

export function closeMessageModal() {
  document.getElementById('messageModal').classList.add('hidden');
  document.getElementById('messageContent').value = '';
}

export async function sendMessage() {
  const content = document.getElementById('messageContent').value.trim();
  if (!content) return showToast("Message cannot be empty", true);
  const { error } = await supabase.from('messages').insert({ sender_id: currentUser.id, recipient_id: currentRecipientId, content });
  if (error) showToast(error.message, true);
  else { closeMessageModal(); showToast("Message sent"); }
}

export async function renderMessages() {
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