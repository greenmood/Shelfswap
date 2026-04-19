-- Shelfswap v0 initial schema
-- Tables: users, books, swap_requests, email_log
-- View: discoverable_books
-- RLS: per shelfswap_v0_api.md (handle reveal replaces email reveal per build_order)

create type book_condition as enum ('good', 'worn');
create type swap_status as enum ('pending', 'accepted', 'declined', 'completed', 'cancelled');

-- users: app-level profile keyed to auth.users.id
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  first_name text,
  zip_code text,
  whatsapp text,
  telegram text,
  instagram text,
  created_at timestamptz not null default now()
);

-- keep public.users in sync with auth.users
create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- books
create table public.books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  author text,
  cover_url text,
  condition book_condition not null default 'good',
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create index books_owner_id_idx on public.books (owner_id);
create index books_available_idx on public.books (is_available) where is_available = true;

-- swap_requests
create table public.swap_requests (
  id uuid primary key default gen_random_uuid(),
  requested_book_id uuid not null references public.books(id) on delete cascade,
  offered_book_id uuid not null references public.books(id) on delete cascade,
  requester_id uuid not null references public.users(id) on delete cascade,
  owner_id uuid not null references public.users(id) on delete cascade,
  status swap_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index swap_requests_owner_status_idx on public.swap_requests (owner_id, status);
create index swap_requests_requester_status_idx on public.swap_requests (requester_id, status);

create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger swap_requests_touch_updated_at
  before update on public.swap_requests
  for each row execute function public.touch_updated_at();

-- email_log
create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  to_user_id uuid not null references public.users(id) on delete cascade,
  kind text not null,
  swap_request_id uuid references public.swap_requests(id) on delete set null,
  sent_at timestamptz not null default now()
);

-- discoverable_books view (handles omitted; revealed via server route after accept)
create view public.discoverable_books
with (security_invoker = true) as
select
  b.id,
  b.title,
  b.author,
  b.cover_url,
  b.condition,
  b.is_available,
  b.created_at,
  b.owner_id,
  u.first_name as owner_first_name,
  u.zip_code
from public.books b
join public.users u on u.id = b.owner_id
where b.is_available = true;

-- RLS
alter table public.users enable row level security;
alter table public.books enable row level security;
alter table public.swap_requests enable row level security;
alter table public.email_log enable row level security;

-- users: authenticated users can read profile rows (email stays on the table
-- but no client query should select it; server routes use the secret key for
-- privileged reads)
create policy users_select on public.users
  for select to authenticated
  using (true);

create policy users_update_own on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- books
create policy books_select on public.books
  for select to authenticated
  using (is_available = true or owner_id = (select auth.uid()));

create policy books_insert_own on public.books
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy books_update_own on public.books
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy books_delete_own on public.books
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- swap_requests: client can read its own rows only; all writes go through
-- server routes using the secret key (bypasses RLS)
create policy swap_requests_select on public.swap_requests
  for select to authenticated
  using (requester_id = (select auth.uid()) or owner_id = (select auth.uid()));

-- email_log: no client access; server routes only
