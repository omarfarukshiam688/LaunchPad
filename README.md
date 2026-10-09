# Launchpad

Launchpad is a personal project launcher for developers. Save the
projects you have deployed, upload a thumbnail for each one, and
open every site with a single click.

Launchpad is open source and self-hosted. Every developer connects
their own copy to their own Supabase project, so there is no shared
database and no central server. Your data stays in your own
Supabase project.

Source code: <https://github.com/omarfarukshiam688/LaunchPad>

## Features

- One-click project opening — each card opens its URL in a new tab
- Project thumbnails stored in a private Supabase Storage bucket
- Add, edit, and delete projects
- Search by name, description, or platform
- Dark and light themes
- Sign up, sign in, and password reset powered by Supabase Auth

## Requirements

- [Node.js 22 or newer](https://nodejs.org) — runs the development
  server and the production build
- npm — installs the project dependencies (it comes with Node.js)
- [Git](https://git-scm.com) — clones the repository
- A free [Supabase](https://supabase.com) account — stores your
  projects, images, and user accounts

## Getting Started

### Step 1: Clone the repository

```bash
git clone https://github.com/omarfarukshiam688/LaunchPad.git
cd LaunchPad
```

Want your own copy on GitHub? Fork Launchpad first, then clone
your fork instead.

### Step 2: Create a Supabase project

1. Open <https://supabase.com/dashboard> and sign in.
2. Click **New project**.
3. Choose a project name and set a database password.
4. Wait for the project to finish setting up.

Always create your own project. Do not try to use the original
author's database — Launchpad has no shared backend.

### Step 3: Get your Supabase URL and publishable key

1. In the Supabase Dashboard, open your project.
2. Go to **Project Settings → General** and copy the **Project URL**.
   It looks like `https://your-project-ref.supabase.co`.
3. Go to **Project Settings → API** and copy the **Publishable key**.
   It starts with `sb_publishable_`.

The Project URL tells Launchpad where your Supabase project is.
The publishable key is designed for frontend use. You must use the
publishable key — never a secret key.

### Step 4: Connect Launchpad to Supabase

Create your local environment file:

```bash
cp .env.example .env.local
```

On Windows PowerShell, run this instead:

```powershell
Copy-Item .env.example .env.local
```

Open `.env.local` in a text editor and enter your own values:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

These are examples, not real credentials.

- Replace both values with the ones from your own Supabase project.
- Do not add quotation marks around the values.
- Never put an `sb_secret_` or `service_role` key in a `VITE_`
  variable. Vite would embed it in your site for everyone to see.
- Never commit `.env.local` to GitHub. It is already git-ignored.

### Step 5: Set up the database

The database schema lives in one migration file:

```
supabase/migrations/20261009000000_init.sql
```

This migration creates the `projects` table, Row Level Security
policies, database permissions, an `updated_at` trigger, and the
private `project-images` Storage bucket with its policies.

**Recommended method — Supabase CLI:**

1. Log in to Supabase:

   ```bash
   npx supabase login
   ```

2. Link this folder to your own Supabase project:

   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

   Find `YOUR_PROJECT_REF` in your Project URL
   (`https://YOUR_PROJECT_REF.supabase.co`) or in the dashboard
   address bar. Replace the placeholder with your own project
   reference.

3. Check the migration history:

   ```bash
   npx supabase migration list
   ```

   This shows which migrations exist locally and which have been
   applied to the linked project.

4. Preview pending migrations without applying them:

   ```bash
   npx supabase db push --dry-run
   ```

5. Review the preview, confirm you are linked to your own project,
   then apply the migration:

   ```bash
   npx supabase db push
   ```

   **Warning:** `db push` changes the linked project's database.
   Always check that the linked project reference is your own before
   pushing.

   Note: `npx supabase db reset` is only for a local Supabase
   development stack. Do not use it to set up your hosted project.

**Alternative method — SQL Editor:**

1. Open your own Supabase project in the dashboard.
2. Open **SQL Editor** and start a new query.
3. Open `supabase/migrations/20261009000000_init.sql` in the
   repository, copy all of its SQL, and paste it into the query.
4. Review the SQL, then run it once against your fresh project.

   **Warning:** do not run the migration twice — the second run
   will fail because the table and policies already exist. Also,
   running SQL manually is not recorded as an applied migration by
   the Supabase CLI, so `npx supabase migration list` will still
   show it as pending.

### Step 6: Configure Supabase Authentication

In the Supabase Dashboard, open **Authentication → Settings**
(exact menu names can change slightly as Supabase updates the
dashboard). For local development, set:

- **Site URL:** `http://localhost:5173`
- **Redirect URLs:** add `http://localhost:5173/login` and
  `http://localhost:5173/reset-password`

Launchpad sends confirmation and password-reset emails that link
back to these paths. After you deploy your instance, update the
Site URL and Redirect URLs to your live domain, for example
`https://your-domain`, `https://your-domain/login`, and
`https://your-domain/reset-password`.

**Email confirmation:** Launchpad works with email confirmation
turned on or off. If it is on, new users receive a confirmation
email and must confirm their address before signing in.

**Keeping your instance personal:** after your own account exists,
turn off **Enable sign ups** in the Authentication settings. Do not
rely on hiding the sign-up tab in the app — that is cosmetic; the
Supabase setting is the actual control.

### Step 7: Start Launchpad

```bash
npm install
npm run dev
```

Vite prints the local development URL, usually
`http://localhost:5173`. Open it in your browser.

If you change `.env.local` while the development server is running,
restart the server so the new values are picked up.

### Step 8: Use Launchpad

1. Sign up to create your account (confirm your email if that
   setting is on), then sign in.
2. Click **Add New Project**.
3. Upload a thumbnail (PNG, JPG, WebP, GIF, SVG, or AVIF, up to
   5 MB).
4. Enter the project name and URL, plus an optional description and
   hosting platform.
5. Save the project.
6. Click the project card to open the website in a new tab.
7. Use the menu on a card to edit or delete the project.

Project details are stored in Supabase Postgres and thumbnails are
stored in Supabase Storage. Launchpad does not discover your
projects automatically — you add each project's details manually.

## Deployment

Launchpad is a static single-page app. Build it with:

```bash
npm run build
```

The build type-checks the code and writes the production files to
the `dist/` folder. Your host must rewrite all routes to
`index.html` for client-side routing — the included `vercel.json`
and `netlify.toml` already do this.

**Vercel**

1. Connect your own GitHub repository on Vercel.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in
   **Project Settings → Environment Variables**.
3. Deploy.

**Netlify**

1. Deploy your own GitHub repository (or the `dist/` folder) on
   Netlify.
2. Add the same two variables in **Site configuration →
   Environment variables**.

After deploying, update the Supabase Authentication **Site URL**
and **Redirect URLs** to your live domain.

Launchpad has not been deployed for you — you deploy your own copy
to your own hosting account.

## Security

- Every deployment uses its own Supabase project.
- The publishable key is intended for frontend use. Secret keys and
  database passwords must never be placed in frontend environment
  variables.
- Database Row Level Security and Storage policies enforce that each
  user can only see and modify their own projects and images.
- The image bucket is private. Images are served through
  short-lived signed URLs, never public URLs.
- `.env.local` must not be committed to Git.
- Verify your own Supabase configuration before exposing your
  deployment publicly. No security test has been performed against
  your project by anyone else.

## Troubleshooting

- **"Configuration required" screen** — `VITE_SUPABASE_URL` or
  `VITE_SUPABASE_PUBLISHABLE_KEY` is missing or empty. Check
  `.env.local` and restart the dev server.
- **"contains a secret-format key" error** — a `sb_secret_` or
  `service_role` key was placed in a `VITE_` variable. Replace it
  with the publishable key from **Project Settings → API**.
- **"relation \"projects\" does not exist" or an empty dashboard** —
  the migration has not been applied. See Step 5.
- **Database permission errors** — you are not signed in, or the
  migration has not been applied to your project. Sign in first,
  then re-check Step 5.
- **Image upload fails** — check the file type (PNG, JPG, WebP,
  GIF, SVG, or AVIF) and the 5 MB size limit. If it still fails,
  the Storage policies from the migration are missing.
- **Images do not display** — signed URLs expire after one hour.
  Reload the dashboard to refresh them.
- **Confirmation or password-reset emails do not work** — check
  the Site URL and Redirect URLs in **Authentication → Settings**
  (Step 6). The paths `/login` and `/reset-password` must be
  allowed.

Never disable Row Level Security or make the image bucket public to
"fix" permission problems — that removes the security controls.

## Testing and contributing

```bash
npm run lint      # checks the code with oxlint
npx vitest run    # runs the unit tests (Supabase is mocked)
npx tsc -b        # type-checks the project
npm run build     # type-checks and creates the production build
```

The unit tests use a mocked Supabase client. They check application
logic only — they do not prove that your database or Storage
policies actually enforce isolation.

Contributions are welcome. Please run the commands above before
submitting changes, and never commit secrets or `.env.local`.

## Project structure

```
src/
  components/    UI components (Navbar, project cards, modals, dialogs)
  context/       Supabase Auth and theme contexts
  hooks/         useProjects data hook
  lib/           Supabase client, environment validation,
                 projects data layer, database types
  pages/         Dashboard, Login, ResetPassword
supabase/
  migrations/    20261009000000_init.sql
```

## License

Launchpad uses the MIT License. See the [LICENSE](LICENSE) file.
