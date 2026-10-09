-- Launchpad phase 1 schema
-- Executed once by the Supabase CLI (supabase/migrations are applied in
-- timestamp order). Apply to your own Supabase project with:
--   npx supabase db reset          (local development)
--   npx supabase migration up      (linked hosted project)

begin;

-- ---------------------------------------------------------------------------
-- projects table
-- ---------------------------------------------------------------------------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  name text not null
    constraint projects_name_not_blank check (length(btrim(name)) > 0),
  url text not null
    constraint projects_url_http check (url ~* '^https?://'),
  image_path text not null
    constraint projects_image_path_not_blank check (length(btrim(image_path)) > 0),
  description text,
  platform text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.projects is
  'Personal launcher projects. Each row belongs to the authenticated owner (user_id).';

create index projects_user_id_created_at_idx
  on public.projects (user_id, created_at desc);

create index projects_user_id_platform_idx
  on public.projects (user_id, platform)
  where platform is not null;

-- Server-side updated_at maintenance
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger projects_set_updated_at
  before update on public.projects
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — every policy is scoped to auth.uid(); the frontend
-- never filters as a security control.
-- ---------------------------------------------------------------------------

alter table public.projects enable row level security;

create policy "Users can view their own projects"
  on public.projects
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own projects"
  on public.projects
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own projects"
  on public.projects
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own projects"
  on public.projects
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Explicit least-privilege privileges.
-- The RLS policies above remain the record-level authorization mechanism.
-- ---------------------------------------------------------------------------

revoke all on public.projects from anon, public;
grant select, insert, update, delete on public.projects to authenticated;

revoke all on function public.set_updated_at() from public;
grant execute on function public.set_updated_at() to authenticated;

-- ---------------------------------------------------------------------------
-- Private storage bucket for project thumbnails.
-- Object layout: <user_id>/<unique-image-filename> so every user's images
-- live in their own namespace.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-images',
  'project-images',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif']
);

create policy "Users can upload their own project images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'project-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can view their own project images"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'project-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own project images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'project-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'project-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own project images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'project-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;
