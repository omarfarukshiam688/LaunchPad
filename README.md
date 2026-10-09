# Launchpad

A premium, open-source, self-hosted personal project launcher for developers.
Save the projects you've deployed to Vercel, Netlify, Render, GitHub Pages, or
any other host — with thumbnails — and open them all from one dashboard with a
single click.

Every instance is personal: each deployment connects to **its own** Supabase
project and its own database. There is no central backend and no shared data.

## Features

- **One-click project opening** — every card opens its configured `https://` URL
  in a new tab
- **Project thumbnails** — uploaded images live in a private, per-user Supabase
  Storage namespace and are served via signed URLs
- **Dark & light themes** — dark by default, with a persistent toggle that
  respects your system preference until you override it
- **Full CRUD** — edit project name, URL, description,
  platform, and thumbnail (with safe image replacement),
  and delete projects with a custom confirmation dialog
- **Search** — filter projects by name, description, or platform
- **Real authentication** — sign up, sign in, sign out, persistent sessions, and
  password reset, all powered by Supabase Auth
- **Database-level security** — Row Level Security policies guarantee users can
  only ever see and modify their own records

## Tech stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- React Router
- Supabase (`@supabase/supabase-js`) — Auth, Postgres (RLS), and Storage

## Prerequisites

- Node.js 22+ and npm
- Your own [Supabase](https://supabase.com) project (free tier works).
  Create one at [supabase.com/dashboard](https://supabase.com/dashboard)
  — every Launchpad instance uses its own project, so you always
  provision it under your own account
- Optional: [Supabase CLI](https://supabase.com/docs/guides/local-development)
  (`npx supabase`) for applying migrations from the terminal

## Quick start

```bash
git clone <your-fork-or-clone-url>
cd launchpad

cp .env.example .env.local
# edit .env.local and fill in your own Supabase values

npm install
npm run dev
```

### Tests

```bash
npm test          # run the Vitest suite (jsdom, mocked Supabase)
npm run lint      # run oxlint
```

The unit tests mock the Supabase client, so they run
without credentials. They cover the data layer's
ordering/rollback logic, the edit and delete dialogs,
URL validation, and card-action click handling. They do
not exercise real RLS or Storage policy enforcement.

### Environment variables

| Variable                    | Required | Description                                                                 |
| --------------------------- | -------- | --------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`         | Yes      | Your Supabase project URL, e.g. `https://your-ref.supabase.co`              |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes  | Your **publishable** key (`sb_publishable_…`) from *Project Settings → API* |

Notes:

- **Never** put a `sb_secret_…` / `service_role` key, database password,
  or any other backend secret in a `VITE_` variable. Vite embeds
  **every** `VITE_` variable into the client bundle at build time, so a
  secret placed there would be exposed to anyone who loads your site.
- `.env.local` is git-ignored. Never commit real keys.

## Database setup

The complete schema lives in one migration:

```
supabase/migrations/20261009000000_init.sql
```

Apply it to **your own** Supabase project with either method:

**Link your local folder to your own project** (your personal
Supabase workspace for this instance) — required for the CLI
commands below:

```bash
npx supabase link            # prompts for your project ref; your own credentials
```

**Preview pending migrations safely** before applying anything:

```bash
npx supabase migration list  # read-only: shows which migrations are applied
```

You can also open `supabase/migrations/20261009000000_init.sql`
and review the SQL directly — it is the only migration, and the
Supabase CLI applies migrations in timestamp order.

**Option A — Supabase CLI** (recommended for local development):

```bash
npx supabase db reset            # local: applies all migrations in order
# or, for a linked hosted project:
npx supabase migration up
```

**Option B — SQL editor**: open *Supabase Dashboard → SQL Editor*, create a new
query, paste the contents of `supabase/migrations/20261009000000_init.sql`,
and run it.

The migration creates:

1. `public.projects` table (`id`, `user_id` defaulting to `auth.uid()`,
   `name`, `url`, `image_path`, `description`, `platform`, `created_at`,
   `updated_at`) with an `updated_at` maintenance trigger
2. Row Level Security with explicit SELECT / INSERT / UPDATE / DELETE policies
   scoped to `auth.uid()`
3. Least-privilege grants: `revoke all` from `anon` and `public`,
   `select, insert, update, delete` for `authenticated` only
4. A **private** `project-images` Storage bucket (5 MB, image MIME types only)
   with per-user namespace policies

## Supabase Auth configuration

Open *Authentication → Settings* in your Supabase dashboard:

- **Site URL**: set it to your deployment URL (e.g. `https://launchpad.vercel.app`).
  Password-reset emails redirect to `/reset-password` on that origin.
- **Allowed Redirect URLs**: add your deployment URL's
  `/login` and `/reset-password` paths (e.g.
  `https://your-domain/login` and `https://your-domain/reset-password`)
  so confirmation and password-reset emails can redirect back
  to the app.
- **Email confirmation**: this app handles both modes gracefully.
  - *Confirmation disabled*: sign-up signs the user in immediately.
  - *Confirmation enabled* (recommended for public instances): sign-up returns no
    session and the app shows a "check your email" notice. Sign-in before
    confirming produces a clear "email not confirmed" message.
- **Disabling further sign-ups** (recommended for publicly deployed instances):
  after your account exists, turn off *Enable sign ups* (or configure an email
  allow list). Do **not** rely on hiding the sign-up button — that is not a
  security control. Hiding is cosmetic; the setting is the control.

## Deployment

The app is a static SPA; any static host with SPA rewrites works.

**Vercel** — `vercel.json` is included with the required rewrite. Push the repo
and add the environment variables in *Project Settings → Environment Variables*.

**Netlify** — `netlify.toml` is included. Deploy the repo (or the `dist`
folder) and add the variables in *Site configuration → Environment variables*.

Manual build:

```bash
npm run build     # type-checks and bundles to dist/
npm run preview   # serves the production build locally
```

## Security model

- **RLS is the authorization layer.** Policies on `public.projects` and
  `storage.objects` restrict every record to `auth.uid()`. The frontend sends no
  `user_id` and never filters as a security control.
- **Owner is derived server-side.** `user_id` defaults to `auth.uid()`, and the
  INSERT policy rejects any client-supplied owner mismatch.
- **Private storage.** The `project-images` bucket is not public; objects are
  stored as `<user_id>/<filename>` and displayed through short-lived signed
  URLs. No Base64 images in the database or `localStorage`.
- **No secrets in the browser.** Only the publishable key is used;
  secret/service_role keys are rejected at startup, and only the two
  required public variables are read from the environment (dynamic
  `import.meta.env[...]` access is intentionally avoided so Vite never
  bundles unrelated `VITE_` variables).

### Security limitations

- **Client-side checks are UX, not enforcement.** URL, image, and
  form validation run in the browser for a good experience, but the
  database `CHECK` constraints, RLS policies, and Storage policies
  are the actual security controls.
- **Tests do not prove policy enforcement.** The Vitest suite mocks
  Supabase; it verifies application logic only. RLS and Storage
  policies must be verified against your own Supabase project
  (for example, by signing in as two different users and confirming
  neither can see or modify the other's rows or objects).
- **Signed URLs expire.** Thumbnails are served through signed URLs
  that expire after one hour; the dashboard refreshes them whenever
  projects are loaded or changed.
- **External font CDN.** `index.html` loads Inter from
  Google Fonts. If your network blocks it, the app still works
  with fallback system fonts.

### Troubleshooting

- **"Configuration required" screen** — `VITE_SUPABASE_URL` or
  `VITE_SUPABASE_PUBLISHABLE_KEY` is missing or empty in
  `.env.local`. Restart the dev server after editing env files.
- **"contains a secret-format key" error** — a `sb_secret_…` or
  `service_role` key was placed in a `VITE_` variable. Replace it
  with the publishable key from *Project Settings → API*.
- **"relation \"projects\" does not exist" or empty dashboard** —
  the migration has not been applied to your Supabase project yet.
  See [Database setup](#database-setup).
- **"email not confirmed" on sign-in** — email confirmation is
  enabled; open the confirmation email first, or disable
  confirmation in *Authentication → Settings* for your instance.

## Contributing

Contributions are welcome. Keep the existing dashboard design,
run `npm run lint`, `npm test`, and `npx tsc -b` before
submitting changes, and never commit secrets or `.env.local`.

## Project structure

```
src/
  components/
    layout/      Navbar (search, theme toggle, account menu)
    projects/    ProjectCard, ProjectGrid, AddProjectModal,
                 DeleteProjectDialog, ProjectCardMenu
  ui/          Button, Modal, form fields, icons, logo
  context/       AuthContext (Supabase Auth), ThemeContext
  hooks/         useProjects (data fetching + mutations)
  lib/           supabase client, env validation, projects data layer,
                 database types, auth error mapping
  pages/         Dashboard, Login, ResetPassword
supabase/
  migrations/    20261009000000_init.sql
```

## Roadmap

- Drag-to-reorder and pinning

## License

MIT — see the [LICENSE](LICENSE) file.
# LaunchPad
