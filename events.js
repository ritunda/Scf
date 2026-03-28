import { supabase } from './config.js';
import { showToast, escapeHtml } from './utils.js';
import { openEventModal } from './modals.js';

export async function renderEvents() {
  const { data: events, error } = await supabase.from('events').select('*').order('start_time');
  if (error) throw error;
  document.getElementById('appContent').innerHTML = `
    <div class="flex justify-between items-center mb-6"><h2 class="text-2xl font-bold">Upcoming Events</h2>${currentProfile?.is_verified ? `<button onclick="openEventModal()" class="btn-primary">+ Create Event</button>` : ''}</div>
    <div class="grid md:grid-cols-2 gap-4">${events.map(ev => `<div class="bg-white rounded-xl border border-gray-200 p-4"><h3 class="text-xl font-bold">${ev.title}</h3><div class="text-[#0a66c2] text-sm">${new Date(ev.start_time).toLocaleString()}</div><p class="mt-2">${ev.description}</p>${ev.virtual_link ? `<a href="${ev.virtual_link}" target="_blank" class="text-[#0a66c2]">Join online</a>` : `<div>📍 ${ev.location}</div>`}</div>`).join('')}</div>
  `;
}

export async function createEvent() {
  const title = document.getElementById('eventTitle').value;
  if (!title) { showToast("Title required", true); return; }
  await supabase.from('events').insert({
    title,
    description: document.getElementById('eventDescription').value,
    start_time: document.getElementById('eventDate').value,
    location: document.getElementById('eventLocation').value,
    event_type: document.getElementById('eventType').value,
    organizer_id: currentUser.id
  });
  closeEventModal();
  loadView('events');
  showToast("Event created");
}