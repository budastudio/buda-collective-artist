# How to see Buda Collective working — Quick tutorial

This package already ships with your Supabase API keys loaded into
`config.js`. You only need 2 things set up in the Supabase dashboard
(one time), and then you can test it.

---

## Part 1 — Set up Supabase (5-10 min, one time)

Go to your project: `https://supabase.com/dashboard/project/ziautsdlspdojwwvwmfa`

### 1.1 Create the `artists` table

Go to **SQL Editor** → **New query**, paste this, and hit **Run**:

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

create policy "public can insert pending artists"
on public.artists for insert
to anon
with check (status = 'pending' and featured = false);

create policy "public can read approved artists"
on public.artists for select
to anon
using (status = 'approved');
```

If it says the table already exists (because you created it in an
earlier test), run this instead:

```sql
alter table public.artists add column if not exists bio text;
alter table public.artists add column if not exists works jsonb not null default '[]'::jsonb;
alter table public.artists add column if not exists wants_featured boolean not null default false;
drop policy if exists "public can insert pending artists" on public.artists;
create policy "public can insert pending artists"
on public.artists for insert
to anon
with check (status = 'pending' and featured = false);
```

### 1.2 Create the avatars bucket

1. Go to **Storage** → **New bucket**.
2. Exact name: `avatars`. Check **Public bucket**. Create.
3. Open the `avatars` bucket → **Policies** tab → **New policy** (or run
   this in SQL Editor):

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

That's it — Supabase is ready. You won't need to touch it again until
you want to approve an artist (Part 3).

---

## Part 2 — Upload the project and see it live

### Option A — Test it on your computer first

1. Unzip this package into a folder.
2. Open a terminal in that folder and run:
   ```bash
   python3 -m http.server 8080
   ```
3. Open in your browser:
   - `http://localhost:8080/index.html` → the showcase with the 25
     artists and the **"+ Join / Featured"** button in the bottom
     right.
   - `http://localhost:8080/join.html` → the registration form.

### Option B — Upload it straight to your GitHub repo

```bash
# inside your local clone of budastudio/buda-collective-artist
cp -r /path/to/unzipped-folder/* .
git add .
git commit -m "feat: Supabase + artist registration (Join/Featured)"
git push origin main
```

If you use GitHub Pages / Vercel / Netlify on top of that repo, the
push already publishes it. If you don't have hosting yet, Option A lets
you see it working right now on your machine.

---

## Part 3 — Test the full flow (checklist)

1. Open `join.html`, fill out the form with test data, upload an
   avatar, and check (or not) **"Unlock Upgrade"**. Hit Submit.
2. You should see a green message: *"Done! Your profile is in review
   (pending)."* If you checked the box, you'll also get your personal
   link to copy.
3. Go to Supabase → **Table Editor → artists**. Your test artist should
   be there with `status = pending`.
4. Change `status` to `approved` (double-click the cell, type
   `approved`, hit Enter).
5. Open `index.html` again (or refresh): your test artist now appears
   floating alongside the 25, and clicking it takes you straight to
   their X.
6. If you also want to test the Featured Window: on that same row,
   change `featured` to `true`. Refresh `index.html`: that bubble is
   now bigger and floats above the rest, and clicking it opens
   `featured.html?id=...` with their bio instead of going straight to X.

That's the whole cycle: **registration → free approval → (optional)
paid Featured, activated by you by hand**.

---

## What this package does NOT include (and why)

- **Automated payment (Stripe/PayPal/etc.):** I don't have your
  credentials for those services or access to set them up. For now you
  confirm payment outside this system (bank transfer, wallet, whatever
  you use) and turn on `featured = true` by hand in Supabase. If you
  want to automate payments later, share the keys and we'll build it.
- **Admin panel with approve/reject buttons:** for now, approval is
  manual from Table Editor, as requested. If this becomes tedious once
  you have many submissions, I can build you a simple password-protected
  page to approve with one click.

## If something doesn't work

- If `join.html` throws an error on submit: check that you ran the full
  SQL from Part 1 (table + policies + bucket).
- If `index.html` doesn't show community artists: open the browser
  console (F12 → Console) and look for messages starting with `[Buda]`
  — they'll tell you what failed.
- Anything else, paste me the console error and we'll fix it.
