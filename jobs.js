import { supabase } from './config.js';
import { showToast, escapeHtml } from './utils.js';
import { openJobModal } from './modals.js';

export async function renderJobs() {
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

export async function createJob() {
  const title = document.getElementById('jobTitle').value;
  if (!title) { showToast("Title required", true); return; }
  await supabase.from('jobs').insert({
    title,
    employer: document.getElementById('jobEmployer').value,
    location: document.getElementById('jobLocation').value,
    description: document.getElementById('jobDescription').value,
    posted_by: currentUser.id
  });
  closeJobModal();
  loadView('jobs');
  showToast("Job posted");
}

function applyJob(jobId) { showToast("Apply feature coming soon – contact poster directly"); }