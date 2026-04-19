-- Privacy tightening:
--   * Restrict direct reads of public.users to the caller's own row
--     (email, whatsapp, telegram, instagram are no longer exposed to peers).
--   * Add public_profiles view exposing only id, first_name, and booleans
--     indicating which contact channels the user has shared.
--   * Rebuild discoverable_books to join public_profiles so the view
--     continues to return other users' books after the RLS tightening.

-- Drop the view because it references users (even though the RLS change
-- wouldn't strictly require the drop, recreating against public_profiles is
-- cleaner).
drop view if exists public.discoverable_books;

-- Replace the too-permissive users_select policy.
drop policy if exists users_select on public.users;

create policy users_select_self on public.users
  for select to authenticated
  using (id = (select auth.uid()));

-- public_profiles: safe, world-readable projection of users.
-- Uses default SECURITY DEFINER behaviour so the view can surface rows even
-- though users RLS now restricts direct SELECT to self.
create view public.public_profiles as
select
  id,
  first_name,
  (whatsapp is not null) as has_whatsapp,
  (telegram is not null) as has_telegram,
  (instagram is not null) as has_instagram
from public.users;

grant select on public.public_profiles to authenticated, anon;

-- Rebuild discoverable_books joining public_profiles instead of users.
-- security_invoker = true keeps books-side RLS checks on the caller's role.
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
  p.first_name as owner_first_name
from public.books b
join public.public_profiles p on p.id = b.owner_id
where b.is_available = true;
