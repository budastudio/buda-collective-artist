document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('joinForm');
  const submitBtn = document.getElementById('submitBtn');
  const msgEl = document.getElementById('formMsg');
  const avatarInput = document.getElementById('avatar');
  const avatarPreview = document.getElementById('avatarPreview');
  const inviteBox = document.getElementById('inviteBox');
  const inviteLinkInput = document.getElementById('inviteLink');
  const copyInviteBtn = document.getElementById('copyInviteBtn');

  copyInviteBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(inviteLinkInput.value);
      copyInviteBtn.textContent = 'Copied!';
      setTimeout(() => { copyInviteBtn.textContent = 'Copy'; }, 1800);
    } catch (e) {
      inviteLinkInput.select();
      document.execCommand('copy');
    }
  });

  avatarInput.addEventListener('change', () => {
    const file = avatarInput.files && avatarInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => { avatarPreview.src = e.target.result; };
    reader.readAsDataURL(file);
  });

  function setMsg(text, type) {
    msgEl.textContent = text;
    msgEl.className = 'form-msg' + (type ? ' ' + type : '');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const xLink = document.getElementById('xLink').value.trim();
    const country = document.getElementById('country').value.trim();
    const wallet = document.getElementById('wallet').value.trim();
    const marketplace = document.getElementById('marketplace').value.trim();
    const website = document.getElementById('website').value.trim();
    const bio = document.getElementById('bio').value.trim();
    const wantsFeatured = document.getElementById('wantsFeatured').checked;
    const avatarFile = avatarInput.files && avatarInput.files[0];

    if (!name || !xLink || !avatarFile) {
      setMsg('Name, X link and avatar are required.', 'error');
      return;
    }

    if (typeof budaSupabase === 'undefined') {
      setMsg('Supabase is not configured. Check config.js.', 'error');
      return;
    }

    submitBtn.disabled = true;
    setMsg('Uploading avatar…', '');

    try {
      const avatarUrl = await budaSupabase.uploadAvatar(avatarFile, name);

      setMsg('Saving profile…', '');
      const artist = await budaSupabase.registerArtist({
        name,
        xLink,
        country,
        wallet,
        marketplace,
        website,
        avatarUrl,
        bio,
        wantsFeatured
      });

      setMsg('✅ Done! Your profile is in review (pending). We\'ll let you know once it\'s approved.', 'success');
      form.reset();
      avatarPreview.src = 'logo-artista.png';

      if (wantsFeatured && artist && artist.id) {
        const url = new URL(`featured.html?id=${encodeURIComponent(artist.id)}`, window.location.href).href;
        inviteLinkInput.value = url;
        inviteBox.style.display = 'block';
      } else {
        inviteBox.style.display = 'none';
      }
    } catch (err) {
      console.error("FULL ERROR:", err);

      const message =
        err?.message ||
        err?.error_description ||
        err?.details ||
        JSON.stringify(err, null, 2);

      alert(message);
      setMsg(message, "error");

    } finally {
      submitBtn.disabled = false;
    }
  });
});
