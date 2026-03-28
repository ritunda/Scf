export function showToast(msg, isError = false) {
  const toast = document.createElement('div');
  toast.className = `fixed bottom-20 md:bottom-6 right-6 z-[10000] flex items-center gap-3 px-6 py-4 rounded-full font-semibold shadow-lg text-white transition-all duration-300 ${isError ? 'bg-red-600' : 'bg-[#0a66c2]'}`;
  toast.innerHTML = `<i class="fa-solid ${isError ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i> ${msg}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

export function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m]));
}

export function toggleDropdown(btn) {
  const dropdown = btn.nextElementSibling;
  dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
  window.addEventListener('click', function close(e) {
    if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
      window.removeEventListener('click', close);
    }
  });
}