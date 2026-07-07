/**
 * Shared server-side helpers for the Buda Collective approval flow.
 * Runs only on Vercel serverless functions (never shipped to the browser),
 * so it is safe to use the Supabase SERVICE ROLE key here.
 *
 * Required environment variables (set them in Project Settings → Vars):
 *   SUPABASE_SERVICE_ROLE_KEY  → service_role secret of the SAME project as config.js
 *   ADMIN_EMAIL                → inbox that receives approval requests
 *   ADMIN_PASSWORD             → password that unlocks admin.html
 *   RESEND_API_KEY             → resend.com API key used to send the emails
 * Optional:
 *   SUPABASE_URL               → defaults to the project baked into config.js
 *   EMAIL_FROM                 → verified Resend sender (defaults to onboarding@resend.dev)
 *   PUBLIC_BASE_URL            → site origin used to build links in the email
 */

// Keep the server pointed at the SAME project the public site (config.js) uses,
// even if only the secret key is provided via env.
export const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://ziautsdlspdojwwvwmfa.supabase.co').replace(/\/$/, '');
export const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
export const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
export const EMAIL_FROM = process.env.EMAIL_FROM || 'Buda Collective <onboarding@resend.dev>';

const ARTISTS_TABLE = 'artists';
const AVATAR_BUCKET = 'avatars';

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'artist';
}

export function makeId() {
  if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function ensureConfigured() {
  if (!SERVICE_KEY) {
    const err = new Error('SUPABASE_SERVICE_ROLE_KEY is not set on the server.');
    err.statusCode = 500;
    throw err;
  }
}

/** Thin wrapper around the Supabase PostgREST endpoint using the service role key. */
async function rest(path, { method = 'GET', headers = {}, body } = {}) {
  ensureConfigured();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const err = new Error(`Supabase error (${res.status}): ${typeof data === 'string' ? data : JSON.stringify(data)}`);
    err.statusCode = 502;
    throw err;
  }
  return data;
}

/** Uploads a base64 avatar to the public "avatars" bucket and returns its public URL. */
export async function uploadAvatar(base64, ext, artistName) {
  ensureConfigured();
  if (!base64) return null;
  const clean = base64.includes(',') ? base64.split(',')[1] : base64;
  const bytes = Buffer.from(clean, 'base64');
  const safeExt = (ext || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const path = `${slugify(artistName)}-${Date.now()}.${safeExt}`;

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${AVATAR_BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': safeExt === 'jpg' || safeExt === 'jpeg' ? 'image/jpeg' : `image/${safeExt}`,
      'x-upsert': 'true',
    },
    body: bytes,
  });
  if (!res.ok) {
    const detail = await res.text();
    const err = new Error(`Avatar upload failed (${res.status}): ${detail}`);
    err.statusCode = 502;
    throw err;
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`;
}

/**
 * Builds a Leonardo-style profile object (same shape as leonardo.json) from a
 * DB row. This is the JSON that is emailed to the admin and that powers the
 * floating in-page window once the artist is approved as Featured.
 */
export function buildProfile(row) {
  const parts = [];
  if (row.country) parts.push(row.country);
  parts.push('Buda Collective Artist');
  const works = Array.isArray(row.works) ? row.works : [];
  const hero = works[0]?.image || row.avatar_url || 'logo-artista.png';
  return {
    id: row.id,
    name: row.name,
    subtitle: parts.join(' · '),
    avatar: row.avatar_url || 'logo-artista.png',
    hero,
    bio: row.bio || '',
    social: {
      x: row.x_link ? { link: row.x_link, click: row.x_link } : undefined,
      website: row.website || '',
    },
    works,
  };
}

export async function insertArtist(row) {
  const data = await rest(ARTISTS_TABLE, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: [row],
  });
  return Array.isArray(data) ? data[0] : data;
}

export async function listArtistsByStatus(status) {
  const cols = 'id,name,x_link,country,wallet,marketplace,website,avatar_url,bio,works,wants_featured,featured,status,created_at';
  return rest(`${ARTISTS_TABLE}?status=eq.${encodeURIComponent(status)}&select=${cols}&order=created_at.desc`);
}

export async function getArtist(id) {
  const rows = await rest(`${ARTISTS_TABLE}?id=eq.${encodeURIComponent(id)}&select=*`);
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function updateArtist(id, patch) {
  const data = await rest(`${ARTISTS_TABLE}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: patch,
  });
  return Array.isArray(data) ? data[0] : data;
}

/** Sends an email through Resend. Returns { skipped: true } when not configured. */
export async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY || !to) return { skipped: true };
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
  });
  if (!res.ok) {
    const detail = await res.text();
    console.error('[Buda] Resend error:', res.status, detail);
    return { skipped: false, ok: false, detail };
  }
  return { skipped: false, ok: true };
}

export function baseUrl(req) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

export function isAdmin(req) {
  const pass = req.headers['x-admin-password'] || (req.body && req.body.password);
  return ADMIN_PASSWORD && pass === ADMIN_PASSWORD;
}

export function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
