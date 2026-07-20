document.addEventListener('DOMContentLoaded', async () => {


  const loadingEl = document.getElementById('state-loading');
  const errorEl = document.getElementById('state-error');
  const profileEl = document.getElementById('artistProfile');


  function showError(){

    loadingEl.style.display='none';
    profileEl.style.display='none';
    errorEl.style.display='flex';

  }



  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');


  if(!id){

    showError();
    return;

  }



  if(typeof budaSupabase === 'undefined'){

    console.error('[Buda] Supabase missing');
    showError();
    return;

  }



  try{


    const artist =
      await budaSupabase.fetchApprovedArtistById(id);
    console.log("DORTHE DATA:", artist);



    if(!artist){

      showError();
      return;

    }



    /*
    ==========================
       PROFILE
    ==========================
    */


    document.getElementById('pHero').src =
      artist.hero_image_url ||
      artist.avatar_url ||
      'obra-background.jpg';



    document.getElementById('pAvatar').src =
      artist.avatar_url ||
      'logo-artista.png';



    document.getElementById('pName').textContent =
      artist.name || '';



    document.getElementById('pSubtitle').textContent =
      artist.founder
      ? `Founder #${artist.founder_number || ''} · Buda Collective`
      : 'Artist · Buda Collective';



    document.getElementById('pBio').textContent =
      artist.bio || '';



    document.getElementById('pBio').style.display =
      artist.bio ? 'block' : 'none';



    /*
    ==========================
       ARTIST STATEMENT
    ==========================
    */


    const statementEl =
      document.getElementById('artistStatement');


    if(statementEl && artist.statement){

      statementEl.textContent =
        artist.statement;

      statementEl.style.display='block';

    }




    /*
    ==========================
       X
    ==========================
    */


    const xLink =
      document.getElementById('pXLink');


    if(artist.x_link){

      xLink.href = artist.x_link;
      xLink.style.display='inline-block';

    }
    else{

      xLink.style.display='none';

    }





    /*
    ==========================
       FEATURED WORK
    ==========================
    */


    const works = [];



    if(artist.work_1_image){

      works.push({

        image: artist.work_1_image,
        link: artist.work_1_link,
        title:'Featured Artwork'

      });

    }



    if(artist.work_2_image){

      works.push({

        image: artist.work_2_image,
        link: artist.work_2_link,
        title:'Artwork 02'

      });

    }




    /*
       JSONB works future support
    */


    if(Array.isArray(artist.works)){

      artist.works.forEach(w=>{

        works.push(w);

      });

    }





    const grid =
      document.getElementById('worksGrid');



    if(works.length){


      document.getElementById('worksHeading').style.display='block';



      grid.innerHTML =
      works.map((w,index)=>`

        <div class="work-item"
             data-index="${index}">


          <img
          src="${w.image || w.image_url || ''}"
          alt="${w.title || ''}">


          <p class="work-title">
          ${w.title || 'Artwork'}
          </p>


        </div>


      `).join('');



    }





    /*
    ==========================
       YOUTUBE
    ==========================
    */


    const youtube =
      document.getElementById('artistYoutube');


    if(youtube && artist.youtube_url){

      youtube.href =
        artist.youtube_url;

      youtube.style.display='inline-block';

    }





    loadingEl.style.display='none';
    profileEl.style.display='block';



  }
  catch(e){

    console.error(
      '[Buda] Error loading featured artist:',
      e
    );

    showError();

  }



});
