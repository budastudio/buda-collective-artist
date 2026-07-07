import {
  makeId,
  uploadAvatar,
  insertArtist,
  buildProfile,
  sendEmail,
  baseUrl,
  escapeHtml,
  ADMIN_EMAIL,
} from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const {
      name,
      xLink,
      country,
      wallet,
      marketplace,
      website,
      bio,
      wantsFeatured,
      avatarBase64,
      avatarExt,
      avatarUrl,
    } = body;

    if (!name || !xLink) {
      return res.status(400).json({ error: 'Name and X link are required.' });
    }

    // Upload the avatar server-side (service role) so it never depends on
    // public storage policies. Fall back to a URL if one was already uploaded.
    let finalAvatarUrl = avatarUrl || null;
    if (avatarBase64) {
      finalAvatarUrl = await uploadAvatar(avatarBase64, avatarExt, name);
    }

    const id = makeId();
    const row = {
      id,
      name,
      x_link: xLink || null,
      country: country || null,
      wallet: wallet || null,
      marketplace: marketplace || null,
      website: website || null,
      avatar_url: finalAvatarUrl,
      bio: bio || null,
      works: [],
      wants_featured: !!wantsFeatured,
      featured: false,
      status: 'pending',
    };

    const inserted = await insertArtist(row);
    const artist = inserted || row;
    const profile = buildProfile(artist);

    // Email the admin the generated JSON profile + a link to approve.
    const origin = baseUrl(req);
    const adminUrl = `${origin}/admin.html`;
    const profileJson = JSON.stringify(profile, null, 2);
    const emailResult = await sendEmail({
      to: ADMIN_EMAIL,
      subject: `New Buda artist pending approval: ${name}`,
      html: `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;line-height:1.5">
          <h2 style="margin:0 0 4px">New artist submission</h2>
          <p style="margin:0 0 16px;color:#555">A new artist registered and is waiting for your approval.</p>
          <table style="border-collapse:collapse;font-size:14px">
            <tr><td style="padding:2px 12px 2px 0;color:#888">Name</td><td><strong>${escapeHtml(name)}</strong></td></tr>
            <tr><td style="padding:2px 12px 2px 0;color:#888">X</td><td>${escapeHtml(xLink)}</td></tr>
            <tr><td style="padding:2px 12px 2px 0;color:#888">Country</td><td>${escapeHtml(country || '-')}</td></tr>
            <tr><td style="padding:2px 12px 2px 0;color:#888">Wants featured</td><td>${wantsFeatured ? 'Yes' : 'No'}</td></tr>
          </table>
          ${finalAvatarUrl ? `<p style="margin:16px 0"><img src="${escapeHtml(finalAvatarUrl)}" alt="avatar" width="96" height="96" style="border-radius:50%;object-fit:cover"></p>` : ''}
          ${bio ? `<p style="margin:16px 0;max-width:520px">${escapeHtml(bio)}</p>` : ''}
          <p style="margin:20px 0">
            <a href="${adminUrl}" style="background:#111;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Review &amp; approve</a>
          </p>
          <p style="margin:16px 0 6px;color:#888;font-size:13px">Auto-generated profile JSON:</p>
          <pre style="background:#f4f4f5;border:1px solid #e4e4e7;border-radius:8px;padding:14px;font-size:12px;overflow:auto;max-width:560px">${escapeHtml(profileJson)}</pre>
        </div>
      `,
    });

    return res.status(200).json({
      ok: true,
      id: artist.id,
      profile,
      emailSent: emailResult && emailResult.ok === true,
    });
  } catch (err) {
    console.error('[Buda] /api/submit error:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Server error' });
  }
}
