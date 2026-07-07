# Buda Collective — Supabase Integration

This package replaces the project at the root of your repo
`budastudio/buda-collective-artist`. **It does not modify** the 25
Founding Artists (positions, physics, and animations are untouched —
verified with a diff).

## The approval flow is TWO independent steps

1. **`status`: `pending → approved`** (free) — you do this yourself in
   Table Editor. This only activates the basics: avatar, name, and X
   link as one more bubble on the canvas, just like the 25 Founding
   Artists.
2. **`featured`: `false → true`** (paid) — you do this yourself, by
   hand, **only after confirming payment** (outside this system:
   wallet, bank transfer, whatever you use). This unlocks the
   **Featured Window**: a bigger bubble, floating above everyone else,
   whose click opens `featured.html?id=...` (bio + works gallery)
   instead of going straight to X.

The "Unlock Upgrade" checkbox on the form **doesn't activate anything by
itself** — it only stores `wants_featured = true` as a note for you. The
real `featured` column is always inserted as `false`, and the RLS policy
below blocks the client from changing it.

## What's in this package

- `index.html` — the same showcase as always. **No sidebar panel.**
  Approved community artists are added directly into the same
  canvas/panel where the 25 live, with their own bubble, name on hover,
  and click:
  - If **not** featured: click opens their X link directly (same as
    the 25).
  - If **featured** (activated by you after payment): their bubble is
    bigger and floats above the rest; click opens
    `featured.html?id=...` — their individual window with bio and
    works — instead of going straight to X.
  - The only visible addition to `index.html` is a single small button,
    **"+ Join / Featured"**, that links to `join.html`.
- `featured.html` / `featured.css` / `featured.js` — individual page for
  a featured artist (avatar, bio, works gallery, X link).
- `supabase.js` — single access layer to Supabase (upload avatar,
  register artist, fetch approved artists, fetch one by id).
- `join.html` / `join.css` / `join.js` — registration form (avatar,
  name, X link, country, wallet, marketplace, website, bio, and the
  "Unlock Upgrade" intent checkbox). If checked, right after submitting
  the artist immediately sees their **personal link**
  (`featured.html?id=...`) to share right away — that link shows "not
  found" until you approve `status` AND turn on `featured`.
- `config.js` — already filled in with your URL and your `anon key`.

⚠️ Important: I don't have network access or credentials to connect
myself to your Supabase project (`ziautsdlspdojwwvwmfa`) or to push to
GitHub. The code is ready, with exact steps below so you can connect it
yourself in ~10 minutes.

---

## Step 1 — Fill in `config.js`

Already done for you in this package. If you ever need to redo it, go
to your dashboard: **Settings → API**.

```js
const SUPABASE_URL = 'https://ziautsdlspdojwwvwmfa.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY_HERE';
```

The `anon key` is public by design (it's used in the browser); the real
security comes from the RLS in Step 2.

## Step 2 — Create the `artists` table (SQL Editor)

```sql
create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  x_link text,
  country text,
  wallet text,
  marketplace text,
  website text,
  avatar_url text,
  bio text,
  works jsonb not null default '[]'::jsonb,
  wants_featured boolean not null default false,
  featured boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

alter table public.artists enable row level security;

-- Anyone can register, but it ALWAYS stays 'pending' and featured=false.
-- No one can self-approve or self-feature from the client; both flags
-- are changed by you, by hand, in Table Editor.
create policy "public can insert pending artists"
on public.artists for insert
to anon
with check (status = 'pending' and featured = false);

-- The showcase can only read artists that are already approved.
create policy "public can read approved artists"
on public.artists for select
to anon
using (status = 'approved');
```

> If you already created the `artists` table before (without
> `bio`/`works`/`wants_featured`), run this instead of repeating the
> `create table`:
> ```sql
> alter table public.artists add column if not exists bio text;
> alter table public.artists add column if not exists works jsonb not null default '[]'::jsonb;
> alter table public.artists add column if not exists wants_featured boolean not null default false;
> drop policy if exists "public can insert pending artists" on public.artists;
> create policy "public can insert pending artists"
> on public.artists for insert
> to anon
> with check (status = 'pending' and featured = false);
> ```

There is no `update`/`delete` policy for `anon`: to approve `status` or
turn on `featured` (after confirming payment), go to **Table Editor →
artists** and change those fields by hand. Only you, from the dashboard
(as the `postgres` role), can do this — RLS blocks it for the public.

## Step 3 — Create the avatars bucket (Storage)

1. **Storage → New bucket** → exact name: `avatars` → check **Public
   bucket**.
2. In **Storage → Policies** for the `avatars` bucket, add:

```sql
create policy "public can upload avatars"
on storage.objects for insert
to anon
with check (bucket_id = 'avatars');

create policy "public can read avatars"
on storage.objects for select
to anon
using (bucket_id = 'avatars');
```

## Step 4 — Test it

1. Upload these files to the root of your repo (replacing the existing
   ones).
2. Open `join.html`, register a test artist with an avatar. Check
   "Unlock Upgrade" if you want to test that flow, and write a short
   bio.
3. Go to **Table Editor → artists**: it should show up with
   `status = pending`, `featured = false`, and `wants_featured`
   reflecting the checkbox.
4. Manually change `status` to `approved` → it now shows up on
   `index.html` as a simple bubble (avatar + name + click to X).
5. Only once you confirm payment (outside this system), change
   `featured` to `true` → now its bubble is bigger, floats above the
   rest, and its click opens `featured.html?id=<their-id>` with their
   bio and (if you loaded them) their works.

### Loading "works" for a featured artist

For now these are loaded by hand from **Table Editor → artists →
works** (jsonb column), with this format:

```json
[
  { "title": "Work 1", "image": "https://url-to-image.jpg", "year": "2026" },
  { "title": "Work 2", "image": "https://url-to-image-2.jpg", "year": "2026" }
]
```

If the artist is featured but has no `works` loaded, `featured.html`
still shows their avatar, name, bio, and X link — it just skips the
gallery.

## How to push this to GitHub

I don't have access to your repo or your GitHub account from here, so
you'll need to push it yourself:

```bash
# inside your local clone of budastudio/buda-collective-artist
cp -r /path/to/unzipped-folder/* .
git add .
git commit -m "feat: Supabase integration + community artist registration"
git push origin main
```

## Scalability — suggested next steps (not included yet)

- A protected admin panel to approve/reject without going into Supabase
  Studio.
- Pagination in `fetchApprovedArtists()` once the community grows a lot.
- Client-side avatar compression/resize before upload (saves Storage
  space).
- Email notification to the artist once their profile is approved
  (Supabase Edge Function + trigger).
- Automated payment confirmation (Stripe Checkout or similar) to flip
  `featured` on its own.

Let me know if you'd like any of these and we'll build it.
