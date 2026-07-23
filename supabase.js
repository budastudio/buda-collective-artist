/**
 * supabase.js — Buda Collective
 * Single access layer to Supabase.
 */
(function () {

  if (typeof window.supabase === 'undefined') {
    console.error('[Buda] Supabase SDK not found.');
    return;
  }

  if (
    typeof SUPABASE_URL === 'undefined' ||
    typeof SUPABASE_ANON_KEY === 'undefined' ||
    !SUPABASE_URL ||
    !SUPABASE_ANON_KEY
  ) {
    console.error('[Buda] Missing SUPABASE_URL / SUPABASE_ANON_KEY in config.js');
  }

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  const ARTISTS_TABLE = 'artists';
  const AVATAR_BUCKET = 'avatars';

  function slugify(text) {
    return String(text)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'artist';
  }

  async function uploadAvatar(file, artistName) {
    if (!file) return null;

    const ext =
      (file.name.split('.').pop() || 'png')
      .toLowerCase();

    const path =
      `${slugify(artistName)}-${Date.now()}.${ext}`;

    const { data, error } =
      await client
        .storage
        .from(AVATAR_BUCKET)
        .upload(
          path,
          file,
          {
            cacheControl:'3600',
            upsert:false
          }
        );

    if(error) throw error;

    const { data:pub } =
      client
      .storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(data.path);

    return pub.publicUrl;
  }

  function generarId(){
    if(window.crypto && crypto.randomUUID)
      return crypto.randomUUID();

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    .replace(/[xy]/g,c=>{
      const r = Math.random()*16|0;
      return (
        c==='x'
        ? r
        : (r&0x3|0x8)
      ).toString(16);
    });
  }

  async function registerArtist(payload){
    const id = generarId();

    const row = {
      id,
      name:payload.name,
      x_link:payload.xLink || null,
      country:payload.country || null,
      wallet:payload.wallet || null,
      marketplace:payload.marketplace || null,
      website:payload.website || null,
      avatar_url:payload.avatarUrl || null,
      bio:payload.bio || null,
      wants_featured:!!payload.wantsFeatured,
      featured:false,
      status:'pending'
    };

    const {error} =
      await client
      .from(ARTISTS_TABLE)
      .insert([row]);

    if(error) throw error;

    return row;
  }

  /*
  =====================================
  INDEX SHOWCASE
  =====================================
  */
  async function fetchApprovedArtists(){
    const {data,error} =
      await client
      .from(ARTISTS_TABLE)
      .select(
        'id, name, x_link, avatar_url, featured, created_at'
      )
      .eq('status','approved')
      .order(
        'created_at',
        {
          ascending:false
        }
      );

    if(error) throw error;

    return data || [];
  }

  /*
  =====================================
  FEATURED ARTIST PAGE
  Datos completos del artista
  =====================================
  */
  async function fetchApprovedArtistById(id){
    const {data,error} =
      await client
      .from(ARTISTS_TABLE)
      .select(`
        id,
        created_at,
        name,
        x_link,
        country,
        wallet,
        marketplace,
        website,
        avatar_url,
        bio,
        works,
        featured,
        founder,
        founder_number,
        founder_since,
        rarity,
        hero_image_url,
        statement,
        youtube_url,
        work_1_image,
        work_1_title,
        work_1_link,
        work_2_image,
        work_2_title,
        work_2_link
      `)
      .eq('status','approved')
      .eq('id',id)
      .single();

    if(error) throw error;

    return data;
  }

  window.budaSupabase = {
    client,
    uploadAvatar,
    registerArtist,
    fetchApprovedArtists,
    fetchApprovedArtistById
  };

})();
