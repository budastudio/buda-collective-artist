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

    // Armamos la lista de obras leyendo las columnas de Supabase
    let worksList = [];

    if (artist.work_1_image) {
      worksList.push({
        image: artist.work_1_image,
        title: artist.work_1_title || 'Obra 1',
        link: artist.work_1_link || null
      });
    }

    if (artist.work_2_image) {
      worksList.push({
        image: artist.work_2_image,
        title: artist.work_2_title || 'Obra 2',
        link: artist.work_2_link || null
      });
    }

    if (Array.isArray(artist.works)) {
      worksList = worksList.concat(artist.works);
    }

    if (worksList.length > 0) {
      document.getElementById('worksHeading').style.display = 'block';
      const grid = document.getElementById('worksGrid');

      grid.innerHTML = worksList.map(w => {
        const imageUrl = w.image || w.image_url || '';
        const title = w.title || '';
        const linkUrl = w.link || w.url || null;

        return `
          <div class="work-item">
            ${linkUrl ? `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">` : ''}
              <img src="${imageUrl}" alt="${title}">
            ${linkUrl ? `</a>` : ''}
            
            ${title ? `<p class="work-title">${title}</p>` : ''}
            
            ${linkUrl ? `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="work-link">Ver obra ↗</a>` : ''}
          </div>
        `;
      }).join('');
    }

    loadingEl.style.display = 'none';
    profileEl.style.display = 'block';
  } catch (e) {
    console.error('[Buda] Error loading the featured profile:', e);
    showError();
  }
});