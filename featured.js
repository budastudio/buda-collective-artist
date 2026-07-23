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

    // Header independiente del Avatar
    const heroEl = document.getElementById('pHero');
    if (artist.hero_image_url) {
      heroEl.src = artist.hero_image_url;
      heroEl.style.display = 'block';
    } else {
      heroEl.src = 'obra-background.jpg';
    }

    // Avatar y Nombre
    document.getElementById('pAvatar').src = artist.avatar_url || 'logo-artista.png';
    document.getElementById('pName').textContent = artist.name;

    // Subtítulo con soporte para Founder / Featured
    let subtitleText = artist.featured ? 'Featured Artist · Buda Collective' : 'Artist · Buda Collective';
    if (artist.founder) {
      const founderNum = artist.founder_number ? ` #${artist.founder_number}` : '';
      subtitleText = `Founder${founderNum} · Buda Collective`;
    }
    document.getElementById('pSubtitle').textContent = subtitleText;

    // Bio
    document.getElementById('pBio').textContent = artist.bio || '';
    document.getElementById('pBio').style.display = artist.bio ? 'block' : 'none';

    // Contenedor de Botones Sociales / Links
    let buttonsContainer = document.getElementById('socialButtons');
    if (!buttonsContainer) {
      buttonsContainer = document.createElement('div');
      buttonsContainer.id = 'socialButtons';
      buttonsContainer.className = 'social-buttons';
      const bioEl = document.getElementById('pBio');
      bioEl.parentNode.insertBefore(buttonsContainer, bioEl.nextSibling);
    }
    buttonsContainer.innerHTML = '';

    // Botón X (Twitter)
    const xLinkEl = document.getElementById('pXLink');
    if (xLinkEl) {
      if (artist.x_link) {
        xLinkEl.href = artist.x_link;
        xLinkEl.style.display = 'inline-flex';
        buttonsContainer.appendChild(xLinkEl);
      } else {
        xLinkEl.style.display = 'none';
      }
    } else if (artist.x_link) {
      const newX = document.createElement('a');
      newX.id = 'pXLink';
      newX.className = 'x-link';
      newX.href = artist.x_link;
      newX.target = '_blank';
      newX.rel = 'noopener noreferrer';
      newX.textContent = 'View profile on X ↗';
      buttonsContainer.appendChild(newX);
    }

    // Botón YouTube
    if (artist.youtube_url) {
      const ytLink = document.createElement('a');
      ytLink.id = 'pYoutubeLink';
      ytLink.className = 'yt-link';
      ytLink.href = artist.youtube_url;
      ytLink.target = '_blank';
      ytLink.rel = 'noopener noreferrer';
      ytLink.textContent = 'Watch process video ↗';
      buttonsContainer.appendChild(ytLink);
    }

    // Obras (work_1, work_2 y/o array works)
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