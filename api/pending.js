import { isAdmin, listArtistsByStatus, buildProfile, ADMIN_PASSWORD } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD is not set on the server.' });
  }
  if (!isAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const rows = await listArtistsByStatus('pending');
    const artists = (rows || []).map((r) => ({ ...r, profile: buildProfile(r) }));
    return res.status(200).json({ ok: true, artists });
  } catch (err) {
    console.error('[Buda] /api/pending error:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Server error' });
  }
}
