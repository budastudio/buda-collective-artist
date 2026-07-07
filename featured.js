document.addEventListener('DOMContentLoaded', async () => {
  const loadingEl = document.getElementById('state-loading');
  const errorEl = document.getElementById('state-error');
  const profileEl = document.getElementById('artistProfile');

  function showError() {
    loadingEl.style.display = 'none';
    profileEl.style.display = 'none';
    errorEl.style.display = 'flex';
  }

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    showError();
    return;
  }

  if (typeof budaSupabase === 'undefined') {
    console.error('[Buda] Supabase is not configured (check config.js).');
    showError();
    return;
  }

  try {
    const artist = await budaSupabase.fetchApprovedArtistById(id);
    if (!artist) {
      showError();
      return;
    }

    document.getElementById('pHero').src = artist.avatar_url || 'obra-background.jpg';
    document.getElementById('pAvatar').src = artist.avatar_url || 'logo-artista.png';
    document.getElementById('pName').textContent = artist.name;
    document.getElementById('pSubtitle').textContent = artist.featured ? 'Featured Artist · Buda Collective' : 'Artist · Buda Collective';
    document.getElementById('pBio').textContent = artist.bio || '';
    document.getElementById('pBio').style.display = artist.bio ? 'block' : 'none';

    const xLinkEl = document.getElementById('pXLink');
    if (artist.x_link) {
      xLinkEl.href = artist.x_link;
      xLinkEl.style.display = 'inline-block';
    } else {
      xLinkEl.style.display = 'none';
    }

    const works = Array.isArray(artist.works) ? artist.works : [];
    if (works.length > 0) {
      document.getElementById('worksHeading').style.display = 'block';
      const grid = document.getElementById('worksGrid');
      grid.innerHTML = works.map(w => `
        <div class="work-item">
          <img src="${w.image || w.image_url || ''}" alt="${w.title || ''}">
          <p class="work-title">${w.title || ''}</p>
          <p class="work-year">${w.year || ''}</p>
        </div>
      `).join('');
    }

    loadingEl.style.display = 'none';
    profileEl.style.display = 'block';
  } catch (e) {
    console.error('[Buda] Error loading the featured profile:', e);
    showError();
  }
});
