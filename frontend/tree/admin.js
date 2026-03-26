// GratiTree Admin — PoC: no Firebase; admin features disabled on static hosting

document.addEventListener('DOMContentLoaded', () => {
  const signedOutView = document.getElementById('signedOutView');
  const signedInView = document.getElementById('signedInView');
  const notAdminView = document.getElementById('notAdminView');
  const adminView = document.getElementById('adminView');

  if (signedOutView) signedOutView.classList.add('hidden');
  if (signedInView) signedInView.classList.remove('hidden');
  if (notAdminView) {
    notAdminView.classList.remove('hidden');
    notAdminView.innerHTML = `
      <p class="error">Admin tools are disabled in this demo deployment (no database).</p>
      <p class="status">Use the Firebase-hosted GratiTree project for full admin workflows.</p>
    `;
  }
  if (adminView) adminView.classList.add('hidden');
});
