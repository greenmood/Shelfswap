-- my_wishes: self-scoped view of the caller's wishes with full book details,
-- including currently-unavailable books that books-RLS would otherwise hide.
--
-- Default (DEFINER) semantics let the view see all rows; the auth.uid() filter
-- keeps results scoped to the caller. auth.uid() reads the request JWT and
-- works under DEFINER — this is the documented Supabase pattern.

create view public.my_wishes as
select
  w.book_id,
  w.created_at as wished_at,
  b.title,
  b.author,
  b.cover_url,
  b.condition,
  b.is_available,
  b.owner_id,
  p.first_name as owner_first_name
from public.book_wishes w
join public.books b on b.id = w.book_id
join public.public_profiles p on p.id = b.owner_id
where w.user_id = (select auth.uid());

grant select on public.my_wishes to authenticated;
