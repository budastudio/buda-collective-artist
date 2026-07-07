/**
 * supabase.js — Buda Collective
 * Single access layer to Supabase. Requires that these are loaded BEFORE it:
 *   1) https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2  (UMD, defines window.supabase)
 *   2) config.js  (defines SUPABASE_URL and SUPABASE_ANON_KEY)
 *
 * Exposes a single global object: window.budaSupabase
 */
(function () {
  if (typeof window.supabase === 'undefined') {
    console.error('[Buda] Supabase SDK not found. Make sure the CDN <script> tag is loaded before supabase.js');
    return;
  }
  if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined' || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[Buda] Missing SUPABASE_URL / SUPABASE_ANON_KEY in config.js');
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const ARTISTS_TABLE = 'artists';
  const AVATAR_BUCKET = 'avatars';

  function slugify(text) {
    return String(text)
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'artist';
  }

  /**
   * Uploads the avatar to the public "avatars" bucket and returns its public URL.
   * @param {File} file
   * @param {string} artistName used only to generate a readable file name
   */
  async function uploadAvatar(file, artistName) {
    if (!file) return null;
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `${slugify(artistName)}-${Date.now()}.${ext}`;

    const { data, error } = await client
      .storage
      .from(AVATAR_BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: false });

    if (error) throw error;

    const { data: pub } = client.storage.from(AVATAR_BUCKET).getPublicUrl(data.path);
    return pub.publicUrl;
  }

  function generarId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  /**
   * Inserts a new artist with status = 'pending'.
   * The id is generated on the client (instead of asking for it back with
   * .select()) so we don't depend on a SELECT policy over 'pending' rows —
   * this way profiles under review stay unlisted publicly, while we can
   * still return the personal link (featured.html?id=...) immediately,
   * without waiting for approval.
   *
   * IMPORTANT: `featured` is ALWAYS inserted as false. It's a flag that
   * only the admin flips by hand in Supabase (Table Editor) after
   * confirming payment for the Featured Window — the client never
   * controls it directly (RLS enforces this too, see README-SUPABASE.md).
   * `wants_featured` just stores whether the artist checked the box, as a
   * reference for the admin (it doesn't unlock anything by itself).
   *
   * payload: { name, xLink, country, wallet, marketplace, website, avatarUrl, bio, wantsFeatured }
   */
  async function registerArtist(payload) {
    const id = generarId();
    const row = {
      id,
      name: payload.name,
      x_link: payload.xLink || null,
      country: payload.country || null,
      wallet: payload.wallet || null,
      marketplace: payload.marketplace || null,
      website: payload.website || null,
      avatar_url: payload.avatarUrl || null,
      bio: payload.bio || null,
      wants_featured: !!payload.wantsFeatured,
      featured: false,
      status: 'pending'
    };

    const { error } = await client.from(ARTISTS_TABLE).insert([row]);
    if (error) throw error;
    return row;
  }

  /**
   * Fetches artists already approved by the admin, to paint them on the
   * canvas. Only fetches the minimum needed: avatar, name, X link, and
   * the featured flag.
   */
  async function fetchApprovedArtists() {
    const { data, error } = await client
      .from(ARTISTS_TABLE)
      .select('id, name, x_link, avatar_url, featured, created_at')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Fetches a single approved artist by id, with all of their data
   * (including bio and works, used by featured.html).
   */
  async function fetchApprovedArtistById(id) {
    const { data, error } = await client
      .from(ARTISTS_TABLE)
      .select('id, name, x_link, avatar_url, bio, works, featured, created_at')
      .eq('status', 'approved')
      .eq('id', id)
      .single();

    if (error) throw error;
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
