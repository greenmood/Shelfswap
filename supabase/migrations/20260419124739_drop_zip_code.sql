-- Remove zip_code from users. Product is Ukraine-focused; zip codes aren't a
-- meaningful locality signal there. v0 Discovery will show all available books
-- with no location filter; revisit with a city field when scale demands it.

-- The view references users.zip_code, so drop and recreate it.
drop view if exists public.discoverable_books;

alter table public.users drop column if exists zip_code;

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
  u.first_name as owner_first_name
from public.books b
join public.users u on u.id = b.owner_id
where b.is_available = true;
